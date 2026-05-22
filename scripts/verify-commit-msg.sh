#!/usr/bin/env bash
# verify-commit-msg.sh — commit-msg hook for autonomous-loop branches.
#
# Enforces tier-acknowledgment for escalation-list tasks (per next-task.md).
# Companion to scripts/verify-task-commit.sh (pre-commit) — runs AFTER the
# commit message is written but BEFORE the commit finalizes, which is the
# only hook stage with access to the commit message text.
#
# Rules (fire only on main and bakeoff/* branches):
#   1. If the commit's subject starts with `T-NN:` and T-NN is on the
#      escalation list, the body MUST contain a `Tier: <model + effort>`
#      line.
#   2. If the `Tier:` line does NOT match a known escalation-tier model
#      (Opus 4.7, GPT-5 Pro, Gemini 2.5 Pro Thinking), the body MUST
#      also contain `Tier-mismatch acknowledged: <reason>`.
#
# T-46b (watchdog) and T-67/T-72 (cost ledger) and T-89c/d are the highest-
# stakes entries — security and privacy invariants whose subtle bugs are
# expensive to catch later.
#
# Install: scripts/install-hooks.sh symlinks this into .git/hooks/commit-msg.

set -euo pipefail

COMMIT_MSG_FILE="${1:-.git/COMMIT_EDITMSG}"
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

case "$BRANCH" in
  main|bakeoff/*) ;;
  *) exit 0 ;;
esac

REPO_ROOT=$(git rev-parse --show-toplevel)
ESCALATION_LIST="$REPO_ROOT/scripts/escalation-list.txt"

if [[ ! -f "$ESCALATION_LIST" ]]; then
  exit 0   # no list, nothing to enforce
fi

if [[ ! -f "$COMMIT_MSG_FILE" ]]; then
  exit 0   # nothing to check
fi

# Extract the task ID from the commit subject (first non-empty line).
SUBJECT=$(grep -v '^#' "$COMMIT_MSG_FILE" | grep -v '^$' | head -1)
TASK_ID=$(echo "$SUBJECT" | grep -oE '^T-[0-9]+[a-z]?' | head -1 || true)

if [[ -z "$TASK_ID" ]]; then
  exit 0   # not a task commit (spec edit, ADR, docs, etc.)
fi

# Is this task on the escalation list?
if ! grep -E '^[[:space:]]*[^#]' "$ESCALATION_LIST" | grep -Fxq "$TASK_ID"; then
  exit 0   # not on escalation list, no check needed
fi

# ── From here, $TASK_ID is on the escalation list ──

red()    { printf '\033[31m%s\033[0m\n' "$*" >&2; }

# Strip out comment lines starting with `#` (commit message comments) for
# the body parsing — git strips these on save anyway, but during the hook
# they may still be present in COMMIT_EDITMSG.
MSG_BODY=$(grep -v '^#' "$COMMIT_MSG_FILE")

# Rule 1: require a `Tier:` line.
if ! echo "$MSG_BODY" | grep -qE '^Tier:[[:space:]]+\S'; then
  red ""
  red "✗ commit-msg hook: Escalation-tier task $TASK_ID requires a Tier: line."
  red ""
  red "Add a line to the commit body like one of:"
  red "  Tier: Claude Opus 4.7 at xhigh"
  red "  Tier: GPT-5 Pro at high"
  red "  Tier: Claude Sonnet 4.6 at high"
  red "  Tier: Cursor Composer (auto-routed)"
  red ""
  red "See .claude/commands/next-task.md §'Model and effort tier' for the"
  red "escalation list. T-46b, T-67, T-72, T-89c, T-89d are security- and"
  red "privacy-sensitive — bias toward escalation tier."
  red ""
  exit 1
fi

# Rule 2: if Tier: line does NOT name an escalation-tier model, require
# Tier-mismatch acknowledgment.
TIER_LINE=$(echo "$MSG_BODY" | grep -E '^Tier:' | head -1)
ESCALATION_TIER_RE='Opus 4\.7|GPT-5 Pro|Gemini 2\.5 Pro Thinking|escalation'

if ! echo "$TIER_LINE" | grep -qE "$ESCALATION_TIER_RE"; then
  if ! echo "$MSG_BODY" | grep -qE '^Tier-mismatch acknowledged:[[:space:]]+\S'; then
    red ""
    red "✗ commit-msg hook: Escalation-tier task $TASK_ID is being committed"
    red "  on what appears to be a default-tier driver:"
    red "    $TIER_LINE"
    red ""
    red "Either switch to an escalation-tier model (Opus 4.7, GPT-5 Pro,"
    red "Gemini 2.5 Pro Thinking) and retry, OR acknowledge the mismatch by"
    red "adding to the commit body:"
    red "  Tier-mismatch acknowledged: <one-line reason for proceeding>"
    red ""
    red "Acceptable reasons: the task scope turned out mechanical despite"
    red "list membership; the human is reviewing every commit; this is an"
    red "iteration on prior escalation-tier work. Unacceptable: 'just want"
    red "to ship.'"
    red ""
    exit 1
  fi
fi

# Both rules pass.
exit 0
