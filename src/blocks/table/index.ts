/**
 * src/blocks/table/index.ts — runtime manifest for the Table block.
 *
 * Legacy-wrapper approach (T-141): imports the existing editor node and renderer
 * and wraps them in a defineBlock({...}) manifest. The per-block migration task
 * (T-14x) will fold the legacy files into this folder.
 *
 * Default-exports the BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 */

import type { TableBlock } from "./schema";
import { TableBlockDataSchema } from "./schema";
import type { ZodType } from "zod";
import {
  DocTableTipTapNode,
  tableBlockToProseMirror,
  proseMirrorToTableBlock,
} from "../../editor/nodes/TableNode";
import { Table } from "../../renderer/blocks/Table";
import { defineBlock } from "../defineBlock";
import type { ProseMirrorNode } from "../../editor/mapping";

const tableBlock = defineBlock<TableBlock>({ 
  schemaName: "table",
  // Cast: schema._input allows undefined for .default() fields; _output matches TBlock
  schema: TableBlockDataSchema as ZodType<TableBlock>,
  allowedAttrs: ["columns", "rows", "caption", "note"] as const,
  paletteLabel: "Table",
  tiptapNode: DocTableTipTapNode,
  renderer: Table,
  toPm: (block) => tableBlockToProseMirror(block) as ProseMirrorNode,
  // Cast via unknown: ProseMirrorNode.attrs is Record<string,unknown>;
  // the specific PmNode type narrows that to the node's actual attrs.
  fromPm: (node) => proseMirrorToTableBlock(node as unknown as Parameters<typeof proseMirrorToTableBlock>[0]),
});

export default tableBlock;
