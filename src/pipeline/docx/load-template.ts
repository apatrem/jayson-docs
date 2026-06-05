/**
 * DOCX pipeline — load the master `.docx`.
 *
 * Uses dolanmiu/docx's `patchDocument` API for template-fill (it accepts an
 * existing .docx and a patches map). See docs/DECISIONS_LOG.md D3 for why
 * dolanmiu/docx over docxtemplater.
 *
 * Reference: https://docx.js.org/api/functions/patchDocument.html
 */

export function loadDocxTemplate(_templatePath: string): Buffer {
  // TODO M4: implement.
  //   return readFileSync(templatePath);
  throw new Error('M4 not implemented');
}
