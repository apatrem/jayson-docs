import type { JSONContent } from "@tiptap/react";

/** DocModel prose fragments use PM export names; TipTap uses its own mark names. */
const TO_EDITOR_MARK: Record<string, string> = {
  strong: "bold",
  em: "italic",
};

const TO_DOCMODEL_MARK: Record<string, string> = {
  bold: "strong",
  italic: "em",
};

export function normalizeProseMarksForEditor(content: JSONContent): JSONContent {
  return mapMarks(content, TO_EDITOR_MARK);
}

export function denormalizeProseMarksForDocModel(content: JSONContent): JSONContent {
  return mapMarks(content, TO_DOCMODEL_MARK);
}

function mapMarks(node: JSONContent, rename: Record<string, string>): JSONContent {
  const marks = node.marks?.map((mark) => {
    const nextType = rename[mark.type ?? ""];
    return nextType === undefined ? mark : { ...mark, type: nextType };
  });

  const children = node.content?.map((child) => mapMarks(child, rename));

  return {
    ...node,
    ...(marks === undefined ? {} : { marks }),
    ...(children === undefined ? {} : { content: children }),
  };
}
