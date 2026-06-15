# ADR 0011 — Minimalism review lens + `SHORTCUT(…)` markers (imported from Ponytail's philosophy)

**Status:** accepted

> Derives from **agentic-workflow ADR-0011**. Same decision, adapted to this repo's files (`AGENTS.md`,
> `ROLES.md`, the dual-review skill).

## Context

We evaluated [Ponytail](https://github.com/DietrichGebert/ponytail) — a popular (MIT) rule-pack that
pushes agents toward minimal code ("lazy senior developer": YAGNI → stdlib → platform → existing dep →
one-liner → minimal). We **did not adopt the plugin**: it ships session lifecycle hooks that inject
behaviour from *outside* the repo, which conflicts with ADR-0001 (rules live in `AGENTS.md`, committed
and verifiable, not in the harness), and most of its thesis already lives in our conventions (`ROLES.md`
"smallest diff", "no new dependencies", the small-PR ritual). But three of its ideas filled real gaps,
so we imported the *content*, not the tool.

The gap: in a workflow where a cheap implementer writes minimal diffs by default, **deliberate
corner-cutting is invisible** to the human merger — they can't tell "naive on purpose, here's the
ceiling" from "naive because the model didn't think." Our gate/tests/protected-paths defend the corners
that must *never* be cut; nothing made the *acceptable* corners legible.

## Decision

1. **Decision-hierarchy ladder + a minimalism floor** (authoring rules, every tier — `AGENTS.md`).
   The "smallest correct change" rule becomes an explicit ladder (*needed at all? → stdlib → platform →
   installed dep → one line → minimal code*), paired with a **floor**: minimalism never cuts input
   validation at trust boundaries, error handling that prevents data loss, security, or accessibility.
   In this repo the floor explicitly includes **fill-plan schema validation and the reject-don't-fix
   error policy** (`ERROR_HANDLING.md`) — these are corners minimalism must never cut.

2. **`// SHORTCUT(<ceiling>): <upgrade path>` markers.** Each deliberate simplification is marked
   inline, naming the known ceiling **and** the upgrade path — e.g. `// SHORTCUT(O(n²) scan): ok <1k
   rows; add an index if it grows`. This is a "constraint the code can't show" (it survives the
   minimal-comment ethos), it travels with the code, and it is greppable.

3. **An advisory minimalism *lens* on the existing reviewer** (the `medium`/`hard` dual review;
   `/agentic-workflow:review`). The adversarial reviewer we already run on every tier gains one
   dimension: produce an over-engineering **delete-list**, and **enforce** that every deliberate corner
   carries a `SHORTCUT(…)` marker (adding the markers the cheap author missed). The synthesis lists the
   SHORTCUTs a PR adds.

4. **The code is the ledger** — no committed `DEBT.md`. `grep -rn 'SHORTCUT('` is the running inventory;
   the review surfaces what each PR *adds* (debt seen the moment it's created).

### Three load-bearing choices (do not drop)

- **Advisory, not a veto.** Over-engineering does **not** become a blocker class — the veto stays
  blockers-only (correctness / security / spec-violation / regression — ADR-0004). Subjective vetoes
  thrash; minimalism is a quality nudge, not a merge gate.
- **Reviewer-enforced, not author-mandated.** Marking is a job for the **premium, reliable reviewer**,
  not the cheap implementer — a discretionary convention on the weakest model decays, and an inconsistent
  marker is worse than none (absence would falsely read as "no shortcut").
- **No ledger file.** A committed `DEBT.md` duplicates the code and drifts — the same single-source
  argument that keeps model picks in `docs/MODELS.md` only. The markers in code are the source of truth.

## Consequences

- **Deliberate corners are legible at the merge gate** — the human merger sees the ceilings and upgrade
  paths a minimal diff took on, without an out-of-band tracker.
- **Cost is bounded:** a little comment density on genuinely-cut corners, and one advisory dimension
  added to a review that runs anyway. No new agent, no new command, no new file.
- **Relation to the other ADRs:** complements ADR-0001 (we imported *content into the repo*, not a
  harness plugin), respects ADR-0004's blockers-only veto, and reuses the single-source discipline behind
  `docs/MODELS.md`. Distinct from the **lessons → guardrails** ritual (AGENTS.md §9), which tracks
  *mistakes*; this tracks *deliberate* shortcuts.
- **Not imported from Ponytail:** the modes dial (collides with our effort dial), the statusline, the
  benchmarks, and the plugin/hooks themselves.
