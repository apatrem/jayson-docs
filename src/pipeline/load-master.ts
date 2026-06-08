import { existsSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import Automizer from 'pptx-automizer';
import { MasterError } from './errors.js';

/** Alias used when registering the master for `addSlide` copy operations. */
export const MASTER_TEMPLATE_ALIAS = 'master';

/**
 * Loads the master .pptx that defines the brand and the closed library of
 * slide layouts.
 *
 * The master is read once per pipeline invocation. See docs/ARCHITECTURE.md
 * §4 step 1, and docs/BUILD_BRIEF.md M2.
 *
 * Error contract: see ERROR_HANDLING.md ("master").
 *
 * @param templatePath absolute path to the master .pptx
 * @returns configured Automizer ready to compose output slides
 */
export function loadMaster(templatePath: string): Automizer {
  const absolutePath = resolve(templatePath);

  if (extname(absolutePath).toLowerCase() !== '.pptx') {
    throw new MasterError(`master template must be a .pptx file: ${absolutePath}`);
  }

  if (!existsSync(absolutePath)) {
    throw new MasterError(`master template not found: ${absolutePath}`);
  }

  const templateFile = basename(absolutePath);
  const templateDir = resolve(absolutePath, '..');

  try {
    return new Automizer({
      templateDir,
      removeExistingSlides: true,
      verbosity: 0,
    })
      .loadRoot(templateFile)
      .load(templateFile, MASTER_TEMPLATE_ALIAS);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new MasterError(`failed to load master template ${absolutePath}: ${reason}`);
  }
}
