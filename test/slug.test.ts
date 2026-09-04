import { describe, expect, it } from "vitest";
import { slugify, slugifyUnique } from "../src/shared/slug.js";

describe("slugify", () => {
  it("lowercases, strips accents, and dashes non-alphanumerics", () => {
    expect(slugify("Notícia: Prefeitura anuncia obra!")).toBe(
      "noticia-prefeitura-anuncia-obra",
    );
  });

  it("trims leading/trailing dashes", () => {
    expect(slugify("  ---Olá Mundo---  ")).toBe("ola-mundo");
  });

  it("collapses repeated separators", () => {
    expect(slugify("a    b---c")).toBe("a-b-c");
  });

  it("truncates to 160 chars", () => {
    const huge = "a".repeat(300);
    expect(slugify(huge).length).toBe(160);
  });
});

describe("slugifyUnique", () => {
  it("appends a short suffix after the base slug", () => {
    const result = slugifyUnique("Notícia Importante");
    expect(result).toMatch(/^noticia-importante-[a-z0-9]{6}$/);
  });

  it("produces different results on repeated calls", () => {
    const a = slugifyUnique("Mesmo Título");
    const b = slugifyUnique("Mesmo Título");
    expect(a).not.toBe(b);
  });
});
