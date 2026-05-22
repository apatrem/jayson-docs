import { z } from "zod";
import { CommentSchema } from "./comment";
import { SectionSchema, SlideSchema } from "./containers";
import { MetaSchema } from "./meta";

export const DocModelSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("document"),
      schemaVersion: z.literal("1.0.0"),
      meta: MetaSchema,
      sections: z.array(SectionSchema).min(1),
      comments: z.array(CommentSchema).default([]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("deck"),
      schemaVersion: z.literal("1.0.0"),
      meta: MetaSchema,
      slides: z.array(SlideSchema).min(1),
      comments: z.array(CommentSchema).default([]),
    })
    .strict(),
]);

export type DocModel = z.infer<typeof DocModelSchema>;
