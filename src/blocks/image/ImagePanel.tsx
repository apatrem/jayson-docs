import { type FC } from "react";
import type { BlockPanelProps } from "../defineBlock";
import { PanelShell, Field, usePanelDraft } from "../panel-kit";
import {
  ImageBlockSchema,
  type ImageAlign,
  type ImageBlock,
  type ImageWidth,
} from "./schema";

const WIDTHS: ImageWidth[] = ["small", "medium", "large", "full"];
const ALIGNS: ImageAlign[] = ["left", "center", "right"];

export const ImagePanel: FC<BlockPanelProps<ImageBlock>> = ({
  block,
  onUpdate,
  onClose,
}) => {
  const { draft, errors, update } = usePanelDraft(
    block,
    ImageBlockSchema,
    onUpdate,
  );
  return (
    <PanelShell title="Image" onClose={onClose}>
      <Field
        label="Source path"
        error={errors["src"]}
        hint="Relative asset path (e.g. assets/diagram.png)"
      >
        <input
          type="text"
          value={draft.src}
          onChange={(e) => update({ ...draft, src: e.target.value })}
        />
      </Field>
      <Field label="Alt text" error={errors["alt"]}>
        <input
          type="text"
          value={draft.alt}
          onChange={(e) => update({ ...draft, alt: e.target.value })}
        />
      </Field>
      <Field label="Caption" error={errors["caption"]}>
        <input
          type="text"
          value={draft.caption ?? ""}
          onChange={(e) =>
            update({ ...draft, caption: e.target.value || undefined })
          }
        />
      </Field>
      <Field label="Width">
        <select
          value={draft.width}
          onChange={(e) =>
            update({ ...draft, width: e.target.value as ImageWidth })
          }
        >
          {WIDTHS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Align">
        <select
          value={draft.align}
          onChange={(e) =>
            update({ ...draft, align: e.target.value as ImageAlign })
          }
        >
          {ALIGNS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </Field>
    </PanelShell>
  );
};
