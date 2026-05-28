import { type FC } from "react";
import type { BlockPanelProps } from "../defineBlock";
import { PanelShell, Field, usePanelDraft } from "../panel-kit";
import {
  DiagramBlockSchema,
  type DiagramBlock,
  type DiagramWidth,
} from "./schema";

const WIDTHS: DiagramWidth[] = ["medium", "large", "full"];

export const DiagramPanel: FC<BlockPanelProps<DiagramBlock>> = ({
  block,
  onUpdate,
  onClose,
}) => {
  const { draft, errors, update } = usePanelDraft(
    block,
    DiagramBlockSchema,
    onUpdate,
  );
  return (
    <PanelShell title="Diagram" onClose={onClose}>
      <Field label="Title" error={errors["title"]}>
        <input
          type="text"
          value={draft.title ?? ""}
          maxLength={120}
          onChange={(e) =>
            update({ ...draft, title: e.target.value || undefined })
          }
        />
      </Field>
      <Field
        label="Mermaid source"
        error={errors["source"]}
        hint="Mermaid diagram definition (flowchart, sequence, etc.)"
      >
        <textarea
          rows={10}
          value={draft.source}
          maxLength={4000}
          style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }}
          onChange={(e) => update({ ...draft, source: e.target.value })}
        />
      </Field>
      <Field label="Caption" error={errors["caption"]}>
        <input
          type="text"
          value={draft.caption ?? ""}
          maxLength={500}
          onChange={(e) =>
            update({ ...draft, caption: e.target.value || undefined })
          }
        />
      </Field>
      <Field label="Width">
        <select
          value={draft.width}
          onChange={(e) =>
            update({ ...draft, width: e.target.value as DiagramWidth })
          }
        >
          {WIDTHS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </Field>
    </PanelShell>
  );
};
