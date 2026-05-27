import { describe, expect, it } from "vitest";
import {
  denormalizeProseMarksForDocModel,
  normalizeProseMarksForEditor,
} from "../../src/editor/normalize-prose-marks";

describe("normalize-prose-marks", () => {
  it("maps strong/em to bold/italic for TipTap and back for DocModel", () => {
    const docModelFragment = {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Hello",
          marks: [{ type: "strong" }, { type: "em" }],
        },
      ],
    };

    const forEditor = normalizeProseMarksForEditor(docModelFragment);
    expect(forEditor.content?.[0]?.marks?.map((m) => m.type)).toEqual([
      "bold",
      "italic",
    ]);

    const roundTrip = denormalizeProseMarksForDocModel(forEditor);
    expect(roundTrip.content?.[0]?.marks?.map((m) => m.type)).toEqual([
      "strong",
      "em",
    ]);
  });
});
