// Minimal type shim for pagedjs (0.4.x ships no type declarations).
// Only the Previewer surface we use is declared.
declare module "pagedjs" {
  export interface PagedFlow {
    total: number;
    pages: unknown[];
  }
  export class Previewer {
    constructor(options?: unknown);
    preview(
      content: string | Node,
      stylesheets?: Array<string | { _: string }>,
      renderTo?: Element | null,
    ): Promise<PagedFlow>;
  }
}
