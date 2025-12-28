import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { GeneratedQuery } from "./types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Fake web provider record from fake_web_providers.jsonl
 */
export interface FakeWebProvider {
  provider_name: string;
  specialties?: string[];
  location?: {
    city: string;
    state: string;
  };
  languages?: string[];
  insurance_accepted?: string[];
  accepting_new_patients?: boolean;
  telehealth_available?: boolean;
  source?: string;
}

/**
 * Search input - can be GeneratedQuery or plain object
 */
export interface SearchInput {
  text?: string;
  specialty?: string;
  location?: {
    city?: string;
    state?: string;
  };
  insurance?: string;
  language?: string;
  accepting_new_patients?: boolean;
  telehealth_available?: boolean;
}

/**
 * Search result with score and reasons
 */
export interface SearchResult {
  provider: FakeWebProvider;
  score: number;
  reasons: string[];
}

// Cache for loaded providers
let fakeWebProvidersCache: FakeWebProvider[] | null = null;

/**
 * Load fake web providers from JSONL file
 * Caches results in module scope
 */
export async function loadFakeWebProviders(): Promise<FakeWebProvider[]> {
  if (fakeWebProvidersCache) {
    return fakeWebProvidersCache;
  }

  try {
    // Try multiple possible paths
    const possiblePaths = [
      join(process.cwd(), "..", "public", "data", "fake_web_providers.jsonl"),
      join(process.cwd(), "public", "data", "fake_web_providers.jsonl"),
      join(__dirname, "..", "..", "..", "public", "data", "fake_web_providers.jsonl"),
      join(dirname(process.cwd()), "public", "data", "fake_web_providers.jsonl"),
    ];

    let content = "";
    for (const path of possiblePaths) {
      try {
        content = await readFile(path, "utf-8");
        break;
      } catch {
        continue;
      }
    }

    if (!content) {
      throw new Error(
        "Could not find fake_web_providers.jsonl in any expected location"
      );
    }

    const lines = content.trim().split("\n");
    fakeWebProvidersCache = lines
      .filter((line) => line.trim())
      .map((line) => {
        try {
          return JSON.parse(line) as FakeWebProvider;
        } catch {
          return null;
        }
      })
      .filter((p): p is FakeWebProvider => p !== null);

    return fakeWebProvidersCache;
  } catch (error) {
    console.error("Failed to load fake web providers:", error);
    return [];
  }
}

/**
 * Normalize text for token matching (lowercase, split on whitespace)
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/**
 * Calculate token overlap between query text and provider fields
 */
function calculateTextOverlap(
  queryText: string,
  provider: FakeWebProvider
): number {
  const queryTokens = new Set(tokenize(queryText));
  if (queryTokens.size === 0) return 0;

  const providerTokens = new Set<string>();
  
  // Add provider name tokens
  if (provider.provider_name) {
    tokenize(provider.provider_name).forEach((t) => providerTokens.add(t));
  }
  
  // Add specialty tokens
  if (provider.specialties) {
    provider.specialties.forEach((s) => {
      tokenize(s).forEach((t) => providerTokens.add(t));
    });
  }
  
  // Add location tokens
  if (provider.location) {
    if (provider.location.city) {
      tokenize(provider.location.city).forEach((t) => providerTokens.add(t));
    }
    if (provider.location.state) {
      tokenize(provider.location.state).forEach((t) => providerTokens.add(t));
    }
  }
  
  // Add source tokens
  if (provider.source) {
    tokenize(provider.source).forEach((t) => providerTokens.add(t));
  }

  // Calculate overlap ratio
  let matches = 0;
  for (const token of queryTokens) {
    if (providerTokens.has(token)) {
      matches++;
    }
  }

  return matches / queryTokens.size;
}

/**
 * Search and rank fake web providers based on query criteria
 * Returns top N matches deterministically
 */
export async function searchFakeWebProviders(
  input: GeneratedQuery | SearchInput,
  limit: number = 10
): Promise<SearchResult[]> {
  const providers = await loadFakeWebProviders();
  
  // Normalize input to SearchInput format
  let searchInput: SearchInput;
  if ("query_text" in input && "provider_id" in input) {
    // It's a GeneratedQuery
    const query = input as GeneratedQuery;
    searchInput = {
      text: query.query_text,
      specialty: query.specialty,
      location: query.city || query.state
        ? {
            city: query.city,
            state: query.state,
          }
        : undefined,
      insurance: query.insurance,
      language: query.language,
    };
  } else {
    // It's already a SearchInput
    searchInput = input as SearchInput;
  }

  // Score each provider
  const scored: SearchResult[] = providers.map((provider) => {
    let score = 0;
    const reasons: string[] = [];

    // Specialty match: strong weight (10 points)
    if (searchInput.specialty && provider.specialties) {
      const specialtyLower = searchInput.specialty.toLowerCase();
      const hasMatch = provider.specialties.some(
        (s) => s.toLowerCase() === specialtyLower
      );
      if (hasMatch) {
        score += 10;
        reasons.push(`specialty:${searchInput.specialty}`);
      }
    }

    // City match: medium weight (5 points)
    if (searchInput.location?.city && provider.location?.city) {
      if (
        searchInput.location.city.toLowerCase() ===
        provider.location.city.toLowerCase()
      ) {
        score += 5;
        reasons.push(`city:${provider.location.city}`);
      }
    }

    // State match: medium weight but weaker (3 points)
    if (searchInput.location?.state && provider.location?.state) {
      if (
        searchInput.location.state.toLowerCase() ===
        provider.location.state.toLowerCase()
      ) {
        score += 3;
        reasons.push(`state:${provider.location.state}`);
      }
    }

    // Insurance match: medium weight (5 points)
    if (searchInput.insurance && provider.insurance_accepted) {
      const insuranceLower = searchInput.insurance.toLowerCase();
      const hasMatch = provider.insurance_accepted.some(
        (i) => i.toLowerCase() === insuranceLower
      );
      if (hasMatch) {
        score += 5;
        reasons.push(`insurance:${searchInput.insurance}`);
      }
    }

    // Language match: small weight (2 points)
    if (searchInput.language && provider.languages) {
      const languageLower = searchInput.language.toLowerCase();
      const hasMatch = provider.languages.some(
        (l) => l.toLowerCase() === languageLower
      );
      if (hasMatch) {
        score += 2;
        reasons.push(`language:${searchInput.language}`);
      }
    }

    // Accepting new patients: small boost (1 point) if query asks for it
    if (
      searchInput.accepting_new_patients === true &&
      provider.accepting_new_patients === true
    ) {
      score += 1;
      reasons.push("accepting_new_patients:true");
    }

    // Telehealth available: small boost (1 point) if query asks for it
    if (
      searchInput.telehealth_available === true &&
      provider.telehealth_available === true
    ) {
      score += 1;
      reasons.push("telehealth_available:true");
    }

    // Text overlap: variable weight (0-5 points based on overlap ratio)
    if (searchInput.text) {
      const textOverlap = calculateTextOverlap(searchInput.text, provider);
      const textScore = textOverlap * 5;
      score += textScore;
      if (textScore > 0) {
        reasons.push(`text_overlap:${(textOverlap * 100).toFixed(0)}%`);
      }
    }

    return {
      provider,
      score,
      reasons,
    };
  });

  // Sort by score (descending), then by provider name (ascending) for determinism
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.provider.provider_name.localeCompare(b.provider.provider_name);
  });

  // Return top N
  return scored.slice(0, limit);
}

/**
 * Sanity check function - can be called manually for testing
 * Logs search results for a sample query
 */
export async function sanityCheckSearch(): Promise<void> {
  console.log("Running search sanity check...");
  
  const testQuery: SearchInput = {
    text: "Dermatology in Cambridge, MA",
    specialty: "Dermatology",
    location: {
      city: "Cambridge",
      state: "MA",
    },
    insurance: "Aetna",
  };

  const results = await searchFakeWebProviders(testQuery, 5);
  
  console.log(`Found ${results.length} results for test query:`);
  results.forEach((result, index) => {
    console.log(
      `  ${index + 1}. ${result.provider.provider_name} (score: ${result.score.toFixed(2)})`
    );
    console.log(`     Reasons: ${result.reasons.join(", ")}`);
  });
  
  console.log("Sanity check complete.");
}

// To run sanity check manually:
// import { sanityCheckSearch } from './search';
// sanityCheckSearch();

