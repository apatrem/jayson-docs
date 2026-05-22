import { describe, it, expect } from "vitest";
import { ProseMirrorFragmentSchema } from "../../src/schema/prosemirror-fragment";

describe("ProseMirrorFragmentSchema", () => {
  it("accepts a minimal doc fragment", () => {
    expect(
      ProseMirrorFragmentSchema.parse({ type: "doc", content: [] }),
    ).toEqual({ type: "doc", content: [] });
  });

  it("rejects bare strings", () => {
    expect(ProseMirrorFragmentSchema.safeParse("hello").success).toBe(false);
  });
});
