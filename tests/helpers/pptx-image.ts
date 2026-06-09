import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import {
  activeSlidePaths,
  relationshipTarget,
  shapeBlockFromSlideXml,
  readPartText,
} from './pptx-package.js';

/** Read the media bytes referenced by a named image shape. */
export async function readPptxImageBytesForShape(
  filePath: string,
  shapeName: string,
  slideIndex = 0,
): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(await readFile(filePath));
  const slidePath = (await activeSlidePaths(zip))[slideIndex];
  if (slidePath === undefined) {
    throw new Error(`active slide not found at index ${slideIndex}`);
  }

  const shapeBlock = shapeBlockFromSlideXml(await readPartText(zip, slidePath), shapeName);
  const relationshipId = /r:embed="([^"]+)"/.exec(shapeBlock ?? '')?.[1];
  if (relationshipId === undefined) {
    throw new Error(`image relationship not found for shape: ${shapeName}`);
  }

  const mediaPart = await relationshipTarget(zip, slidePath, relationshipId);
  const media = zip.file(mediaPart);
  if (media === null) {
    throw new Error(`image media part not found: ${mediaPart}`);
  }
  return media.async('uint8array');
}
