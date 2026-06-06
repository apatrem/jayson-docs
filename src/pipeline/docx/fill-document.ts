import type { FillPlan } from '@schema/index.js';

/**
 * DOCX pipeline — POST-v1 (DECISIONS_LOG D20). Not implemented or accepted in
 * v1 (v1 is the report-pptx skeleton).
 *
 * When DOCX is scoped: maps each section to a `patchDocument` patch entry
 * (default `{placeholder}` syntax). NB: dolanmiu/docx has **no native chart
 * classes** (D21) — a DOCX chart approach (PPT copy-paste, or the paid
 * docxtemplater module) is unresolved; do not assume native charts.
 */
// eslint-disable-next-line @typescript-eslint/require-await -- async stub; body lands post-v1 (D20)
export async function fillDocx(_templateBuffer: Buffer, _fillPlan: FillPlan): Promise<Buffer> {
  // Post-v1 (D20): implement when DOCX is scoped.
  //
  // Pattern (sketch):
  //   import { patchDocument, PatchType, TextRun } from 'docx';
  //   const patches: Record<string, { type: PatchType; children: TextRun[] }> = {};
  //   for each section in fillPlan.sections, for each block in section.blocks:
  //     patches[slot.name] = { type: PatchType.PARAGRAPH, children: [new TextRun(block.text)] };
  //   return await patchDocument({ outputType: 'nodebuffer', data: templateBuffer, patches });
  throw new Error('DOCX pipeline is post-v1 (D20)');
}
