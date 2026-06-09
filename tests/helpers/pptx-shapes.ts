import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { activeSlidePaths, readPartText, shapeBlockFromSlideXml } from './pptx-package.js';

/**
 * Extract visible text from a named shape on a slide XML fragment.
 * Returns undefined when the shape name is absent.
 */
function shapeTextFromSlideXml(slideXml: string, shapeName: string): string | undefined {
  const shapeBlock = shapeBlockFromSlideXml(slideXml, shapeName);

  if (shapeBlock === undefined) {
    return undefined;
  }

  const textRuns = [...shapeBlock.matchAll(/<a:t(?:[^>]*)>([^<]*)<\/a:t>/g)].map(
    (match) => match[1] ?? '',
  );

  return textRuns.join('');
}

/**
 * Read all slide shape texts keyed by PowerPoint shape name from a .pptx file.
 */
export async function readPptxShapeTexts(filePath: string): Promise<Map<string, string>> {
  const zip = await JSZip.loadAsync(await readFile(filePath));
  const shapeTexts = new Map<string, string>();

  const slidePaths = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort();

  for (const slidePath of slidePaths) {
    const slideFile = zip.file(slidePath);
    if (slideFile === null) {
      continue;
    }

    const slideXml = await slideFile.async('string');
    const shapeNames = [...slideXml.matchAll(/<p:cNvPr[^>]*name="(slot\.[^"]+)"/g)].map(
      (match) => match[1] ?? '',
    );

    for (const shapeName of shapeNames) {
      if (shapeName === '') {
        continue;
      }

      const text = shapeTextFromSlideXml(slideXml, shapeName);
      if (text !== undefined) {
        // Later slides win — removeExistingSlides leaves orphan XML from the root.
        shapeTexts.set(shapeName, text);
      }
    }
  }

  return shapeTexts;
}

/** Read named shape texts for each active slide in presentation order. */
export async function readPptxShapeTextsBySlide(filePath: string): Promise<Map<string, string>[]> {
  const zip = await JSZip.loadAsync(await readFile(filePath));
  const slides: Map<string, string>[] = [];

  for (const slidePath of await activeSlidePaths(zip)) {
    const slideXml = await readPartText(zip, slidePath);
    const texts = new Map<string, string>();
    const shapeNames = [...slideXml.matchAll(/<p:cNvPr[^>]*name="(slot\.[^"]+)"/g)].map(
      (match) => match[1] ?? '',
    );

    for (const shapeName of shapeNames) {
      const text = shapeTextFromSlideXml(slideXml, shapeName);
      if (shapeName !== '' && text !== undefined) {
        texts.set(shapeName, text);
      }
    }
    slides.push(texts);
  }

  return slides;
}

/** Read one named shape's raw XML from an active slide. */
export async function readPptxShapeXml(
  filePath: string,
  shapeName: string,
  slideIndex = 0,
): Promise<string> {
  const zip = await JSZip.loadAsync(await readFile(filePath));
  const slidePath = (await activeSlidePaths(zip))[slideIndex];
  if (slidePath === undefined) {
    throw new Error(`active slide not found at index ${slideIndex}`);
  }
  const block = shapeBlockFromSlideXml(await readPartText(zip, slidePath), shapeName);
  if (block === undefined) {
    throw new Error(`shape not found on active slide ${slideIndex}: ${shapeName}`);
  }
  return block;
}

/** Count slides listed in presentation.xml (what PowerPoint actually opens). */
export async function countPresentationSlides(filePath: string): Promise<number> {
  const zip = await JSZip.loadAsync(await readFile(filePath));
  const presentationFile = zip.file('ppt/presentation.xml');
  if (presentationFile === null) {
    return 0;
  }

  const presentationXml = await presentationFile.async('string');
  return [...presentationXml.matchAll(/<p:sldId\b/g)].length;
}
