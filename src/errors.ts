export class AupError extends Error {
  readonly code: string;

  constructor(code: string, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "AupError";
    this.code = code;
  }
}

export class ConfigError extends AupError {
  constructor(message: string, cause?: unknown) {
    super("CONFIG", message, cause);
    this.name = "ConfigError";
  }
}

export class BrowserError extends AupError {
  constructor(message: string, cause?: unknown) {
    super("BROWSER", message, cause);
    this.name = "BrowserError";
  }
}

export class JourneyError extends AupError {
  constructor(message: string, cause?: unknown) {
    super("JOURNEY", message, cause);
    this.name = "JourneyError";
  }
}
