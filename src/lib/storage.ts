/**
 * Storage utilities using localStorage as a fallback
 * since browsers cannot write to disk directly
 */

const QUERIES_KEY = 'guidepost.queries';
const RUNS_KEY = 'guidepost.runs';

export function saveQueries(queries: any[]): void {
  try {
    localStorage.setItem(QUERIES_KEY, JSON.stringify(queries));
  } catch (error) {
    console.error('Failed to save queries to localStorage:', error);
  }
}

export function loadQueries(): any[] {
  try {
    const data = localStorage.getItem(QUERIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load queries from localStorage:', error);
    return [];
  }
}

export function saveRuns(runs: any[]): void {
  try {
    localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
  } catch (error) {
    console.error('Failed to save runs to localStorage:', error);
  }
}

export function loadRuns(): any[] {
  try {
    const data = localStorage.getItem(RUNS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load runs from localStorage:', error);
    return [];
  }
}

export function clearQueries(): void {
  localStorage.removeItem(QUERIES_KEY);
}

export function clearRuns(): void {
  localStorage.removeItem(RUNS_KEY);
}

