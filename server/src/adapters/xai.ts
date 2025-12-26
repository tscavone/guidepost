import { Adapter, AdapterResponse } from "./types";
// @ts-ignore - undici types may not be fully recognized by TypeScript
import { fetch, Agent } from "undici";

/**
 * xAI adapter - OpenAI REST compatible
 * Endpoint: POST https://api.x.ai/v1/responses
 * Note: xAI docs mention that "instructions" parameter may be unsupported;
 * we only send input, not instructions
 *
 * DEMO-ONLY: Uses a custom HTTPS agent with rejectUnauthorized: false to work around
 * Windows CRYPT_E_NO_REVOCATION_CHECK errors. This disables TLS certificate
 * revocation checks and should NOT be used in production environments.
 */
// Create a custom HTTPS agent that disables certificate revocation checks
// This is a demo-only workaround for Windows TLS revocation issues
const httpsAgent = new Agent({
  connect: {
    rejectUnauthorized: false,
  },
});

export const xaiAdapter: Adapter = async ({
  prompt,
  model,
}): Promise<AdapterResponse> => {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("XAI_API_KEY environment variable is not set");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch("https://api.x.ai/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: prompt,
      }),
      signal: controller.signal,
      dispatcher: httpsAgent,
    });

    clearTimeout(timeoutId);

    if (response.status === 429 || response.status >= 500) {
      // Retry once on rate limit or server error
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const retryResponse = await fetch("https://api.x.ai/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: prompt,
        }),
        dispatcher: httpsAgent,
      });

      if (!retryResponse.ok) {
        const errorText = await retryResponse.text();
        throw new Error(`xAI API error: ${retryResponse.status} ${errorText}`);
      }

      const retryData = await retryResponse.json();
      return {
        output_text: extractOutputText(retryData),
        raw: retryData,
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`xAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return {
      output_text: extractOutputText(data),
      raw: data,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("xAI API request timed out after 60 seconds");
    }
    throw error;
  }
};

function extractOutputText(data: any): string {
  // Extract assistant text from xAI/Grok Responses API response structure
  // Structure: response.output[0].content[0].text
  try {
    if (
      data.output &&
      Array.isArray(data.output) &&
      data.output.length > 0 &&
      data.output[0].content &&
      Array.isArray(data.output[0].content) &&
      data.output[0].content.length > 0 &&
      data.output[0].content[0].text &&
      typeof data.output[0].content[0].text === "string"
    ) {
      return data.output[0].content[0].text;
    }

    // Fallback to other possible structures
    if (data.output && typeof data.output === "string") {
      return data.output;
    }
    if (data.text && typeof data.text === "string") {
      return data.text;
    }
    if (
      data.choices &&
      Array.isArray(data.choices) &&
      data.choices.length > 0
    ) {
      return data.choices[0].text || data.choices[0].message?.content || "";
    }

    // If no text found, return empty string (parsing will handle the error)
    return "";
  } catch {
    return "";
  }
}
