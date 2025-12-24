import { AgentRun, AgentAnswer } from "./types";

export function generateRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function stripCodeFences(text: string): string {
  // Remove leading/trailing triple backticks with optional "json" language tag
  return text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
}

export function parseJsonFromText(text: string): any | null {
  try {
    // Strip code fences first
    const cleaned = stripCodeFences(text);

    // Try to find JSON in the text
    const jsonMatch = cleaned.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    // Try parsing the entire cleaned text as JSON
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export function parseAgentAnswer(text: string): {
  answer: AgentAnswer;
  parseError: string | null;
} {
  const parsed = parseJsonFromText(text);

  if (!parsed || typeof parsed !== "object") {
    const errorPreview = text.substring(0, 200);
    return {
      answer: {
        provider_id: null,
        found: false,
        extracted_attributes: {},
        competitor_mentions: [],
        confidence: null,
        notes: "parse_error",
      },
      parseError: errorPreview,
    };
  }

  // Validate and normalize the parsed JSON to match AgentAnswer schema
  const answer: AgentAnswer = {
    provider_id:
      typeof parsed.provider_id === "string" ? parsed.provider_id : null,
    found: typeof parsed.found === "boolean" ? parsed.found : false,
    extracted_attributes:
      typeof parsed.extracted_attributes === "object" &&
      parsed.extracted_attributes !== null
        ? parsed.extracted_attributes
        : {},
    competitor_mentions: Array.isArray(parsed.competitor_mentions)
      ? parsed.competitor_mentions.filter((m: any) => typeof m === "string")
      : [],
    confidence:
      typeof parsed.confidence === "number" &&
      parsed.confidence >= 0 &&
      parsed.confidence <= 1
        ? parsed.confidence
        : null,
    notes: typeof parsed.notes === "string" ? parsed.notes : null,
  };

  return { answer, parseError: null };
}

export function createAgentRun(
  queryId: string,
  agent: string,
  model: string,
  startTime: number,
  outputText: string,
  raw: any,
  error: string | null = null,
  requestContext?: { query_text: string; candidate_provider_ids: string[] }
): AgentRun {
  const latencyMs = Date.now() - startTime;

  let agentAnswer: AgentAnswer | null = null;
  let parseError: string | null = null;

  if (!error) {
    const parseResult = parseAgentAnswer(outputText);
    agentAnswer = parseResult.answer;
    parseError = parseResult.parseError;
  }

  return {
    run_id: generateRunId(),
    query_id: queryId,
    agent,
    model,
    latency_ms: latencyMs,
    output_text: outputText,
    agent_answer: agentAnswer,
    error: error || parseError,
    raw_response: raw,
    request_context: requestContext,
    created_at: new Date().toISOString(),
  };
}
