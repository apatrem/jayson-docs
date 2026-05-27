/**
 * src/blocks/diagram/index.ts — runtime manifest for the Diagram block.
 *
 * Legacy-wrapper approach (T-141): imports the existing editor node and renderer
 * and wraps them in a defineBlock({...}) manifest. The per-block migration task
 * (T-14x) will fold the legacy files into this folder.
 *
 * Default-exports the BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 */

import type { DiagramBlock } from "./schema";
import { DiagramBlockSchema } from "./schema";
import type { ZodType } from "zod";
import {
  DiagramTipTapNode,
  diagramBlockToProseMirror,
  proseMirrorToDiagramBlock,
} from "../../editor/nodes/DiagramNode";
import { Diagram } from "../../renderer/blocks/Diagram";
import { defineBlock } from "../defineBlock";
import type { ProseMirrorNode } from "../../editor/mapping";

const diagramBlock = defineBlock<DiagramBlock>({ 
  schemaName: "diagram",
  // Cast: schema._input allows undefined for .default() fields; _output matches TBlock
  schema: DiagramBlockSchema as ZodType<DiagramBlock>,
  allowedAttrs: ["source", "title", "caption", "width", "note"] as const,
  paletteLabel: "Diagram",
  tiptapNode: DiagramTipTapNode,
  renderer: Diagram,
  toPm: (block) => diagramBlockToProseMirror(block) as ProseMirrorNode,
  // Cast via unknown: ProseMirrorNode.attrs is Record<string,unknown>;
  // the specific PmNode type narrows that to the node's actual attrs.
  fromPm: (node) => proseMirrorToDiagramBlock(node as unknown as Parameters<typeof proseMirrorToDiagramBlock>[0]),
});

export default diagramBlock;
