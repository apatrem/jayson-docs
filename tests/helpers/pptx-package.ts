import { posix } from 'node:path';
import type JSZip from 'jszip';

async function readZipText(zip: JSZip, path: string): Promise<string> {
  const file = zip.file(path);
  if (file === null) {
    throw new Error(`PPTX part not found: ${path}`);
  }
  return file.async('string');
}

function relationshipMap(xml: string): Map<string, string> {
  return new Map(
    [...xml.matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((match) => [
      match[1] ?? '',
      match[2] ?? '',
    ]),
  );
}

/** Return slide XML paths in presentation order, excluding orphaned root slides. */
export async function activeSlidePaths(zip: JSZip): Promise<string[]> {
  const presentationXml = await readZipText(zip, 'ppt/presentation.xml');
  const relsXml = await readZipText(zip, 'ppt/_rels/presentation.xml.rels');
  const rels = relationshipMap(relsXml);

  return [...presentationXml.matchAll(/<p:sldId\b[^>]*r:id="([^"]+)"/g)].map((match) => {
    const relationshipId = match[1] ?? '';
    const target = rels.get(relationshipId);
    if (target === undefined) {
      throw new Error(`presentation relationship not found: ${relationshipId}`);
    }
    return posix.normalize(posix.join('ppt', target));
  });
}

/** Resolve a relationship target relative to its owning OOXML part. */
export async function relationshipTarget(
  zip: JSZip,
  sourcePart: string,
  relationshipId: string,
): Promise<string> {
  const sourceDir = posix.dirname(sourcePart);
  const relsPath = posix.join(sourceDir, '_rels', `${posix.basename(sourcePart)}.rels`);
  const rels = relationshipMap(await readZipText(zip, relsPath));
  const target = rels.get(relationshipId);
  if (target === undefined) {
    throw new Error(`${sourcePart} relationship not found: ${relationshipId}`);
  }
  return posix.normalize(posix.join(sourceDir, target));
}

/** Extract one named shape's complete XML block from a slide. */
export function shapeBlockFromSlideXml(slideXml: string, shapeName: string): string | undefined {
  const escaped = shapeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `<p:cNvPr[^>]*name="${escaped}"[\\s\\S]*?(?:</p:sp>|</p:pic>|</p:graphicFrame>)`,
  ).exec(slideXml)?.[0];
}

export async function readPartText(zip: JSZip, path: string): Promise<string> {
  return readZipText(zip, path);
}
