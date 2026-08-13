export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, extra?: Record<string, unknown>): void;
  info(message: string, extra?: Record<string, unknown>): void;
  warn(message: string, extra?: Record<string, unknown>): void;
  error(message: string, extra?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function emit(level: LogLevel, min: LogLevel, bindings: Record<string, unknown>, message: string, extra?: Record<string, unknown>): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[min]) {
    return;
  }
  const record = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...bindings,
    ...extra,
  };
  const line = `${JSON.stringify(record)}\n`;
  if (level === "error") {
    process.stderr.write(line);
  } else {
    process.stdout.write(line);
  }
}

export function createLogger(level: LogLevel = "info", bindings: Record<string, unknown> = {}): Logger {
  return {
    debug: (message, extra) => emit("debug", level, bindings, message, extra),
    info: (message, extra) => emit("info", level, bindings, message, extra),
    warn: (message, extra) => emit("warn", level, bindings, message, extra),
    error: (message, extra) => emit("error", level, bindings, message, extra),
    child: (childBindings) => createLogger(level, { ...bindings, ...childBindings }),
  };
}
