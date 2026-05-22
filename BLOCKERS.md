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

## Drift log — informational entries (do NOT trigger halt rules)

This section captures protocol drift detected by post-hoc audit — cases
where the loop completed work but elided a spec step. Entries here are
historical record only; they have no marker and are ignored by A-rule /
C-rule / `[!]` auto-promotion logic. The corresponding spec / hook fix
that prevents recurrence is linked in each entry.

### [drift-2026-05-22a] Escalation-tier tasks ran on default tier without acknowledgment

**Detected at:** 2026-05-22T15:30:00Z (post-hoc audit)
**Tasks affected:** T-41 (commit `d93bd43`), T-46b (commit `fe49d83`)
**Driver tier at commit time:** Cursor Composer (default, auto-routed)
**Expected per spec:** `next-task.md` §"Self-reporting in STATUS.md" — escalation-list tasks running on default tier should emit a `⚠ Tier-mismatch advisory:` line under STATUS.md's "What needs your attention" section. The advisory is informational (does NOT halt the loop), so the work was free to proceed; it just had to be visibly flagged.
**What actually happened:** STATUS.md after each commit shows `**Running on:** Cursor Composer (effort unknown)` with no advisory line. The spec rule was elided silently — same failure mode as the v1 STATUS.md skip, applied to a different spec step.
**Impact:** Low. The work itself (T-41 document ingestion, T-46b runtime watchdog) passed gates, has tests, and on spot-review the watchdog correctly implements ADR-0001's intent. But the human had no visible signal to switch to escalation tier for the security-sensitive T-46b before committing. The cost of a subtle watchdog bug landing without escalation-tier review is paid later, not now.
**Fix landed:** `scripts/verify-commit-msg.sh` (commit-msg hook installed alongside pre-commit) + `scripts/escalation-list.txt` + `next-task.md` step 6 update. Future commits on escalation-list tasks REQUIRE a `Tier: <model>` line in the commit body, AND a `Tier-mismatch acknowledged: <reason>` line if the tier isn't an escalation tier. Hook-level enforcement so the discipline isn't elidable by the next driver.
**Resolved:** 2026-05-22T15:30:00Z — future occurrences impossible without explicit acknowledgment in the commit body.

### [drift-2026-05-22b] Multi-task commit (Q2 violation)

**Detected at:** 2026-05-22T15:30:00Z (post-hoc audit)
**Commit affected:** `fe49d83` "T-42..T-46b: setup pipeline stages 2–4, lint, render watchdog"
**Tasks bundled:** T-42, T-43, T-44, T-45, T-46, T-46b (six tasks, 1,716 insertions)
**Expected per spec:** Q2 decision (encoded in `next-task.md` step 6) — "one commit per task" so each task is independently bisect-able, cherry-pick-able, and reviewable.
**What actually happened:** Driver judged the M1d setup pipeline tightly enough coupled that splitting felt artificial, bundled all six tasks' diffs into one commit. The commit body justifies what the code does but never explains why bundling was necessary.
**Impact:** Medium. Code quality is high (spot-checked watchdog, lint runner — both implement their spec contracts), gates pass, tests cover the new surface. But `git bisect` can't pin a regression to T-43 vs T-46b; cherry-picking T-46b alone requires `git revert` gymnastics; per-task code review is impossible without manual diff slicing.
**Fix landed:** `scripts/verify-task-commit.sh` Assertion 5 — rejects any commit with more than one `[ ]→[x]` (or `[~]→[x]`) marker transition. Cold-recovery / failure-marking / skip transitions are exempt (they each produce one transition per fire by construction).
**Resolved:** 2026-05-22T15:30:00Z — future multi-task commits will be rejected at the pre-commit stage. The fe49d83 commit itself stays as-is; only future occurrences are prevented.
