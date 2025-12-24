import { Adapter, AdapterResponse } from './types';

/**
 * OpenAI adapter using the Responses API
 * Reference: OpenAI Responses API documentation
 * Endpoint: POST https://api.openai.com/v1/responses
 */
export const openaiAdapter: Adapter = async ({ prompt, model }): Promise<AdapterResponse> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: prompt,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 429 || response.status >= 500) {
      // Retry once on rate limit or server error
      await new Promise(resolve => setTimeout(resolve, 1000));
      const retryResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: prompt,
        }),
      });

      if (!retryResponse.ok) {
        const errorText = await retryResponse.text();
        throw new Error(`OpenAI API error: ${retryResponse.status} ${errorText}`);
      }

      const retryData = await retryResponse.json();
      return {
        output_text: extractOutputText(retryData),
        raw: retryData,
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return {
      output_text: extractOutputText(data),
      raw: data,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('OpenAI API request timed out after 15 seconds');
    }
    throw error;
  }
};

function extractOutputText(data: any): string {
  // Extract assistant text from OpenAI Responses API response structure
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
    if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
      return data.choices[0].text || data.choices[0].message?.content || "";
    }
    
    // If no text found, return empty string (parsing will handle the error)
    return "";
  } catch {
    return "";
  }
}

