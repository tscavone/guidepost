import "dotenv/config";
import express from "express";
import cors from "cors";
import { RunRequest, RunBatchRequest, AgentRun, AgentSpec } from "./types";
import { getAdapter, hasApiKey } from "./adapters";
import { createAgentRun } from "./utils";
import {
  loadProviders,
  getProviderSlice,
  formatProviderForPrompt,
} from "./providers";

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

app.post("/api/run", async (req, res) => {
  try {
    const body: RunRequest = req.body;
    const { query_id, query_text, agents } = body;
    const queryProviderId = body.providers?.[0]?.provider_id;

    if (!query_id || !query_text || !agents || !Array.isArray(agents)) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const runs: AgentRun[] = [];

    for (const agentSpec of agents) {
      const startTime = Date.now();

      if (!hasApiKey(agentSpec.agent)) {
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
            queryProviderId || null
          )
        );
        continue;
      }

      try {
        const adapter = getAdapter(agentSpec.agent);

        // Get provider slice for this query
        const providerSlice = getProviderSlice(queryProviderId, allProviders);
        const formattedProviders = providerSlice.map(formatProviderForPrompt);
        const candidateProviderIds = providerSlice.map((p) => p.provider_id);

        const prompt = `You are a healthcare directory assistant. Answer the following query about finding a healthcare provider.

Query: ${query_text}

Available providers:
${JSON.stringify(formattedProviders, null, 2)}

Return ONLY valid JSON matching this exact schema:
{
  "provider_id": "string or null",
  "found": boolean,
  "extracted_attributes": { "attribute_id": value },
  "competitor_mentions": ["string"],
  "confidence": number between 0 and 1 or null,
  "notes": "string or null"
}

Instructions:
- Select the best provider_id from the provided list, or null if no provider matches
- Set found=false if no provider matches the query
- Populate extracted_attributes only for attributes that are explicitly supported by the provider data provided (location, specialties, languages, accepting_new_patients, telehealth_available, insurance_accepted)
- Never invent insurance, language, hospital, or other attributes not in the provider data
- List any competitor brands or tools mentioned in competitor_mentions
- Provide confidence score if available, otherwise null
- Add any relevant notes in the notes field

Return JSON only, no other text.`;

        console.log(`[${agentSpec.agent}] Query: ${query_text}`);
        console.log(`[${agentSpec.agent}] Model: ${agentSpec.model}`);

        const result = await adapter({
          prompt,
          model: agentSpec.model,
        });

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
              candidate_provider_ids: candidateProviderIds,
            },
            queryProviderId || null
          )
        );
      } catch (error) {
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
            queryProviderId || null
          )
        );
      }
    }

    res.json(runs);
  } catch (error) {
    console.error("Error in /api/run:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/run-batch", async (req, res) => {
  try {
    const body: RunBatchRequest = req.body;
    const { queries, agents } = body;

    if (
      !queries ||
      !Array.isArray(queries) ||
      !agents ||
      !Array.isArray(agents)
    ) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const allRuns: AgentRun[] = [];

    for (const query of queries) {
      for (const agentSpec of agents) {
        const startTime = Date.now();

        if (!hasApiKey(agentSpec.agent)) {
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
              query.provider_id || null
            )
          );
          continue;
        }

        try {
          const adapter = getAdapter(agentSpec.agent);

          // Get provider slice for this query
          const providerSlice = getProviderSlice(
            query.provider_id,
            allProviders
          );
          const formattedProviders = providerSlice.map(formatProviderForPrompt);
          const candidateProviderIds = providerSlice.map((p) => p.provider_id);

          const prompt = `You are a healthcare directory assistant. Answer the following query about finding a healthcare provider.

Query: ${query.query_text}

Available providers:
${JSON.stringify(formattedProviders, null, 2)}

Return ONLY valid JSON matching this exact schema:
{
  "provider_id": "string or null",
  "found": boolean,
  "extracted_attributes": { "attribute_id": value },
  "competitor_mentions": ["string"],
  "confidence": number between 0 and 1 or null,
  "notes": "string or null"
}

Instructions:
- Select the best provider_id from the provided list, or null if no provider matches
- Set found=false if no provider matches the query
- Populate extracted_attributes only for attributes that are explicitly supported by the provider data provided (location, specialties, languages, accepting_new_patients, telehealth_available, insurance_accepted)
- Never invent insurance, language, hospital, or other attributes not in the provider data
- List any competitor brands or tools mentioned in competitor_mentions
- Provide confidence score if available, otherwise null
- Add any relevant notes in the notes field

Return JSON only, no other text.`;

          console.log(`[${agentSpec.agent}] Query: ${query.query_text}`);
          console.log(`[${agentSpec.agent}] Model: ${agentSpec.model}`);

          const result = await adapter({
            prompt,
            model: agentSpec.model,
          });

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
                candidate_provider_ids: candidateProviderIds,
              },
              query.provider_id || null
            )
          );
        } catch (error) {
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
              query.provider_id || null
            )
          );
        }
      }
    }

    res.json(allRuns);
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
