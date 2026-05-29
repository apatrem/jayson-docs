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

  constructor(private readonly view: EditorView) {
    const mount = view.dom.parentElement;
    this.mount = mount ?? view.dom;
    if (this.mount instanceof HTMLElement && this.mount.style.position === "") {
      this.mount.style.position = "relative";
    }

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
    this.mount.appendChild(this.handle);

    view.dom.addEventListener("mousemove", this.onMouseMove);
    view.dom.addEventListener("mouseleave", this.onMouseLeave);
  }

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
    const at = this.view.posAtCoords({ left: event.clientX, top: event.clientY });
    const block = at ? findTopLevelBlock(this.view.state.doc, at.pos) : null;
    if (block === null) {
      this.hide();
      return;
    }
    const dom = this.view.nodeDOM(block.start);
    if (!(dom instanceof HTMLElement) || !(this.mount instanceof HTMLElement)) {
      this.hide();
      return;
    }
    const blockRect = dom.getBoundingClientRect();
    const mountRect = this.mount.getBoundingClientRect();
    this.handle.style.top = `${blockRect.top - mountRect.top + this.mount.scrollTop}px`;
    this.handle.style.left = `${blockRect.left - mountRect.left + this.mount.scrollLeft - 22}px`;
    this.handle.style.display = "block";
    this.blockStart = block.start;
  };

  private readonly onMouseLeave = (): void => {
    if (!this.dragging && this.menu === null) {
      this.hide();
    }
  };

  private readonly onDragStart = (event: DragEvent): void => {
    if (this.blockStart === null || event.dataTransfer === null) {
      return;
    }
    this.dragging = true;
    event.dataTransfer.setData(DRAG_DATA_TYPE, String(this.blockStart));
    event.dataTransfer.effectAllowed = "move";
    const blockDom = this.view.nodeDOM(this.blockStart);
    if (blockDom instanceof HTMLElement) {
      event.dataTransfer.setDragImage(blockDom, 0, 0);
    }
  };

  private readonly onDragEnd = (): void => {
    this.dragging = false;
    setDropPos(this.view, null);
    this.hide();
  };

  private hide(): void {
    this.handle.style.display = "none";
    this.blockStart = null;
  }

  destroy(): void {
    this.closeMenu();
    this.view.dom.removeEventListener("mousemove", this.onMouseMove);
    this.view.dom.removeEventListener("mouseleave", this.onMouseLeave);
    this.handle.removeEventListener("dragstart", this.onDragStart);
    this.handle.removeEventListener("dragend", this.onDragEnd);
    this.handle.removeEventListener("click", this.onClick);
    this.handle.remove();
  }
}

export const DragReorder = Extension.create({
  name: "dragReorder",

  addProseMirrorPlugins() {
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
        view: (editorView) => new GutterHandleView(editorView),
        props: {
          decorations(state) {
            return dropIndicatorDecorations(state);
          },
          handleDOMEvents: {
            dragover(view, event) {
              const types = event.dataTransfer?.types;
              if (!types || !Array.from(types).includes(DRAG_DATA_TYPE)) {
                return false;
              }
              event.preventDefault();
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
              const raw = event.dataTransfer?.getData(DRAG_DATA_TYPE);
              if (raw === undefined || raw.length === 0) {
                return false;
              }
              const insertAt = dropPosForEvent(view, event);
              setDropPos(view, null);
              if (insertAt === null) {
                return false;
              }
              const tr = buildMoveTransaction(view.state, Number(raw), insertAt);
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
