import { type FC } from "react";
import type { BlockPanelProps } from "../defineBlock";
import { PanelShell, Field, usePanelDraft } from "../panel-kit";
import { DividerBlockSchema, type DividerBlock } from "./schema";

export const DividerPanel: FC<BlockPanelProps<DividerBlock>> = ({
  block,
  onUpdate,
  onClose,
}) => {
  const { draft, errors, update } = usePanelDraft(
    block,
    DividerBlockSchema,
    onUpdate,
  );
  return (
    <PanelShell title="Divider" onClose={onClose}>
      <Field label="Label" error={errors["label"]}>
        <input
          type="text"
          value={draft.label ?? ""}
          maxLength={80}
          onChange={(e) =>
            update({ ...draft, label: e.target.value || undefined })
          }
        />
      </Field>
      <Field label="Subtitle" error={errors["subtitle"]}>
        <input
          type="text"
          value={draft.subtitle ?? ""}
          maxLength={120}
          onChange={(e) =>
            update({ ...draft, subtitle: e.target.value || undefined })
          }
        />
      </Field>
      <Field label="Numbering (e.g. “Section 3”)" error={errors["numbering"]}>
        <input
          type="text"
          value={draft.numbering ?? ""}
          maxLength={40}
          onChange={(e) =>
            update({ ...draft, numbering: e.target.value || undefined })
          }
        />
      </Field>
    </PanelShell>
  );
};
