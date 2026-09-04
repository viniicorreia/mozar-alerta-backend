import { describe, expect, it } from "vitest";
import { sanitizeNewsContent } from "../src/modules/news/index.js";

describe("sanitizeNewsContent", () => {
  it("strips script tags entirely", () => {
    const result = sanitizeNewsContent('<p>Olá</p><script>alert("xss")</script>');
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
  });

  it("strips inline event handlers", () => {
    const result = sanitizeNewsContent('<p onclick="alert(1)">clique</p>');
    expect(result).not.toContain("onclick");
  });

  it("keeps allowed formatting tags", () => {
    const result = sanitizeNewsContent("<p><strong>importante</strong> e <em>urgente</em></p>");
    expect(result).toContain("<strong>importante</strong>");
    expect(result).toContain("<em>urgente</em>");
  });

  it("keeps safe links and adds rel=noopener", () => {
    const result = sanitizeNewsContent('<a href="https://example.com">link</a>');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain("noopener");
  });

  it("drops javascript: URLs", () => {
    const result = sanitizeNewsContent('<a href="javascript:alert(1)">clique</a>');
    expect(result).not.toContain("javascript:");
  });
});
