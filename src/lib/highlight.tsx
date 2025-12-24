import React from "react";
import { AgentAnswer } from "./types";

/**
 * Flatten agent answer into an array of searchable terms for highlighting
 */
export function flattenHighlightTerms(answer: AgentAnswer | null): string[] {
  if (!answer) return [];

  const terms: string[] = [];

  // Add provider_id if present
  if (answer.provider_id) {
    terms.push(answer.provider_id);
  }

  // Add extracted attributes
  if (answer.extracted_attributes) {
    Object.entries(answer.extracted_attributes).forEach(([key, value]) => {
      // Handle location object
      if (key === "location" && typeof value === "object" && value !== null) {
        const location = value as { city?: string; state?: string };
        if (location.city) terms.push(location.city);
        if (location.state) terms.push(location.state);
      }
      // Handle arrays (specialties, languages, insurance_accepted, etc.)
      else if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === "string") {
            terms.push(item);
          }
        });
      }
      // Handle strings
      else if (typeof value === "string") {
        terms.push(value);
      }
      // Exclude booleans and numbers
    });
  }

  // Add competitor mentions
  if (answer.competitor_mentions && Array.isArray(answer.competitor_mentions)) {
    answer.competitor_mentions.forEach((mention) => {
      if (typeof mention === "string") {
        terms.push(mention);
      }
    });
  }

  return terms;
}

/**
 * Highlight matching terms in text, returning React nodes
 */
export function highlightText(
  text: string,
  terms: string[]
): React.ReactNode {
  if (!text || terms.length === 0) {
    return text;
  }

  // Escape special regex characters and create case-insensitive pattern
  const escapedTerms = terms
    .filter((term) => term && term.trim().length > 0)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (escapedTerms.length === 0) {
    return text;
  }

  const pattern = new RegExp(`(${escapedTerms.join("|")})`, "gi");
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    // Add highlighted match
    parts.push(
      <mark
        key={match.index}
        style={{
          backgroundColor: "#ffeb3b",
          padding: "2px 0",
          borderRadius: "2px",
        }}
      >
        {match[0]}
      </mark>
    );

    lastIndex = pattern.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

