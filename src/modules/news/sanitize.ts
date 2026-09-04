import sanitizeHtml from "sanitize-html";

/**
 * Sanitizes news body HTML before it ever touches the database — plan §12
 * (XSS protection). Deliberately conservative: enough tags for an editorial
 * article, nothing that can execute script or load arbitrary resources.
 */
export function sanitizeNewsContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "a",
      "ul",
      "ol",
      "li",
      "blockquote",
      "h2",
      "h3",
      "h4",
      "img",
      "figure",
      "figcaption",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title"],
    },
    allowedSchemes: ["http", "https"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
}
