import { type FC } from "react";
import type { BlockPanelProps } from "../defineBlock";
import { PanelShell, Field, FieldGroup, usePanelDraft } from "../panel-kit";
import {
  TeamBlockSchema,
  type TeamBlock,
  type TeamLayout,
  type TeamMember,
} from "./schema";

const LAYOUTS: TeamLayout[] = ["grid", "hierarchical", "list"];
const MAX_MEMBERS = 12;

export const TeamPanel: FC<BlockPanelProps<TeamBlock>> = ({
  block,
  onUpdate,
  onClose,
}) => {
  const { draft, errors, update } = usePanelDraft(
    block,
    TeamBlockSchema,
    onUpdate,
  );

  const setMember = (i: number, patch: Partial<TeamMember>): void =>
    update({
      ...draft,
      members: draft.members.map((m, idx) =>
        idx === i ? { ...m, ...patch } : m,
      ),
    });

  return (
    <PanelShell title="Team" onClose={onClose}>
      <Field label="Layout">
        <select
          value={draft.layout}
          onChange={(e) =>
            update({ ...draft, layout: e.target.value as TeamLayout })
          }
        >
          {LAYOUTS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </Field>

      {draft.members.map((member, i) => (
        <FieldGroup
          key={i}
          legend={`Member ${i + 1}`}
          {...(draft.members.length > 1
            ? {
                onRemove: () =>
                  update({
                    ...draft,
                    members: draft.members.filter((_, idx) => idx !== i),
                  }),
              }
            : {})}
        >
          <Field label="Name" error={errors[`members.${i}.name`]}>
            <input
              type="text"
              value={member.name}
              onChange={(e) => setMember(i, { name: e.target.value })}
            />
          </Field>
          <Field label="Role" error={errors[`members.${i}.role`]}>
            <input
              type="text"
              value={member.role}
              onChange={(e) => setMember(i, { role: e.target.value })}
            />
          </Field>
          <Field label="Allocation">
            <input
              type="text"
              value={member.allocation ?? ""}
              onChange={(e) =>
                setMember(i, { allocation: e.target.value || undefined })
              }
            />
          </Field>
          <Field label="Bio">
            <textarea
              rows={2}
              value={member.bio ?? ""}
              maxLength={200}
              style={{ width: "100%" }}
              onChange={(e) =>
                setMember(i, { bio: e.target.value || undefined })
              }
            />
          </Field>
        </FieldGroup>
      ))}

      {draft.members.length < MAX_MEMBERS && (
        <button
          type="button"
          style={{ marginTop: 12 }}
          onClick={() =>
            update({
              ...draft,
              members: [...draft.members, { name: "Name", role: "Role" }],
            })
          }
        >
          Add member
        </button>
      )}
    </PanelShell>
  );
};
