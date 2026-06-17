# AGENTS.md — Handoff Brief for the Implementing Coding Agent

`agentic-workflow-baseline: v0.3.7` — this repo adopts the agentic-workflow baseline (pack **v0.3.7**; AW-0001…AW-0011) **by reference** (see `docs/adr/0001-adopt-agentic-workflow-baseline-by-reference.md`). Workflow conventions are cited below by their `AW-NNNN` labels, not re-hosted here; their canonical text lives in the agentic-workflow repo (`apatrem/agentic-workflow`). The pack's **process skills** (`/agentic-workflow:review`, `:run`, …) are delivered globally via the installed plugin — never vendored into this repo; the local `skills/` folder is the **product deliverable** (BYO-LLM playbooks, §6), not pack skills.

You are the autonomous coding agent (Claude Code, or equivalent) building this system. Read this file in full before touching code.

---

## 0. Multi-agent workflow — read before you commit

This repo is worked by **several agents in parallel** across CLIs — **Claude Code, Cursor, Codex** (the cross-CLI framing of AW-0007), … `main` is **integration-only** — protected; PR + green CI required; a human merges. The model is **long-lived worktree folders, ephemeral per-task branches**: a fresh branch per task, cut from `origin/main` and deleted after merge. (**Superset** — the engine — runs each agent in its own git worktree the same way; AW-0002.)

```
~/Documents/jayson-docs           # main — integration only; a human merges here
~/Documents/jayson-docs-claude    # Claude's worktree folder (long-lived)
~/Documents/jayson-docs-cursor    # Cursor's worktree folder
~/Documents/jayson-docs-codex     # Codex's worktree folder
# inside any worktree, per task:  git checkout -b agent/<tool>/<task-id> origin/main
```

**Rules:**
1. **Never commit to `main` directly.** Work in your worktree, on a fresh `agent/<tool>/<task-id>` branch cut from `origin/main`; delete it after merge.
2. **Rebase before you start and before you push:** `git fetch origin && git rebase origin/main`. Keep commits small and narrowly scoped — less surface, fewer collisions.
3. **Ship via PR.** Open a pull request to `main`; another agent reviews it (this is the "challenge each other" step); the human merges. CI must be green.
4. **CI gates everything** (`.github/workflows/ci.yml` — build + lint + test + validate). A clean `git` merge is **not** proof of correctness; CI is. Two agents editing nearby lines can merge "cleanly" into broken or duplicated content — CI and review catch that.
5. **`docs/DECISIONS_LOG.md` is the shared source of intent.** Read it first; record any cross-cutting decision there *before* diverging, so parallel agents converge instead of collide.
6. **Effort/review dial — `mode: low | medium | hard`, default `low` (prefer low, justify higher) — AW-0004.** The routine ~90% path is `low`: one implementer (chosen per session in Superset; the orchestrator role stays `claude-code` — AW-0002) + the gate + one adversarial reviewer. `medium` adds an independent cross-lineage dual review on the PR (`/agentic-workflow:review`). `hard` runs competitive best-of-N across lineages → a smart-merge → then the medium dual review (`hard ⊇ medium`). **Model policy is by reference: AW-0004 + the baseline `docs/MODELS.md`** (the living model→role→tier table) — this repo keeps **no local `MODELS.md`** and names no models inline, so picks churn in one place. Agent biases for best-of-N: `ROLES.md`.
   - **`mode` is a floor, not a ceiling (AW-0004).** A change touching **protected/destructive surface** runs at **≥ `medium`** regardless of the declared mode: destructive filesystem ops (`rm -rf`, in-place rewrites), the gate/CI config, lockfiles/dependency manifests, migrations/schema/data-shape changes, auth/secrets/security boundaries, public API/contract changes — **and governance / decision-record / architecture changes** (this file, `docs/adr/**`, `docs/WORKFLOW.md`, `ROLES.md`, or any convention/architecture shift), which are **`medium` by default**. Bump the tier and record *"escalated by risk floor"* in the task and PR.
   - **Post-review remediation & escalation loop (AW-0010).** The remediator is the tier's implementer (fresh spawn on the same branch, prompt = the synthesis punch-list, commit-don't-push); default re-check is a cheap targeted re-verify; excess findings escalate one tier + a full re-review; capped at 3 rounds → route to `needs-human` (AW-0006), never to `main`.
   - **Minimalism lens + `SHORTCUT` markers (AW-0011).** Each deliberate corner cut carries an inline `// SHORTCUT(<ceiling>): <upgrade path>` marker; the reviewer (not the cheap author) enforces this; the code is the ledger — `grep -rn 'SHORTCUT('` is the running inventory (no committed `DEBT.md`). Advisory, blockers-only veto stands.
7. **Process model:** one page in `docs/WORKFLOW.md`; the workflow conventions are the agentic-workflow baseline, adopted **by reference** (AW-0001…AW-0011; see `docs/adr/0001-adopt-agentic-workflow-baseline-by-reference.md`). Local **domain** ADRs (none yet) start at `docs/adr/0002`.

Starting a task (from your worktree folder):

```bash
git fetch origin
git checkout -b agent/<tool>/<task-id> origin/main   # fresh per-task branch
# …work, commit small, run the gate… then push and open a PR to main; delete the branch after merge
```

---

## 1. Read first, code second

Before writing any code, read these files in this order:

1. `docs/ARCHITECTURE.md` — the *why*, the one principle, the requirement table.
2. `docs/BUILD_BRIEF.md` — the *what to do*: guardrails, milestones, acceptance criteria.
3. `docs/SLIDE_LAYOUT_LIBRARY.md` — the slide layouts (PPTX) and shape-naming convention.
4. `docs/DECISIONS_LOG.md` — what was decided and rejected. Do not revisit these.
5. `CHART_CATALOGUE.md` — JSON shape per approved chart type.
6. `ERROR_HANDLING.md` — what to do on each failure class.
7. `skills/README.md` — the four skills this CLI serves (LLM-agnostic playbooks; Cowork plugin optional).

Then read the scaffolded source files in `src/` to understand the contracts already in place.

---

## 2. The one principle

The source of brand consistency is the master `.pptx` / `.docx` in `templates/`. The source of content is the fill-plan JSON produced **by the user's own agentic LLM** (BYO LLM, D15; not by this codebase). The CLI under `src/cli/` and the pipeline under `src/pipeline/` do pure template-fill — they read a fill-plan JSON, fill named shapes / placeholders, and save a native Office file. **No LLM call lives in this codebase.**

You are building the CLI and the pipeline. You are **not** building an editor, a renderer, an Office parser, an LLM client, or anything else. See `docs/DECISIONS_LOG.md` for the full list of things not to build.

---

## 3. How to work

- **Milestone discipline.** Work `BUILD_BRIEF.md` milestones in order. Do not start a milestone until the previous one's acceptance criteria all pass.
- **Use the scaffolded contracts.** The Zod schemas in `src/schema/`, the brand file in `src/brand/brand.yaml`, the chart catalogue, the error policy, and the four skill SKILL.md files are *fixed contracts*. Implement against them; do not redesign them.
- **Test as you go.** Each milestone has acceptance criteria stated as testable conditions. Write the tests that prove them; do not declare a milestone done without passing tests.
- **No new dependencies.** Use only what is in `package.json`. If you genuinely need another library, stop and ask.

---

## 4. Open inputs you depend on

1. **Master templates.** The real sanitized **`templates/report.master.pptx` (26 layouts) is in-repo** (D22), with `slot.*` names applied and `src/setup/layout-spec.json` generated from it. `PLACEHOLDER-report.master.pptx` remains the only *fillable* master until Phase 5 lands, then it is retired (D22). The other three masters are still pending and post-v1 (D20):
   - `templates/commercial-proposal.master.pptx`
   - `templates/commercial-proposal.master.docx`
   - `templates/report.master.docx`

2. **Layouts.** v1 fill implements **`kpi-row-chart`** only (`src/schema/layouts/kpi-row-chart.ts`). The next step is **Phase 5** (`tasks/T-101…T-105`): making the **26 real layouts** fillable (their Zod schemas and `layout-spec.json` entries already exist from Setup Phases 1–3). The original five seed layouts in `docs/SLIDE_LAYOUT_LIBRARY.md` were **superseded by D22's 26 real layouts**. All DOCX section schemas remain **post-v1**.

---

## 5. Hard rules — violating these breaks the architecture

- **No LLM call from inside this codebase.** The LLM is the user's own agentic LLM (BYO LLM, D15) via their session. The CLI accepts a *fill-plan JSON*; it does not generate one.
- **No `@anthropic-ai/sdk`, no API key, no environment variables for LLM auth.** See `docs/DECISIONS_LOG.md` D11.
- **Do not parse or generate DOCX/PPTX outside the stack libraries.** `pptx-automizer` + `pptxgenjs` for PPTX; `docx` (dolanmiu) for DOCX. No other tool touches OOXML.
- **Do not let the LLM choose coordinates, grid cells, sizes, fonts, or colours.** The skills tell Claude to pick a `layoutId` and fill typed slots, full stop. The CLI enforces this via Zod.
- **Do not auto-truncate, auto-shorten, or "fix" fill-plans that fail schema validation.** Reject with a clear error. See `ERROR_HANDLING.md`.
- **Do not use Tiptap, React, Vite, Playwright, or any HTML/PDF renderer.** Outputs are `.pptx` and `.docx` only.
- **Brand tokens come from `src/brand/brand.yaml`** — the validated mirror of the master template. Precedence: **master template > `brand.yaml` > prose docs** (D2-2); the YAML beats narrative docs, never the template it mirrors. In v1, charts data-swap into pre-authored master charts (D21), so the **master chart's styling wins** for charts.
- **`src/setup/layout-spec.json` and the Zod layout schemas (`src/schema/**`) are contracts — do not hand-edit them in feature work.** `layout-spec.json` is the `shapes ≡ slots` source of truth (per-layout master `sourceSlideIndex` + slot names, from the Phase 2 setup). The fill pipeline *consumes* it; if the master changes, regenerate it via the setup scripts — never edit by hand.

---

## 6. Delivery — a portable skills pack + app (BYO LLM)

The product is a **portable `skills/` folder of markdown playbooks** plus the standalone **app**, driven by the user's **own** agentic LLM (Claude Cowork, Claude Code, Cursor, ChatGPT-with-tools, a local model — "BYO LLM"; see `docs/DECISIONS_LOG.md` D15). Four deliverable skills:

- `commercial-proposal-pptx`
- `commercial-proposal-docx`
- `report-pptx`
- `report-docx`

Each skill instructs the LLM to gather the brief, produce a schema-valid fill-plan, write it to a project-relative temp file (or pipe it via `--plan -`), then invoke the bundled `./jayson-docs fill --template … --plan … --out …` app (during local dev from the repo, use `npx jayson-docs fill …`) — or, if the LLM has no tools, hand the fill-plan to the human to run. **The app is the dumb mortar between the LLM and the `.pptx` / `.docx`.**

A **Cowork plugin is one optional packaging** of these same markdown skills (auto-trigger + one-click install for firms already on Cowork). To publish it, verify the manifest and SKILL.md formats with the `cowork-plugin-management:create-cowork-plugin` skill.

---

## 7. When you are unsure

Stop. Read the relevant doc. If the answer is genuinely missing, leave a TODO with a clear question and surface it to the user — do not guess. Inventing layouts, slot names, brand values, or chart shapes breaks the consistency guarantee the entire architecture exists to enforce.

---

## 8. Definition of done — v1

All of:

- All milestone acceptance criteria pass (see `docs/BUILD_BRIEF.md` §3).
- Given a fill-plan JSON and the appropriate master template, the CLI produces a final `.pptx` or `.docx` that opens cleanly in PowerPoint / Word with the Acme brand applied and native editable charts.
- The **`report-pptx`** skill works end-to-end driven by a **BYO LLM** (D15; verify with ≥1 LLM plus a human-run fill-plan): the user describes a deliverable, the LLM produces a schema-valid fill-plan, the skill invokes the app, the file appears. *(v1 implements only report-pptx — D20.)*
- `pnpm run build`, `pnpm run lint`, `pnpm run test`, `pnpm run validate` all green.
- The repo is small, dependencies are exactly those in `package.json` (no `@anthropic-ai/sdk`), and the docs are accurate.

Then stop. v2 (additional layouts, additional templates, MinerU upstream) waits for explicit go-ahead.

---

## 9. Working agreements (PR hygiene)

- **Gate (one command):** `pnpm run build && pnpm run lint && pnpm run test && pnpm run validate`. The green gate is the bar; a clean merge is not. `main` is **protected** — PR + green CI required to merge.
- **Small PRs.** Routine work < 300 changed lines; split or stack anything larger. Separate a mechanical change from a behaviour change.
- **Branching** — see §0: long-lived worktree folders, ephemeral per-task branches (`agent/<tool>/<task-id>`, deleted after merge).
- **Package manager — pnpm (AW-0009 is the convention; the local fact is here).** This existing repo **migrated to pnpm on 2026-06-09**; it routinely runs **many parallel worktrees** (the existing-repo concurrency trigger AW-0009 names), so the per-worktree install cost applies. The gate above is the canonical pnpm command; the lockfile is `pnpm-lock.yaml`.
- **Sparse review.** Ask a reviewer (Codex/Claude) for **blockers only** — correctness, security, missing tests, broken boundaries; ≤10 findings, ranked by severity. Lint/format handles style. `hard`-tier best-of-N biases: `ROLES.md`.
- **Lessons → guardrails.** Every recurring agent mistake becomes a test, a lint rule, or a line in this file — never just a mental note.
