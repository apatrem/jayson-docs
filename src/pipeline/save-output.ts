import { randomBytes } from 'node:crypto';
import { rename, unlink } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import type Automizer from 'pptx-automizer';
import { SaveError } from './errors.js';

/**
 * Writes the composed presentation to disk as a native .pptx.
 *
 * The save step is the last step and is treated as atomic from the
 * consultant's view — either the file is written cleanly or it is not
 * written at all. Do not produce a partial file.
 *
 * Errors: ERROR_HANDLING.md ("save").
 */
export async function saveOutput(automizer: Automizer, outputPath: string): Promise<void> {
  const absolutePath = resolve(outputPath);
  const outputDir = dirname(absolutePath);
  const fileName = basename(absolutePath);
  const tempFileName = `.${fileName}.${randomBytes(8).toString('hex')}.tmp`;
  const tempPath = join(outputDir, tempFileName);

  automizer.outputDir = `${outputDir}/`;

  try {
    await automizer.write(tempFileName);
    await rename(tempPath, absolutePath);
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    const reason = error instanceof Error ? error.message : String(error);
    throw new SaveError(`failed to save output ${absolutePath}: ${reason}`, { cause: error });
  }
}
