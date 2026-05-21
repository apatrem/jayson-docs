# Review Panel UI — Design Spec

**Purpose:** concrete wireframe + component breakdown + state model for the most-used screen in the system: the AI comment review panel (D-25 mode B, the default).

**Audience:** the developer implementing M5 (T-92, T-95, T-96, T-97, T-98, T-99).

**Companion to:** `docs/DECISIONS.md` (D-12, D-25, D-26), `examples/sample-comment-thread.json`.

---

## Why this screen matters

Per the grilling session, consultants run **5–10 LLM cycles per doc** with **20–30 comments per cycle**. Most of a consultant's time will be spent in this panel: triaging, accepting, rejecting, following up. If it's slow, cluttered, or unclear, the system fails on its core promise.

---

## Wireframe

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│     ┌──────────────────────────────────────┐  ┌──────────────────────────┐ │
│     │ DOCUMENT (left, ~65% width)          │  │ REVIEW PANEL (right)     │ │
│     │                                       │  │                          │ │
│     │  ## Section 1                         │  │ 12 proposals pending     │ │
│     │  ┌────────────────────────────────┐  │  │ ┌──────────────────────┐ │ │
│     │  │ Block 1 (prose)                │  │  │ │ ⬛  Block 1 [info]   │ │ │
│     │  │ Lorem ipsum...                  │  │  │ │ "Quantify this"      │ │ │
│     │  └────────────────────────────────┘  │  │ │ ─ before / after ─   │ │ │
│     │  ┌────────────────────────────────┐  │  │ │ [Accept] [Reject] [↩]│ │ │
│     │  │ Block 2 (callout)              │  │  │ └──────────────────────┘ │ │
│     │  │ ★ Has comments (3)              │  │  │ ┌──────────────────────┐ │ │
│     │  └────────────────────────────────┘  │  │ │ ⬛  Block 2 [info]   │ │ │
│     │  ┌────────────────────────────────┐  │  │ │ "Shorten to one line"│ │ │
│     │  │ Block 3 (chart)                │  │  │ │ ─ before / after ─   │ │ │
│     │  └────────────────────────────────┘  │  │ │ [Accept] [Reject] [↩]│ │ │
│     │                                       │  │ └──────────────────────┘ │ │
│     │                                       │  │ ...                      │ │
│     │                                       │  │                          │ │
│     │                                       │  │ ─────────────────────── │ │
│     │                                       │  │ [Accept all visible]    │ │
│     │                                       │  │ [Send 2 follow-ups]     │ │
│     │                                       │  │ [Close review]          │ │
│     └──────────────────────────────────────┘  └──────────────────────────┘ │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

## Component breakdown

```
<ReviewPanel>                        // top-level, opens when batch returns
  <ReviewPanelHeader>                // "12 proposals pending"
    <ModeToggle>                     // panel | inline | diff (D-25)
    <CloseButton>
  </ReviewPanelHeader>

  <ReviewPanelList>                  // scrollable; cards ordered by block position
    {comments.map(c => (
      <ProposalCard
        key={c.id}
        comment={c}
        onAccept={...}
        onReject={...}
        onFollowUp={...}
        onClickJumpToBlock={...}
      />
    ))}
  </ReviewPanelList>

  <ReviewPanelFooter>
    <BulkActions>                    // Accept all / Reject all
    <FollowUpQueue>                  // "Send N follow-ups"
  </ReviewPanelFooter>
</ReviewPanel>

<ProposalCard>
  <CardHeader>
    <BlockBadge type={block.type} />  // 🅱 for prose, 🅒 for callout, etc.
    <BlockLocation>                   // "Section 1 > Block 2"
    <ConflictBadge if={hasConflict} />// yellow "Conflict" (T-99)
    <FailedBadge if={status="failed"}/>// red "Failed — view raw"
  </CardHeader>

  <CardBody>
    <CommentInstruction>              // "Quantify this"
    <ThreadHistory if={thread.length > 2}/>// collapsible "show 2 earlier"
    <DiffPreview>                     // before/after preview (current vs proposal)
      <ProseDiff />                   // for prose-bearing blocks
      <FieldsDiff />                  // for structural blocks (chart, KPI, etc.)
    </DiffPreview>
  </CardBody>

  <CardActions>
    <AcceptButton>    [Y]
    <RejectButton>    [N]
    <FollowUpButton>  [F]   →  opens <FollowUpInput inline />
    <EditPatchButton> [E]   →  opens patch in inline editor before accept
  </CardActions>
</ProposalCard>
```

## State model

```typescript
// Per-comment local state. Layered on top of the persisted Comment in DocModel.
interface ProposalUiState {
  commentId: string;
  // Optimistic UI status — distinct from the persisted Comment.status.
  uiStatus: "pending" | "accepted-pending-undo" | "rejected-pending-undo" | "failed" | "conflict";
  // For follow-ups queued but not yet sent.
  pendingFollowUp?: string;
  // Conflict detection (T-99) — set when two proposals overlap on the same block.
  conflictsWith?: string[];      // other comment IDs
  // If the LLM call failed, the raw output is here so the user can see it.
  rawFailedOutput?: string;
  // Number of attempts (for retry).
  retryCount: number;
}

// Top-level panel state.
interface ReviewPanelState {
  visible: boolean;
  proposals: Record<string, ProposalUiState>;    // by commentId
  followUpQueue: string[];                       // comment IDs with pending follow-ups
  bulkAction: { kind: "accept-all" | "reject-all"; running: boolean } | null;
}
```

## State transitions

```
┌──────────┐  AI returns      ┌──────────────┐  user clicks Accept   ┌──────────┐
│ pending  │ ───valid patch──>│ pending      │ ────────────────────> │ accepted │
└──────────┘                  │ (showing     │                       └──────────┘
                              │ proposal)    │  user clicks Reject   ┌──────────┐
                              │              │ ────────────────────> │ rejected │
                              └──────────────┘                       └──────────┘
                                     │
                                     │ user clicks Follow-up
                                     │ → adds to followUpQueue
                                     ▼
                              ┌──────────────┐  user clicks
                              │ pending      │  "Send N follow-ups"
                              │ + follow-up  │ ─────────────────────> back to "pending"
                              │   queued     │   (with new AI proposal)
                              └──────────────┘

Accepted / Rejected → still undoable within the session (D-06, D-07).
                      Each accept is a separate undo step (D-07).
```

## Keyboard shortcuts

| Key | Action |
|---|---|
| `j` / `↓` | Move focus to next proposal card |
| `k` / `↑` | Move focus to previous proposal card |
| `y` / `enter` | Accept the focused proposal |
| `n` / `delete` | Reject the focused proposal |
| `f` | Open the follow-up input on the focused card |
| `e` | Open the patch in an inline editor (advanced — manually edit before accepting) |
| `cmd/ctrl+enter` | Accept all visible (bulk) |
| `cmd/ctrl+shift+enter` | Send queued follow-ups |
| `cmd/ctrl+shift+r` | Cycle review mode (panel → inline → diff → panel) |
| `esc` | Close panel |

## Card visual states

```
┌──────────────────────────────────┐
│ ⬛ Block 4 (chart) [pending]      │   default — proposal pending review
│                                    │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ ✅ Block 4 (chart) [accepted]     │   accepted — collapsed, undo available
│                                    │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ ⊘ Block 4 (chart) [rejected]      │   rejected — collapsed, undo available
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ ⚠ Block 4 + Block 6 [conflict]    │   yellow border — both target overlapping range
│ Resolve before accepting.          │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ ✕ Block 4 [failed]                │   red border — LLM returned invalid output
│ [View raw output] [Retry]          │
└──────────────────────────────────┘
```

## Diff preview rules

**For prose-bearing blocks (prose, callout body, bullet/numbered list items, table cells):**
- Show inline word-level diff: red strikethrough for removed, green underline for added.
- Use a simple word-level diff algorithm (Myers; jsdiff library is acceptable — it's MIT and tiny).

**For structural blocks (chart, kpi-cards, risk-matrix, etc.):**
- Show a field-by-field side-by-side: changed fields highlighted.
- For arrays (e.g. chart.data.series), show items that changed in red/green; unchanged items collapsed as "5 unchanged."

**For deletes (op: remove):**
- Show the block content with full red strikethrough across the whole card.
- Label: "Will delete this block."

**For inserts (op: insert-after):**
- Show only the new block content (no "before" side).
- Label: "Will add a new block after Block N."

## Bulk actions

### "Accept all visible"
Accepts every proposal currently in `pending` state in the order they appear in the panel. Each accept is a separate undo step (D-07), so a user can undo individual accepts after a bulk operation.

**Confirmation:** if more than 5 proposals are pending, show a confirmation modal: *"Accept 12 proposed changes? You can undo individually."*

### "Send N follow-ups"
Sends the queued follow-ups in a batched LLM call (D-13). The proposals being followed-up-on return to `pending` state with the new AI response.

**Visibility:** the button only appears when `followUpQueue.length > 0`. The label updates live ("Send 1 follow-up" / "Send 3 follow-ups").

## Performance budgets

- **Initial render with 30 proposals:** < 200ms (no skeleton needed).
- **Single-card update on accept/reject:** < 16ms (one frame — no jank during keyboard navigation).
- **Scroll through 50-card list:** smooth 60 fps (use virtualization only if measurement shows it's needed; default render is fine for our scale).
- **Diff computation:** synchronous for ≤ 500 chars; web worker for larger (rare — most edits are small).

## Accessibility

- Each card is `<article role="article" aria-labelledby="card-{id}-header">`.
- Action buttons have full text labels ("Accept proposal for Block 4 in Section 2"), shortened visually via CSS but readable to screen readers.
- The panel has `aria-live="polite"` on the proposal count so screen reader users hear "5 proposals pending" updates.
- Color is never the only signal — every status (pending/accepted/rejected/conflict/failed) has both color AND an icon AND text.

## Component file locations

| Component | File |
|---|---|
| `ReviewPanel` | `src/comments/ReviewPanel.tsx` |
| `ProposalCard` | `src/comments/ProposalCard.tsx` |
| `DiffPreview` | `src/comments/DiffPreview.tsx` |
| `ProseDiff` | `src/comments/diff/ProseDiff.tsx` |
| `FieldsDiff` | `src/comments/diff/FieldsDiff.tsx` |
| `FollowUpInput` | `src/comments/FollowUpInput.tsx` |
| `BulkActions` | `src/comments/BulkActions.tsx` |
| `ModeToggle` | `src/ui/ReviewModeToggle.tsx` |
| Conflict detector | `src/comments/ConflictDetector.ts` |

## What this design deliberately doesn't include

- **Threaded commenting between consultants.** Reviewers leave plain-text comments (D-26), but reviewer comments aren't bundled with AI-proposal cards — they show as separate items in the panel.
- **Reactions / emoji.** Out of scope.
- **Notifications when a reviewer leaves comments.** Out of scope in v1; consultants poll by opening the doc.
- **A "compare to previous proposal" history view.** Threading captures this (each `ai-proposal` entry in the thread is preserved); future v1.1 could add a dedicated history viewer.

## Acceptance checklist (per T-92)

- [ ] Panel opens automatically when a batch returns proposals.
- [ ] All proposals visible, sorted by block position in the doc.
- [ ] Per-card actions: Accept, Reject, Follow-up, Edit patch (advanced).
- [ ] Keyboard shortcuts all functional.
- [ ] Conflict detection highlights overlapping proposals (T-99).
- [ ] Failed proposals show with raw output viewable + retry button.
- [ ] Bulk Accept-all confirms when > 5 pending.
- [ ] Follow-up queue button appears only when queue is non-empty; updates count live.
- [ ] Mode toggle cycles to inline (T-93) and diff (T-94) views without losing state.
- [ ] Per-accept undo works (T-83 + T-98).
- [ ] Panel state persists if the editor is closed and reopened mid-review (open proposals come back).
