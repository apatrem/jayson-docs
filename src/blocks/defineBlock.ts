import type { Node } from "@tiptap/core";
import type { ComponentType } from "react";
import type { ZodType } from "zod";
import type { ProseMirrorNode } from "../editor/mapping";

// SchemaEntry lives in schema-entry-type.ts so schema-registry.ts can import
// it without pulling in @tiptap/core.  Re-exported here for backwards compat.
import type { SchemaEntry } from "./schema-entry-type";
export type { SchemaEntry };

/**
 * Props every structured-block side panel receives. DocumentView mounts the
 * panel when the block is node-selected; `onUpdate` commits the edited block
 * back to the editor (attrs-only), `onClose` dismisses the panel.
 */
export interface BlockPanelProps<TBlock> {
  block: TBlock;
  onUpdate: (next: TBlock) => void;
  onClose: () => void;
}

/**
 * Full runtime record stored in the runtime-registry.
 * Extends SchemaEntry with editor and renderer wiring.
 */
export interface BlockRegistryRecord extends SchemaEntry {
  tiptapNode: Node;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderer: ComponentType<{ block: any }>;
  toPm: (block: unknown) => ProseMirrorNode;
  fromPm: (node: ProseMirrorNode) => unknown;
  /**
   * Optional data-editing side panel. When present, selecting the block in the
   * editor mounts this panel (see DocumentView). Blocks whose data is fully
   * captured in attrs (most of them) round-trip via toPm/fromPm; rich-text body
   * content (e.g. callout) stays inline-edited and is preserved across panel
   * updates because updateAttributes only touches attrs.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  panel?: ComponentType<BlockPanelProps<any>>;
}

/**
 * Factory for defining a Standard-tier block.
 *
 * Returns a BlockRegistryRecord that the two registries split:
 *   - schema-registry stores the SchemaEntry subset (pure, no UI deps)
 *   - runtime-registry stores the full BlockRegistryRecord
 */
export function defineBlock<TBlock>(input: {
  schemaName: string;
  schema: ZodType<TBlock>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
  tiptapNode: Node;
  renderer: ComponentType<{ block: TBlock }>;
  toPm: (block: TBlock) => ProseMirrorNode;
  fromPm: (node: ProseMirrorNode) => TBlock;
  panel?: ComponentType<BlockPanelProps<TBlock>>;
}): BlockRegistryRecord {
  return {
    schemaName: input.schemaName,
    schema: input.schema as ZodType<unknown>,
    allowedAttrs: input.allowedAttrs,
    paletteLabel: input.paletteLabel,
    tiptapNode: input.tiptapNode,
    renderer: input.renderer as BlockRegistryRecord["renderer"],
    toPm: input.toPm as (block: unknown) => ProseMirrorNode,
    fromPm: input.fromPm as (node: ProseMirrorNode) => unknown,
    ...(input.panel !== undefined
      ? { panel: input.panel as NonNullable<BlockRegistryRecord["panel"]> }
      : {}),
  };
}
