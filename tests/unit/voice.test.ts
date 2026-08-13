import { describe, expect, it } from "vitest";
import { translateAxeRule } from "../../src/voice/axe-stories.js";

describe("axe story translation", () => {
  it("never headlines a rule id or ‘aria-label missing’", () => {
    const story = translateAxeRule("button-name", "Buttons must have discernible text", {
      nodeCount: 1,
      html: "<button>×</button>",
      step: "payment dialog",
    });
    expect(story.finding.toLowerCase()).not.toContain("button-name");
    expect(story.finding.toLowerCase()).not.toContain("aria-label");
    expect(story.livedMoment).toContain("Deep");
    expect(story.habit.length).toBeGreaterThan(20);
  });

  it("turns a missing label into a person who cannot fill a field", () => {
    const story = translateAxeRule("label", "Form elements must have labels", {
      nodeCount: 2,
      html: '<input id="email" placeholder="Email">',
      step: "form",
    });
    expect(story.finding).toMatch(/field/i);
    expect(story.livedMoment).toContain("Deep");
    expect(story.habit).toMatch(/label/i);
  });
});
