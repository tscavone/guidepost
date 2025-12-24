/**
 * Placeholder scoring functions for agent run evaluation
 */

export function calculateRelevanceScore(run: any): number {
  // Placeholder: return a mock score
  return Math.random() * 100;
}

export function calculateAccuracyScore(run: any): number {
  // Placeholder: return a mock score
  return Math.random() * 100;
}

export function calculateLatencyScore(latencyMs: number): number {
  // Lower latency = higher score (max 100ms = 100 points)
  return Math.max(0, 100 - latencyMs / 10);
}

