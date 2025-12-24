/**
 * Parse JSONL (JSON Lines) format - one JSON object per line
 */
export function parseJsonl<T = any>(text: string): T[] {
  const lines = text.trim().split('\n');
  const results: T[] = [];
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        results.push(JSON.parse(line));
      } catch (error) {
        console.warn('Failed to parse JSONL line:', line, error);
      }
    }
  }
  
  return results;
}

/**
 * Convert array of objects to JSONL format
 */
export function toJsonl<T extends Record<string, any>>(records: T[]): string {
  return records.map(record => JSON.stringify(record)).join('\n');
}

