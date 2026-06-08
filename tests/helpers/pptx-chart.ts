import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';

export interface PptxChartData {
  series: string[];
  categories: string[];
  /** values[categoryIndex][seriesIndex] */
  values: number[][];
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

  for (const serBlock of seriesBlocks) {
    const seriesLabel =
      /<c:tx>[\s\S]*?<c:v>([^<]*)<\/c:v>/.exec(serBlock)?.[1] ?? '';
    series.push(seriesLabel);

    const catBlock = /<c:cat>([\s\S]*?)<\/c:cat>/.exec(serBlock)?.[1] ?? '';
    const categoryLabels = [...catBlock.matchAll(/<c:pt idx="\d+"><c:v>([^<]*)<\/c:v>/g)].map(
      (match) => match[1] ?? '',
    );

    const valBlock = /<c:val>([\s\S]*?)<\/c:val>/.exec(serBlock)?.[1] ?? '';
    const seriesValues = [...valBlock.matchAll(/<c:pt idx="\d+"><c:v>([^<]*)<\/c:v>/g)].map(
      (match) => Number(match[1]),
    );

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

  return { series, categories, values };
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
