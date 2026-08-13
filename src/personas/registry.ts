import type { AgentId } from "../schema/finding.js";
import { AshaAuditorAgent } from "./asha.js";
import { DeepScreenReaderAgent } from "./deep.js";
import { JohnKeyboardAgent } from "./john.js";
import { SapnaCognitiveAgent } from "./sapna.js";
import type { PersonaAgent } from "./types.js";

const AGENTS: Record<AgentId, PersonaAgent> = {
  john: new JohnKeyboardAgent(),
  deep: new DeepScreenReaderAgent(),
  sapna: new SapnaCognitiveAgent(),
  asha: new AshaAuditorAgent(),
};

export function resolveAgents(ids: AgentId[]): PersonaAgent[] {
  return ids.map((id) => {
    const agent = AGENTS[id];
    if (!agent) {
      throw new Error(`Unknown persona agent: ${id}`);
    }
    return agent;
  });
}
