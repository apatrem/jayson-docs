import { type FC } from "react";
import type { BlockPanelProps } from "../defineBlock";
import { PanelShell, Field, usePanelDraft } from "../panel-kit";
import {
  HeadingBlockSchema,
  type HeadingBlock,
  type HeadingLevel,
} from "./schema";

const LEVELS: HeadingLevel[] = [1, 2, 3, 4];

export const HeadingPanel: FC<BlockPanelProps<HeadingBlock>> = ({
  block,
  onUpdate,
  onClose,
}) => {
  const { draft, errors, update } = usePanelDraft(
    block,
    HeadingBlockSchema,
    onUpdate,
  );
  return (
    <PanelShell title="Heading" onClose={onClose}>
      <Field label="Level">
        <select
          value={draft.level}
          onChange={(e) =>
            update({ ...draft, level: Number(e.target.value) as HeadingLevel })
          }
        >
          {LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>
              H{lvl}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Text" error={errors["text"]}>
        <input
          type="text"
          value={draft.text}
          maxLength={200}
          onChange={(e) => update({ ...draft, text: e.target.value })}
        />
      </Field>
      <Field>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={draft.numbered}
            onChange={(e) => update({ ...draft, numbered: e.target.checked })}
          />
          Numbered
        </label>
      </Field>
    </PanelShell>
  );
};
