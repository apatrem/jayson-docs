#!/usr/bin/env tsx
/**
 * Derives src/setup/layout-spec.json from docs/setup/naming-table.md.
 * Run after editing the naming table: npx tsx scripts/generate-layout-spec.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  LayoutSpec,
  LayoutSpecEntry,
  LayoutSlot,
  RegionKind,
  ShapeDeletion,
  UsageTier,
} from '../src/setup/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const namingTablePath = join(root, 'docs/setup/naming-table.md');
const outputPath = join(root, 'src/setup/layout-spec.json');

const REGION_KINDS = new Set<string>([
  'title',
  'section-title',
  'subtitle',
  'chart-title',
  'content',
  'chart',
  'table',
  'image',
  'source',
  'footer',
]);

function parseGeometry(raw: string): LayoutSlot['match']['geometry'] {
  if (raw === '—' || raw.trim() === '') {
    return undefined;
  }
  const parts: Partial<Record<'x' | 'y' | 'w' | 'h', number>> = {};
  for (const match of raw.matchAll(/([xywh])=([\d.]+)/g)) {
    const axis = match[1];
    if (axis === 'x' || axis === 'y' || axis === 'w' || axis === 'h') {
      parts[axis] = Number(match[2]);
    }
  }
  const { x, y, w, h } = parts;
  if (x === undefined || y === undefined || w === undefined || h === undefined) {
    return undefined;
  }
  return { x, y, w, h };
}

function parseNamingTable(md: string): LayoutSpec {
  const layouts: LayoutSpecEntry[] = [];
  const slideSections = md.split(new RegExp('^### Slide (\\d+) — ', 'm')).slice(1);

  for (let i = 0; i < slideSections.length; i += 2) {
    const slideIndex = Number(slideSections[i]);
    const body = slideSections[i + 1] ?? '';
    const layoutId = new RegExp('^`([^`]+)`', 'm').exec(body)?.[1];
    if (layoutId === undefined) {
      throw new Error(`slide ${slideIndex}: missing layoutId`);
    }

    const tierMatch = new RegExp('\\| Usage tier \\| `([^`]+)` \\|').exec(body);
    const tier = (tierMatch?.[1] ?? 'common') as UsageTier;

    const chartKindMatch = new RegExp('\\| Pinned chart kind \\| `([^`]+)` \\|').exec(body);
    const pinnedChartKind = chartKindMatch?.[1];

    const slots: LayoutSlot[] = [];
    const tableRows = body.split('\n').filter((line) => line.startsWith('|') && !line.includes('---'));
    let inShapeTable = false;

    for (const row of tableRows) {
      const cols = row
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());
      if (cols[0] === 'Current `cNvPr` name') {
        inShapeTable = true;
        continue;
      }
      if (!inShapeTable || cols.length < 6) {
        continue;
      }
      const currentShapeName = cols[0] ?? '';
      const placeholder = cols[1] ?? '';
      const masterText = cols[2] ?? '';
      const geometryRaw = cols[3] ?? '';
      const slotName = cols[4] ?? '';
      const regionKind = cols[5] ?? '';
      const notes = cols[6] ?? '';
      if (!slotName.startsWith('slot.')) {
        continue;
      }
      if (!REGION_KINDS.has(regionKind)) {
        throw new Error(`slide ${slideIndex} slot ${slotName}: unknown region kind ${regionKind}`);
      }

      const chartKindFromNotes = /chart kind:\s*([\w-]+)/.exec(notes)?.[1];
      slots.push({
        slotName,
        regionKind: regionKind as RegionKind,
        chartKind: chartKindFromNotes ?? (regionKind === 'chart' ? pinnedChartKind : undefined),
        match: {
          currentShapeName,
          placeholder: placeholder === '—' ? undefined : placeholder,
          masterText: masterText === '—' ? undefined : masterText,
          geometry: parseGeometry(geometryRaw),
        },
      });
    }

    if (slots.length === 0) {
      throw new Error(`slide ${slideIndex} (${layoutId}): no slots parsed`);
    }

    layouts.push({
      layoutId,
      tier,
      sourceSlideIndex: slideIndex,
      pinnedChartKind,
      slots,
    });
  }

  const layoutIds = layouts.map((l) => l.layoutId);
  const uniqueIds = new Set(layoutIds);
  if (uniqueIds.size !== layoutIds.length) {
    const dupes = layoutIds.filter((id, idx) => layoutIds.indexOf(id) !== idx);
    throw new Error(`duplicate layoutIds: ${[...new Set(dupes)].join(', ')}`);
  }
  if (layouts.length !== 50) {
    throw new Error(`expected 50 layouts, got ${layouts.length}`);
  }

  return { templateId: 'report.master.pptx', layouts };
}

function parseDeletions(md: string): ShapeDeletion[] {
  const section = md.split('## Deletions')[1];
  if (section === undefined) {
    return [];
  }
  const body = section.split('\n---\n')[0] ?? '';
  const deletions: ShapeDeletion[] = [];
  let inTable = false;
  for (const row of body.split('\n').filter((line) => line.startsWith('|'))) {
    const cols = row
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    if (cols[0] === 'Slide') {
      inTable = true;
      continue;
    }
    if (!inTable || cols.length < 4 || cols[0]?.includes('---')) {
      continue;
    }
    const slideIndex = Number(cols[0]);
    const currentShapeName = cols[1] ?? '';
    const masterText = cols[2] === '—' ? undefined : cols[2];
    const reason = cols[3] ?? '';
    deletions.push({
      sourceSlideIndex: slideIndex,
      match: { currentShapeName, masterText },
      reason,
    });
  }
  return deletions;
}

export function generateLayoutSpecFromNamingTable(md: string): LayoutSpec {
  const spec = parseNamingTable(md);
  spec.deletions = parseDeletions(md);
  return spec;
}

const isMain =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const checkMode = process.argv.includes('--check');
  const md = readFileSync(namingTablePath, 'utf-8');
  const spec = generateLayoutSpecFromNamingTable(md);
  const serialized = `${JSON.stringify(spec, null, 2)}\n`;

  if (checkMode) {
    const committed = readFileSync(outputPath, 'utf-8');
    if (committed !== serialized) {
      process.stderr.write(
        'FAIL  layout-spec.json drift: regenerate with npx tsx scripts/generate-layout-spec.ts\n',
      );
      process.exit(1);
    }
    process.stdout.write(
      `PASS  layout-spec.json matches naming table (${spec.layouts.length} layouts)\n`,
    );
  } else {
    writeFileSync(outputPath, serialized);
    process.stdout.write(`wrote ${outputPath} (${spec.layouts.length} layouts)\n`);
  }
}
