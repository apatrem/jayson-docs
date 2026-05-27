/**
 * Derives a Zod schema + registry metadata from an AuthoredBlockManifest.
 *
 * Used by defineAuthoredBlock() to produce the schema-registry SchemaEntry
 * for a dynamically defined Authored block.
 */

import { z } from "zod";
import type {
  AttrFieldDef,
  SimpleAttrField,
  AuthoredBlockManifest,
} from "./defineAuthoredBlock";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function simpleFieldZod(field: SimpleAttrField): z.ZodTypeAny {
  switch (field.kind) {
    case "string": {
      let s = z.string();
      if (field.maxLength !== undefined) s = s.max(field.maxLength);
      return s;
    }
    case "enum": {
      if (field.options.length === 0) return z.string();
      // z.enum requires at least one element in the tuple
      const vals = field.options.map((o) => o.value) as [string, ...string[]];
      return z.enum(vals);
    }
    case "number": {
      let n = z.number();
      if (field.min !== undefined) n = n.min(field.min);
      if (field.max !== undefined) n = n.max(field.max);
      return n;
    }
    case "bool":
      return z.boolean();
  }
}

function attrFieldZod(field: AttrFieldDef): z.ZodTypeAny {
  if (field.kind === "repeated-item") {
    const itemShape: Record<string, z.ZodTypeAny> = {};
    for (const f of field.itemFields) {
      const base = simpleFieldZod(f);
      const defVal =
        "defaultValue" in f && f.defaultValue !== undefined
          ? f.defaultValue
          : undefined;
      itemShape[f.fieldId] =
        defVal !== undefined
          ? base.optional().default(defVal as never)
          : base.optional();
    }
    let arr = z.array(z.object(itemShape));
    if (field.maxItems !== undefined) arr = arr.max(field.maxItems);
    // minItems is a UI/form-level constraint, not enforced at schema level so that
    // blocks with empty repeated fields (e.g. freshly inserted) still pass validation.
    return arr.optional().default([]);
  }

  const base = simpleFieldZod(field);
  const defVal =
    "defaultValue" in field && field.defaultValue !== undefined
      ? field.defaultValue
      : undefined;
  return defVal !== undefined
    ? base.optional().default(defVal as never)
    : base.optional();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Builds the Zod schema for an Authored block from its manifest.
 *
 * The schema validates:
 *   - id (string)
 *   - type (literal === slug)
 *   - note (optional string)
 *   - one optional field per AttrFieldDef
 *   - body (optional ProseMirrorFragment) when content === "rich-text"
 */
export function buildAuthoredSchema(
  manifest: AuthoredBlockManifest,
): z.ZodType<unknown> {
  const shape: Record<string, z.ZodTypeAny> = {
    id: z.string(),
    type: z.literal(manifest.slug),
    note: z.string().optional(),
  };

  for (const field of manifest.attrs) {
    shape[field.fieldId] = attrFieldZod(field);
  }

  if (manifest.content === "rich-text") {
    // body is an optional ProseMirrorFragment (doc node with content array)
    shape["body"] = z
      .object({
        type: z.literal("doc"),
        content: z.array(z.unknown()),
      })
      .optional();
  }

  return z.object(shape);
}

/**
 * Returns the allowedAttrs list for the schema-registry entry.
 * Includes all standard block fields plus dynamic attr fieldIds.
 */
export function buildAllowedAttrs(
  manifest: AuthoredBlockManifest,
): readonly string[] {
  const base: string[] = ["id", "type", "note"];
  if (manifest.content === "rich-text") base.push("body");
  return [...base, ...manifest.attrs.map((f) => f.fieldId)];
}

/**
 * Returns the default attrs object for a new instance of the block.
 * Suitable for passing to editor.commands.insertContent({ attrs: defaults }).
 */
export function buildDefaultAttrs(
  manifest: AuthoredBlockManifest,
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {
    blockId: "", // filled in by the insert command at call time
    note: "",
  };

  for (const field of manifest.attrs) {
    if (field.kind === "repeated-item") {
      defaults[field.fieldId] = [];
    } else if ("defaultValue" in field && field.defaultValue !== undefined) {
      defaults[field.fieldId] = field.defaultValue;
    } else if (field.kind === "string") {
      defaults[field.fieldId] = "";
    } else if (field.kind === "number") {
      defaults[field.fieldId] = 0;
    } else if (field.kind === "bool") {
      defaults[field.fieldId] = false;
    } else {
      defaults[field.fieldId] = null;
    }
  }

  return defaults;
}
