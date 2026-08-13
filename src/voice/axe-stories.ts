export interface HumaneTranslation {
  finding: string;
  livedMoment: string;
  impact: string;
  recommendation: string;
  habit: string;
}

interface AxeContext {
  nodeCount: number;
  html?: string;
  target?: string;
  step: string;
}

function snippet(html: string | undefined): string {
  if (!html) {
    return "this control";
  }
  const compact = html.replace(/\s+/g, " ").trim();
  return compact.length > 90 ? `${compact.slice(0, 87)}…` : compact;
}

const RULES: Record<string, (ctx: AxeContext) => HumaneTranslation> = {
  "button-name": (ctx) => ({
    finding: "A button never says what it does",
    livedMoment: `Deep lands on a control and hears only “button”. There is no name — not Close, not Pay, not Menu. At “${ctx.step}” he has to guess, or skip it and hope nothing important was behind that silence.`,
    impact: "Someone who cannot see the icon has no way to know whether this control helps, cancels, or submits.",
    recommendation: "Give the button visible text, or a short accessible name that matches its purpose (for example “Close payment dialog”). Prefer visible text over an icon-only control.",
    habit: "If you ship a control, read it out loud. If you cannot say its name in three words, the page cannot either.",
  }),
  "link-name": (ctx) => ({
    finding: "A link never says where it goes",
    livedMoment: `Deep hears “link” with no destination. At “${ctx.step}” he cannot tell this apart from any other link on the page.`,
    impact: "Link purpose is guesswork, so people skip it or follow the wrong path.",
    recommendation: "Use link text that names the destination or action. Avoid “click here”. If the visible text is an icon, add a name that matches.",
    habit: "Write link text as if the rest of the page had disappeared. The words on the link should still make sense.",
  }),
  label: (ctx) => ({
    finding: "A form field never introduces itself",
    livedMoment: `Deep reaches a box and hears “edit” or “blank”. The placeholder, if any, is not a name he can trust. He does not know whether this is email, a card number, or something else — ${snippet(ctx.html)}.`,
    impact: "People who listen to the page cannot fill the form with confidence, even when the visual layout looks obvious.",
    recommendation: "Keep a visible <label> tied to the field with for/id (or wrap the field in the label). Placeholders are examples, not names.",
    habit: "Every input deserves a label that stays on screen. If you only remember one form habit, remember that one.",
  }),
  "image-alt": () => ({
    finding: "An image stays silent",
    livedMoment: "Deep hears “image” and nothing more. If the picture carries meaning — a product, a warning, a logo — that meaning never arrives.",
    impact: "Visual information is missing for anyone who cannot see the image.",
    recommendation: "Describe the meaning in a short alt text. If the image is decorative, use alt=\"\" so Deep can skip it.",
    habit: "When you drop in an <img>, ask: does this picture say something a teammate would need in Slack? If yes, write that in alt.",
  }),
  "color-contrast": () => ({
    finding: "The text fades into the page",
    livedMoment: "The copy is there, but it is faint. In bright light, on a tired screen, or with low vision, the instructions simply disappear.",
    impact: "People miss warnings, prices, or next steps that look ‘fine’ on a designer’s calibrated monitor.",
    recommendation: "Use stronger contrast between text and background (aim for WCAG AA). Do not rely on light grey on beige for anything someone must read to finish the task.",
    habit: "If you have to squint, someone else cannot read it at all. Check contrast before you ship the palette.",
  }),
  "landmark-one-main": () => ({
    finding: "There is no ‘main’ place to land",
    livedMoment: "Deep cannot jump to the heart of the page. He starts at the top and listens through chrome, banners, and extras to find the task.",
    impact: "Every visit costs extra time and attention, especially on pages with heavy navigation.",
    recommendation: "Wrap the primary content in <main>. One main landmark per page.",
    habit: "Think in regions: banner, navigation, main, content info. Semantics are a map, not decoration.",
  }),
  region: () => ({
    finding: "Parts of the page have no region",
    livedMoment: "Some content sits outside any landmark. Deep cannot skip or list it; it just appears in the middle of the stream.",
    impact: "The page feels like one long hallway instead of rooms you can enter on purpose.",
    recommendation: "Put content inside header, nav, main, aside, or footer — or give a named region if it is a distinct area.",
    habit: "Before you add a new slab of UI, decide which room of the page it belongs in.",
  }),
  "page-has-heading-one": () => ({
    finding: "The page never announces its title as a heading",
    livedMoment: "Deep pulls up the heading list to learn where he is. There is no h1, so the document has no front door.",
    impact: "Orientation fails. People who navigate by headings do not get a starting point.",
    recommendation: "Give the page one h1 that names the task (“Checkout”, “Create invoice”), then nest h2/h3 underneath.",
    habit: "Headings are the table of contents. Write them before you style them.",
  }),
  "heading-order": () => ({
    finding: "The heading outline skips a level",
    livedMoment: "Deep walks the outline and suddenly jumps from a title to a deep sub-section. The structure no longer matches the story of the page.",
    impact: "Heading navigation becomes a maze instead of a map.",
    recommendation: "Do not skip levels for visual size. Style headings with CSS; keep the outline honest (h1 → h2 → h3).",
    habit: "Never choose a heading level because of font size. Choose it because of outline.",
  }),
  "html-has-lang": () => ({
    finding: "The page does not say what language it is in",
    livedMoment: "A screen reader may pronounce the whole checkout in the wrong voice or cadence.",
    impact: "Every word is harder to understand when the synthesizer guesses the language.",
    recommendation: "Set <html lang=\"en\"> (or the actual language of the UI).",
    habit: "The first attribute on <html> is lang. Treat it like charset: always there.",
  }),
  "aria-dialog-name": () => ({
    finding: "The dialog never says its name",
    livedMoment: "A layer appears. Deep hears “dialog” and not “Confirm payment” or “Delete invoice”. He does not know which task he just entered.",
    impact: "Modal work becomes disorienting; people cancel out of fear of doing the wrong thing.",
    recommendation: "Name the dialog with aria-labelledby pointing at its visible title.",
    habit: "Every overlay needs a title, and that title must be the accessible name — not only a visual headline.",
  }),
  "nested-interactive": () => ({
    finding: "Two controls are nested inside each other",
    livedMoment: "John and Deep hit a control that behaves like two things at once. Tab stops and announcements fight each other.",
    impact: "Activation becomes unpredictable; people trigger the wrong action.",
    recommendation: "Do not put a button inside a link (or the reverse). One interactive job per element.",
    habit: "If it is clickable, it is one control. Nest layout, not interactivity.",
  }),
};

const FALLBACK = (ruleId: string, help: string, ctx: AxeContext): HumaneTranslation => ({
  finding: "Something on this screen is harder to perceive or operate than it looks",
  livedMoment: `Asha confirmed a real, repeatable problem (${help}) at “${ctx.step}”. That is not a trivia flag — it is a moment where a person can get stuck, miss meaning, or lose the next step.`,
  impact: `${ctx.nodeCount} place(s) on this screen carry this problem. Someone completing this journey will feel it even if the visual design looks finished.`,
  recommendation: help.endsWith(".") ? help : `${help}.`,
  habit: "When a checker speaks, translate it into a person: who gets stuck, and on which step? Then fix that moment — not only the rule ID.",
});

export function translateAxeRule(
  ruleId: string,
  help: string,
  ctx: AxeContext,
): HumaneTranslation {
  const writer = RULES[ruleId];
  if (writer) {
    return writer(ctx);
  }
  return FALLBACK(ruleId, help, ctx);
}
