import type { AgentId, Category, Severity } from "../schema/finding.js";
import type { HumaneTranslation } from "./axe-stories.js";
import type { JsxA11yHit } from "../skills/jsx-a11y.js";

export interface JsxA11yStory extends HumaneTranslation {
  category: Category;
  severity: Severity;
}

type Lens = Extract<AgentId, "john" | "deep" | "sapna">;

function at(hit: JsxA11yHit): string {
  const loc = hit.line > 0 ? `${hit.file}:${hit.line}` : hit.file;
  return loc || "this component";
}

const JOHN = new Set([
  "click-events-have-key-events",
  "mouse-events-have-key-events",
  "interactive-supports-focus",
  "no-static-element-interactions",
  "no-noninteractive-element-interactions",
  "no-noninteractive-tabindex",
  "tabindex-no-positive",
  "no-access-key",
  "aria-activedescendant-has-tabindex",
  "no-aria-hidden-on-focusable",
  "no-autofocus",
]);

const DEEP = new Set([
  "alt-text",
  "anchor-has-content",
  "anchor-ambiguous-text",
  "aria-activedescendant-has-tabindex",
  "aria-props",
  "aria-proptypes",
  "aria-role",
  "aria-unsupported-elements",
  "control-has-associated-label",
  "heading-has-content",
  "html-has-lang",
  "iframe-has-title",
  "img-redundant-alt",
  "label-has-associated-control",
  "lang",
  "media-has-caption",
  "no-aria-hidden-on-focusable",
  "no-interactive-element-to-noninteractive-role",
  "no-noninteractive-element-to-interactive-role",
  "no-redundant-roles",
  "prefer-tag-over-role",
  "role-has-required-aria-props",
  "role-supports-aria-props",
  "scope",
]);

const SAPNA = new Set([
  "autocomplete-valid",
  "no-autofocus",
  "no-distracting-elements",
  "anchor-ambiguous-text",
  "media-has-caption",
  "label-has-associated-control",
  "no-onchange",
]);

export function jsxA11yLenses(ruleId: string): Lens[] {
  const lenses: Lens[] = [];
  if (JOHN.has(ruleId)) {
    lenses.push("john");
  }
  if (DEEP.has(ruleId)) {
    lenses.push("deep");
  }
  if (SAPNA.has(ruleId)) {
    lenses.push("sapna");
  }
  return lenses;
}

function bump(hit: JsxA11yHit, floor: Severity): Severity {
  if (hit.severity === 2 && floor === "low") {
    return "medium";
  }
  if (hit.severity === 2 && floor === "medium") {
    return "high";
  }
  return floor;
}

const STORIES: Partial<Record<string, Partial<Record<Lens, (hit: JsxA11yHit) => JsxA11yStory>>>> = {
  "click-events-have-key-events": {
    john: (hit) => ({
      category: "keyboard",
      severity: bump(hit, "high"),
      finding: "A control only listens for a click",
      livedMoment: `John never reaches the action at ${at(hit)}. The source wires a click and not a key. From the keyboard the control is not there.`,
      impact: "Anyone who cannot use a pointer is locked out of this step.",
      recommendation: "Use a real button or add a keyboard handler (Enter/Space) and make it focusable.",
      habit: "onclick without a key path is a closed door.",
    }),
  },
  "mouse-events-have-key-events": {
    john: (hit) => ({
      category: "keyboard",
      severity: bump(hit, "high"),
      finding: "Hover and mouse handlers have no keyboard twin",
      livedMoment: `At ${at(hit)} the UI reacts to a mouse move or down. John has no matching key. The extra state never appears for him.`,
      impact: "Keyboard users miss menus, tooltips, or drag affordances.",
      recommendation: "Pair mouse handlers with keyboard equivalents, or use a component that already has them.",
      habit: "If the mouse reveals it, the keyboard must reveal it too.",
    }),
  },
  "interactive-supports-focus": {
    john: (hit) => ({
      category: "keyboard",
      severity: bump(hit, "high"),
      finding: "Something clickable cannot take focus",
      livedMoment: `John tabs past ${at(hit)}. The source says it is interactive, but it is not in the tab order.`,
      impact: "The journey cannot reach this control from the keyboard.",
      recommendation: "Use a native control, or give the element a role and tabindex that match the action.",
      habit: "If it does a job, it must be a stop on the Tab path.",
    }),
  },
  "no-static-element-interactions": {
    john: (hit) => ({
      category: "keyboard",
      severity: bump(hit, "critical"),
      finding: "A static element is pretending to be a control",
      livedMoment: `A div or span at ${at(hit)} handles interaction. John tabs the page and never lands on it.`,
      impact: "The step exists only for a pointer.",
      recommendation: "Replace it with <button> or <a href>. Do not hang onClick on a div.",
      habit: "If it does something, it is a button.",
    }),
  },
  "no-noninteractive-tabindex": {
    john: (hit) => ({
      category: "keyboard",
      severity: bump(hit, "medium"),
      finding: "Tab stops on something that is not a control",
      livedMoment: `John’s focus lands on ${at(hit)} — a non-interactive node with a tabindex. He thinks he can activate it. He cannot.`,
      impact: "Extra stops slow him down and teach the wrong model of the page.",
      recommendation: "Remove tabindex from non-interactive elements. Use tabindex=\"-1\" only when you must move focus in script.",
      habit: "Tab order is for things people can use, not for layout.",
    }),
  },
  "tabindex-no-positive": {
    john: (hit) => ({
      category: "keyboard",
      severity: bump(hit, "medium"),
      finding: "Positive tabindex hijacks John’s path",
      livedMoment: `Focus jumps out of document order because ${at(hit)} uses a positive tabindex. John loses the map of the page.`,
      impact: "People skip fields or land somewhere they did not expect.",
      recommendation: "Use tabindex=\"0\" or \"-1\" only. Never 1, 2, 3.",
      habit: "Do not invent a second tab order. Source order is the order.",
    }),
  },
  "alt-text": {
    deep: (hit) => ({
      category: "screen-reader",
      severity: bump(hit, "medium"),
      finding: "An image in source never introduces itself",
      livedMoment: `Deep will hear “image” and then silence for ${at(hit)}. If the picture carries meaning, it never arrives.`,
      impact: "Visual meaning is missing for anyone who does not see the file.",
      recommendation: "Write short alt that carries the meaning, or alt=\"\" if it is decorative.",
      habit: "If you would mention the picture in a standup, it needs alt text.",
    }),
  },
  "label-has-associated-control": {
    deep: (hit) => ({
      category: "screen-reader",
      severity: bump(hit, "high"),
      finding: "A label is not tied to its field",
      livedMoment: `At ${at(hit)} the caption sits next to a box in source, but it is not connected. Deep hears an unnamed field.`,
      impact: "Forms that look obvious become a blank quiz when you can only listen.",
      recommendation: "Tie a visible <label> with htmlFor/id, or wrap the input.",
      habit: "A field without a wired label is a question you covered with your hand.",
    }),
    sapna: (hit) => ({
      category: "cognitive",
      severity: bump(hit, "medium"),
      finding: "The field’s instructions are not attached",
      livedMoment: `Sapna has to remember what ${at(hit)} wanted. The label is nearby in the file, not bound to the control, so the hint does not travel with focus.`,
      impact: "Memory load goes up in the middle of a form.",
      recommendation: "Associate the label with the control so the name stays with the field.",
      habit: "Labels live with the field, not as nearby decoration.",
    }),
  },
  "control-has-associated-label": {
    deep: (hit) => ({
      category: "screen-reader",
      severity: bump(hit, "high"),
      finding: "A control in source has no accessible name",
      livedMoment: `Deep reaches the control from ${at(hit)} and hears only its role. No name, no purpose.`,
      impact: "People guess, skip, or activate the wrong thing.",
      recommendation: "Give visible text or a short accessible name that matches the action.",
      habit: "Read every control out loud. If you only say ‘button’, it is not finished.",
    }),
  },
  "heading-has-content": {
    deep: (hit) => ({
      category: "screen-reader",
      severity: bump(hit, "medium"),
      finding: "A heading is empty in source",
      livedMoment: `Deep’s heading list includes a blank stop from ${at(hit)}. The outline has a hole.`,
      impact: "Heading navigation stops being a table of contents.",
      recommendation: "Put the section name in the heading, and style size with CSS.",
      habit: "Empty headings are signs with the letters peeled off.",
    }),
  },
  "html-has-lang": {
    deep: (hit) => ({
      category: "screen-reader",
      severity: bump(hit, "medium"),
      finding: "The document never states its language",
      livedMoment: `The root at ${at(hit)} has no lang. A synthesizer may pronounce the whole journey in the wrong voice.`,
      impact: "Every word is harder to understand.",
      recommendation: "Set lang on <html> to the UI language.",
      habit: "lang on <html> is like charset: always there.",
    }),
  },
  "iframe-has-title": {
    deep: (hit) => ({
      category: "screen-reader",
      severity: bump(hit, "medium"),
      finding: "An iframe never says what it is",
      livedMoment: `Deep hits a frame from ${at(hit)} with no title. It is a room with no sign.`,
      impact: "Embedded tools and payments become unnamed detours.",
      recommendation: "Give the iframe a title that names the job (for example “Payment form”).",
      habit: "Every frame is a scene. Title the scene.",
    }),
  },
  "anchor-ambiguous-text": {
    deep: (hit) => ({
      category: "screen-reader",
      severity: bump(hit, "low"),
      finding: "A link does not say where it goes",
      livedMoment: `Deep hears “click here” or “learn more” from ${at(hit)} with no destination in the name.`,
      impact: "Link purpose is guesswork in the links list.",
      recommendation: "Name the destination in the link text.",
      habit: "Write link text as if the rest of the page had disappeared.",
    }),
    sapna: (hit) => ({
      category: "cognitive",
      severity: bump(hit, "low"),
      finding: "The next step is a shrug",
      livedMoment: `Labels like “click here” at ${at(hit)} ask Sapna to already know the outcome.`,
      impact: "People hesitate or learn by making mistakes.",
      recommendation: "Name the outcome in the control (“Pay $42”, “Open invoice”).",
      habit: "Button and link copy is a contract.",
    }),
  },
  "no-autofocus": {
    sapna: (hit) => ({
      category: "cognitive",
      severity: bump(hit, "medium"),
      finding: "Focus is stolen when the view loads",
      livedMoment: `autofocus at ${at(hit)} yanks Sapna into a field before she has read the screen. The map of the page never forms.`,
      impact: "Sudden focus moves raise anxiety and skip context.",
      recommendation: "Do not autofocus on page load. Move focus only after a user action (for example opening a dialog).",
      habit: "Let people arrive before you grab them.",
    }),
    john: (hit) => ({
      category: "keyboard",
      severity: bump(hit, "low"),
      finding: "Focus starts in the middle of the page",
      livedMoment: `John lands inside ${at(hit)} instead of the start of the tab order. Skip links and headers are already behind him.`,
      impact: "He cannot build a model of the page from the top.",
      recommendation: "Remove autofocus except after an intentional open.",
      habit: "The first Tab should be a greeting, not a trap.",
    }),
  },
  "no-distracting-elements": {
    sapna: (hit) => ({
      category: "cognitive",
      severity: bump(hit, "medium"),
      finding: "The page keeps moving while she is trying to think",
      livedMoment: `A marquee or blink at ${at(hit)} will not sit still. Sapna’s attention is pulled off the task.`,
      impact: "Motion raises sensory load on forms and payments.",
      recommendation: "Remove <marquee> and <blink>. Pause auto-rotation; honour prefers-reduced-motion.",
      habit: "If someone is filling a form, the rest of the page should be quiet.",
    }),
  },
  "autocomplete-valid": {
    sapna: (hit) => ({
      category: "cognitive",
      severity: bump(hit, "low"),
      finding: "The browser cannot help fill this field",
      livedMoment: `autocomplete at ${at(hit)} is missing or nonsense. Sapna has to retype identity and payment details she has typed a hundred times.`,
      impact: "Memory and typing load go up on checkout and signup.",
      recommendation: "Use a valid autocomplete token (email, name, cc-number, …).",
      habit: "If the browser already knows it, let it say it.",
    }),
  },
  "media-has-caption": {
    deep: (hit) => ({
      category: "screen-reader",
      severity: bump(hit, "medium"),
      finding: "Media has no captions in source",
      livedMoment: `The media at ${at(hit)} ships without captions. Speech never becomes text.`,
      impact: "People who cannot hear the track miss the meaning.",
      recommendation: "Provide captions or a transcript.",
      habit: "If it speaks, it also writes.",
    }),
    sapna: (hit) => ({
      category: "cognitive",
      severity: bump(hit, "medium"),
      finding: "The video or audio has no text twin",
      livedMoment: `Sapna cannot pause the meaning into words at ${at(hit)}. There is no caption track to re-read.`,
      impact: "Fast speech and background sound become a wall.",
      recommendation: "Add captions so the message can be read at her pace.",
      habit: "Give people a way to read what they cannot catch in time.",
    }),
  },
};

function fallback(lens: Lens, hit: JsxA11yHit): JsxA11yStory {
  const category: Category = lens === "john" ? "keyboard" : lens === "deep" ? "screen-reader" : "cognitive";
  return {
    category,
    severity: bump(hit, "medium"),
    finding: "Static analysis found a source-level accessibility problem",
    livedMoment: `${lens === "john" ? "John" : lens === "deep" ? "Deep" : "Sapna"} will feel this on the journey. eslint-plugin-jsx-a11y flagged ${hit.pluginRule} at ${at(hit)}.`,
    impact: "The live page and the source disagree with what a person needs at this step.",
    recommendation: hit.message.endsWith(".") ? hit.message : `${hit.message}.`,
    habit: "Treat jsx-a11y as a letter from the source file. Confirm it on the live journey, then fix the moment — not only the rule id.",
  };
}

export function translateJsxA11y(lens: Lens, hit: JsxA11yHit): JsxA11yStory | null {
  if (!jsxA11yLenses(hit.ruleId).includes(lens)) {
    return null;
  }
  const writer = STORIES[hit.ruleId]?.[lens];
  if (writer) {
    return writer(hit);
  }
  return fallback(lens, hit);
}
