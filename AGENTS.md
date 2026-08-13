# Agents (Cursor / Claude)

AUP uses **inbuilt** Cursor and Claude models (`model: inherit`). It does not ship an LLM client.

| File | Role |
| --- | --- |
| `.cursor/rules/aup-token-packet.mdc` | Always-on: packet only, no DOM |
| `.cursor/agents/aup-panel.md` | Cursor agent |
| `.claude/agents/aup-panel.md` | Claude Code agent |
| `CLAUDE.md` | Claude project instructions |
| `agents/*.agent.md` | Persona contracts (John, Deep, Sapna, Asha) |
| `skills/token-packet/SKILL.md` | How the packet is produced |

The model never sees the full axe payload or HTML. Proof in the packet looks like `axe:label` or a short selector.
