import { type FC } from "react";
import type { BlockPanelProps } from "../defineBlock";
import { PanelShell, Field, usePanelDraft } from "../panel-kit";
import {
  CalloutBlockSchema,
  type CalloutBlock,
  type CalloutVariant,
} from "./schema";

const VARIANTS: CalloutVariant[] = [
  "info",
  "success",
  "warning",
  "error",
  "quote",
  "tip",
];

/**
 * Edits the callout's attrs-backed fields (variant / title / attribution).
 * The body is rich text edited inline in the editor (NodeViewContent) and is
 * preserved across panel updates — updateAttributes never touches node content.
 */
export const CalloutPanel: FC<BlockPanelProps<CalloutBlock>> = ({
  block,
  onUpdate,
  onClose,
}) => {
  const { draft, errors, update } = usePanelDraft(
    block,
    CalloutBlockSchema,
    onUpdate,
  );
  return (
    <PanelShell title="Callout" onClose={onClose}>
      <Field label="Variant">
        <select
          value={draft.variant}
          onChange={(e) =>
            update({ ...draft, variant: e.target.value as CalloutVariant })
          }
        >
          {VARIANTS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Title" error={errors["title"]}>
        <input
          type="text"
          value={draft.title ?? ""}
          maxLength={100}
          onChange={(e) =>
            update({ ...draft, title: e.target.value || undefined })
          }
        />
      </Field>
      <Field
        label="Attribution"
        error={errors["attribution"]}
        hint="Shown for the quote variant"
      >
        <input
          type="text"
          value={draft.attribution ?? ""}
          maxLength={200}
          onChange={(e) =>
            update({ ...draft, attribution: e.target.value || undefined })
          }
        />
      </Field>
      <Field>
        <p style={{ fontSize: 11, color: "#64748B", margin: 0 }}>
          The callout body is edited inline in the document.
        </p>
      </Field>
    </PanelShell>
  );
};
