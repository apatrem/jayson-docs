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
import { useEffect, useMemo, useState, type CSSProperties, type FC } from "react";
import { CommentMark } from "../comments/CommentMark";
import type { DocModel } from "../schema/docmodel";
import { docModelToProseMirror } from "./mapping";
import { BulletListTipTapNode } from "../blocks/bullet-list";
import { CalloutTipTapNode } from "../blocks/callout";
import { ChartTipTapNode } from "./nodes/ChartNode";
import { DiagramTipTapNode } from "../blocks/diagram";
import { DividerTipTapNode } from "../blocks/divider";
import { HeadingTipTapNode } from "../blocks/heading";
import { ImageTipTapNode } from "../blocks/image";
import { KpiCardsTipTapNode } from "../blocks/kpi-cards";
import { NumberedListTipTapNode } from "../blocks/numbered-list";
import { ProseTipTapNode } from "../blocks/prose";
import { RiskMatrixTipTapNode } from "../blocks/risk-matrix";
import { RoadmapTipTapNode } from "../blocks/roadmap";
import { DocTableTipTapNode } from "./nodes/TableNode";
import { TeamTipTapNode } from "../blocks/team";
import { TimelineTipTapNode } from "../blocks/timeline";

export interface EditorProps {
  initialContent?: JSONContent | string;
  docModel?: DocModel;
  editable?: boolean;
  onUpdate?: (content: JSONContent) => void;
  onEditorReady?: (editor: TipTapEditor | null) => void;
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
  docModel,
  editable = true,
  onUpdate,
  onEditorReady,
}) => {
  const deck = docModel?.kind === "deck" ? docModel : null;
  // M6 known limitation (see BLOCKERS.md drift-2026-05-25b): the deck surface
  // strips the slide wrapper when feeding a slide into TipTap, so there is no
  // inverse mapping from edited editor JSON back to the deck DocModel. Until
  // that round-trip exists, force editable=false for decks — silently allowing
  // edits would lose user input on the next slide switch.
  const effectiveEditable = deck === null ? editable : false;
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const activeSlideIndex =
    deck === null
      ? 0
      : // Math.max guards the empty-deck case (slides.length === 0 would
        // otherwise yield -1 and an undefined slide lookup downstream).
        Math.max(0, Math.min(currentSlideIndex, deck.slides.length - 1));
  const activeSlide = deck?.slides[activeSlideIndex];
  const editorContent = useMemo(
    () =>
      deck === null
        ? initialContent
        : editorContentForDeckSlide(deck, activeSlideIndex),
    [activeSlideIndex, deck, initialContent],
  );
  const editor = useEditor({
    extensions: createEditorExtensions(),
    content: editorContent,
    editable: effectiveEditable,
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

  useEffect(() => {
    setCurrentSlideIndex(0);
  }, [deck]);

  useEffect(() => {
    onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (editor === null || deck === null) {
      return;
    }
    editor.commands.setContent(editorContent, false);
  }, [deck, editor, editorContent]);

  const editorSurface = <EditorContent editor={editor} style={styles.surface} />;

  return (
    <section style={styles.shell} aria-label="WYSIWYG editor">
      <div style={styles.toolbar} aria-label="Formatting toolbar">
        <ToolbarButton
          label="Bold"
          active={editor?.isActive("bold") ?? false}
          disabled={editor === null || !effectiveEditable}
          onClick={() => {
            editor?.chain().focus().toggleBold().run();
          }}
        />
        <ToolbarButton
          label="Italic"
          active={editor?.isActive("italic") ?? false}
          disabled={editor === null || !effectiveEditable}
          onClick={() => {
            editor?.chain().focus().toggleItalic().run();
          }}
        />
      </div>
      {deck === null ? (
        editorSurface
      ) : (
        <div style={styles.deckShell}>
          <nav aria-label="Slide navigation" style={styles.slideStrip}>
            {deck.slides.map((slide, index) => {
              const isActive = index === activeSlideIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  aria-current={isActive ? "true" : undefined}
                  aria-label={`Slide ${index + 1} ${slide.layout}`}
                  onClick={() => {
                    setCurrentSlideIndex(index);
                  }}
                  style={{
                    ...styles.slideButton,
                    ...(isActive ? styles.slideButtonActive : {}),
                  }}
                >
                  <span>Slide {index + 1}</span>
                  <span style={styles.slideLayoutLabel}>{slide.layout}</span>
                </button>
              );
            })}
          </nav>
          <section
            aria-label="Current slide"
            data-current-slide-id={activeSlide?.id ?? ""}
            style={styles.slideFocus}
          >
            <p style={styles.slideMeta}>
              Slide {activeSlideIndex + 1} of {deck.slides.length} ·{" "}
              {activeSlide?.layout ?? "unknown"}
            </p>
            {editorSurface}
          </section>
        </div>
      )}
    </section>
  );
};

function editorContentForDeckSlide(
  deck: Extract<DocModel, { kind: "deck" }>,
  slideIndex: number,
): JSONContent {
  const mapped = docModelToProseMirror(deck);
  const slide = mapped.content[slideIndex];
  const content = (slide?.content ?? []).filter(isJsonContentNode);
  return {
    type: "doc",
    content: content.length > 0 ? content : [{ type: "paragraph" }],
  };
}

function isJsonContentNode(value: unknown): value is JSONContent {
  if (value === null || typeof value !== "object") {
    return false;
  }
  return typeof (value as { type?: unknown }).type === "string";
}

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
      return new Set(["blockId", "source", "title", "caption", "width", "note"]);
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
      // Marks listed in ALLOWED_EDITOR_MARK_NAMES without an explicit case
      // here (bold, italic, strike, code) are attr-free by design. If you
      // add a mark with attrs, add a case above — the empty-set default
      // means a forgotten case rejects all attrs, which is the safe failure
      // mode for a security boundary.
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
  deckShell: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: "12rem minmax(0, 1fr)",
  },
  slideStrip: {
    alignContent: "start",
    display: "grid",
    gap: "0.5rem",
  },
  slideButton: {
    background: "Canvas",
    border: "1px solid ButtonBorder",
    borderRadius: "0.5rem",
    color: "CanvasText",
    cursor: "pointer",
    display: "grid",
    gap: "0.25rem",
    padding: "0.625rem",
    textAlign: "left",
  },
  slideButtonActive: {
    outline: "2px solid Highlight",
    outlineOffset: "2px",
  },
  slideLayoutLabel: {
    color: "GrayText",
    fontSize: "0.75rem",
  },
  slideFocus: {
    border: "1px solid ButtonBorder",
    borderRadius: "0.75rem",
    display: "grid",
    gap: "0.75rem",
    padding: "0.75rem",
  },
  slideMeta: {
    color: "GrayText",
    fontSize: "0.875rem",
    margin: 0,
  },
};

export default Editor;
