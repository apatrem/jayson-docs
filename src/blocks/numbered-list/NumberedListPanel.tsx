import { type FC } from "react";
import type { BlockPanelProps } from "../defineBlock";
import {
  PanelShell,
  Field,
  FieldGroup,
  usePanelDraft,
  fragmentToPlainText,
  plainTextToFragment,
} from "../panel-kit";
import {
  NumberedListBlockSchema,
  emptyNumberedListItem,
  type NumberedListBlock,
  type NumberedListItem,
} from "./schema";

const MAX_ITEMS = 12;

export const NumberedListPanel: FC<BlockPanelProps<NumberedListBlock>> = ({
  block,
  onUpdate,
  onClose,
}) => {
  const { draft, errors, update } = usePanelDraft(
    block,
    NumberedListBlockSchema,
    onUpdate,
  );

  const setItemText = (i: number, text: string): void =>
    update({
      ...draft,
      items: draft.items.map((item, idx) =>
        idx === i
          ? ({
              ...item,
              text: plainTextToFragment(text) as NumberedListItem["text"],
            })
          : item,
      ),
    });

  return (
    <PanelShell title="Numbered List" onClose={onClose}>
      <Field label="Start at" error={errors["startAt"]}>
        <input
          type="number"
          min={1}
          value={draft.startAt ?? 1}
          style={{ width: 80 }}
          onChange={(e) => {
            const n = Number(e.target.value);
            update({
              ...draft,
              startAt: Number.isFinite(n) && n > 1 ? n : undefined,
            });
          }}
        />
      </Field>
      {draft.items.map((item, i) => (
        <FieldGroup
          key={i}
          legend={`Item ${i + 1}`}
          {...(draft.items.length > 1
            ? {
                onRemove: () =>
                  update({
                    ...draft,
                    items: draft.items.filter((_, idx) => idx !== i),
                  }),
              }
            : {})}
        >
          <Field error={errors[`items.${i}.text`]}>
            <input
              type="text"
              value={fragmentToPlainText(item.text)}
              onChange={(e) => setItemText(i, e.target.value)}
            />
          </Field>
        </FieldGroup>
      ))}
      {draft.items.length < MAX_ITEMS && (
        <button
          type="button"
          style={{ marginTop: 12 }}
          onClick={() =>
            update({
              ...draft,
              items: [...draft.items, emptyNumberedListItem()],
            })
          }
        >
          Add item
        </button>
      )}
    </PanelShell>
  );
};
