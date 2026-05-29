import { createContext, useContext } from "react";
import type { BrandTokens } from "../../schema/brand";
import type { Meta } from "../../schema/meta";
import {
  computeHeadingNumbers,
  resolveNumberingScheme,
  type HeadingLike,
} from "./numbering";

/**
 * Supplies each heading block its computed outline number (ADR-0018, item 4).
 * The number is a projection — derived from heading order at render time and
 * provided here keyed by block id, never stored on the block. The map only
 * contains *numbered* headings; an absent id means "render no marker".
 *
 * Shared by the static/export renderer (DocumentRenderer) and the editor
 * heading node view, so both surfaces show identical numbers.
 */
const HeadingNumberContext = createContext<ReadonlyMap<string, string>>(new Map());

export const HeadingNumberProvider = HeadingNumberContext.Provider;

/** The computed number for a heading block, or null when it has none. */
export function useHeadingNumber(blockId: string): string | null {
  return useContext(HeadingNumberContext).get(blockId) ?? null;
}

interface HeadingWithId extends HeadingLike {
  id: string;
}

/**
 * Build the blockId → number map from headings in document order, applying the
 * brand ⊕ per-document numbering scheme. Unnumbered headings are omitted.
 */
export function buildHeadingNumberMap(
  headingsInOrder: readonly HeadingWithId[],
  brand: Pick<BrandTokens, "numbering"> | null | undefined,
  meta: Pick<Meta, "layout"> | null | undefined,
): Map<string, string> {
  const scheme = resolveNumberingScheme(brand, meta);
  const numbers = computeHeadingNumbers(headingsInOrder, scheme);
  const map = new Map<string, string>();
  headingsInOrder.forEach((heading, index) => {
    const number = numbers[index];
    if (number !== null && number !== undefined) {
      map.set(heading.id, number);
    }
  });
  return map;
}
