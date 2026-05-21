# Blockers — append-only audit log

This file records every `[?]` and `[!]` marker created by `/next-task`, with enough context for the human to resolve each one in the morning-check ritual.

## How this file works

- **Append-only.** `/next-task` adds new entries when a task is marked `[?]` or `[!]`. Existing entries are never rewritten.
- **The agent does NOT delete entries.** When you resolve a blocker:
  1. Fix the root cause (edit the task spec, fix the code, supply the external dep).
  2. Edit `docs/TASKS.md` to change the marker back to `[ ]` (the loop will pick the task up on the next fire).
  3. Append a `**Resolved:**` line to the BLOCKERS.md entry indicating how + when you fixed it.
  4. Optionally delete the resolved entry once you're confident it won't recur.

## Auto-promotion rule (γ semantics)

When a task is marked `[!]` (waiting on external dep), its BLOCKERS.md entry includes a `**Fires unresolved:**` counter. Every subsequent loop fire that re-checks the entry increments the counter. When it reaches **3**, the agent auto-promotes the marker from `[!]` to `[?]` (treating it as a real blocker that needs human action, not just patience).

Example timeline:
- Fire #1 at 09:00 — task marked `[!]`, counter = 0
- Fire #2 at 09:45 — counter incremented to 1
- Fire #3 at 10:30 — counter incremented to 2
- Fire #4 at 11:15 — counter would go to 3 → auto-promoted to `[?]`, TASKS.md marker updated, this entry's marker line updated.

This ensures external blockers don't silently rot for days.

---

(no entries yet — this section will populate as the loop runs)
