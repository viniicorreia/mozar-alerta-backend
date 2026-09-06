import { describe, expect, it } from "vitest";
import { newsListQuerySchema } from "@mozar/types";

describe("newsListQuerySchema.q (search)", () => {
  it("accepts a normal query and trims it", () => {
    const parsed = newsListQuerySchema.parse({ q: "  obra na cidade  " });
    expect(parsed.q).toBe("obra na cidade");
  });

  it("rejects a query shorter than 2 chars", () => {
    expect(newsListQuerySchema.safeParse({ q: "a" }).success).toBe(false);
  });

  it("rejects a query longer than 120 chars", () => {
    expect(newsListQuerySchema.safeParse({ q: "x".repeat(121) }).success).toBe(false);
  });

  it("leaves q undefined when absent", () => {
    expect(newsListQuerySchema.parse({}).q).toBeUndefined();
  });
});
