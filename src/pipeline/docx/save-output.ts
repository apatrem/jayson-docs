import { writeFileSync } from 'node:fs';

/**
 * DOCX pipeline — write the patched buffer to disk.
 *
 * Atomic: either the file is written cleanly or it is not written at all.
 * Errors: see ERROR_HANDLING.md ("save").
 */
export function saveDocx(buffer: Buffer, outputPath: string): void {
  writeFileSync(outputPath, buffer);
}
