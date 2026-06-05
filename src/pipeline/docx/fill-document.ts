import type { FillPlan } from '@schema/index.js';

/**
 * DOCX pipeline — fill the master with a fill-plan.
 *
 * Maps each section in the fill-plan to a patch entry consumed by
 * dolanmiu/docx's `patchDocument`. Placeholder syntax in the master is the
 * default `{placeholder}` form unless overridden.
 *
 * Charts: built natively by dolanmiu/docx's chart classes. See
 * CHART_CATALOGUE.md for per-kind shape.
 */
// eslint-disable-next-line @typescript-eslint/require-await -- async stub; body (awaits patchDocument) lands in M4
export async function fillDocx(_templateBuffer: Buffer, _fillPlan: FillPlan): Promise<Buffer> {
  // TODO M4: implement.
  //
  // Pattern (sketch):
  //   import { patchDocument, PatchType, TextRun } from 'docx';
  //   const patches: Record<string, { type: PatchType; children: TextRun[] }> = {};
  //   for each section in fillPlan.sections, for each block in section.blocks:
  //     patches[slot.name] = { type: PatchType.PARAGRAPH, children: [new TextRun(block.text)] };
  //   return await patchDocument({ outputType: 'nodebuffer', data: templateBuffer, patches });
  throw new Error('M4 not implemented');
}
