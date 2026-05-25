import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

export interface DragReorderOptions {
  blockSelector: string;
  handleSelector: string;
}

export interface DragReorderAttrs {
  sourceIndex: number;
  targetIndex: number;
}

export const DragReorder = Extension.create<DragReorderOptions>({
  name: "dragReorder",

  addOptions() {
    return {
      blockSelector: "[data-block-id]",
      handleSelector: "[data-drag-handle]",
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    return [
      new Plugin({
        key: new PluginKey("dragReorder"),
        props: {
          handleDOMEvents: {
            dragstart(view, event) {
              const handle = closestElement(event.target, options.handleSelector);
              if (handle === null) {
                return false;
              }
              const block = handle.closest(options.blockSelector);
              if (!(block instanceof HTMLElement)) {
                return false;
              }
              const sourcePos = safePosAtElement(view, block);
              if (sourcePos === null) {
                return false;
              }
              event.dataTransfer?.setData("application/x-docsystem-block-pos", String(sourcePos));
              event.dataTransfer?.setData("text/plain", block.getAttribute("data-block-id") ?? "");
              event.dataTransfer?.setDragImage(block, 0, 0);
              return false;
            },
            drop(view, event) {
              const rawSourcePos = event.dataTransfer?.getData(
                "application/x-docsystem-block-pos",
              );
              if (rawSourcePos === undefined || rawSourcePos.length === 0) {
                return false;
              }
              const sourcePos = Number(rawSourcePos);
              const target = closestElement(event.target, options.blockSelector);
              if (target === null || !Number.isInteger(sourcePos)) {
                return false;
              }
              const targetPos = safePosAtElement(view, target);
              if (targetPos === null || targetPos === sourcePos) {
                return false;
              }
              moveNode(view, sourcePos, targetPos);
              event.preventDefault();
              return true;
            },
          },
        },
      }),
    ];
  },
});

export function reorderBlocks<T>(blocks: T[], attrs: DragReorderAttrs): T[] {
  const { sourceIndex, targetIndex } = attrs;
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

function moveNode(view: EditorView, sourcePos: number, targetPos: number): void {
  const sourceNode = view.state.doc.nodeAt(sourcePos);
  if (sourceNode === null) {
    return;
  }
  const adjustedTarget =
    sourcePos < targetPos ? targetPos - sourceNode.nodeSize : targetPos;
  const transaction = view.state.tr
    .delete(sourcePos, sourcePos + sourceNode.nodeSize)
    .insert(adjustedTarget, sourceNode);
  view.dispatch(transaction.scrollIntoView());
}

function safePosAtElement(view: EditorView, element: Element): number | null {
  try {
    return view.posAtDOM(element, 0);
  } catch {
    return null;
  }
}

function closestElement(target: EventTarget | null, selector: string): HTMLElement | null {
  return target instanceof HTMLElement ? target.closest(selector) : null;
}
