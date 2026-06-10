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

export class ChartDataError extends Error {
  readonly code = 'chart-data' as const;

  constructor(message: string) {
    super(message);
    this.name = 'ChartDataError';
  }
}

export class ImageRefError extends Error {
  readonly code = 'image-ref' as const;

  constructor(message: string) {
    super(message);
    this.name = 'ImageRefError';
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
): error is MasterError | ShapeNameError | ChartDataError | ImageRefError | SaveError {
  return (
    error instanceof MasterError ||
    error instanceof ShapeNameError ||
    error instanceof ChartDataError ||
    error instanceof ImageRefError ||
    error instanceof SaveError
  );
}
