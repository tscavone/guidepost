export interface ProviderRecord {
  provider_id: string;
  first: string;
  last: string;
  gender: string;
  attributes: {
    location?: {
      city: string;
      state: string;
    };
    specialties?: string[];
    accepting_new_patients?: boolean;
    languages?: string[];
    telehealth_available?: boolean;
    age_groups?: string[];
    insurance_accepted?: string[];
    hospital_affiliations?: string[];
    next_available_days?: number | null;
    board_certified?: boolean;
    years_in_practice?: number;
    license_state?: string;
  };
}

export interface GuidepostConfig {
  version: string;
  prefixes: string[];
  provider_attributes: Array<{
    id: string;
    name: string;
    value_type: string;
  }>;
}

export interface GeneratedQuery {
  query_id: string;
  query_text: string;
  prefix?: string;
  provider_id: string;
  city?: string;
  state?: string;
  specialty?: string;
  language?: string;
  insurance?: string;
}

export interface AgentSpec {
  agent: "openai" | "xai" | "gemini";
  model: string;
}

export interface AgentAnswer {
  provider_id: string | null;
  found: boolean;
  extracted_attributes: Record<string, any>;
  competitor_mentions: string[];
  confidence: number | null;
  notes: string | null;
}

export interface AgentRun {
  run_id: string;
  query_id: string;
  agent: string;
  model: string;
  latency_ms: number;
  output_text: string;
  agent_answer: AgentAnswer | null;
  error: string | null;
  raw_response?: any;
  request_context?: {
    query_text: string;
    candidate_provider_ids: string[];
  };
  created_at: string;
}

export interface RunRequest {
  query_id: string;
  query_text: string;
  providers?: ProviderRecord[];
  config?: GuidepostConfig;
  agents: AgentSpec[];
}

export interface RunBatchRequest {
  queries: GeneratedQuery[];
  agents: AgentSpec[];
}
