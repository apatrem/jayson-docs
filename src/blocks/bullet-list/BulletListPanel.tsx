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
  BulletListBlockSchema,
  emptyBulletListItem,
  type BulletListBlock,
  type BulletListItem,
} from "./schema";

const MAX_ITEMS = 12;

export const BulletListPanel: FC<BlockPanelProps<BulletListBlock>> = ({
  block,
  onUpdate,
  onClose,
}) => {
  const { draft, errors, update } = usePanelDraft(
    block,
    BulletListBlockSchema,
    onUpdate,
  );

  const setItemText = (i: number, text: string): void =>
    update({
      ...draft,
      items: draft.items.map((item, idx) =>
        idx === i
          ? ({
              ...item,
              text: plainTextToFragment(text) as BulletListItem["text"],
            })
          : item,
      ),
    });

  return (
    <PanelShell title="Bullet List" onClose={onClose}>
      <p style={{ fontSize: 11, color: "#64748B", marginTop: 8 }}>
        Edits item text as plain text. Nested sub-items are preserved but not
        editable here.
      </p>
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
            update({ ...draft, items: [...draft.items, emptyBulletListItem()] })
          }
        >
          Add item
        </button>
      )}
    </PanelShell>
  );
};
