import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorView } from "@tiptap/pm/view";
import { setBlockAttr } from "../block-commands";

/**
 * Block drag-reorder (ADR-0018, item 3). A gutter handle (widget decoration) on
 * each top-level block lets the consultant drag it to a new position WITHIN or
 * ACROSS sections. A horizontal insertion-line indicator shows where it will
 * land; dropping into an empty section is allowed.
 *
 * Schema safety is non-negotiable: the insert position is always clamped to be
 * directly inside a section (`document` content is `section+`), so a block can
 * never land at the top level. A drop that can't resolve to a section's content
 * is rejected. Sections themselves are reordered by the sidebar (item 1), not
 * here — this surface only moves blocks.
 *
 * The move + clamp helpers are exported and unit-tested without a DOM; the
 * plugin wires them to HTML5 drag events.
 */

const DRAG_DATA_TYPE = "application/x-docsystem-block-pos";

// The block being dragged, tracked at module scope rather than via dataTransfer:
// some webviews don't expose custom dataTransfer MIME types during `dragover`,
// so a `types`-based check would skip preventDefault and the drop would never
// fire. The handle and the editor's drop handler share this module, so this is
// reliable. (dataTransfer.setData is still set so the OS sees a valid drag.)
let activeBlockDragSource: number | null = null;

// ── Pure helpers (unit-tested) ────────────────────────────────────────────

export interface BlockBoundary {
  /** Position immediately before the block node. */
  start: number;
  /** Position immediately after the block node. */
  end: number;
  /** The block node itself. */
  node: PMNode;
}

/**
 * Find the top-level block (a direct child of a `section`) that contains `pos`.
 * Returns its boundary, or null when `pos` is not inside a section's block.
 */
export function findTopLevelBlock(doc: PMNode, pos: number): BlockBoundary | null {
  if (pos < 0 || pos > doc.content.size) {
    return null;
  }
  const $pos = doc.resolve(pos);
  for (let depth = $pos.depth; depth >= 1; depth -= 1) {
    if ($pos.node(depth - 1).type.name === "section") {
      return {
        start: $pos.before(depth),
        end: $pos.after(depth),
        node: $pos.node(depth),
      };
    }
  }
  return null;
}

/**
 * Resolve a raw document position to a section-level insert position (parent =
 * section), or null if `pos` is not inside any section. Used as the fallback
 * when the pointer isn't over a specific block (section padding) — it appends
 * to the nearest enclosing section. NOTE: sections are `block+`, so there is no
 * truly empty section to drop into; "drop into an empty section" is deferred to
 * item 1 (which introduces empty sections via a `block*` schema change).
 */
export function sectionContentInsertPos(doc: PMNode, pos: number): number | null {
  if (pos < 0 || pos > doc.content.size) {
    return null;
  }
  const $pos = doc.resolve(pos);
  for (let depth = $pos.depth; depth >= 0; depth -= 1) {
    if ($pos.node(depth).type.name === "section") {
      // The end of the section's content is always a valid section-level
      // boundary (parent = section), unlike an arbitrary in-block position.
      return $pos.end(depth);
    }
  }
  return null;
}

/**
 * Build a transaction that moves the block starting at `sourceStart` so it is
 * inserted at `insertAt`. Returns null when the move is invalid:
 *   - no block at `sourceStart`
 *   - `insertAt` does not resolve to directly inside a section (would put a
 *     block at the top level — schema violation)
 *   - `insertAt` falls within the source block itself (no-op drop)
 */
export function buildMoveTransaction(
  state: EditorState,
  sourceStart: number,
  insertAt: number,
): Transaction | null {
  const sourceNode = state.doc.nodeAt(sourceStart);
  if (sourceNode === null) {
    return null;
  }
  const from = sourceStart;
  const to = sourceStart + sourceNode.nodeSize;
  if (insertAt >= from && insertAt <= to) {
    return null; // dropping onto itself
  }
  // The insert position must be directly inside a section (never top level —
  // `document` content is `section+`).
  const $insert = state.doc.resolve(insertAt);
  if ($insert.parent.type.name !== "section") {
    return null;
  }
  // Don't empty the source section: sections are `block+`. A cross-section move
  // of a section's only block would leave it empty (ProseMirror would auto-fill
  // a stray block), so reject it. (Allowing empty sections is deferred to item
  // 1's section create/delete work.)
  const $source = state.doc.resolve(sourceStart);
  const crossesSection = $source.parent !== $insert.parent;
  if (crossesSection && $source.parent.childCount === 1) {
    return null;
  }
  let tr = state.tr.delete(from, to);
  const mappedInsert = tr.mapping.map(insertAt);
  tr = tr.insert(mappedInsert, sourceNode);
  if (!tr.docChanged) {
    return null;
  }
  return tr.scrollIntoView();
}

/**
 * Reorder a flat array of blocks (pure, schema-agnostic). Retained for callers
 * that operate on the DocModel array directly (e.g. the section sidebar).
 */
export function reorderBlocks<T>(
  blocks: T[],
  sourceIndex: number,
  targetIndex: number,
): T[] {
  if (
    sourceIndex === targetIndex ||
    sourceIndex < 0 ||
    targetIndex < 0 ||
    sourceIndex >= blocks.length ||
    targetIndex >= blocks.length
  ) {
    return blocks;
  }
  const next = [...blocks];
  const [moved] = next.splice(sourceIndex, 1);
  if (moved === undefined) {
    return blocks;
  }
  next.splice(targetIndex, 0, moved);
  return next;
}

// ── Plugin (floating gutter handle + insertion line + DOM wiring) ───────────

interface DragReorderState {
  /** Doc position where the dragged block will be inserted, or null. */
  dropPos: number | null;
}

const dragReorderKey = new PluginKey<DragReorderState>("dragReorder");

function createDropIndicator(): HTMLElement {
  const indicator = document.createElement("div");
  indicator.className = "doc-drop-indicator";
  indicator.setAttribute("contenteditable", "false");
  return indicator;
}

function dropIndicatorDecorations(state: EditorState): DecorationSet {
  const dropPos = dragReorderKey.getState(state)?.dropPos ?? null;
  if (dropPos === null) {
    return DecorationSet.empty;
  }
  // The drop position is always a section-level boundary (between blocks), so
  // the indicator renders as a sibling line — never inside a node view.
  return DecorationSet.create(state.doc, [
    Decoration.widget(dropPos, createDropIndicator, {
      side: -1,
      key: "drop-indicator",
      ignoreSelection: true,
    }),
  ]);
}

/** Resolve the drop position for a pointer event over the editor. */
function dropPosForEvent(view: EditorView, event: DragEvent): number | null {
  const at = view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (at === null) {
    return null;
  }
  const block = findTopLevelBlock(view.state.doc, at.pos);
  if (block !== null) {
    // Before or after the hovered block, by pointer-Y vs the block's midpoint.
    const dom = view.nodeDOM(block.start);
    if (dom instanceof HTMLElement) {
      const rect = dom.getBoundingClientRect();
      return event.clientY < rect.top + rect.height / 2 ? block.start : block.end;
    }
    return block.start;
  }
  // Not over a block — maybe an empty section / padding.
  return sectionContentInsertPos(view.state.doc, at.pos);
}

function setDropPos(view: EditorView, dropPos: number | null): void {
  const current = dragReorderKey.getState(view.state)?.dropPos ?? null;
  if (current === dropPos) {
    return;
  }
  view.dispatch(view.state.tr.setMeta(dragReorderKey, { dropPos }));
}

/**
 * A single reusable gutter handle that follows the hovered top-level block.
 * One floating element (no per-block DOM, no widget-in-contentDOM conflict) is
 * repositioned on mousemove and carries the hovered block's start position for
 * dragstart.
 */
class GutterHandleView {
  private readonly handle: HTMLElement;
  private readonly mount: HTMLElement;
  private blockStart: number | null = null;
  private dragging = false;
  private menu: HTMLElement | null = null;
  private menuBlockStart: number | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly view: EditorView,
    private readonly defaultSpacingMultiple: number,
  ) {
    // Mount on document.body (a stable container) rather than the editor
    // wrapper — React re-renders the wrapper and can detach it mid-session,
    // which orphans an absolutely-positioned child. The handle/menu use page
    // coordinates (rect + scroll offset) so they track the block as it scrolls.
    this.mount = document.body;

    this.handle = document.createElement("div");
    this.handle.className = "doc-drag-handle";
    this.handle.setAttribute("draggable", "true");
    this.handle.setAttribute("contenteditable", "false");
    this.handle.setAttribute("aria-label", "Drag to reorder block");
    this.handle.textContent = "⠿";
    this.handle.style.display = "none";
    this.handle.addEventListener("dragstart", this.onDragStart);
    this.handle.addEventListener("dragend", this.onDragEnd);
    this.handle.addEventListener("click", this.onClick);
    // Keep the handle alive while the pointer is on it (it sits in the gutter,
    // left of the editable text — moving onto it must not trigger a hide).
    this.handle.addEventListener("mouseenter", this.cancelHide);
    this.handle.addEventListener("mouseleave", this.scheduleHide);
    this.mount.appendChild(this.handle);

    view.dom.addEventListener("mousemove", this.onMouseMove);
    view.dom.addEventListener("mouseleave", this.scheduleHide);
  }

  // Hide is deferred so the pointer can travel from the block into the gutter
  // handle without it vanishing; entering the handle (or a block) cancels it.
  private readonly scheduleHide = (): void => {
    if (this.dragging || this.menu !== null) {
      return;
    }
    this.cancelHide();
    this.hideTimer = setTimeout(() => this.hide(), 220);
  };

  private readonly cancelHide = (): void => {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  };

  // Clicking the handle (without a drag) opens a small block menu. Layout
  // toggles (breakBefore now; spaceBefore in item 7) live here, per ADR-0018.
  private readonly onClick = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    if (this.blockStart === null) {
      return;
    }
    if (this.menuOpenFor(this.blockStart)) {
      this.closeMenu();
    } else {
      this.openMenu(this.blockStart);
    }
  };

  private menuOpenFor(blockStart: number): boolean {
    return this.menu !== null && this.menuBlockStart === blockStart;
  }

  private openMenu(blockStart: number): void {
    this.closeMenu();
    const node = this.view.state.doc.nodeAt(blockStart);
    if (node === null) {
      return;
    }
    const menu = document.createElement("div");
    menu.className = "doc-block-menu";
    menu.setAttribute("contenteditable", "false");

    // Heading-only: toggle outline numbering for this heading (ADR-0018 item 4).
    if (node.type.name === "heading") {
      const numbered = node.attrs.numbered !== false;
      const numberItem = document.createElement("button");
      numberItem.type = "button";
      numberItem.className = "doc-block-menu-item";
      numberItem.textContent = numbered ? "Remove numbering" : "Add numbering";
      numberItem.addEventListener("click", (clickEvent) => {
        clickEvent.preventDefault();
        const tr = setBlockAttr(this.view.state, blockStart, "numbered", !numbered);
        if (tr !== null) {
          this.view.dispatch(tr);
        }
        this.closeMenu();
        this.view.focus();
      });
      menu.appendChild(numberItem);
    }

    const breakOn = node.attrs.breakBefore === true;
    const item = document.createElement("button");
    item.type = "button";
    item.className = "doc-block-menu-item";
    item.textContent = breakOn ? "Remove page break" : "Start on a new page";
    item.addEventListener("click", (clickEvent) => {
      clickEvent.preventDefault();
      this.applyBreakBefore(blockStart, !breakOn);
    });
    menu.appendChild(item);

    // "Spacing above" override (ADR-0018, item 7): a multiple of the brand unit;
    // empty re-inherits the document default.
    const spacingRow = document.createElement("label");
    spacingRow.className = "doc-block-menu-row";
    const spacingText = document.createElement("span");
    spacingText.textContent = "Spacing above (×)";
    const spacingInput = document.createElement("input");
    spacingInput.type = "number";
    spacingInput.min = "0";
    spacingInput.step = "0.5";
    spacingInput.className = "doc-block-menu-input";
    // Empty input shows the inherited document spacing as a light-grey
    // placeholder so the consultant sees the value they'd be overriding.
    spacingInput.placeholder = String(this.defaultSpacingMultiple);
    const currentSpace: unknown = node.attrs.spaceBefore;
    spacingInput.value = typeof currentSpace === "number" ? String(currentSpace) : "";
    spacingInput.addEventListener("change", () => {
      this.applySpaceBefore(blockStart, spacingInput.value.trim());
    });
    spacingRow.appendChild(spacingText);
    spacingRow.appendChild(spacingInput);
    menu.appendChild(spacingRow);

    // Anchor below the handle (which is already positioned in mount coords).
    menu.style.top = `${parseFloat(this.handle.style.top || "0") + 22}px`;
    menu.style.left = this.handle.style.left || "0px";
    this.mount.appendChild(menu);
    this.menu = menu;
    this.menuBlockStart = blockStart;
    document.addEventListener("mousedown", this.onDocMouseDown, true);
    document.addEventListener("keydown", this.onKeyDown, true);
  }

  private closeMenu(): void {
    if (this.menu !== null) {
      this.menu.remove();
      this.menu = null;
      this.menuBlockStart = null;
      document.removeEventListener("mousedown", this.onDocMouseDown, true);
      document.removeEventListener("keydown", this.onKeyDown, true);
    }
  }

  private applyBreakBefore(blockStart: number, value: boolean): void {
    const tr = setBlockAttr(this.view.state, blockStart, "breakBefore", value);
    if (tr !== null) {
      this.view.dispatch(tr);
    }
    this.closeMenu();
    this.view.focus();
  }

  private applySpaceBefore(blockStart: number, raw: string): void {
    let value: number | null;
    if (raw === "") {
      value = null; // clear → re-inherit the document default gap
    } else {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return;
      }
      value = parsed;
    }
    const tr = setBlockAttr(this.view.state, blockStart, "spaceBefore", value);
    if (tr !== null) {
      this.view.dispatch(tr);
    }
    // Keep the menu open so the consultant can fine-tune the value.
  }

  private readonly onDocMouseDown = (event: MouseEvent): void => {
    const target = event.target;
    if (
      target instanceof Node &&
      (this.menu?.contains(target) === true || this.handle.contains(target))
    ) {
      return;
    }
    this.closeMenu();
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      this.closeMenu();
    }
  };

  private readonly onMouseMove = (event: MouseEvent): void => {
    if (this.dragging || this.menu !== null || !this.view.editable) {
      return; // freeze the handle while a menu is open
    }
    this.cancelHide(); // pointer is over the editor — keep the handle alive
    const at = this.view.posAtCoords({ left: event.clientX, top: event.clientY });
    const block = at ? findTopLevelBlock(this.view.state.doc, at.pos) : null;
    if (block === null) {
      this.scheduleHide();
      return;
    }
    const dom = this.view.nodeDOM(block.start);
    if (!(dom instanceof HTMLElement)) {
      this.scheduleHide();
      return;
    }
    // Page coordinates: viewport rect + scroll offset, so the body-mounted
    // handle aligns with the block top and scrolls with the document.
    const blockRect = dom.getBoundingClientRect();
    this.handle.style.top = `${blockRect.top + window.scrollY}px`;
    this.handle.style.left = `${blockRect.left + window.scrollX - 22}px`;
    this.handle.style.display = "block";
    this.blockStart = block.start;
  };

  private readonly onDragStart = (event: DragEvent): void => {
    if (this.blockStart === null || event.dataTransfer === null) {
      return;
    }
    this.dragging = true;
    activeBlockDragSource = this.blockStart;
    event.dataTransfer.setData(DRAG_DATA_TYPE, String(this.blockStart));
    event.dataTransfer.effectAllowed = "move";
    // DEACTIVATED (kept intentionally): using the whole block as the drag image
    // renders a full-size ghost that follows the cursor and obscures the
    // insertion line, which read as buggy. We now fall back to the browser
    // default drag image (just the small gutter handle), so only the insertion
    // line previews the drop. Re-enable this block to bring back the block-ghost
    // preview.
    // const blockDom = this.view.nodeDOM(this.blockStart);
    // if (blockDom instanceof HTMLElement) {
    //   event.dataTransfer.setDragImage(blockDom, 0, 0);
    // }
  };

  private readonly onDragEnd = (): void => {
    this.dragging = false;
    activeBlockDragSource = null;
    setDropPos(this.view, null);
    this.hide();
  };

  private hide(): void {
    this.cancelHide();
    this.handle.style.display = "none";
    this.blockStart = null;
  }

  destroy(): void {
    this.closeMenu();
    this.cancelHide();
    this.view.dom.removeEventListener("mousemove", this.onMouseMove);
    this.view.dom.removeEventListener("mouseleave", this.scheduleHide);
    this.handle.removeEventListener("dragstart", this.onDragStart);
    this.handle.removeEventListener("dragend", this.onDragEnd);
    this.handle.removeEventListener("click", this.onClick);
    this.handle.removeEventListener("mouseenter", this.cancelHide);
    this.handle.removeEventListener("mouseleave", this.scheduleHide);
    this.handle.remove();
  }
}

export interface DragReorderOptions {
  /** Document default block-spacing multiple, shown as the "Spacing above"
   * placeholder so an unset block reveals the inherited value. */
  defaultSpacingMultiple: number;
}

export const DragReorder = Extension.create<DragReorderOptions>({
  name: "dragReorder",

  addOptions() {
    return { defaultSpacingMultiple: 3 };
  },

  addProseMirrorPlugins() {
    const defaultSpacingMultiple = this.options.defaultSpacingMultiple;
    return [
      new Plugin<DragReorderState>({
        key: dragReorderKey,
        state: {
          init: () => ({ dropPos: null }),
          apply(tr, value) {
            const meta = tr.getMeta(dragReorderKey) as DragReorderState | undefined;
            if (meta !== undefined) {
              return meta;
            }
            // The drop position is a transient pixel-derived value; clear it on
            // any doc change so a stale indicator never lingers.
            if (tr.docChanged && value.dropPos !== null) {
              return { dropPos: null };
            }
            return value;
          },
        },
        view: (editorView) => new GutterHandleView(editorView, defaultSpacingMultiple),
        props: {
          decorations(state) {
            return dropIndicatorDecorations(state);
          },
          handleDOMEvents: {
            dragover(view, event) {
              if (activeBlockDragSource === null) {
                return false;
              }
              // Must preventDefault on dragover or the browser never fires drop.
              event.preventDefault();
              if (event.dataTransfer) {
                event.dataTransfer.dropEffect = "move";
              }
              setDropPos(view, dropPosForEvent(view, event));
              return false;
            },
            dragleave(view, event) {
              // Clear only when the pointer truly leaves the editor surface.
              if (event.relatedTarget === null) {
                setDropPos(view, null);
              }
              return false;
            },
            drop(view, event) {
              const source = activeBlockDragSource;
              if (source === null) {
                return false;
              }
              activeBlockDragSource = null;
              const insertAt = dropPosForEvent(view, event);
              setDropPos(view, null);
              if (insertAt === null) {
                return false;
              }
              const tr = buildMoveTransaction(view.state, source, insertAt);
              if (tr === null) {
                return false;
              }
              event.preventDefault();
              view.dispatch(tr);
              return true;
            },
          },
        },
      }),
    ];
  },
});
