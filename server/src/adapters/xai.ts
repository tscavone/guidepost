import { Adapter, AdapterResponse } from './types';

/**
 * xAI adapter - OpenAI REST compatible
 * Endpoint: POST https://api.x.ai/v1/responses
 * Note: xAI docs mention that "instructions" parameter may be unsupported;
 * we only send input, not instructions
 */
export const xaiAdapter: Adapter = async ({ prompt, model }): Promise<AdapterResponse> => {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error('XAI_API_KEY environment variable is not set');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch('https://api.x.ai/v1/responses', {
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
      const retryResponse = await fetch('https://api.x.ai/v1/responses', {
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
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('xAI API request timed out after 15 seconds');
    }
    throw error;
  }
};

function extractOutputText(data: any): string {
  // xAI is OpenAI-compatible, so use similar extraction logic
  if (data.output && typeof data.output === 'string') {
    return data.output;
  }
  if (data.text && typeof data.text === 'string') {
    return data.text;
  }
  if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
    return data.choices[0].text || data.choices[0].message?.content || JSON.stringify(data);
  }
  return JSON.stringify(data);
}

