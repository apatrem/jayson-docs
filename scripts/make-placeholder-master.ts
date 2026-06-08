/**
 * Generates `templates/PLACEHOLDER-report.master.pptx` — a SYNTHETIC, Acme-styled
 * master holding one `kpi-row-chart` slide (v1 walking skeleton; D20/D21).
 *
 * PLACEHOLDER per AGENTS.md §4 — NOT a real firm template (no real brand, no PII).
 * Every fillable shape is named per docs/SLIDE_LAYOUT_LIBRARY.md so pptx-automizer
 * can target it (M2), and the chart is a pre-authored STACKED-BAR so the pipeline
 * swaps its data rather than building one (D21).
 *
 *   npx tsx scripts/make-placeholder-master.ts
 */
// pptxgenjs is CJS (`module.exports = class`); the dynamic-import default is the
// constructor and stays type-safe + correct under tsx/Node ESM interop.
const { default: PptxGenJS } = await import('pptxgenjs');

// Acme brand tokens — mirror src/brand/brand.yaml.
const C = { primary: '00C259', secondary: 'D3F2E1', text: '1F2937', accent: '2683C6', muted: '9CA3AF' };
const HEAD = 'Futura';
const BODY = 'Arial';

const pptx = new PptxGenJS();
// Neutral metadata — no real names/company (the Downloads template leaked these).
pptx.author = 'Acme Consulting';
pptx.company = 'Acme Consulting';
pptx.subject = 'PLACEHOLDER report master — synthetic, not a real firm template';
pptx.title = 'Acme report master (placeholder)';
pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in

const s = pptx.addSlide();
s.background = { color: 'FFFFFF' };

// slot.title — action title (8–15 words)
s.addText('Tier-1 candidates score 2x ammonia on bankable long-term demand', {
  objectName: 'slot.title', x: 0.5, y: 0.35, w: 12.33, h: 0.8,
  fontFace: HEAD, fontSize: 24, bold: true, color: C.text, valign: 'middle',
});

// slot.kpi-strip.cardN.{figure,label,delta} — 3 cards
const cards = [
  { figure: '2.4x', label: 'demand vs ammonia', delta: '+140%' },
  { figure: '€68/MWh', label: 'LCOE target', delta: '-12%' },
  { figure: '7', label: 'credible offtakers', delta: '' },
];
cards.forEach((card, i) => {
  const x = 0.5 + i * 4.13;
  const n = i + 1;
  s.addText(card.figure, { objectName: `slot.kpi-strip.card${n}.figure`, x, y: 1.35, w: 3.8, h: 0.6, fontFace: HEAD, fontSize: 30, bold: true, color: C.primary });
  s.addText(card.label, { objectName: `slot.kpi-strip.card${n}.label`, x, y: 1.98, w: 3.8, h: 0.35, fontFace: BODY, fontSize: 12, color: C.text });
  s.addText(card.delta, { objectName: `slot.kpi-strip.card${n}.delta`, x, y: 2.33, w: 3.8, h: 0.3, fontFace: BODY, fontSize: 11, color: C.accent });
});

// slot.chart — pre-authored native STACKED-BAR (pipeline swaps the data — D21)
const chartData = [
  { name: 'low', labels: ['Industry A', 'Industry B', 'Industry C', 'Ammonia'], values: [120, 90, 60, 50] },
  { name: 'base', labels: ['Industry A', 'Industry B', 'Industry C', 'Ammonia'], values: [240, 200, 140, 100] },
  { name: 'high', labels: ['Industry A', 'Industry B', 'Industry C', 'Ammonia'], values: [380, 310, 260, 170] },
];
s.addChart(pptx.ChartType.bar, chartData, {
  objectName: 'slot.chart', x: 0.5, y: 2.95, w: 7.7, h: 3.9,
  barGrouping: 'stacked', chartColors: [C.secondary, C.primary, C.accent],
  showLegend: true, legendPos: 'b', showTitle: false,
});

// slot.narrative — bullets (≤5 items, ≤60 words)
s.addText(
  [
    { text: 'Three industries clear the bankability gate in all scenarios.', options: { bullet: true } },
    { text: 'Ammonia trails on counterparty diversity, not on LCOE.', options: { bullet: true } },
    { text: 'Final selection in Module 2.', options: { bullet: true } },
  ],
  { objectName: 'slot.narrative', x: 8.5, y: 2.95, w: 4.33, h: 3.9, fontFace: BODY, fontSize: 13, color: C.text, valign: 'top' },
);

// slot.footer — brand mark · confidentiality · page (auto-applied at fill time)
s.addText('Acme Consulting   ·   Confidential — for the addressee only   ·   1', {
  objectName: 'slot.footer', x: 0.5, y: 7.05, w: 12.33, h: 0.3, fontFace: BODY, fontSize: 9, color: C.muted,
});

const out = 'templates/PLACEHOLDER-report.master.pptx';
await pptx.writeFile({ fileName: out });
process.stdout.write(`wrote ${out}\n`);
