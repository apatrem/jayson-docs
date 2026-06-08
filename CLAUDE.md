# CLAUDE.md

Read **AGENTS.md** first — it is the source of truth for this repo (workflow, hard rules, the gate, DoD). This file only adds Claude Code operating notes.

- Work in your own worktree on an ephemeral `agent/claude/<task>` branch. **Never commit to `main`** (it is protected — PR + green CI required).
- Before finishing, run the gate: `npm run build && npm run lint && npm run test && npm run validate`. A clean merge is not proof; the gate is.
- Smallest correct change; keep diffs small (< 300 lines routine). No new dependencies without asking.
- Reject invalid fill-plans with a clear error — never auto-"fix" them (`ERROR_HANDLING.md`).
- When unsure, stop and ask (AGENTS.md §7).
