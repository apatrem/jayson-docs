import type { ZodType } from "zod";

/**
 * Schema-only fields stored in the schema-registry.
 * No React, no TipTap, no renderer imports allowed here or in any transitively
 * imported module — enforced by tests/blocks/schema-purity.test.ts.
 *
 * Kept in a separate file so src/blocks/schema-registry.ts can import it
 * without pulling in @tiptap/core (which defineBlock.ts requires for
 * BlockRegistryRecord.tiptapNode).
 */
export interface SchemaEntry {
  schemaName: string;
  schema: ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
}
