/**
 * Builds TipTap node + generic node view for an Authored block manifest.
 *
 * This module is the "built-in, app-bundled code" for the editor side
 * described in ADR-0013.  The manifest is data; this code does the work.
 */

import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import React, { type FC, type ChangeEvent } from "react";
import type {
  AttrFieldDef,
  AuthoredBlockManifest,
  EnumAttrField,
} from "./defineAuthoredBlock";
import { buildDefaultAttrs } from "./schema-builder";

// ─── Attr widget helpers ──────────────────────────────────────────────────────

/**
 * Renders a single editing widget for an attr field.
 * Returns a controlled input element; changes are committed via updateAttributes.
 */
function AttrWidget({
  field,
  value,
  onChange,
}: {
  field: AttrFieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}): React.ReactElement | null {
  if (field.kind === "repeated-item") {
    // Repeated items rendered as a read-only summary in the node view.
    // Full editing is deferred to a future side-panel enhancement.
    const items = Array.isArray(value) ? value : [];
    return React.createElement(
      "div",
      { className: "authored-attr authored-attr--repeated" },
      React.createElement("label", {}, field.label),
      React.createElement(
        "span",
        { className: "authored-attr__count" },
        `${items.length} item${items.length !== 1 ? "s" : ""}`,
      ),
    );
  }

  const commonProps = {
    className: "authored-attr__input",
    id: `authored-attr-${field.fieldId}`,
  };

  let input: React.ReactElement;

  if (field.kind === "string") {
    input = React.createElement("input", {
      ...commonProps,
      type: "text",
      value: typeof value === "string" ? value : (field.defaultValue ?? ""),
      placeholder: field.placeholder,
      maxLength: field.maxLength,
      onChange: (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    });
  } else if (field.kind === "enum") {
    const enumField = field as EnumAttrField;
    input = React.createElement(
      "select",
      {
        ...commonProps,
        value: typeof value === "string" ? value : (enumField.defaultValue ?? ""),
        onChange: (e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value),
      },
      ...enumField.options.map((opt) =>
        React.createElement(
          "option",
          { key: opt.value, value: opt.value },
          opt.label,
        ),
      ),
    );
  } else if (field.kind === "number") {
    input = React.createElement("input", {
      ...commonProps,
      type: "number",
      value: typeof value === "number" ? value : (field.defaultValue ?? 0),
      min: field.min,
      max: field.max,
      step: field.step,
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        onChange(e.target.valueAsNumber),
    });
  } else {
    // bool
    input = React.createElement("input", {
      ...commonProps,
      type: "checkbox",
      checked: typeof value === "boolean" ? value : (field.defaultValue ?? false),
      onChange: (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.checked),
    });
  }

  return React.createElement(
    "div",
    { className: "authored-attr" },
    React.createElement(
      "label",
      { htmlFor: `authored-attr-${field.fieldId}` },
      field.label,
    ),
    input,
  );
}

// ─── Node view factory ────────────────────────────────────────────────────────

/**
 * Builds the React node view component for an Authored block.
 *
 * The node view renders:
 *   - A toolbar (when selected) with form widgets for each attr.
 *   - NodeViewContent for blocks with content === "rich-text".
 */
export function buildAuthoredNodeView(
  manifest: AuthoredBlockManifest,
): FC<NodeViewProps> {
  const AuthoredNodeView: FC<NodeViewProps> = ({
    node,
    updateAttributes,
    selected,
  }) => {
    return React.createElement(
      NodeViewWrapper,
      {
        "data-block-id": node.attrs.blockId as string,
        "data-block-type": manifest.slug,
        className: `authored-block-editor ${selected ? "authored-block-editor--selected" : ""}`,
      },
      // Toolbar: visible only when selected
      selected
        ? React.createElement(
            "div",
            {
              className: "authored-toolbar",
              contentEditable: false,
            },
            React.createElement(
              "span",
              { className: "authored-toolbar__title" },
              manifest.title,
            ),
            ...manifest.attrs.map((field) =>
              React.createElement(AttrWidget, {
                key: field.fieldId,
                field,
                value: node.attrs[field.fieldId],
                onChange: (v) => updateAttributes({ [field.fieldId]: v }),
              }),
            ),
          )
        : null,
      // Content area for rich-text blocks
      manifest.content === "rich-text"
        ? React.createElement(NodeViewContent, {
            className: "authored-block-content",
          })
        : null,
    );
  };

  Object.defineProperty(AuthoredNodeView, "name", {
    value: `AuthoredNodeView_${manifest.slug}`,
  });

  return AuthoredNodeView;
}

// ─── TipTap node factory ──────────────────────────────────────────────────────

/**
 * Builds a TipTap Node for an Authored block.
 *
 * The node is fully dynamic: attrs, parseHTML/renderHTML, content mode, and
 * node view are all derived from the manifest at call time.
 */
export function buildAuthoredTipTapNode(manifest: AuthoredBlockManifest): Node {
  const nodeView = buildAuthoredNodeView(manifest);
  const defaults = buildDefaultAttrs(manifest);

  return Node.create({
    name: manifest.slug,
    group: "block",
    // "block+" when the block has rich-text content; atom (no content) otherwise
    content: manifest.content === "rich-text" ? "block+" : "",
    atom: manifest.content === "none",
    defining: true,
    isolating: manifest.content === "rich-text",

    addAttributes() {
      // Base attrs present on every authored block
      const attrs: Record<
        string,
        {
          default: unknown;
          parseHTML: (el: Element) => unknown;
          renderHTML: (a: Record<string, unknown>) => Record<string, string>;
        }
      > = {
        blockId: {
          default: null,
          parseHTML: (el) => el.getAttribute("data-block-id"),
          renderHTML: (a) => ({ "data-block-id": String(a.blockId ?? "") }),
        },
        note: {
          default: "",
          parseHTML: (el) => el.getAttribute("data-note") || "",
          renderHTML: (a) => ({ "data-note": String(a.note ?? "") }),
        },
      };

      // Dynamic attrs from the manifest
      for (const field of manifest.attrs) {
        const defaultVal =
          "defaultValue" in field && field.defaultValue !== undefined
            ? field.defaultValue
            : field.kind === "repeated-item"
              ? []
              : null;

        attrs[field.fieldId] = {
          default: defaultVal,
          parseHTML(el) {
            const raw = el.getAttribute(`data-attr-${field.fieldId}`);
            if (raw === null) return defaultVal;
            if (field.kind === "number") return parseFloat(raw);
            if (field.kind === "bool") return raw === "true";
            if (field.kind === "repeated-item") {
              try {
                return JSON.parse(raw) as unknown[];
              } catch {
                return [];
              }
            }
            return raw;
          },
          renderHTML(a) {
            const v = a[field.fieldId];
            const serialized =
              field.kind === "repeated-item" ? JSON.stringify(v) : String(v ?? "");
            return { [`data-attr-${field.fieldId}`]: serialized };
          },
        };
      }

      return attrs;
    },

    parseHTML() {
      return [{ tag: `div[data-block-type="${manifest.slug}"]` }];
    },

    renderHTML({ HTMLAttributes }) {
      return [
        "div",
        mergeAttributes(HTMLAttributes, {
          "data-block-type": manifest.slug,
        }),
        ...(manifest.content === "rich-text" ? [0] : []),
      ];
    },

    addCommands() {
      // Generic insert command named insert_<slug> (kebab → underscore)
      const cmdName = `insert_${manifest.slug.replace(/-/g, "_")}`;
      const slug = manifest.slug;
      const isRichText = manifest.content === "rich-text";
      return {
        [cmdName]:
          () =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ({ commands }: { commands: any }) =>
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            commands.insertContent({
              type: slug,
              attrs: {
                ...defaults,
                blockId: crypto.randomUUID(),
              },
              ...(isRichText
                ? { content: [{ type: "paragraph", content: [] }] }
                : {}),
            }),
      } as Record<string, unknown>;
    },

    addNodeView() {
      return ReactNodeViewRenderer(nodeView);
    },
  });
}
