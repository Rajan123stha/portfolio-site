"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  AssistantCitation,
  AssistantErrorCode,
  FinishState,
  GroundingSummary,
  SegmentCheck,
  StreamEvent,
} from "@/lib/assistant/protocol";

/**
 * Client state for the assistant: the visible conversation, the signed
 * transcript the server needs back, and the request in flight.
 *
 * The two are deliberately separate. What the visitor sees (segments,
 * citations, flags) is rich UI state; what the server needs is an opaque
 * string it signed, and this hook never looks inside it.
 */

export type Segment = {
  text: string;
  citations: AssistantCitation[];
  /** `null` while the segment is still streaming. */
  check: SegmentCheck | null;
};

export type AnswerStatus = "pending" | "streaming" | "done" | "stopped" | "error";

export type UserMessage = { id: string; role: "user"; text: string };

export type AssistantMessage = {
  id: string;
  role: "assistant";
  question: string;
  segments: Segment[];
  status: AnswerStatus;
  summary?: GroundingSummary;
  finish?: FinishState;
  error?: { code: AssistantErrorCode | "network"; message: string };
};

export type ChatMessage = UserMessage | AssistantMessage;

type Conversation = { transcript: string; signature: string };

const STORAGE_KEY = "portfolio-assistant:v1";

type ChatOptions = {
  /**
   * Supplies a bot-check token for a conversation's first question. Absent or
   * returning `null` when the site has no bot check configured.
   */
  getVerification?: () => Promise<string | null>;
};

export function useAssistantChat({ getVerification }: ChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const conversation = useRef<Conversation | null>(null);
  const request = useRef<AbortController | null>(null);
  // State, not a ref: saving must wait for the render that shows restored
  // messages, or Strict Mode's double effect run overwrites them with [].
  const [hydrated, setHydrated] = useState(false);

  // ── Persistence: survive a reload within the tab, nothing longer ──
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          messages: ChatMessage[];
          conversation: Conversation | null;
        };
        // An answer that was mid-stream when the page unloaded is incomplete.
        setMessages(
          parsed.messages.map((message) =>
            message.role === "assistant" &&
            (message.status === "pending" || message.status === "streaming")
              ? { ...message, status: "stopped" }
              : message,
          ),
        );
        conversation.current = parsed.conversation;
      }
    } catch {
      // Storage unavailable or corrupt — start fresh.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ messages, conversation: conversation.current }),
      );
    } catch {
      // Quota or privacy mode; the chat still works, it just won't persist.
    }
  }, [messages, hydrated]);

  useEffect(() => () => request.current?.abort(), []);

  const update = useCallback(
    (id: string, change: (message: AssistantMessage) => AssistantMessage) => {
      setMessages((current) =>
        current.map((message) =>
          message.id === id && message.role === "assistant" ? change(message) : message,
        ),
      );
    },
    [],
  );

  const ask = useCallback(
    async (rawQuestion: string) => {
      const question = rawQuestion.trim();
      if (!question || request.current) return;

      const answerId = createId();
      setMessages((current) => [
        ...current,
        { id: createId(), role: "user", text: question },
        { id: answerId, role: "assistant", question, segments: [], status: "pending" },
      ]);

      const controller = new AbortController();
      request.current = controller;

      // Only a conversation's first question needs a bot-check token; the
      // server records the pass in the signed transcript after that.
      const send = async () => {
        const verification =
          !conversation.current && getVerification ? await getVerification() : null;

        return fetch("/api/assistant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            question,
            ...conversation.current,
            ...(verification ? { verification } : {}),
          }),
          signal: controller.signal,
        });
      };

      try {
        let response = await send();

        // Tokens expire after five minutes; one fresh attempt covers a chat
        // left open before the first question.
        if (response.status === 403) {
          const body = (await response.clone().json().catch(() => null)) as { code?: string } | null;
          if (body?.code === "verification_failed") response = await send();
        }

        if (!response.ok || !response.body) {
          const body = (await response.json().catch(() => null)) as {
            code?: AssistantErrorCode;
            message?: string;
          } | null;
          update(answerId, (message) => ({
            ...message,
            status: "error",
            error: {
              code: body?.code ?? "unavailable",
              message: body?.message ?? "The assistant couldn't answer just now.",
            },
          }));
          return;
        }

        for await (const event of readEvents(response.body)) {
          if (event.type === "done") {
            conversation.current = { transcript: event.transcript, signature: event.signature };
          }
          update(answerId, (message) => apply(message, event));
        }

        // A stream that ends without `done` was cut off in transit.
        update(answerId, (message) =>
          message.status === "streaming" || message.status === "pending"
            ? {
                ...message,
                status: "error",
                error: { code: "network", message: "The connection dropped before the answer finished." },
              }
            : message,
        );
      } catch {
        update(answerId, (message) =>
          controller.signal.aborted
            ? { ...message, status: "stopped" }
            : {
                ...message,
                status: "error",
                error: { code: "network", message: "Couldn't reach the assistant. Check your connection and try again." },
              },
        );
      } finally {
        request.current = null;
      }
    },
    [update, getVerification],
  );

  const stop = useCallback(() => request.current?.abort(), []);

  /** Drops a failed exchange and asks the same question again. */
  const retry = useCallback(
    (answerId: string) => {
      const failed = messages.find(
        (message): message is AssistantMessage =>
          message.id === answerId && message.role === "assistant",
      );
      if (!failed) return;

      const index = messages.indexOf(failed);
      setMessages((current) => current.filter((_, i) => i !== index && i !== index - 1));
      void ask(failed.question);
    },
    [ask, messages],
  );

  const reset = useCallback(() => {
    request.current?.abort();
    conversation.current = null;
    setMessages([]);
  }, []);

  const last = messages.at(-1);
  const busy =
    last?.role === "assistant" && (last.status === "pending" || last.status === "streaming");

  return { messages, busy, ask, stop, retry, reset };
}

/** Folds one stream event into the answer it belongs to. */
function apply(message: AssistantMessage, event: StreamEvent): AssistantMessage {
  const segments = [...message.segments];
  const open = segments.at(-1);
  const isOpen = open !== undefined && open.check === null;

  switch (event.type) {
    case "text":
      if (isOpen) segments[segments.length - 1] = { ...open, text: open.text + event.text };
      else segments.push({ text: event.text, citations: [], check: null });
      return { ...message, segments, status: "streaming" };

    case "segment":
      // Consecutive markers close a segment with no new text — still keep
      // their citations, attached where the previous claim ended.
      if (isOpen) {
        segments[segments.length - 1] = { ...open, citations: event.citations, check: event.check };
      } else {
        segments.push({ text: "", citations: event.citations, check: event.check });
      }
      return { ...message, segments, status: "streaming" };

    case "done":
      return { ...message, status: "done", summary: event.summary, finish: event.finish };

    case "error":
      return { ...message, status: "error", error: { code: event.code, message: event.message } };
  }
}

/** Parses an NDJSON response body into events as lines arrive. */
async function* readEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });

    let newline: number;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) yield JSON.parse(line) as StreamEvent;
    }

    if (done) break;
  }
}

function createId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
