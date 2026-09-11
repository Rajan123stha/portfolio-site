# AI assistant — security and cost controls

The "Ask about me" chat is a public, unauthenticated endpoint (`POST /api/assistant`)
that spends a provider quota on every answer. This document covers what it
protects, how, how to configure it for production, and how to check each
safeguard yourself.

---

## 1. What needs protecting

| Asset | What could go wrong |
| --- | --- |
| **Your provider quota / bill** | A script asks thousands of questions and burns the free tier (or a paid budget) in minutes. |
| **Your API key** | The key leaks into the browser bundle or the repo and is used elsewhere. |
| **Your reputation** | The model invents a job, a skill or a number and shows it to a recruiter. |
| **Visitor privacy** | Questions or IP addresses are stored in a way that identifies someone. |
| **The rest of the site** | Abuse of the chat slows down or breaks the database the portfolio runs on. |

## 2. What the model can and cannot do

This bounds the damage of any prompt-injection attempt, so it is worth stating
first:

- The model receives **only public content**: the same facts the page shows,
  with hidden sections and items excluded. There are no secrets, no admin data,
  no messages and no analytics in its context.
- It has **no tools**: it can't read files, query the database, browse, or call
  anything. It can only return text.
- Its text is **checked before the visitor sees it as trustworthy**: every
  claim must cite a fact, and numbers, names and links that don't match the
  portfolio are flagged. Only links the portfolio publishes become clickable.

So the worst a successful "ignore your instructions" attack achieves is an
off-topic or odd reply — on the attacker's own screen, marked as unverified.

## 3. The request pipeline

Checks run cheapest-first; the provider is called only when everything before
it allows the request. Code: `app/api/assistant/route.ts`.

| # | Check | Cost | Stops |
| --- | --- | --- | --- |
| 1 | Same-origin `Origin` header, bot user-agents | free | Other websites using your quota through their visitors' browsers; declared crawlers |
| 2 | `Content-Type: application/json`, body ≤ 48 KB (read with a hard cap), question ≤ 600 chars and made of words | free | Oversized or junk payloads; memory abuse |
| 3 | Signed conversation history (HMAC, 6 h expiry, 8 questions max) | free | Forged "earlier answers", replaying old chats, endlessly long chats |
| 4 | Cloudflare Turnstile on each conversation's first question *(optional)* — a missing token is refused before any database work | 1 HTTPS call | Scripts — including ones that rotate IPs |
| 5 | Per-visitor limits: 4/min, 10/hour, 25/day | 1 DB query | One person or one IP using everything |
| 6 | Answer cache for suggested questions | 1 DB query | Paying twice for the same popular question |
| 7 | Site-wide ceilings: 10 answers/min, 200/day, 750 k tokens/day | free | Total spend, however many identities an attacker has |
| 8 | Lean model call: last 3 exchanges only, 1 024-token answer cap, abandoned if the provider goes silent (30 s before the first word, 15 s after), 60 s hard ceiling | provider | Long chats growing the prompt; runaway or stalled answers |

After the answer, the tokens the provider reports are added to the daily
budget (estimated at ~4 characters per token if a provider doesn't report
them).

### Why both per-visitor and site-wide limits

Per-visitor limits key on the IP address, which a determined attacker can
rotate. They exist for **fairness**. The site-wide ceilings are the real
**spend cap**: no matter how many IPs a script uses, the provider is never
asked for more than `AI_DAILY_LIMIT` answers or `AI_DAILY_TOKEN_LIMIT` tokens a
day. Turnstile is what stops IP-rotating scripts from using up that allowance
and locking real visitors out.

## 4. Privacy

- **IP addresses are never stored.** Rate-limit keys are an HMAC of the IP,
  keyed with `AUTH_SECRET`, so they can't be reversed or brute-forced.
- **Visitor questions are never stored by the server.** The conversation lives
  in the visitor's own tab (`sessionStorage`) and in the signed transcript the
  browser sends back. The answer cache holds answers to *your* suggested
  questions only — never text a visitor typed.
- Counters are purged automatically after two days; cached answers after seven.
- Questions are sent to your model provider to be answered. Check your
  provider's data policy (Gemini's free tier may use prompts to improve its
  products — the paid tier does not).

## 5. Configuration

All optional; defaults are sized for Gemini's free tier. Set them in
`.env.local` and in your host's environment variables.

| Variable | Default | Purpose |
| --- | --- | --- |
| `AI_PROVIDER` | `gemini` | `gemini` or `openai-compatible` |
| `AI_API_KEY` | — | Provider key. **Server-only — never prefix with `NEXT_PUBLIC_`.** |
| `AI_MODEL` | `gemini-3.6-flash` | Model ID |
| `AI_DAILY_LIMIT` | `200` | Answers per UTC day, whole site |
| `AI_DAILY_TOKEN_LIMIT` | `750000` | Provider tokens per UTC day, whole site |
| `AI_RPM_LIMIT` | `10` | Answers per minute, whole site — keep under your provider's RPM |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | — | Enables the bot check |
| `TRUSTED_IP_HEADER` | — | Header your host sets to the real client IP (see below) |

Per-visitor limits, conversation length and history window are constants in
`lib/assistant/config.ts` (`ASSISTANT_LIMITS`).

## 6. Production checklist

1. **Keep the key server-side.** Set `AI_API_KEY` only in `.env.local`
   (gitignored) and your host's dashboard. Never commit it; never name it
   `NEXT_PUBLIC_*`.
2. **Restrict the Gemini key.** Google Cloud console → *APIs & Services →
   Credentials* → your key → *API restrictions* → allow only the
   **Generative Language API**. A leaked key then can't be used for anything
   else.
3. **Cap spend at the provider too.** The free tier has hard quotas. If you
   ever enable billing, set a budget alert in Google Cloud *Billing → Budgets*
   and lower `AI_DAILY_TOKEN_LIMIT` to match — two ceilings are better than one.
4. **Turn on Turnstile.** dash.cloudflare.com → *Turnstile → Add widget* → add
   your domain → copy the site and secret keys into `TURNSTILE_SITE_KEY` and
   `TURNSTILE_SECRET_KEY`. Free, and invisible for almost every visitor.
5. **Get the client IP right.**
   - Vercel: leave `TRUSTED_IP_HEADER` blank.
   - Behind Cloudflare: `TRUSTED_IP_HEADER="cf-connecting-ip"`.
   - Elsewhere: the header your proxy sets and **overwrites**. Only set it if
     that proxy really is in front of the site — otherwise a client can send the
     header itself and pick its own identity.
6. **Keep `AUTH_SECRET` long and private.** It signs admin sessions and chat
   transcripts. Rotating it signs everyone out and resets open chats — which is
   also the fix if it ever leaks.
7. **Watch the admin panel.** *Admin → AI assistant* shows answers and tokens
   against their caps, cache hits, blocked requests, and which protections are
   on.

## 7. Testing the safeguards

Run these against your own deployment (replace `SITE`). `curl`'s default
user-agent is itself blocked as a bot, so the tests send a browser one.

```bash
SITE="https://your-domain.com"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140 Safari/537.36"
# Sends a question the way the site's own page does, plus any extra curl flags.
ask() { curl -s -o /dev/null -w "%{http_code}\n" -X POST "$SITE/api/assistant" \
  -H "content-type: application/json" -H "origin: $SITE" -A "$UA" "$@"; }

# Another website calling the endpoint → 403
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$SITE/api/assistant" \
  -H "content-type: application/json" -H "origin: https://evil.example" -A "$UA" \
  -d '{"question":"hi there"}'

# A bot user-agent → 403
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$SITE/api/assistant" \
  -H "content-type: application/json" -H "origin: $SITE" -d '{"question":"hi there"}'

# Not JSON → 415
ask -H "content-type: text/plain" -d 'hello'

# Oversized body → 413
ask -d "{\"question\":\"$(head -c 60000 /dev/zero | tr '\0' a)\"}"

# Junk question → 400
ask -d '{"question":"???"}'

# Forged history → 409
ask -d '{"question":"and then?","transcript":"{\"v\":1}","signature":"forged"}'

# Per-visitor burst limit: the 5th question inside a minute → 429.
# (The first four are real questions and use a little quota.)
for i in 1 2 3 4 5 6; do ask -d '{"question":"What is your stack?"}'; done
```

To try the bot check locally without a Cloudflare account, use Cloudflare's
published test keys: site key `1x00000000000000000000BB` (invisible, always
passes) with secret `1x0000000000000000000000000000000AA` — or secret
`2x0000000000000000000000000000000AA` to see every conversation refused.

With Turnstile enabled, every one of these returns `403` instead: a request
without a bot-check token is refused before it reaches the rate limiter or the
database, so a flood of them costs nothing.

**Check the key isn't in the browser bundle** (Gemini keys start with `AIza`):

```bash
pnpm build && grep -rl "AIza" .next/static && echo "LEAK" || echo "key not in client code"
```

**Check the cache:** ask the same suggested question from two browsers. The
second answer appears instantly, and *Answered from cache today* goes up in the
admin panel while *Tokens today* doesn't.

## 8. Remaining risks

- **Without Turnstile**, a script rotating IP addresses can use the site-wide
  daily allowance, after which real visitors see "try again tomorrow". Spend
  stays capped; availability doesn't.
- **Shared IPs** (offices, universities, mobile carriers) share one set of
  per-visitor limits.
- **Fixed windows** allow a short burst at a boundary (the end of one minute and
  the start of the next).
- **Heavy concurrency** can overshoot the site-wide caps by a few answers: the
  load is read and then reserved in separate statements.
- **Turnstile fails closed**: if Cloudflare is unreachable, new conversations
  can't start (existing ones continue).
- **The answer checks are lexical**: they catch invented numbers, names and
  links, not a subtly wrong paraphrase — which is why every claim also shows
  its source text.

## 9. If something goes wrong

- **Key leaked:** delete it in Google AI Studio, create a new one, update
  `AI_API_KEY` in your host, redeploy.
- **Abuse or a cost spike:** switch the assistant off in *Admin → AI
  assistant* (takes effect immediately), enable Turnstile, lower the limits,
  then switch it back on.
- **Suspected transcript or session compromise:** rotate `AUTH_SECRET`.
