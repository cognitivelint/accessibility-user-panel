import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { slug } from "../util/ids.js";

/** Artifact writer used during a panel run. Also exported as src/evidence-store.ts. */
export class EvidenceStore {
  readonly root: string;
  readonly runId: string;

  constructor(evidenceDir: string, runId: string) {
    this.runId = runId;
    this.root = resolve(evidenceDir, runId);
    mkdirSync(this.root, { recursive: true });
  }

  path(...segments: string[]): string {
    return join(this.root, ...segments.map(slug));
  }

  write(relativePath: string, contents: string | Buffer): string {
    const full = join(this.root, relativePath);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, contents);
    return relative(process.cwd(), full);
  }

  json(relativePath: string, value: unknown): string {
    return this.write(relativePath, `${JSON.stringify(value, null, 2)}\n`);
  }

  text(relativePath: string, value: string): string {
    return this.write(relativePath, value.endsWith("\n") ? value : `${value}\n`);
  }
}
