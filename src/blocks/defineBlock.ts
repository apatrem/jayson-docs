import type { Node } from "@tiptap/core";
import type { ComponentType } from "react";
import type { ZodType } from "zod";
import type { ProseMirrorNode } from "../editor/mapping";

/**
 * Schema-only fields stored in the schema-registry.
 * No React, no TipTap, no renderer imports allowed here or in any transitively
 * imported module — enforced by tests/blocks/schema-purity.test.ts.
 */
export interface SchemaEntry {
  schemaName: string;
  schema: ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
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
  };
}
