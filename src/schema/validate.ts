import { DocModelSchema, type DocModel } from "./docmodel";

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export type ValidationResult =
  | { ok: true; doc: DocModel }
  | { ok: false; errors: ValidationError[] };

export function validateDocModel(input: unknown): ValidationResult {
  const result = DocModelSchema.safeParse(input);
  if (!result.success) {
    const errors: ValidationError[] = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));
    return { ok: false, errors };
  }

  const duplicateIdErrors = findDuplicateStableIds(result.data);
  if (duplicateIdErrors.length > 0) {
    return { ok: false, errors: duplicateIdErrors };
  }

  return { ok: true, doc: result.data };
}

function findDuplicateStableIds(doc: DocModel): ValidationError[] {
  const seen = new Map<string, string>();
  const errors: ValidationError[] = [];

  const record = (id: string, path: string) => {
    const prior = seen.get(id);
    if (prior !== undefined) {
      errors.push({
        path,
        message: `Duplicate id '${id}' also appears at ${prior}.`,
        code: "duplicate_id",
      });
      return;
    }
    seen.set(id, path);
  };

  if (doc.kind === "document") {
    doc.sections.forEach((section, si) => {
      record(section.id, `sections.${si}.id`);
      section.blocks.forEach((block, bi) => {
        record(block.id, `sections.${si}.blocks.${bi}.id`);
      });
    });
  } else {
    doc.slides.forEach((slide, si) => {
      record(slide.id, `slides.${si}.id`);
      slide.blocks.forEach((block, bi) => {
        record(block.id, `slides.${si}.blocks.${bi}.id`);
      });
    });
  }

  doc.comments.forEach((comment, ci) => {
    record(comment.id, `comments.${ci}.id`);
  });

  return errors;
}
