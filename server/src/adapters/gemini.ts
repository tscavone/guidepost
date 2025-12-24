import { Adapter, AdapterResponse } from './types';

/**
 * Gemini adapter using REST generateContent endpoint
 * Endpoint: POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 */
export const geminiAdapter: Adapter = async ({ prompt, model }): Promise<AdapterResponse> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt,
          }],
        }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 429 || response.status >= 500) {
      // Retry once on rate limit or server error
      await new Promise(resolve => setTimeout(resolve, 1000));
      const retryResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt,
            }],
          }],
        }),
      });

      if (!retryResponse.ok) {
        const errorText = await retryResponse.text();
        throw new Error(`Gemini API error: ${retryResponse.status} ${errorText}`);
      }

      const retryData = await retryResponse.json();
      return {
        output_text: extractOutputText(retryData),
        raw: retryData,
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return {
      output_text: extractOutputText(data),
      raw: data,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Gemini API request timed out after 15 seconds');
    }
    throw error;
  }
};

function extractOutputText(data: any): string {
  // Extract text from Gemini generateContent response
  if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
    const candidate = data.candidates[0];
    if (candidate.content && candidate.content.parts && Array.isArray(candidate.content.parts)) {
      const textParts = candidate.content.parts
        .filter((part: any) => part.text)
        .map((part: any) => part.text);
      if (textParts.length > 0) {
        return textParts.join('\n');
      }
    }
  }
  return JSON.stringify(data);
}

