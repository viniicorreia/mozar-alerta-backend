import type { Sensitivity } from "@mozar/types";

export interface AnalyzeContentInput {
  text: string;
  imageUrls?: string[];
}

export interface AnalyzeContentResult {
  isRelevantToCity: boolean;
  suggestedCategorySlug?: string;
  summary?: string;
  suggestedTitle?: string;
  topics: string[];
  sensitivity: Sensitivity;
  priority: "low" | "normal" | "high" | "breaking";
  confidence: number;
}

/**
 * Pluggable content-classification provider (plan section 8). NEVER sets a
 * News/InstagramPost's moderation status to "published" — it only fills the
 * `ai*` fields for a human moderator to review, and sensitive categories
 * always require explicit human approval regardless of this output.
 */
export interface AIProvider {
  analyzeContent(input: AnalyzeContentInput): Promise<AnalyzeContentResult>;
  detectDuplicate(text: string, candidates: string[]): Promise<number>;
}

/** Default driver — AI_PROVIDER=noop. Moderation works fully manually until a real provider is wired in. */
export class NoopAIProvider implements AIProvider {
  async analyzeContent(): Promise<AnalyzeContentResult> {
    return {
      isRelevantToCity: true,
      topics: [],
      sensitivity: "none",
      priority: "normal",
      confidence: 0,
    };
  }

  async detectDuplicate(): Promise<number> {
    return 0;
  }
}

// Sprint 6 adds OpenAIProvider / AnthropicProvider implementing AIProvider,
// selected by AI_PROVIDER — moderation UI and gating logic never change.
