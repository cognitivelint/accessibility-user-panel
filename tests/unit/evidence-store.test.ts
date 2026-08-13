import { describe, expect, it } from "vitest";
import { EvidenceStore as FromCompat } from "../../src/evidence-store.js";
import { EvidenceStore as FromFolder } from "../../src/evidence/store.js";

describe("evidence store module paths", () => {
  it("exports the same class from both import paths", () => {
    expect(FromCompat).toBe(FromFolder);
  });
});
