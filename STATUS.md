# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-26T00:00:00Z (plan-execution commit — non-loop)
**State:** READY (was HALTED with BLOCKED-NO-ELIGIBLE; cleared now that 23 new pending tasks queued)
**Running on:** Claude Opus 4.7 at high (plan-execution, not a /next-task fire)
**Halt reason:** none — T-113 is next eligible
**Halted since:** N/A

---

## What needs your attention

1. **T-108** — `[!]` waiting for real macOS/Windows signing certificates and CI secrets.
   → BLOCKERS.md §T-108
   → Suggested fix: provide the signing credentials/secrets, then change T-108 back to `[ ]`.
2. **T-109** — `[!]` waiting for updater signing key pair and hosted release-feed URL.
   → BLOCKERS.md §T-109
   → Suggested fix: provide the updater public key/feed URL and keep the private key outside the repo, then change T-109 back to `[ ]`.

## Next eligible task

**T-113** — Lock `protocol-asset` feature + treat starter as runnable.
- Phase 6.5 (Scaffold hardening); no deps; ~2h.
- Closes the remaining starter-scaffold drift that commit e893e64 partially fixed.

After T-113 lands, T-114 (extend verify-bakeoff-v2.sh) unblocks, then T-115 (M7-spike spec doc) → T-116 (M7-spike decisions) → T-117..T-123 (M7-spike implementation) in dependency order.

## Progress since the previous fire

- ✅ 23 new tasks added to docs/TASKS.md this fire (T-113..T-114 scaffold hardening; T-115..T-120, T-120b, T-121..T-123 M7-spike; T-124..T-134 M8 library + templates + generated blocks)
- 📝 BUILD_BRIEF.md updated with M7 + M8 milestone entries + two new rows in "Per-component done means" table
- ⚠ 0 tasks blocked this fire: none
- ⏸ 0 tasks marked waiting this fire: none
- ↩ 0 commits reverted this fire (regressions): none

## At a glance

Total tasks: 140   Done: 114 (81%)   Blocked: 0   Waiting: 2   Open: 23   Skipped: 1

## Recent commits

afa34be Gitignore Rust target/ directories
e893e64 Starter scaffold fixes: ship icons + .taurignore disambiguation
2a87bb0 Phase 7 review follow-ups: release pipeline + notice + runbook
938b372 T-112: write setup runbook
2401441 T-111: write privacy notice
23ba48e T-110: build release pipeline
1ce7e7f M6 review follow-ups: deck editor safety + PDF cleanup + drift log
daac1dc T-107: add deck slide navigation to editor

## CI status (origin/main)

in_progress
