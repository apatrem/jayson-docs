import { readFile } from 'node:fs/promises';
import { basename, dirname, normalize, join as joinPath } from 'node:path';
import JSZip from 'jszip';
import {
  activeSlidePaths,
  readPartText,
  relationshipTarget,
  shapeBlockFromSlideXml,
} from './pptx-package.js';

export interface PptxBubblePoint {
  series: string;
  x: number;
  y: number;
  size: number;
}

export interface PptxChartData {
  series: string[];
  categories: string[];
  /** values[categoryIndex][seriesIndex] */
  values: number[][];
  bubbles?: PptxBubblePoint[];
}

/**
 * Parse a native PowerPoint chart part (OOXML) into series labels, category
 * labels, and the numeric value matrix. Used by M3 chart round-trip tests.
 */
export function parseChartXml(chartXml: string): PptxChartData {
  const seriesBlocks = [...chartXml.matchAll(/<c:ser>([\s\S]*?)<\/c:ser>/g)].map(
    (match) => match[1] ?? '',
  );

  if (seriesBlocks.length === 0) {
    throw new Error('chart XML contains no <c:ser> blocks');
  }

  const series: string[] = [];
  const categories: string[] = [];
  const values: number[][] = [];
  const bubbles: PptxBubblePoint[] = [];

  for (const serBlock of seriesBlocks) {
    const seriesLabel = /<c:tx>[\s\S]*?<c:v>([^<]*)<\/c:v>/.exec(serBlock)?.[1] ?? '';
    series.push(seriesLabel);

    if (chartXml.includes('<c:bubbleChart>')) {
      const points = (tag: 'xVal' | 'yVal' | 'bubbleSize'): number[] => {
        const block = new RegExp(`<c:${tag}>([\\s\\S]*?)</c:${tag}>`).exec(serBlock)?.[1];
        return [...(block ?? '').matchAll(/<c:pt idx="\d+"><c:v>([^<]*)<\/c:v>/g)].map((match) =>
          Number(match[1]),
        );
      };
      const xValues = points('xVal');
      const yValues = points('yVal');
      const sizes = points('bubbleSize');
      xValues.forEach((x, index) => {
        bubbles.push({
          series: seriesLabel,
          x,
          y: yValues[index] ?? 0,
          size: sizes[index] ?? 0,
        });
      });
      continue;
    }

    const catBlock = /<c:cat>([\s\S]*?)<\/c:cat>/.exec(serBlock)?.[1] ?? '';
    const categoryLabels = [...catBlock.matchAll(/<c:pt idx="\d+"><c:v>([^<]*)<\/c:v>/g)].map(
      (match) => match[1] ?? '',
    );

    const valBlock = /<c:val>([\s\S]*?)<\/c:val>/.exec(serBlock)?.[1] ?? '';
    const seriesValues = [...valBlock.matchAll(/<c:pt idx="\d+"><c:v>([^<]*)<\/c:v>/g)].map(
      (match) => Number(match[1]),
    );

    if (categoryLabels.length === 0 && seriesValues.length > 0) {
      if (categories.length === 0) {
        values.push(
          ...seriesValues.map((value) => {
            const row = Array.from({ length: seriesBlocks.length }, () => 0);
            row[series.length - 1] = value;
            return row;
          }),
        );
        categories.push(...seriesValues.map(() => ''));
      } else {
        seriesValues.forEach((value, categoryIndex) => {
          const row = values[categoryIndex];
          if (row !== undefined) {
            row[series.length - 1] = value;
          }
        });
      }
      continue;
    }

    if (categories.length === 0) {
      categories.push(...categoryLabels);
      values.push(
        ...categoryLabels.map(() => Array.from({ length: seriesBlocks.length }, () => 0)),
      );
    }

    categoryLabels.forEach((_, categoryIndex) => {
      const row = values[categoryIndex];
      if (row === undefined) {
        return;
      }
      row[series.length - 1] = seriesValues[categoryIndex] ?? 0;
    });
  }

  return bubbles.length > 0
    ? { series, categories: [], values: [], bubbles }
    : { series, categories, values };
}

function columnLettersToIndex(column: string): number {
  return column.split('').reduce((index, letter) => index * 26 + (letter.charCodeAt(0) - 64), 0) - 1;
}

/** Category labels from the chart's embedded workbook when the chart XML has no `<c:cat>`. */
async function readChartWorkbookCategoryLabels(
  zip: JSZip,
  chartPart: string,
): Promise<string[]> {
  const chartDir = dirname(chartPart);
  const relsPath = joinPath(chartDir, '_rels', `${basename(chartPart)}.rels`);
  const relsXml = await readPartText(zip, relsPath);
  const xlsxTarget = [...relsXml.matchAll(/Target="([^"]+\.xlsx)"/gi)].map((match) => match[1])[0];
  if (xlsxTarget === undefined) {
    return [];
  }

  const xlsxPath = normalize(joinPath(chartDir, xlsxTarget));
  const xlsxFile = zip.file(xlsxPath);
  if (xlsxFile === null) {
    return [];
  }

  const xlsx = await JSZip.loadAsync(await xlsxFile.async('nodebuffer'));
  const sharedStrings: string[] = [];
  const sharedStringsFile = xlsx.file('xl/sharedStrings.xml');
  if (sharedStringsFile !== null) {
    const sharedStringsXml = await sharedStringsFile.async('string');
    for (const match of sharedStringsXml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      const text = match[1]?.match(/<t(?:[^>]*)>([^<]*)<\/t>/)?.[1] ?? '';
      sharedStrings.push(text);
    }
  }

  const sheetFile =
    xlsx.file('xl/worksheets/sheet1.xml') ?? xlsx.file('xl/worksheets/sheet2.xml');
  if (sheetFile === null) {
    return [];
  }

  const sheetXml = await sheetFile.async('string');
  const categories: string[] = [];
  for (const rowMatch of sheetXml.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowNumber = Number(rowMatch[1]);
    if (rowNumber === 1) {
      continue;
    }

    let categoryLabel: string | undefined;
    for (const cellMatch of (rowMatch[2] ?? '').matchAll(
      /<c r="([A-Z]+)(\d+)"(?:\s+t="([^"]*)")?[^>]*>(?:[\s\S]*?<v>([^<]*)<\/v>)?/g,
    )) {
      if (columnLettersToIndex(cellMatch[1] ?? '') !== 0) {
        continue;
      }
      const rawValue = cellMatch[4];
      if (rawValue === undefined) {
        continue;
      }
      categoryLabel =
        cellMatch[3] === 's' ? (sharedStrings[Number(rawValue)] ?? rawValue) : rawValue;
      break;
    }

    if (categoryLabel !== undefined && categoryLabel !== '') {
      categories.push(categoryLabel);
    }
  }

  return categories;
}

async function enrichChartDataFromWorkbook(
  zip: JSZip,
  chartPart: string,
  chartXml: string,
  chartData: PptxChartData,
): Promise<PptxChartData> {
  const lacksCategoryAxis =
    !chartXml.includes('<c:bubbleChart>') && !chartXml.includes('<c:cat>');
  const needsWorkbookCategories =
    lacksCategoryAxis &&
    chartData.values.length > 0 &&
    chartData.categories.every((label) => label === '');

  if (!needsWorkbookCategories) {
    return chartData;
  }

  const workbookCategories = await readChartWorkbookCategoryLabels(zip, chartPart);
  if (workbookCategories.length < chartData.values.length) {
    return chartData;
  }

  return {
    ...chartData,
    categories: workbookCategories.slice(0, chartData.values.length),
  };
}

/** Read chart data from the first chart part in a .pptx file. */
export async function readPptxChartData(
  filePath: string,
  chartPart = 'ppt/charts/chart1.xml',
): Promise<PptxChartData> {
  const zip = await JSZip.loadAsync(await readFile(filePath));
  const chartFile = zip.file(chartPart);
  if (chartFile === null) {
    throw new Error(`chart part not found: ${chartPart}`);
  }

  return parseChartXml(await chartFile.async('string'));
}

/** Read chart data by following a named chart shape's relationship. */
export async function readPptxChartDataForShape(
  filePath: string,
  shapeName: string,
  slideIndex = 0,
): Promise<PptxChartData> {
  const zip = await JSZip.loadAsync(await readFile(filePath));
  const slidePath = (await activeSlidePaths(zip))[slideIndex];
  if (slidePath === undefined) {
    throw new Error(`active slide not found at index ${slideIndex}`);
  }

  const shapeBlock = shapeBlockFromSlideXml(await readPartText(zip, slidePath), shapeName);
  const relationshipId = /<c:chart\b[^>]*r:id="([^"]+)"/.exec(shapeBlock ?? '')?.[1];
  if (relationshipId === undefined) {
    throw new Error(`chart relationship not found for shape: ${shapeName}`);
  }

  const chartPart = await relationshipTarget(zip, slidePath, relationshipId);
  const chartXml = await readPartText(zip, chartPart);
  const parsed = parseChartXml(chartXml);
  return enrichChartDataFromWorkbook(zip, chartPart, chartXml, parsed);
}
