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

export function parseAgentAnswer(
  text: string,
  expectedProviderName: string | null = null,
  allProviders: any[] = []
): {
  answer: AgentAnswer;
  parseError: string | null;
} {
  const parsed = parseJsonFromText(text);

  if (!parsed || typeof parsed !== "object") {
    const errorPreview = text.substring(0, 200);
    return {
      answer: {
        provider_name: null,
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
  const agentProviderName =
    typeof parsed.provider_name === "string"
      ? parsed.provider_name.trim()
      : null;

  // Compute 'found' by matching agent's provider_name with expected provider_name
  // Use case-insensitive matching and handle variations (e.g., "Dr. John Smith" vs "John Smith")
  let found = false;
  if (expectedProviderName && agentProviderName) {
    const normalizeName = (name: string) =>
      name
        .toLowerCase()
        .replace(/^dr\.?\s*/i, "")
        .replace(/\s+/g, " ")
        .trim();
    const normalizedExpected = normalizeName(expectedProviderName);
    const normalizedAgent = normalizeName(agentProviderName);
    found = normalizedAgent === normalizedExpected;
  }

  // Also try to match against all providers if exact match fails
  if (!found && agentProviderName && allProviders.length > 0) {
    const normalizeName = (name: string) =>
      name
        .toLowerCase()
        .replace(/^dr\.?\s*/i, "")
        .replace(/\s+/g, " ")
        .trim();
    const normalizedAgent = normalizeName(agentProviderName);
    found = allProviders.some((p) => {
      // Handle both provider_name and first/last formats
      const providerAny = p as any;
      const providerFullName = providerAny.provider_name || `${providerAny.first || ""} ${providerAny.last || ""}`.trim();
      if (!providerFullName) return false;
      return normalizeName(providerFullName) === normalizedAgent;
    });
  }

  const answer: AgentAnswer = {
    provider_name: agentProviderName,
    found,
    extracted_attributes:
      typeof parsed.extracted_attributes === "object" &&
      parsed.extracted_attributes !== null
        ? parsed.extracted_attributes
        : {},
    competitor_mentions: [], // Not used in new schema but kept for backward compatibility
    confidence: null, // Not used in new schema but kept for backward compatibility
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
  requestContext?: { query_text: string; candidate_provider_ids: string[] },
  expectedProviderName: string | null = null,
  allProviders: any[] = [],
  searchResults?: any[]
): AgentRun {
  const latencyMs = Date.now() - startTime;

  let agentAnswer: AgentAnswer | null = null;
  let parseError: string | null = null;

  if (!error) {
    const parseResult = parseAgentAnswer(
      outputText,
      expectedProviderName,
      allProviders
    );
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
    search_results: searchResults,
    created_at: new Date().toISOString(),
  };
}
