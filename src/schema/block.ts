import { z } from 'zod';
import { chartBlockSchema } from './chart.js';

/**
 * The Closed block-type set (CONTEXT.md) — the universal vocabulary of content
 * primitives the LLM may use. Zod-enforced: a block whose `type` is not in this
 * union is rejected.
 *
 * Used by the **document** path (docx), where a Section holds blocks directly
 * (no slide-layout, no slots — Word reflows). The pptx path fills these same
 * primitives into named slots inside a slide-layout instead.
 *
 * v1 covers the core blocks; the set expands **post-v1** (table, kpi-cards,
 * callout) as the docx pipeline lands. Do not add a block type here without a renderer for it.
 */

const headingBlock = z
  .object({
    type: z.literal('heading'),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    text: z.string().min(1),
  })
  .strict();

const paragraphBlock = z
  .object({
    type: z.literal('paragraph'),
    text: z.string().min(1),
  })
  .strict();

const bulletsBlock = z
  .object({
    type: z.literal('bullets'),
    items: z.array(z.string().min(1)).min(1).max(7),
  })
  .strict();

const chartBlock = z
  .object({
    type: z.literal('chart'),
    chart: chartBlockSchema,
  })
  .strict();

const imageBlock = z
  .object({
    type: z.literal('image'),
    ref: z.string().min(1),
    caption: z.string().max(120).optional(),
  })
  .strict();

export const blockSchema = z.discriminatedUnion('type', [
  headingBlock,
  paragraphBlock,
  bulletsBlock,
  chartBlock,
  imageBlock,
]);

export type Block = z.infer<typeof blockSchema>;
