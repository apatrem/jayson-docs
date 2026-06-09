import type { ChartData } from 'pptx-automizer';
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
