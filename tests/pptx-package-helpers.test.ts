import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseChartXml, readPptxChartDataForShape } from './helpers/pptx-chart.js';
import { readPptxShapeTextsBySlide } from './helpers/pptx-shapes.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const master = join(root, 'templates/report.master.pptx');

describe('PPTX acceptance-test helpers', () => {
  it('reads only active slides in presentation order', async () => {
    const slides = await readPptxShapeTextsBySlide(master);
    expect(slides).toHaveLength(26);
    expect(slides[0]?.has('slot.title')).toBe(true);
    expect(slides[1]?.has('slot.section-title')).toBe(true);
  });

  it('resolves a chart part through its named shape relationship', async () => {
    const chart = await readPptxChartDataForShape(master, 'slot.chart', 6);
    expect(chart.series).toEqual(['Série 1', 'Série 2', 'Série 3']);
    expect(chart.categories).toEqual(['Catégorie 1', 'Catégorie 2', 'Catégorie 3', 'Catégorie 4']);
  });

  it('parses bubble x/y/size points', () => {
    const chart = parseChartXml(`
      <c:bubbleChart>
        <c:ser>
          <c:tx><c:strRef><c:strCache><c:pt idx="0"><c:v>Portfolio</c:v></c:pt></c:strCache></c:strRef></c:tx>
          <c:xVal><c:numRef><c:numCache><c:pt idx="0"><c:v>1</c:v></c:pt><c:pt idx="1"><c:v>4</c:v></c:pt></c:numCache></c:numRef></c:xVal>
          <c:yVal><c:numRef><c:numCache><c:pt idx="0"><c:v>2</c:v></c:pt><c:pt idx="1"><c:v>5</c:v></c:pt></c:numCache></c:numRef></c:yVal>
          <c:bubbleSize><c:numRef><c:numCache><c:pt idx="0"><c:v>3</c:v></c:pt><c:pt idx="1"><c:v>6</c:v></c:pt></c:numCache></c:numRef></c:bubbleSize>
        </c:ser>
      </c:bubbleChart>
    `);

    expect(chart.bubbles).toEqual([
      { series: 'Portfolio', x: 1, y: 2, size: 3 },
      { series: 'Portfolio', x: 4, y: 5, size: 6 },
    ]);
  });
});
