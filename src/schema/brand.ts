import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

const fontEntry = z.object({
  family: z.string(),
  source: z.enum(["self-hosted", "google", "system"]),
  assetPath: z.string().optional(),
  weights: z.array(z.number().int()),
});

/**
 * The brand-token file. Loaded once at app start from the shared cloud folder
 * (D-20). Consumed by every renderer.
 */
export const BrandTokensSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    lastUpdated: z.string(),
    source: z
      .object({
        generatedFrom: z.array(z.string()),
        generator: z.string(),
        reviewedBy: z.string(),
        reviewedAt: z.string(),
      })
      .optional(),

    identity: z.object({
      name: z.string(),
      legalName: z.string().optional(),
      shortName: z.string().optional(),
      tagline: z.string().optional(),
      url: z.string().url().optional(),
      confidentialityNotice: z.string().optional(),
    }),

    logo: z.object({
      primary: z.object({
        svg: z.string(),
        png: z.string().optional(),
        minWidthPx: z.number().int().positive(),
        intrinsicAspect: z.number().positive(),
      }),
      inverse: z
        .object({
          svg: z.string(),
          png: z.string().optional(),
        })
        .optional(),
      monochrome: z.object({ svg: z.string() }).optional(),
      mark: z
        .object({ svg: z.string(), usage: z.string().optional() })
        .optional(),
      favicon: z.string().optional(),
    }),

    colors: z.object({
      brand: z.object({
        primary: hexColor,
        secondary: hexColor,
        tertiary: hexColor.optional(),
        dark: hexColor,
        light: hexColor,
      }),
      neutral: z.record(z.string(), hexColor),
      semantic: z.record(z.string(), z.string()),
      status: z
        .object({
          success: hexColor,
          warning: hexColor,
          error: hexColor,
          info: hexColor,
        })
        .optional(),
      chartPalette: z.object({
        qualitative: z.array(hexColor).min(8),
        sequential: z.array(hexColor).min(3),
        diverging: z
          .object({
            negative: hexColor,
            neutral: hexColor,
            positive: hexColor,
          })
          .optional(),
      }),
    }),

    typography: z.object({
      fonts: z.object({
        heading: fontEntry,
        body: fontEntry,
        mono: fontEntry,
        display: fontEntry.optional(),
      }),
      scale: z.record(z.string(), z.number()),
      lineHeight: z.record(z.string(), z.number()),
      letterSpacing: z.record(z.string(), z.string()).optional(),
      emphasis: z.unknown().optional(),
    }),

    spacing: z.object({
      unit: z.number().positive(),
      scale: z.array(z.number()).min(2),
    }),

    page: z.object({
      size: z.enum(["A4", "Letter", "Legal"]),
      orientation: z.enum(["portrait", "landscape"]),
      margins: z.object({
        top: z.number(),
        right: z.number(),
        bottom: z.number(),
        left: z.number(),
      }),
      header: z
        .object({
          enabled: z.boolean(),
          heightMm: z.number().optional(),
          content: z.string().optional(),
        })
        .optional(),
      footer: z
        .object({
          enabled: z.boolean(),
          heightMm: z.number().optional(),
          content: z.string().optional(),
          pageNumberFormat: z.string().optional(),
        })
        .optional(),
      firstPageHasNoHeader: z.boolean().optional(),
    }),

    deck: z.object({
      slideSize: z.enum(["16:9", "4:3"]),
      dimensionsPx: z.object({ width: z.number(), height: z.number() }),
      margins: z.object({
        top: z.number(),
        right: z.number(),
        bottom: z.number(),
        left: z.number(),
      }),
      titleBar: z
        .object({ enabled: z.boolean(), heightPx: z.number().optional() })
        .optional(),
      footer: z
        .object({
          enabled: z.boolean(),
          heightPx: z.number().optional(),
          content: z.string().optional(),
        })
        .optional(),
    }),

    elements: z.unknown(),
    charts: z.unknown(),
    tone: z.unknown().optional(),

    interactiveHtml: z.unknown().optional(),
    darkMode: z.unknown().optional(),
    accessibility: z.unknown().optional(),
  })
  .strict();

export type BrandTokens = z.infer<typeof BrandTokensSchema>;
