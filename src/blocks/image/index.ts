/**
 * src/blocks/image/index.ts — runtime manifest for the Image block.
 *
 * Legacy-wrapper approach (T-141): imports the existing editor node and renderer
 * and wraps them in a defineBlock({...}) manifest. The per-block migration task
 * (T-14x) will fold the legacy files into this folder.
 *
 * Default-exports the BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 */

import type { ImageBlock } from "./schema";
import { ImageBlockSchema } from "./schema";
import type { ZodType } from "zod";
import type { ComponentType } from "react";
import {
  ImageTipTapNode,
  imageBlockToProseMirror,
  proseMirrorToImageBlock,
} from "../../editor/nodes/ImageNode";
import { Image } from "../../renderer/blocks/Image";
import { defineBlock } from "../defineBlock";
import type { ProseMirrorNode } from "../../editor/mapping";

const imageBlock = defineBlock<ImageBlock>({ 
  schemaName: "image",
  // Cast: schema._input allows undefined for .default() fields; _output matches TBlock
  schema: ImageBlockSchema as ZodType<ImageBlock>,
  allowedAttrs: ["src", "alt", "caption", "width", "align", "note"] as const,
  paletteLabel: "Image",
  tiptapNode: ImageTipTapNode,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderer: Image as ComponentType<{ block: any }>,  // legacy renderer requires extra props (e.g. assetContext); document renderer supplies them — see T-157b
  toPm: (block) => imageBlockToProseMirror(block) as ProseMirrorNode,
  // Cast via unknown: ProseMirrorNode.attrs is Record<string,unknown>;
  // the specific PmNode type narrows that to the node's actual attrs.
  fromPm: (node) => proseMirrorToImageBlock(node as unknown as Parameters<typeof proseMirrorToImageBlock>[0]),
});

export default imageBlock;
