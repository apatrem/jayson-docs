import type { Automizer } from 'pptx-automizer';

/**
 * Writes the composed presentation to disk as a native .pptx.
 *
 * The save step is the last step and is treated as atomic from the
 * consultant's view — either the file is written cleanly or it is not
 * written at all. Do not produce a partial file.
 *
 * Errors: ERROR_HANDLING.md ("save").
 */
// eslint-disable-next-line @typescript-eslint/require-await -- async stub; body (awaits automizer.write) lands in M2
export async function saveOutput(_automizer: Automizer, _outputPath: string): Promise<void> {
  // TODO M2: implement.
  //
  // Pattern (sketch):
  //   await automizer.write(path.basename(outputPath));
  throw new Error('M2 not implemented');
}
