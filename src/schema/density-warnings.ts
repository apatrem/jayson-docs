import {
  REGION_CAPS,
  formatDensityWarning,
  isWithinOptimalWords,
  wordCount,
  type RegionKey,
} from './caps.js';
import type { FillPlan } from './index.js'; // type-only — no runtime cycle
import type { Slide } from './slide.js';

interface SubtitleBlock {
  kind: 'text' | 'callout';
  body: string;
}

interface BulletsBlock {
  kind: 'bullets';
  items: string[];
}

interface TextBlock {
  kind: 'text';
  body: string;
}

interface CalloutBlock {
  kind: 'callout';
  body: string;
}

interface ImageBlock {
  kind: 'image';
  ref: string;
  caption?: string | undefined;
}

interface ChartWrapper {
  kind: 'chart';
  chart: { caption?: string | undefined };
}

type ContentBlock = BulletsBlock | TextBlock | CalloutBlock | ImageBlock | ChartWrapper;

function isSubtitleBlock(value: unknown): value is SubtitleBlock {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    (record.kind === 'text' || record.kind === 'callout') && typeof record.body === 'string'
  );
}

function isContentBlock(value: unknown): value is ContentBlock {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.kind === 'string';
}

function warnWordField(field: string, text: string, region: RegionKey, warnings: string[]): void {
  const cap = REGION_CAPS[region];
  if (cap.unit !== 'words') {
    return;
  }
  const count = wordCount(text);
  if (count <= cap.max && !isWithinOptimalWords(text, cap)) {
    warnings.push(formatDensityWarning(field, count, 'words', region));
  }
}

function warnCaption(field: string, caption: string, warnings: string[]): void {
  const cap = REGION_CAPS.caption;
  const length = caption.length;
  if (length > cap.optimal.max && length <= cap.max) {
    warnings.push(formatDensityWarning(field, length, 'chars', 'caption'));
  }
}

function warnBullets(field: string, items: string[], warnings: string[]): void {
  const cap = REGION_CAPS['content-bullets'];
  const itemCount = items.length;
  const words = wordCount(items.join(' '));

  if (itemCount > cap.max.maxItems || words > cap.max.maxWords) {
    return;
  }

  if (itemCount > cap.optimal.maxItems) {
    warnings.push(
      `warning: ${field} has ${itemCount} items (optimal ≤${cap.optimal.maxItems}, max ${cap.max.maxItems})`,
    );
  }
  if (words > cap.optimal.maxWords) {
    warnings.push(
      `warning: ${field} is ${words} words (optimal ≤${cap.optimal.maxWords}, max ${cap.max.maxWords})`,
    );
  }
}

function warnContentBlock(field: string, block: ContentBlock, warnings: string[]): void {
  switch (block.kind) {
    case 'bullets':
      warnBullets(field, block.items, warnings);
      break;
    case 'text':
      warnWordField(field, block.body, 'content-text', warnings);
      break;
    case 'callout':
      warnWordField(field, block.body, 'content-callout', warnings);
      break;
    case 'image':
      if (block.caption !== undefined) {
        warnCaption(`${field} caption`, block.caption, warnings);
      }
      break;
    case 'chart':
      if (block.chart.caption !== undefined) {
        warnCaption(`${field} caption`, block.chart.caption, warnings);
      }
      break;
    default:
      break;
  }
}

function warnChartCaption(field: string, chart: { caption?: string | undefined }, warnings: string[]): void {
  if (chart.caption !== undefined) {
    warnCaption(field, chart.caption, warnings);
  }
}

const SUBTITLE_KEYS = new Set([
  'subtitle',
  'subtitle-left',
  'subtitle-right',
  'subtitle-middle',
  'subtitle-1',
  'subtitle-2',
]);

const CONTENT_KEYS = new Set([
  'body-left',
  'body-right',
  'body-center',
  'body',
  'narrative',
]);

function walkSlide(slide: Slide, warnings: string[]): void {
  const layoutId = slide.layoutId;

  for (const [key, value] of Object.entries(slide)) {
    if (key === 'layoutId') {
      continue;
    }

    if (key === 'title' && typeof value === 'string') {
      warnWordField('title', value, 'title', warnings);
      continue;
    }

    if (key === 'section-title' && typeof value === 'string') {
      warnWordField('section-title', value, 'section-title', warnings);
      continue;
    }

    if (key === 'chart-title' && typeof value === 'string') {
      warnWordField('chart-title', value, 'chart-title', warnings);
      continue;
    }

    if (key === 'source' && typeof value === 'string') {
      warnWordField('source', value, 'source', warnings);
      continue;
    }

    if (SUBTITLE_KEYS.has(key) && isSubtitleBlock(value)) {
      warnWordField(key, value.body, 'subtitle', warnings);
      continue;
    }

    if (key === 'body' && typeof value === 'string' && (layoutId === 'cover' || layoutId === 'cover-white')) {
      warnWordField('body', value, 'cover-body', warnings);
      continue;
    }

    if (CONTENT_KEYS.has(key) && isContentBlock(value)) {
      warnContentBlock(key, value, warnings);
      continue;
    }

    if (key === 'body' && isContentBlock(value)) {
      warnContentBlock('body', value, warnings);
      continue;
    }

    if (key === 'chart' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      warnChartCaption('chart caption', value as { caption?: string | undefined }, warnings);
      continue;
    }

    if (key === 'image' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const image = value as { caption?: string | undefined };
      if (image.caption !== undefined) {
        warnCaption('image caption', image.caption, warnings);
      }
    }
  }
}

/** Collect non-blocking density warnings for a validated fill-plan. */
export function collectDensityWarnings(plan: FillPlan): string[] {
  const warnings: string[] = [];

  if (plan.kind !== 'deck') {
    return warnings;
  }

  for (const section of plan.sections) {
    for (const slide of section.slides) {
      walkSlide(slide, warnings);
    }
  }

  return warnings;
}
