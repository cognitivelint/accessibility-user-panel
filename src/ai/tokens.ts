/** Cheap, stable estimate: ~4 characters per token. Good enough for budgets, not billing. */
export function estimateTokens(text: string): number {
  if (!text) {
    return 0;
  }
  return Math.ceil(text.length / 4);
}

export function clip(text: string, maxChars: number): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

export const DEFAULT_PACKET_TOKEN_BUDGET = 1800;
export const MAX_PACKET_MOMENTS = 10;
export const MAX_FELT_CHARS = 220;
export const MAX_TITLE_CHARS = 90;
export const MAX_HABIT_CHARS = 140;
