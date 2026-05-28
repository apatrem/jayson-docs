import { z } from "zod";
import { DocBlockSchema } from "./blocks";
import { StableIdSchema } from "./stable-id";

export const SlideLayoutSchema = z.enum([
  "cover",
  "section-divider",
  "agenda",
  "title-body",
  "two-column",
  "three-column",
  "chart-full",
  "chart-commentary",
  "table",
  "quote",
  "process-timeline",
  "team",
  "kpis",
  "image-caption",
  "closing",
]);

export type SlideLayout = z.infer<typeof SlideLayoutSchema>;

export const SectionSchema = z
  .object({
    id: StableIdSchema,
    title: z.string().min(1).max(200).optional(),
    blocks: z.array(DocBlockSchema).min(1),
  })
  .strict();

export type Section = z.infer<typeof SectionSchema>;

export const SlideSchema = z
  .object({
    id: StableIdSchema,
    layout: SlideLayoutSchema,
    blocks: z.array(DocBlockSchema),
    notes: z.string().max(2000).optional(),
  })
  .strict();

export type Slide = z.infer<typeof SlideSchema>;
