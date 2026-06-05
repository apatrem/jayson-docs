import { z } from 'zod';

/**
 * Brand-token schema. The canonical values live in `src/brand/brand.yaml`
 * and are loaded + validated at startup. See docs/DECISIONS_LOG.md D2-2 for
 * the colour resolution that made this file authoritative.
 */
const hex6 = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'must be a 6-digit hex colour like #RRGGBB');

export const brandTokensSchema = z.object({
  schemaVersion: z.string(),
  lastUpdated: z.string(),
  identity: z.object({
    name: z.string().min(1),
    shortName: z.string().min(1),
    confidentialityNotice: z.string().min(1),
  }),
  colors: z.object({
    primary: hex6,
    secondary: hex6,
    text: hex6,
    accent: hex6.optional(),
    muted: hex6.optional(),
  }),
  fonts: z.object({
    heading: z.string().min(1),
    body: z.string().min(1),
  }),
  logo: z.object({
    primary: z.string().min(1),
    fallback: z.string().optional(),
  }),
});

export type BrandTokens = z.infer<typeof brandTokensSchema>;
