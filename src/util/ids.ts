import { createHash } from "node:crypto";

export function stableId(...parts: Array<string | undefined | null>): string {
  const payload = parts.map((part) => (part ?? "").trim().toLowerCase()).join("|");
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
