import type { Automizer } from 'pptx-automizer';

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
export function loadMaster(_templatePath: string): Automizer {
  // TODO M2: implement.
  // Reference: https://github.com/singerla/pptx-automizer
  //
  //   const automizer = new Automizer({
  //     templateDir: path.dirname(templatePath),
  //     outputDir: path.dirname(outputPath),
  //   });
  //   automizer.loadRoot(path.basename(templatePath));
  //   return automizer;
  throw new Error('M2 not implemented');
}
