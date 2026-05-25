import type { Editor as TipTapEditor, Extensions } from "@tiptap/core";
import { Blockquote } from "@tiptap/extension-blockquote";
import { Bold } from "@tiptap/extension-bold";
import { Code } from "@tiptap/extension-code";
import { CodeBlock } from "@tiptap/extension-code-block";
import { Document } from "@tiptap/extension-document";
import { HardBreak } from "@tiptap/extension-hard-break";
import { History } from "@tiptap/extension-history";
import { Italic } from "@tiptap/extension-italic";
import { ListItem } from "@tiptap/extension-list-item";
import { OrderedList } from "@tiptap/extension-ordered-list";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Strike } from "@tiptap/extension-strike";
import { Text } from "@tiptap/extension-text";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { closeHistory } from "@tiptap/pm/history";
import type { CSSProperties, FC } from "react";
import { CommentMark } from "../comments/CommentMark";
import { BulletListTipTapNode } from "./nodes/BulletListNode";
import { CalloutTipTapNode } from "./nodes/CalloutNode";
import { ChartTipTapNode } from "./nodes/ChartNode";
import { DiagramTipTapNode } from "./nodes/DiagramNode";
import { DividerTipTapNode } from "./nodes/DividerNode";
import { HeadingTipTapNode } from "./nodes/HeadingNode";
import { ImageTipTapNode } from "./nodes/ImageNode";
import { KpiCardsTipTapNode } from "./nodes/KpiCardsNode";
import { NumberedListTipTapNode } from "./nodes/NumberedListNode";
import { ProseTipTapNode } from "./nodes/ProseNode";
import { RiskMatrixTipTapNode } from "./nodes/RiskMatrixNode";
import { RoadmapTipTapNode } from "./nodes/RoadmapNode";
import { DocTableTipTapNode } from "./nodes/TableNode";
import { TeamTipTapNode } from "./nodes/TeamNode";
import { TimelineTipTapNode } from "./nodes/TimelineNode";

export interface EditorProps {
  initialContent?: JSONContent | string;
  editable?: boolean;
  onUpdate?: (content: JSONContent) => void;
}

const DEFAULT_CONTENT: JSONContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Start writing..." }],
    },
  ],
};

const blockExtensions = [
  BulletListTipTapNode,
  CalloutTipTapNode,
  ChartTipTapNode,
  DiagramTipTapNode,
  DividerTipTapNode,
  HeadingTipTapNode,
  ImageTipTapNode,
  KpiCardsTipTapNode,
  NumberedListTipTapNode,
  ProseTipTapNode,
  RiskMatrixTipTapNode,
  RoadmapTipTapNode,
  DocTableTipTapNode,
  TeamTipTapNode,
  TimelineTipTapNode,
];

export const ALLOWED_EDITOR_NODE_NAMES = [
  "doc",
  "text",
  "paragraph",
  "hardBreak",
  "blockquote",
  "codeBlock",
  "listItem",
  "orderedList",
  "bulletList",
  "heading",
  "prose",
  "callout",
  "kpiCards",
  "image",
  "docTable",
  "chart",
  "docTimeline",
  "docRoadmap",
  "docRiskMatrix",
  "docTeam",
  "docDiagram",
  "docDivider",
  "numberedList",
] as const;

export const ALLOWED_EDITOR_MARK_NAMES = [
  "bold",
  "italic",
  "strike",
  "code",
  "commentMark",
] as const;

const ALLOWED_HTML_TAGS = new Set([
  "A",
  "BLOCKQUOTE",
  "BR",
  "CODE",
  "DIV",
  "EM",
  "H1",
  "H2",
  "H3",
  "H4",
  "LI",
  "OL",
  "P",
  "PRE",
  "SPAN",
  "STRONG",
  "UL",
]);

const ALLOWED_NODE_NAMES = new Set<string>(ALLOWED_EDITOR_NODE_NAMES);
const ALLOWED_MARK_NAMES = new Set<string>(ALLOWED_EDITOR_MARK_NAMES);

export function createEditorExtensions(): Extensions {
  return [
    Document,
    Paragraph,
    Text,
    Bold,
    Italic,
    Strike,
    Code,
    CodeBlock,
    Blockquote,
    HardBreak,
    History,
    ListItem,
    OrderedList,
    CommentMark,
    ...blockExtensions,
  ];
}

export function assertClosedEditorContent(content: JSONContent): void {
  assertClosedNode(content);
}

export function runAsSeparateUndoStep(
  editor: TipTapEditor,
  operation: (editor: TipTapEditor) => void,
): void {
  editor.view.dispatch(closeHistory(editor.state.tr));
  operation(editor);
  editor.view.dispatch(closeHistory(editor.state.tr));
}

export function sanitizePastedHtml(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  sanitizeElement(template.content);
  return template.innerHTML;
}

export const Editor: FC<EditorProps> = ({
  initialContent = DEFAULT_CONTENT,
  editable = true,
  onUpdate,
}) => {
  const editor = useEditor({
    extensions: createEditorExtensions(),
    content: initialContent,
    editable,
    editorProps: {
      attributes: {
        "aria-label": "Document editor",
      },
      transformPastedHTML: sanitizePastedHtml,
    },
    onUpdate: ({ editor: updatedEditor }) => {
      onUpdate?.(updatedEditor.getJSON());
    },
  });

  return (
    <section style={styles.shell} aria-label="WYSIWYG editor">
      <div style={styles.toolbar} aria-label="Formatting toolbar">
        <ToolbarButton
          label="Bold"
          active={editor?.isActive("bold") ?? false}
          disabled={editor === null || !editable}
          onClick={() => {
            editor?.chain().focus().toggleBold().run();
          }}
        />
        <ToolbarButton
          label="Italic"
          active={editor?.isActive("italic") ?? false}
          disabled={editor === null || !editable}
          onClick={() => {
            editor?.chain().focus().toggleItalic().run();
          }}
        />
      </div>
      <EditorContent editor={editor} style={styles.surface} />
    </section>
  );
};

function assertClosedNode(node: JSONContent): void {
  if (node.type === undefined || !ALLOWED_NODE_NAMES.has(node.type)) {
    throw new Error(`Unknown editor node type: ${node.type ?? "(missing)"}`);
  }
  if (node.attrs !== undefined) {
    const allowedAttrs = allowedAttrsForNode(node.type);
    for (const attrName of Object.keys(node.attrs)) {
      if (!allowedAttrs.has(attrName)) {
        throw new Error(
          `Unknown attr "${attrName}" on editor node type "${node.type}"`,
        );
      }
    }
  }
  for (const mark of node.marks ?? []) {
    assertClosedMark(mark);
  }
  for (const child of node.content ?? []) {
    assertClosedNode(child);
  }
}

function assertClosedMark(mark: NonNullable<JSONContent["marks"]>[number]): void {
  if (mark.type === undefined || !ALLOWED_MARK_NAMES.has(mark.type)) {
    throw new Error(`Unknown editor mark type: ${mark.type ?? "(missing)"}`);
  }
  if (mark.attrs !== undefined) {
    const allowedAttrs = allowedAttrsForMark(mark.type);
    for (const attrName of Object.keys(mark.attrs)) {
      if (!allowedAttrs.has(attrName)) {
        throw new Error(
          `Unknown attr "${attrName}" on editor mark type "${mark.type}"`,
        );
      }
    }
  }
}

function allowedAttrsForNode(nodeType: string): Set<string> {
  switch (nodeType) {
    case "heading":
      return new Set(["blockId", "level", "text", "numbered", "note"]);
    case "prose":
      return new Set(["blockId", "align", "note"]);
    case "bulletList":
      return new Set(["blockId", "items", "note"]);
    case "numberedList":
      return new Set(["blockId", "items", "startAt", "note"]);
    case "callout":
      return new Set(["blockId", "variant", "title", "attribution", "note"]);
    case "kpiCards":
      return new Set(["blockId", "cards", "note"]);
    case "image":
      return new Set(["blockId", "src", "alt", "caption", "width", "align", "note"]);
    case "docTable":
      return new Set(["blockId", "columns", "rows", "caption", "note"]);
    case "chart":
      return new Set(["blockId", "payload"]);
    case "docTimeline":
      return new Set(["blockId", "items", "note"]);
    case "docRoadmap":
      return new Set(["blockId", "lanes", "note"]);
    case "docRiskMatrix":
      return new Set(["blockId", "risks", "note"]);
    case "docTeam":
      return new Set(["blockId", "members", "note"]);
    case "docDiagram":
      return new Set(["blockId", "syntax", "source", "caption", "note"]);
    case "docDivider":
      return new Set(["blockId", "label", "note"]);
    default:
      return new Set();
  }
}

function allowedAttrsForMark(markType: string): Set<string> {
  switch (markType) {
    case "commentMark":
      return new Set(["commentId"]);
    default:
      return new Set();
  }
}

function sanitizeElement(parent: ParentNode): void {
  for (const child of [...parent.childNodes]) {
    if (!(child instanceof HTMLElement)) {
      continue;
    }
    if (!ALLOWED_HTML_TAGS.has(child.tagName)) {
      child.remove();
      continue;
    }
    sanitizeElement(child);
  }
}

const ToolbarButton: FC<{
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}> = ({ label, active, disabled, onClick }) => (
  <button
    type="button"
    aria-pressed={active}
    disabled={disabled}
    onClick={onClick}
    style={{
      ...styles.toolbarButton,
      fontWeight: active ? 700 : 400,
    }}
  >
    {label}
  </button>
);

const styles: Record<string, CSSProperties> = {
  shell: {
    display: "grid",
    gap: "0.75rem",
  },
  toolbar: {
    alignItems: "center",
    display: "flex",
    gap: "0.5rem",
  },
  toolbarButton: {
    border: "1px solid ButtonBorder",
    borderRadius: "0.375rem",
    cursor: "pointer",
    padding: "0.375rem 0.625rem",
  },
  surface: {
    border: "1px solid ButtonBorder",
    borderRadius: "0.5rem",
    minHeight: "16rem",
    padding: "1rem",
  },
};

export default Editor;
