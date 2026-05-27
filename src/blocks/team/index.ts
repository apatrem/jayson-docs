/**
 * src/blocks/team/index.ts — runtime manifest for the Team block.
 *
 * Legacy-wrapper approach (T-141): imports the existing editor node and renderer
 * and wraps them in a defineBlock({...}) manifest. The per-block migration task
 * (T-14x) will fold the legacy files into this folder.
 *
 * Default-exports the BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 */

import type { TeamBlock } from "./schema";
import { TeamBlockSchema } from "./schema";
import type { ZodType } from "zod";
import type { ComponentType } from "react";
import {
  TeamTipTapNode,
  teamBlockToProseMirror,
  proseMirrorToTeamBlock,
} from "../../editor/nodes/TeamNode";
import { Team } from "../../renderer/blocks/Team";
import { defineBlock } from "../defineBlock";
import type { ProseMirrorNode } from "../../editor/mapping";

const teamBlock = defineBlock<TeamBlock>({ 
  schemaName: "team",
  // Cast: schema._input allows undefined for .default() fields; _output matches TBlock
  schema: TeamBlockSchema as ZodType<TeamBlock>,
  allowedAttrs: ["layout", "members", "note"] as const,
  paletteLabel: "Team",
  tiptapNode: TeamTipTapNode,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderer: Team as ComponentType<{ block: any }>,  // legacy renderer requires extra props (e.g. assetContext); document renderer supplies them — see T-157b
  toPm: (block) => teamBlockToProseMirror(block) as ProseMirrorNode,
  // Cast via unknown: ProseMirrorNode.attrs is Record<string,unknown>;
  // the specific PmNode type narrows that to the node's actual attrs.
  fromPm: (node) => proseMirrorToTeamBlock(node as unknown as Parameters<typeof proseMirrorToTeamBlock>[0]),
});

export default teamBlock;
