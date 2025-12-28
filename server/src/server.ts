import "dotenv/config";
import express from "express";
import cors from "cors";
import {
  RunRequest,
  RunBatchRequest,
  AgentRun,
  AgentSpec,
  GeneratedQuery,
} from "./types";
import { getAdapter, hasApiKey } from "./adapters";
import { createAgentRun } from "./utils";
import { loadProviders } from "./providers";
import { searchFakeWebProviders, SearchResult } from "./search";

const app = express();
const PORT = 8787;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests from localhost on any port (for development)
      if (
        !origin ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// Load providers on server start
const allProviders = loadProviders();

/**
 * Get provider name from a provider record, handling both provider_name and first/last formats
 */
function getProviderName(provider: any): string | null {
  if (provider.provider_name) {
    return provider.provider_name;
  }
  if (provider.first || provider.last) {
    return `${provider.first || ""} ${provider.last || ""}`.trim() || null;
  }
  return null;
}

/**
 * Format search results for inclusion in prompt
 */
function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return "[]";
  }

  const formatted = results.map((result) => ({
    provider_name: result.provider.provider_name,
    specialties: result.provider.specialties || [],
    location: result.provider.location || null,
    languages: result.provider.languages || [],
    insurance_accepted: result.provider.insurance_accepted || [],
    accepting_new_patients: result.provider.accepting_new_patients ?? null,
    telehealth_available: result.provider.telehealth_available ?? null,
    source: result.provider.source || null,
    score: result.score,
    match_reasons: result.reasons,
  }));

  return JSON.stringify(formatted, null, 2);
}

/**
 * Generate the prompt for agent execution
 * @param queryText - The search query text
 * @param expectedProviderName - The expected provider name to look for (optional)
 * @param searchResults - The simulated web search results
 * @returns The formatted prompt string
 */
function generatePrompt(
  queryText: string,
  expectedProviderName: string | null,
  searchResults: SearchResult[]
): string {
  const resultsSection = formatSearchResults(searchResults);

  if (expectedProviderName) {
    return `Execute this healthcare provider search query and analyze the results:

Query: ${queryText}
Expected Provider Name: ${expectedProviderName}

=== SIMULATED_WEB_RESULTS ===
${resultsSection}
=== END_SIMULATED_WEB_RESULTS ===

Instructions:
1. Use ONLY the providers listed in SIMULATED_WEB_RESULTS above as your web search findings. Do not invent providers.
2. Parse the results to determine if the expected provider name "${expectedProviderName}" appears anywhere in the returned provider list.
3. CRITICAL: Set "found": true ONLY if the expected provider name "${expectedProviderName}" appears in the query results. Use case-insensitive matching and ignore "Dr." prefix and extra spaces. Any other provider names appearing in the results should NOT trigger "found": true.
4. Set "provider_name" to the name from the results that matches the expected provider name (if found), otherwise null.
5. Extract attributes (location, specialties, languages, accepting_new_patients, telehealth_available, insurance_accepted) from the query results for whichever providers appear, but remember that "found" must only reflect whether the expected provider name appears.
6. Do not infer or invent any attributes that are not explicitly present in the query results.
7. In the notes field, describe whether the expected provider was found in the query results and include any relevant context from the search.

Return ONLY valid JSON matching this exact schema:
{
  "provider_name": "string or null",
  "found": boolean,
  "extracted_attributes": {
    "location": { "city": "string", "state": "string" } | null,
    "specialties": ["string"] | null,
    "languages": ["string"] | null,
    "accepting_new_patients": boolean | null,
    "telehealth_available": boolean | null,
    "insurance_accepted": ["string"] | null
  },
  "notes": "string or null"
}

Return JSON only, no other text.`;
  } else {
    return `Execute this healthcare provider search query and analyze the results:

Query: ${queryText}

=== SIMULATED_WEB_RESULTS ===
${resultsSection}
=== END_SIMULATED_WEB_RESULTS ===

Instructions:
1. Use ONLY the providers listed in SIMULATED_WEB_RESULTS above as your web search findings. Do not invent providers.
2. Parse the results to identify any provider names that appear in the returned data.
3. Set "found": true if you can identify a specific provider from the results, false otherwise.
4. Extract attributes (location, specialties, languages, accepting_new_patients, telehealth_available, insurance_accepted) ONLY from data present in the search results.
5. Do not infer or invent any attributes that are not explicitly present in the results.
6. Include optional reasoning in the notes field.

Return ONLY valid JSON matching this exact schema:
{
  "provider_name": "string or null",
  "found": boolean,
  "extracted_attributes": {
    "location": { "city": "string", "state": "string" } | null,
    "specialties": ["string"] | null,
    "languages": ["string"] | null,
    "accepting_new_patients": boolean | null,
    "telehealth_available": boolean | null,
    "insurance_accepted": ["string"] | null
  },
  "notes": "string or null"
}

Return JSON only, no other text.`;
  }
}

app.post("/api/run", async (req, res) => {
  try {
    const body: RunRequest & { debug?: boolean } = req.body;
    const { query_id, query_text, agents, debug } = body;
    const queryProviderId = body.providers?.[0]?.provider_id;

    if (!query_id || !query_text || !agents || !Array.isArray(agents)) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    // Perform simulated web search
    const searchInput = {
      text: query_text,
      specialty: body.providers?.[0]?.attributes?.specialties?.[0],
      location: body.providers?.[0]?.attributes?.location
        ? {
            city: body.providers?.[0].attributes.location.city,
            state: body.providers?.[0].attributes.location.state,
          }
        : undefined,
      insurance: body.providers?.[0]?.attributes?.insurance_accepted?.[0],
      language: body.providers?.[0]?.attributes?.languages?.[0],
    };
    const searchResults = await searchFakeWebProviders(searchInput, 15);

    const runs: AgentRun[] = [];

    for (const agentSpec of agents) {
      const startTime = Date.now();

      if (!hasApiKey(agentSpec.agent)) {
        // Get expected provider name for error case
        let expectedProviderName: string | null = null;
        if (queryProviderId) {
          const expectedProvider = allProviders.find(
            (p) => p.provider_id === queryProviderId
          );
          if (expectedProvider) {
            expectedProviderName = getProviderName(expectedProvider);
          }
        }

        runs.push(
          createAgentRun(
            query_id,
            agentSpec.agent,
            agentSpec.model,
            startTime,
            "",
            null,
            `API key not configured for ${agentSpec.agent}`,
            undefined,
            expectedProviderName,
            allProviders,
            searchResults
          )
        );
        continue;
      }

      try {
        const adapter = getAdapter(agentSpec.agent);

        // Get expected provider name for matching
        let expectedProviderName: string | null = null;
        if (queryProviderId) {
          const expectedProvider = allProviders.find(
            (p) => p.provider_id === queryProviderId
          );
          if (expectedProvider) {
            expectedProviderName = getProviderName(expectedProvider);
          }
        }

        const prompt = generatePrompt(
          query_text,
          expectedProviderName,
          searchResults
        );

        console.log(`[${agentSpec.agent}] Query: ${query_text}`);
        console.log(
          `[${agentSpec.agent}] Search Results: ${searchResults.length} providers found`
        );
        console.log(`[${agentSpec.agent}] Prompt: ${prompt}`);
        console.log(`[${agentSpec.agent}] Model: ${agentSpec.model}`);
        console.log(
          `[${agentSpec.agent}] Expected Provider Name: ${
            expectedProviderName || "null"
          }`
        );

        const result = await adapter({
          prompt,
          model: agentSpec.model,
        });

        console.log(
          `[${agentSpec.agent}] Raw Response:`,
          JSON.stringify(result.raw, null, 2)
        );

        runs.push(
          createAgentRun(
            query_id,
            agentSpec.agent,
            agentSpec.model,
            startTime,
            result.output_text,
            result.raw,
            null,
            {
              query_text: query_text,
              candidate_provider_ids: [],
            },
            expectedProviderName,
            allProviders,
            searchResults
          )
        );
      } catch (error) {
        // Get expected provider name for error case
        let expectedProviderName: string | null = null;
        if (queryProviderId) {
          const expectedProvider = allProviders.find(
            (p) => p.provider_id === queryProviderId
          );
          if (expectedProvider) {
            expectedProviderName = getProviderName(expectedProvider);
          }
        }

        runs.push(
          createAgentRun(
            query_id,
            agentSpec.agent,
            agentSpec.model,
            startTime,
            "",
            null,
            error instanceof Error ? error.message : "Unknown error",
            undefined,
            expectedProviderName,
            allProviders,
            searchResults
          )
        );
      }
    }

    // Include search results in response if debug flag is set
    if (debug) {
      res.json({ runs, searchResults });
    } else {
      res.json(runs);
    }
  } catch (error) {
    console.error("Error in /api/run:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/run-batch", async (req, res) => {
  try {
    const body: RunBatchRequest & { debug?: boolean } = req.body;
    const { queries, agents, debug } = body;

    if (
      !queries ||
      !Array.isArray(queries) ||
      !agents ||
      !Array.isArray(agents)
    ) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const allRuns: AgentRun[] = [];
    const allSearchResults: Record<string, SearchResult[]> = {};

    for (const query of queries) {
      // Perform simulated web search for this query (reuses cached provider data)
      const searchResults = await searchFakeWebProviders(query, 15);
      if (debug) {
        allSearchResults[query.query_id] = searchResults;
      }

      for (const agentSpec of agents) {
        const startTime = Date.now();

        if (!hasApiKey(agentSpec.agent)) {
          // Get expected provider name for error case
          let expectedProviderName: string | null = null;
          if (query.provider_id) {
            const expectedProvider = allProviders.find(
              (p) => p.provider_id === query.provider_id
            );
            if (expectedProvider) {
              expectedProviderName = getProviderName(expectedProvider);
            }
          }

          allRuns.push(
            createAgentRun(
              query.query_id,
              agentSpec.agent,
              agentSpec.model,
              startTime,
              "",
              null,
              `API key not configured for ${agentSpec.agent}`,
              undefined,
              expectedProviderName,
              allProviders,
              searchResults
            )
          );
          continue;
        }

        try {
          const adapter = getAdapter(agentSpec.agent);

          // Get expected provider name for matching
          let expectedProviderName: string | null = null;
          if (query.provider_id) {
            const expectedProvider = allProviders.find(
              (p) => p.provider_id === query.provider_id
            );
            if (expectedProvider) {
              expectedProviderName = getProviderName(expectedProvider);
            }
          }

          const prompt = generatePrompt(
            query.query_text,
            expectedProviderName,
            searchResults
          );

          console.log(`[${agentSpec.agent}] Query: ${query.query_text}`);
          console.log(
            `[${agentSpec.agent}] Search Results: ${searchResults.length} providers found`
          );
          console.log(`[${agentSpec.agent}] Prompt: ${prompt}`);
          console.log(`[${agentSpec.agent}] Model: ${agentSpec.model}`);
          console.log(
            `[${agentSpec.agent}] Expected Provider Name: ${
              expectedProviderName || "null"
            }`
          );

          const result = await adapter({
            prompt,
            model: agentSpec.model,
          });

          console.log(
            `[${agentSpec.agent}] Raw Response:`,
            JSON.stringify(result.raw, null, 2)
          );

          allRuns.push(
            createAgentRun(
              query.query_id,
              agentSpec.agent,
              agentSpec.model,
              startTime,
              result.output_text,
              result.raw,
              null,
              {
                query_text: query.query_text,
                candidate_provider_ids: [],
              },
              expectedProviderName,
              allProviders,
              searchResults
            )
          );
        } catch (error) {
          // Get expected provider name for error case
          let expectedProviderName: string | null = null;
          if (query.provider_id) {
            const expectedProvider = allProviders.find(
              (p) => p.provider_id === query.provider_id
            );
            if (expectedProvider) {
              expectedProviderName = getProviderName(expectedProvider);
            }
          }

          allRuns.push(
            createAgentRun(
              query.query_id,
              agentSpec.agent,
              agentSpec.model,
              startTime,
              "",
              null,
              error instanceof Error ? error.message : "Unknown error",
              undefined,
              expectedProviderName,
              allProviders,
              searchResults
            )
          );
        }
      }
    }

    // Include search results in response if debug flag is set
    if (debug) {
      res.json({ runs: allRuns, searchResults: allSearchResults });
    } else {
      res.json(allRuns);
    }
  } catch (error) {
    console.error("Error in /api/run-batch:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
