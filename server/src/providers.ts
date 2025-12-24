import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { ProviderRecord } from "./types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let providersCache: ProviderRecord[] | null = null;

export function loadProviders(): ProviderRecord[] {
  if (providersCache) {
    return providersCache;
  }

  try {
    // Try multiple possible paths
    const possiblePaths = [
      join(process.cwd(), "..", "public", "data", "providers.jsonl"),
      join(process.cwd(), "public", "data", "providers.jsonl"),
      join(__dirname, "..", "..", "..", "public", "data", "providers.jsonl"),
      join(dirname(process.cwd()), "public", "data", "providers.jsonl"),
    ];

    let content = "";
    for (const path of possiblePaths) {
      try {
        content = readFileSync(path, "utf-8");
        break;
      } catch {
        continue;
      }
    }

    if (!content) {
      throw new Error(
        "Could not find providers.jsonl in any expected location"
      );
    }
    const lines = content.trim().split("\n");

    providersCache = lines
      .filter((line) => line.trim())
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((p): p is ProviderRecord => p !== null);

    return providersCache;
  } catch (error) {
    console.error("Failed to load providers:", error);
    return [];
  }
}

export function getProviderSlice(
  queryProviderId: string | undefined,
  allProviders: ProviderRecord[]
): ProviderRecord[] {
  const slice: ProviderRecord[] = [];
  const usedIds = new Set<string>();

  // First, try to include the query's provider if it exists
  if (queryProviderId) {
    const queryProvider = allProviders.find(
      (p) => p.provider_id === queryProviderId
    );
    if (queryProvider) {
      slice.push(queryProvider);
      usedIds.add(queryProvider.provider_id);
    }
  }

  // Add random providers until we have 10 total
  const remaining = allProviders.filter((p) => !usedIds.has(p.provider_id));
  const shuffled = [...remaining].sort(() => Math.random() - 0.5);

  while (slice.length < 10 && shuffled.length > 0) {
    slice.push(shuffled.pop()!);
  }

  return slice;
}

export function formatProviderForPrompt(provider: ProviderRecord): any {
  return {
    provider_id: provider.provider_id,
    first: provider.first,
    last: provider.last,
    attributes: {
      location: provider.attributes.location,
      specialties: provider.attributes.specialties,
      languages: provider.attributes.languages,
      accepting_new_patients: provider.attributes.accepting_new_patients,
      telehealth_available: provider.attributes.telehealth_available,
      insurance_accepted: provider.attributes.insurance_accepted,
    },
  };
}
