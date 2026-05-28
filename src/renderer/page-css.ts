import type { BrandTokens } from "../schema/brand";

/**
 * Print/pagination CSS shared by the in-app Page view (paged.js) and the PDF
 * export HTML. Defines the @page box (size, brand margins, running header +
 * page-number footer) and the break-avoid rules.
 *
 * paged.js honours @page margin boxes and `counter(page)`/`counter(pages)` —
 * which Chrome's own print engine does NOT — so this is what lets us show a
 * real header/footer with page numbers and drop Chrome's native date/path.
 */

const BREAK_RULES = `
  [data-block-type="heading"] { break-after: avoid; page-break-after: avoid; }
  [data-block-type="chart"],
  [data-block-type="table"],
  [data-block-type="kpi-cards"],
  [data-block-type="diagram"],
  [data-block-type="callout"],
  [data-block-type="image"],
  [data-block-type="timeline"],
  [data-block-type="roadmap"],
  [data-block-type="risk-matrix"],
  [data-block-type="team"],
  .doc-keep-together { break-inside: avoid; page-break-inside: avoid; }
  [data-block-type="table"] tr { break-inside: avoid; page-break-inside: avoid; }
  .doc-page-break,
  [data-block-type="divider"][data-render-context="document"] {
    break-before: page; page-break-before: always;
  }
`;

function cssEscape(value: string): string {
  // Escape for a CSS string literal used in `content:`.
  return value.replace(/\\/gu, "\\\\").replace(/"/gu, '\\"');
}

export interface PageChromeOptions {
  /** Running header text (document title). Empty string → no header. */
  title: string;
  /** Footer page numbering, e.g. "3 / 12". Defaults to enabled. */
  showPageNumbers?: boolean;
}

/**
 * Builds the @page + break CSS. `size`/margins come from brand.page. The header
 * shows the title; the footer shows "page / pages". Date and file path are
 * deliberately absent — that's the whole point of owning the chrome.
 */
export function buildPageCss(brand: BrandTokens, opts: PageChromeOptions): string {
  const { size, orientation, margins } = brand.page;
  const title = opts.title.trim();
  const showPageNumbers = opts.showPageNumbers ?? true;
  const footerColor = "#64748B";

  const headerBox = title
    ? `@top-center { content: "${cssEscape(title)}"; font-size: 9pt; color: ${footerColor}; }`
    : "";
  const footerBox = showPageNumbers
    ? `@bottom-center { content: counter(page) " / " counter(pages); font-size: 9pt; color: ${footerColor}; }`
    : "";

  return `
  * { box-sizing: border-box; }
  body { margin: 0; }
  @page {
    size: ${size} ${orientation};
    margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
    ${headerBox}
    ${footerBox}
  }
  ${BREAK_RULES}
`;
}
