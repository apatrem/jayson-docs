/**
 * Heading-numbering computation (ADR-0018, item 4). Pure module — no React, no
 * @tiptap/*, no renderer imports — so the same logic drives the editor node
 * view AND the static/export renderer, and is unit-testable in isolation.
 *
 * Rules (all settled in grilling):
 *  - Outline / hierarchical: an Ln heading's prefix is the level-1..Ln counters
 *    joined by the separator (e.g. "1", "1.1", "1.1.1").
 *  - Continuous across the whole document — section boundaries are ignored
 *    (sections are nav-only; headings do the chaptering).
 *  - `numbered: false` → skipped ENTIRELY: no number and no increment.
 *  - A numbered heading's prefix is built only from its *numbered* ancestors;
 *    a level whose counter is still 0 (never used / skipped) is omitted.
 *  - Per-level format (decimal / alpha / roman) + separator come from the brand
 *    house style, optionally overridden per document. The number itself is a
 *    projection — computed here from heading order, never stored.
 */

import type { NumberFormat } from "../../schema/numbering";
import {
  DEFAULT_LEVEL_FORMATS,
  DEFAULT_NUMBERING_SEPARATOR,
  HEADING_LEVEL_COUNT,
} from "../../schema/numbering";

export interface NumberingScheme {
  /** One format per heading level (index 0 → level 1 … index 3 → level 4). */
  levelFormats: readonly NumberFormat[];
  separator: string;
}

// `| undefined` on each optional matches the schema types under
// exactOptionalPropertyTypes (where brand.numbering / meta.layout are X | undefined).
interface NumberingFields {
  levelFormats?: readonly NumberFormat[] | undefined;
  separator?: string | undefined;
}
interface BrandNumberingLike {
  numbering?: NumberingFields | undefined;
}
interface MetaNumberingLike {
  layout?: { numbering?: NumberingFields | undefined } | undefined;
}

/**
 * Resolve the effective scheme: per-document override (`meta.layout.numbering`)
 * wins over the brand house style (`brand.numbering`), which wins over the
 * built-in all-decimal default. Each field resolves independently.
 */
export function resolveNumberingScheme(
  brand: BrandNumberingLike | null | undefined,
  meta: MetaNumberingLike | null | undefined,
): NumberingScheme {
  const brandN = brand?.numbering;
  const metaN = meta?.layout?.numbering;
  return {
    levelFormats:
      metaN?.levelFormats ?? brandN?.levelFormats ?? DEFAULT_LEVEL_FORMATS,
    separator: metaN?.separator ?? brandN?.separator ?? DEFAULT_NUMBERING_SEPARATOR,
  };
}

export interface HeadingLike {
  level: number;
  numbered?: boolean;
}

/**
 * Compute the rendered number prefix for each heading, in document order.
 * Returns an array parallel to `headings`; an entry is `null` when that heading
 * is unnumbered (so the caller renders no marker).
 */
export function computeHeadingNumbers(
  headings: readonly HeadingLike[],
  scheme: NumberingScheme,
): (string | null)[] {
  const counters = new Array<number>(HEADING_LEVEL_COUNT).fill(0);
  return headings.map((heading) => {
    if (heading.numbered === false) {
      return null;
    }
    const level = clampLevel(heading.level);
    counters[level - 1] = (counters[level - 1] ?? 0) + 1;
    for (let deeper = level; deeper < HEADING_LEVEL_COUNT; deeper += 1) {
      counters[deeper] = 0;
    }
    const parts: string[] = [];
    for (let i = 0; i < level; i += 1) {
      const count = counters[i] ?? 0;
      if (count === 0) {
        continue; // unnumbered / never-used ancestor level → omit
      }
      parts.push(formatCounter(count, scheme.levelFormats[i] ?? "decimal"));
    }
    return parts.join(scheme.separator);
  });
}

function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return 1;
  const rounded = Math.round(level);
  if (rounded < 1) return 1;
  if (rounded > HEADING_LEVEL_COUNT) return HEADING_LEVEL_COUNT;
  return rounded;
}

/** Render a positive counter in the given format. */
export function formatCounter(n: number, format: NumberFormat): string {
  switch (format) {
    case "decimal":
      return String(n);
    case "upper-alpha":
      return toAlpha(n).toUpperCase();
    case "lower-alpha":
      return toAlpha(n);
    case "upper-roman":
      return toRoman(n).toUpperCase();
    case "lower-roman":
      return toRoman(n).toLowerCase();
  }
}

/** Bijective base-26: 1→a, 26→z, 27→aa, 52→az, 53→ba … */
function toAlpha(n: number): string {
  let value = Math.max(1, Math.floor(n));
  let out = "";
  while (value > 0) {
    const rem = (value - 1) % 26;
    out = String.fromCharCode(97 + rem) + out;
    value = Math.floor((value - 1) / 26);
  }
  return out;
}

const ROMAN_TABLE: ReadonlyArray<readonly [number, string]> = [
  [1000, "m"],
  [900, "cm"],
  [500, "d"],
  [400, "cd"],
  [100, "c"],
  [90, "xc"],
  [50, "l"],
  [40, "xl"],
  [10, "x"],
  [9, "ix"],
  [5, "v"],
  [4, "iv"],
  [1, "i"],
];

function toRoman(n: number): string {
  let value = Math.max(1, Math.floor(n));
  let out = "";
  for (const [amount, symbol] of ROMAN_TABLE) {
    while (value >= amount) {
      out += symbol;
      value -= amount;
    }
  }
  return out;
}
