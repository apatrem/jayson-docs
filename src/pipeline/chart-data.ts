import type { ChartBubble, ChartData } from 'pptx-automizer';
import type { ChartBlock, Dataset } from '@schema/chart.js';
import { ChartDataError } from './errors.js';

/**
 * Resolve the dataset backing a chart block (inline or via datasetRef).
 * Callers must pass a schema-validated fill-plan; unresolved refs are rejected.
 */
export function resolveChartDataset(
  chart: ChartBlock,
  datasets: Record<string, Dataset> | undefined,
): Dataset {
  if (chart.dataset !== undefined) {
    return chart.dataset;
  }

  if (chart.datasetRef === undefined) {
    throw new ChartDataError(
      'chart must reference a dataset (datasetRef) or include one inline (dataset)',
    );
  }

  const dataset = datasets?.[chart.datasetRef];
  if (dataset === undefined) {
    throw new ChartDataError(
      `datasetRef "${chart.datasetRef}" does not resolve in datasets`,
    );
  }

  return dataset;
}

/**
 * Map a tabular dataset (CHART_CATALOGUE.md bar/stacked-column shape) to the
 * pptx-automizer ChartData structure for modify.setChartData.
 */
export function datasetToChartData(dataset: Dataset): ChartData {
  const [categoryColumn, ...seriesColumns] = dataset.columns;

  if (categoryColumn === undefined || seriesColumns.length === 0) {
    throw new ChartDataError(
      'chart dataset must have a category column and at least one numeric series column',
    );
  }

  return {
    series: seriesColumns.map((label) => ({ label })),
    categories: dataset.rows.map((row, rowIndex) => {
      const categoryLabel = row[0];
      if (categoryLabel === null || categoryLabel === undefined) {
        throw new ChartDataError(
          `dataset row ${rowIndex}: category column "${categoryColumn}" must be a string`,
        );
      }

      const values = seriesColumns.map((seriesColumn, seriesIndex) => {
        const cell = row[seriesIndex + 1];
        if (cell === null) {
          return null;
        }
        if (typeof cell !== 'number') {
          throw new ChartDataError(
            `dataset row ${rowIndex}, column "${seriesColumn}": expected number, got ${typeof cell}`,
          );
        }
        return cell;
      });

      return { label: String(categoryLabel), values };
    }),
  };
}

/**
 * Map a bubble dataset (CHART_CATALOGUE.md x/y/size shape) to the pptx-automizer
 * ChartData structure for modify.setChartBubbles.
 */
export function datasetToBubbleChartData(dataset: Dataset): ChartData {
  const columnNames = dataset.columns.map((column) => column.toLowerCase());
  const seriesIdx = columnNames.indexOf('series');
  const xIdx = columnNames.indexOf('x');
  const yIdx = columnNames.indexOf('y');
  const sizeIdx = columnNames.indexOf('size');

  if (xIdx < 0 || yIdx < 0 || sizeIdx < 0) {
    throw new ChartDataError('bubble dataset must have x, y, and size columns');
  }

  const readBubble = (row: (string | number | null)[], rowIndex: number): ChartBubble => {
    const x = row[xIdx];
    const y = row[yIdx];
    const size = row[sizeIdx];
    if (x === null || typeof x !== 'number') {
      throw new ChartDataError(`dataset row ${rowIndex}: x must be a number`);
    }
    if (y === null || typeof y !== 'number') {
      throw new ChartDataError(`dataset row ${rowIndex}: y must be a number`);
    }
    if (size === null || typeof size !== 'number') {
      throw new ChartDataError(`dataset row ${rowIndex}: size must be a number`);
    }
    return { x, y, size };
  };

  if (seriesIdx >= 0) {
    const seriesOrder: string[] = [];
    const pointsBySeries = new Map<string, ChartBubble[]>();

    dataset.rows.forEach((row, rowIndex) => {
      const label = row[seriesIdx];
      if (label === null || typeof label !== 'string') {
        throw new ChartDataError(`dataset row ${rowIndex}: series label must be a string`);
      }
      if (!pointsBySeries.has(label)) {
        seriesOrder.push(label);
        pointsBySeries.set(label, []);
      }
      pointsBySeries.get(label)?.push(readBubble(row, rowIndex));
    });

    const maxPoints = Math.max(...seriesOrder.map((label) => pointsBySeries.get(label)?.length ?? 0));

    return {
      series: seriesOrder.map((label) => ({ label })),
      categories: Array.from({ length: maxPoints }, (_, pointIndex) => ({
        label: String(pointIndex + 1),
        values: seriesOrder.map((label) => {
          const point = pointsBySeries.get(label)?.[pointIndex];
          return point ?? { x: null, y: null, size: 0 };
        }),
      })),
    };
  }

  return {
    series: [{ label: dataset.title ?? 'Series 1' }],
    categories: dataset.rows.map((row, rowIndex) => ({
      label: String(rowIndex + 1),
      values: [readBubble(row, rowIndex)],
    })),
  };
}
