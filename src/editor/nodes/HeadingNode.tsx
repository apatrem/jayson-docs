import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { FC } from "react";
import type { HeadingBlock, HeadingLevel } from "../../schema/blocks/heading";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    heading: {
      insertHeading: (attrs?: {
        level?: HeadingLevel;
        text?: string;
        numbered?: boolean;
      }) => ReturnType;
    };
  }
}

export const HeadingTipTapNode = Node.create({
  name: "heading",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      blockId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-block-id"),
        renderHTML: (attrs: { blockId: string | null }) => ({
          "data-block-id": attrs.blockId,
        }),
      },
      level: {
        default: 2,
        parseHTML: (el) => Number(el.getAttribute("data-level") ?? 2),
        renderHTML: (attrs: { level: HeadingLevel }) => ({
          "data-level": attrs.level,
        }),
      },
      text: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-text") ?? "",
        renderHTML: (attrs: { text: string }) => ({ "data-text": attrs.text }),
      },
      numbered: {
        default: true,
        parseHTML: (el) => el.getAttribute("data-numbered") !== "false",
        renderHTML: (attrs: { numbered: boolean }) => ({
          "data-numbered": attrs.numbered ? "true" : "false",
        }),
      },
      note: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-note") ?? "",
        renderHTML: (attrs: { note: string }) => ({ "data-note": attrs.note }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-block-type="heading"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-block-type": "heading" }),
    ];
  },

  addCommands() {
    return {
      insertHeading:
        (attrs = {}) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              blockId: crypto.randomUUID(),
              level: attrs.level ?? 2,
              text: attrs.text ?? "New heading",
              numbered: attrs.numbered ?? true,
              note: "",
            },
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(HeadingNodeView);
  },
});

const HeadingNodeView: FC<NodeViewProps> = ({ node, updateAttributes }) => {
  const level = node.attrs.level as HeadingLevel;
  const text = node.attrs.text as string;
  const numbered = node.attrs.numbered as boolean;

  return (
    <NodeViewWrapper className="heading-node-view">
      <label>
        Level
        <select
          value={level}
          onChange={(e) =>
            updateAttributes({ level: Number(e.target.value) as HeadingLevel })
          }
        >
          <option value={1}>H1</option>
          <option value={2}>H2</option>
          <option value={3}>H3</option>
          <option value={4}>H4</option>
        </select>
      </label>
      <input
        type="text"
        value={text}
        maxLength={200}
        onChange={(e) => updateAttributes({ text: e.target.value })}
      />
      <label>
        <input
          type="checkbox"
          checked={numbered}
          onChange={(e) => updateAttributes({ numbered: e.target.checked })}
        />
        Numbered
      </label>
    </NodeViewWrapper>
  );
};

type HeadingPmNode = {
  attrs: {
    blockId: string;
    level: HeadingLevel;
    text: string;
    numbered: boolean;
    note: string;
  };
};

export function headingBlockToProseMirror(block: HeadingBlock): {
  type: string;
  attrs: HeadingPmNode["attrs"];
} {
  return {
    type: "heading",
    attrs: {
      blockId: block.id,
      level: block.level,
      text: block.text,
      numbered: block.numbered,
      note: block.note ?? "",
    },
  };
}

export function proseMirrorToHeadingBlock(node: HeadingPmNode): HeadingBlock {
  return {
    id: node.attrs.blockId,
    type: "heading",
    level: node.attrs.level,
    text: node.attrs.text,
    numbered: node.attrs.numbered,
    note: node.attrs.note || undefined,
  };
}
