import DOMPurify from "isomorphic-dompurify"

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target"],
    FORBID_TAGS: ["style", "script", "iframe", "form", "object", "embed"],
  })
}
