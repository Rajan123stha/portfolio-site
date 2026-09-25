/**
 * Embeds structured data in the page.
 *
 * The JSON is built from CMS content, so it can't be written into a <script>
 * verbatim: a value containing `</script>` would end the tag early and let the
 * rest of the text run as HTML. Escaping every `<` as its JSON unicode escape
 * keeps the data identical to a JSON parser while making that impossible.
 */
const LESS_THAN_ESCAPE = `${String.fromCharCode(92)}u003c`;

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, LESS_THAN_ESCAPE) }}
    />
  );
}
