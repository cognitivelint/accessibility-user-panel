export const PERSONA_VOICE = {
  john: {
    name: "John",
    how: "moves with the Tab key only — no mouse, no trackpad",
  },
  deep: {
    name: "Deep",
    how: "understands the page from what it announces, not from how it looks",
  },
  sapna: {
    name: "Sapna",
    how: "needs a calm path: one clear next step, instructions that stay put, and a way back from mistakes",
  },
  asha: {
    name: "Asha",
    how: "records what a checker can prove, then we translate that proof into a person's experience",
  },
} as const;

export function humanSeverity(severity: "critical" | "high" | "medium" | "low"): string {
  switch (severity) {
    case "critical":
      return "This stopped the task";
    case "high":
      return "This made the task unreliable";
    case "medium":
      return "This made the task harder than it needed to be";
    case "low":
      return "A small friction worth noticing";
  }
}
