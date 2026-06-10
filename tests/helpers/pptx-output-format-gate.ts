import { readFile } from 'node:fs/promises';
import { basename, dirname, posix, resolve } from 'node:path';
import { Automizer } from 'pptx-automizer';
import JSZip from 'jszip';
import { activeSlidePaths, readPartText } from './pptx-package.js';

/** Named failure for CI output-format regression guard (T-106). */
export class OutputFormatGateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OutputFormatGateError';
  }
}

interface ParsedRelationship {
  id: string;
  target: string;
  targetMode?: string;
}

function parseRelationships(xml: string): ParsedRelationship[] {
  return [...xml.matchAll(/<Relationship\b([^>]*?)(?:\/>|><\/Relationship>)/g)].map((match) => {
    const attrs = match[1] ?? '';
    const relationship: ParsedRelationship = {
      id: /Id="([^"]+)"/.exec(attrs)?.[1] ?? '',
      target: /Target="([^"]+)"/.exec(attrs)?.[1] ?? '',
    };
    const targetMode = /TargetMode="([^"]+)"/.exec(attrs)?.[1];
    if (targetMode !== undefined) {
      relationship.targetMode = targetMode;
    }
    return relationship;
  });
}

function sourcePartForRelationships(relsPath: string): string {
  if (relsPath === '_rels/.rels') {
    return '';
  }

  const match = /^(.+)\/_rels\/(.+)\.rels$/.exec(relsPath);
  if (match === null) {
    throw new OutputFormatGateError(`unrecognized relationships part: ${relsPath}`);
  }

  return posix.join(match[1] ?? '', match[2] ?? '');
}

function resolveInternalTarget(sourcePart: string, target: string): string {
  if (target.startsWith('/')) {
    return posix.normalize(target.slice(1));
  }

  const sourceDir = sourcePart === '' ? '' : posix.dirname(sourcePart);
  const resolved =
    sourceDir === '' ? posix.normalize(target) : posix.normalize(posix.join(sourceDir, target));
  return resolved.replace(/^\//, '');
}

function assertContentTypesDeclareSlides(contentTypesXml: string, slidePaths: string[]): void {
  for (const slidePath of slidePaths) {
    const partName = `PartName="/${slidePath}"`;
    if (!contentTypesXml.includes(partName)) {
      throw new OutputFormatGateError(
        `[Content_Types].xml missing Override for active slide part: ${slidePath}`,
      );
    }
  }
}

async function assertInternalRelationshipsResolve(zip: JSZip): Promise<void> {
  for (const relsPath of Object.keys(zip.files).filter((path) => path.endsWith('.rels'))) {
    const relsXml = await readPartText(zip, relsPath);
    const sourcePart = sourcePartForRelationships(relsPath);

    for (const relationship of parseRelationships(relsXml)) {
      if (relationship.targetMode === 'External') {
        continue;
      }

      const resolvedTarget = resolveInternalTarget(sourcePart, relationship.target);
      if (zip.file(resolvedTarget) === null) {
        throw new OutputFormatGateError(
          `unresolved internal relationship in ${relsPath}: Id="${relationship.id}" Target="${relationship.target}" -> missing part ${resolvedTarget}`,
        );
      }
    }
  }
}

async function assertAutomizerReload(filePath: string): Promise<void> {
  const absolutePath = resolve(filePath);
  const templateDir = dirname(absolutePath);
  const templateFile = basename(absolutePath);

  try {
    const automizer = new Automizer({
      templateDir,
      removeExistingSlides: true,
      verbosity: 0,
    }).loadRoot(templateFile);
    await automizer.getInfo();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new OutputFormatGateError(`pptx-automizer failed to reload output: ${reason}`);
  }
}

/** CI-only structural guard for emitted `.pptx` archives (T-106). */
export async function assertOutputFormatGate(filePath: string): Promise<void> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(await readFile(filePath));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new OutputFormatGateError(`PPTX archive failed to open: ${reason}`);
  }

  if (zip.file('[Content_Types].xml') === null) {
    throw new OutputFormatGateError('[Content_Types].xml is missing from the PPTX archive');
  }

  const contentTypesXml = await readPartText(zip, '[Content_Types].xml');
  const slidePaths = await activeSlidePaths(zip);
  assertContentTypesDeclareSlides(contentTypesXml, slidePaths);
  await assertInternalRelationshipsResolve(zip);
  await assertAutomizerReload(filePath);
}

/** Returns true when any `.rels` part declares TargetMode="External". */
export async function pptxHasExternalRelationship(filePath: string): Promise<boolean> {
  const zip = await JSZip.loadAsync(await readFile(filePath));
  for (const relsPath of Object.keys(zip.files).filter((path) => path.endsWith('.rels'))) {
    const relsXml = await readPartText(zip, relsPath);
    if (relsXml.includes('TargetMode="External"')) {
      return true;
    }
  }
  return false;
}

/** Append an external hyperlink relationship to one `.rels` part (test helper). */
export async function appendExternalRelationship(
  filePath: string,
  relsPath: string,
  url: string,
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(await readFile(filePath));
  const relsXml = await readPartText(zip, relsPath);
  const injected = relsXml.replace(
    '</Relationships>',
    `<Relationship Id="rId-external-gate-test" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${url}" TargetMode="External"/></Relationships>`,
  );
  zip.file(relsPath, injected);
  return zip.generateAsync({ type: 'nodebuffer' });
}

/** Point one internal relationship at a missing part (negative-test helper). */
export async function corruptInternalRelationshipTarget(
  filePath: string,
  relsPath: string,
  relationshipId: string,
  missingTarget: string,
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(await readFile(filePath));
  const relsXml = await readPartText(zip, relsPath);
  const corrupted = relsXml.replace(
    new RegExp(`(<Relationship\\b[^>]*Id="${relationshipId}"[^>]*Target=")([^"]+)(")`, 'g'),
    `$1${missingTarget}$3`,
  );
  if (corrupted === relsXml) {
    throw new OutputFormatGateError(
      `could not corrupt relationship Id="${relationshipId}" in ${relsPath}`,
    );
  }
  zip.file(relsPath, corrupted);
  return zip.generateAsync({ type: 'nodebuffer' });
}
