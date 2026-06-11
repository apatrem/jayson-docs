// pptx-automizer's `XmlElement` aliases the DOM `Element` (absent from this
// Node-only tsconfig) — type just the DOM surface used below.
interface XmlDocumentNode {
  createElement(tagName: string): XmlNode;
}

interface XmlNode {
  ownerDocument: XmlDocumentNode;
  childNodes: { length: number; item(index: number): XmlNode | null };
  firstChild: XmlNode | null;
  parentNode: XmlNode | null;
  nodeType: number;
  localName: string;
  textContent: string | null;
  getElementsByTagName(name: string): { length: number; item(index: number): XmlNode | null };
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  appendChild(child: XmlNode): unknown;
  insertBefore(newChild: XmlNode, refChild: XmlNode | null): unknown;
  removeChild(child: XmlNode): unknown;
  createElement?(tagName: string): XmlNode;
}

type ChartXmlDocument = XmlNode & XmlDocumentNode;

type ChartModificationCallback = (
  element: XmlNode,
  chart?: ChartXmlDocument,
  workbook?: unknown,
) => void;

function directChild(parent: XmlNode, localName: string): XmlNode | null {
  const suffix = localName.split(':')[1] ?? localName;
  for (let i = 0; i < parent.childNodes.length; i++) {
    const child = parent.childNodes.item(i);
    if (child?.nodeType === 1 && child.localName === suffix) {
      return child;
    }
  }
  return null;
}

function createChartElement(doc: XmlDocumentNode, name: string): XmlNode {
  return doc.createElement(name);
}

function setTextContent(parent: XmlNode, tag: string, value: string): void {
  const element = createChartElement(parent.ownerDocument, tag);
  element.textContent = value;
  parent.appendChild(element);
}

function buildCategoryElement(doc: ChartXmlDocument, labels: string[]): XmlNode {
  const rowStart = 2;
  const rowEnd = rowStart + labels.length - 1;
  const formula = `Feuil1!$A$${rowStart}:$A$${rowEnd}`;

  const cat = createChartElement(doc, 'c:cat');
  const strRef = createChartElement(doc, 'c:strRef');
  setTextContent(strRef, 'c:f', formula);

  const strCache = createChartElement(doc, 'c:strCache');
  const ptCount = createChartElement(doc, 'c:ptCount');
  ptCount.setAttribute('val', String(labels.length));
  strCache.appendChild(ptCount);

  labels.forEach((label, index) => {
    const pt = createChartElement(doc, 'c:pt');
    pt.setAttribute('idx', String(index));
    setTextContent(pt, 'c:v', label);
    strCache.appendChild(pt);
  });

  strRef.appendChild(strCache);
  cat.appendChild(strRef);
  return cat;
}

/**
 * Inject a `<c:cat><c:strRef>` cache when the master chart omits one (e.g.
 * clustered-column). Categories are data, not styling — D21 stays intact.
 */
export function ensureChartCategoryCache(categoryLabels: string[]): ChartModificationCallback {
  return (_element, chart) => {
    if (chart === undefined || categoryLabels.length === 0) {
      return;
    }

    const series = chart.getElementsByTagName('c:ser');
    for (let i = 0; i < series.length; i++) {
      const ser = series.item(i);
      if (ser === null) {
        continue;
      }
      if (directChild(ser, 'c:cat') !== null) {
        continue;
      }
      const val = directChild(ser, 'c:val');
      if (val === null) {
        continue;
      }
      ser.insertBefore(buildCategoryElement(chart, categoryLabels), val);
    }
  };
}

function cacheContainer(ser: XmlNode, tag: string): XmlNode | null {
  const block = directChild(ser, tag);
  if (block === null) {
    return null;
  }

  const cacheTags = ['c:strCache', 'c:numCache', 'c:numLit'] as const;
  for (const cacheTag of cacheTags) {
    const cache = directChild(block, cacheTag);
    if (cache !== null) {
      return cache;
    }
  }

  for (const refTag of ['c:strRef', 'c:numRef'] as const) {
    const ref = directChild(block, refTag);
    if (ref === null) {
      continue;
    }
    for (const cacheTag of cacheTags) {
      const cache = directChild(ref, cacheTag);
      if (cache !== null) {
        return cache;
      }
    }
  }

  return null;
}

function readCacheValues(cache: XmlNode): string[] {
  const values: string[] = [];
  const points = cache.getElementsByTagName('c:pt');
  for (let i = 0; i < points.length; i++) {
    const pt = points.item(i);
    if (pt === null) {
      continue;
    }
    const valueNode = pt.getElementsByTagName('c:v').item(0);
    values.push(valueNode?.textContent ?? '');
  }
  return values;
}

function rewriteCacheValues(cache: XmlNode, values: string[]): void {
  const existing = cache.getElementsByTagName('c:pt');
  while (existing.length > 0) {
    const pt = existing.item(0);
    const parent = pt?.parentNode ?? null;
    if (pt !== null && parent !== null) {
      parent.removeChild(pt);
    }
  }

  let ptCount = directChild(cache, 'c:ptCount');
  if (ptCount === null) {
    ptCount = createChartElement(cache.ownerDocument, 'c:ptCount');
    cache.insertBefore(ptCount, cache.firstChild);
  }
  ptCount.setAttribute('val', String(values.length));

  values.forEach((value, index) => {
    const pt = createChartElement(cache.ownerDocument, 'c:pt');
    pt.setAttribute('idx', String(index));
    setTextContent(pt, 'c:v', value);
    cache.appendChild(pt);
  });
}

function updateFormulaRange(block: XmlNode, pointCount: number, columnIndex: number): void {
  if (pointCount === 0) {
    return;
  }
  const rowStart = 2;
  const rowEnd = rowStart + pointCount - 1;
  const column = columnIndexToLetters(columnIndex);
  const formula = `Feuil1!$${column}$${rowStart}:$${column}$${rowEnd}`;

  for (const tag of ['c:f', 'cx:f']) {
    const formulaNode = block.getElementsByTagName(tag).item(0);
    if (formulaNode !== null) {
      formulaNode.textContent = formula;
    }
  }
}

function columnIndexToLetters(index: number): string {
  let n = index;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

/**
 * Drop padded bubble points so each series keeps only its own x/y/size values.
 * Used after `setChartBubbles` for the `series,x,y,size` column set.
 */
export function compactMultiSeriesBubblePoints(): ChartModificationCallback {
  return (_element, chart) => {
    if (chart === undefined) {
      return;
    }

    const bubbleCharts = chart.getElementsByTagName('c:bubbleChart');
    for (let chartIndex = 0; chartIndex < bubbleCharts.length; chartIndex++) {
      const bubbleChart = bubbleCharts.item(chartIndex);
      if (bubbleChart === null) {
        continue;
      }

      const series = bubbleChart.getElementsByTagName('c:ser');
      for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
        const ser = series.item(seriesIndex);
        if (ser === null) {
          continue;
        }

        const xCache = cacheContainer(ser, 'c:xVal');
        const yCache = cacheContainer(ser, 'c:yVal');
        const sizeCache = cacheContainer(ser, 'c:bubbleSize');
        if (xCache === null || yCache === null || sizeCache === null) {
          continue;
        }

        const xValues = readCacheValues(xCache);
        const yValues = readCacheValues(yCache);
        const sizeValues = readCacheValues(sizeCache);
        const keptIndices: number[] = [];

        for (let pointIndex = 0; pointIndex < xValues.length; pointIndex++) {
          const x = xValues[pointIndex] ?? '';
          const y = yValues[pointIndex] ?? '';
          if (x !== '' && y !== '') {
            keptIndices.push(pointIndex);
          }
        }

        const compactX = keptIndices.map((index) => xValues[index] ?? '');
        const compactY = keptIndices.map((index) => yValues[index] ?? '');
        const compactSize = keptIndices.map((index) => sizeValues[index] ?? '0');

        rewriteCacheValues(xCache, compactX);
        rewriteCacheValues(yCache, compactY);
        rewriteCacheValues(sizeCache, compactSize);

        const baseColumn = seriesIndex * 3 + 1;
        const xBlock = directChild(ser, 'c:xVal');
        const yBlock = directChild(ser, 'c:yVal');
        const sizeBlock = directChild(ser, 'c:bubbleSize');
        if (xBlock !== null) {
          updateFormulaRange(xBlock, compactX.length, baseColumn);
        }
        if (yBlock !== null) {
          updateFormulaRange(yBlock, compactY.length, baseColumn + 1);
        }
        if (sizeBlock !== null) {
          updateFormulaRange(sizeBlock, compactSize.length, baseColumn + 2);
        }
      }
    }
  };
}
