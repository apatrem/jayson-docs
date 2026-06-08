/** Pipeline error classes — map to CLI exit codes per ERROR_HANDLING.md. */

export class MasterError extends Error {
  readonly code = 'master' as const;

  constructor(message: string) {
    super(message);
    this.name = 'MasterError';
  }
}

export class ShapeNameError extends Error {
  readonly code = 'shape-name' as const;

  constructor(message: string) {
    super(message);
    this.name = 'ShapeNameError';
  }
}

export class SaveError extends Error {
  readonly code = 'save' as const;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'SaveError';
  }
}

export function isPipelineError(
  error: unknown,
): error is MasterError | ShapeNameError | SaveError {
  return (
    error instanceof MasterError ||
    error instanceof ShapeNameError ||
    error instanceof SaveError
  );
}
