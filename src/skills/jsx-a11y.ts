export interface JsxA11yHit {
  /** Rule id without the plugin prefix, e.g. `alt-text`. */
  ruleId: string;
  pluginRule: string;
  message: string;
  file: string;
  line: number;
  column: number;
  severity: 1 | 2;
}

export interface EslintJsonMessage {
  ruleId?: string | null;
  message?: string;
  line?: number;
  column?: number;
  severity?: number;
}

export interface EslintJsonFile {
  filePath?: string;
  messages?: EslintJsonMessage[];
}

const PLUGIN = "jsx-a11y/";

export function normalizeJsxA11yRule(ruleId: string): string {
  return ruleId.startsWith(PLUGIN) ? ruleId.slice(PLUGIN.length) : ruleId;
}

export function parseEslintJsxA11y(report: EslintJsonFile[], cwd?: string): JsxA11yHit[] {
  const hits: JsxA11yHit[] = [];
  for (const file of report) {
    const filePath = file.filePath ?? "";
    for (const message of file.messages ?? []) {
      if (!message.ruleId?.startsWith(PLUGIN)) {
        continue;
      }
      const relative =
        cwd && filePath.startsWith(cwd) ? filePath.slice(cwd.length).replace(/^[/\\]/, "") : filePath;
      hits.push({
        ruleId: normalizeJsxA11yRule(message.ruleId),
        pluginRule: message.ruleId,
        message: message.message ?? message.ruleId,
        file: relative || filePath,
        line: message.line ?? 0,
        column: message.column ?? 0,
        severity: message.severity === 2 ? 2 : 1,
      });
    }
  }
  return hits;
}

export function projectHasJsxA11y(cwd: string, readFile: (path: string) => string): boolean {
  try {
    const pkg = JSON.parse(readFile(`${cwd}/package.json`)) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const name = "eslint-plugin-jsx-a11y";
    return Boolean(pkg.dependencies?.[name] || pkg.devDependencies?.[name]);
  } catch {
    return false;
  }
}
