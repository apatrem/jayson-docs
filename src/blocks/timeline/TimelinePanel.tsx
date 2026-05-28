import { type FC } from "react";
import type { BlockPanelProps } from "../defineBlock";
import { PanelShell, Field, FieldGroup, usePanelDraft } from "../panel-kit";
import {
  TimelineBlockSchema,
  type TimelineBlock,
  type TimelineConnector,
  type TimelineOrientation,
  type TimelinePhase,
} from "./schema";

const ORIENTATIONS: TimelineOrientation[] = ["horizontal", "vertical"];
const CONNECTORS: TimelineConnector[] = ["arrow", "line", "none"];
const MAX_PHASES = 7;
const MIN_PHASES = 2;

export const TimelinePanel: FC<BlockPanelProps<TimelineBlock>> = ({
  block,
  onUpdate,
  onClose,
}) => {
  const { draft, errors, update } = usePanelDraft(
    block,
    TimelineBlockSchema,
    onUpdate,
  );

  const setPhase = (i: number, patch: Partial<TimelinePhase>): void =>
    update({
      ...draft,
      phases: draft.phases.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
    });

  return (
    <PanelShell title="Timeline" onClose={onClose}>
      <Field label="Orientation">
        <select
          value={draft.orientation}
          onChange={(e) =>
            update({
              ...draft,
              orientation: e.target.value as TimelineOrientation,
            })
          }
        >
          {ORIENTATIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Connector">
        <select
          value={draft.connector}
          onChange={(e) =>
            update({ ...draft, connector: e.target.value as TimelineConnector })
          }
        >
          {CONNECTORS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      {draft.phases.map((phase, i) => (
        <FieldGroup
          key={i}
          legend={`Phase ${i + 1}`}
          {...(draft.phases.length > MIN_PHASES
            ? {
                onRemove: () =>
                  update({
                    ...draft,
                    phases: draft.phases.filter((_, idx) => idx !== i),
                  }),
              }
            : {})}
        >
          <Field label="Label" error={errors[`phases.${i}.label`]}>
            <input
              type="text"
              value={phase.label}
              maxLength={40}
              onChange={(e) => setPhase(i, { label: e.target.value })}
            />
          </Field>
          <Field label="Subtitle">
            <input
              type="text"
              value={phase.subtitle ?? ""}
              maxLength={80}
              onChange={(e) =>
                setPhase(i, { subtitle: e.target.value || undefined })
              }
            />
          </Field>
          <Field label="Body">
            <input
              type="text"
              value={phase.body ?? ""}
              maxLength={200}
              onChange={(e) =>
                setPhase(i, { body: e.target.value || undefined })
              }
            />
          </Field>
          <Field label="Duration">
            <input
              type="text"
              value={phase.duration ?? ""}
              maxLength={40}
              onChange={(e) =>
                setPhase(i, { duration: e.target.value || undefined })
              }
            />
          </Field>
        </FieldGroup>
      ))}

      {draft.phases.length < MAX_PHASES && (
        <button
          type="button"
          style={{ marginTop: 12 }}
          onClick={() =>
            update({ ...draft, phases: [...draft.phases, { label: "New phase" }] })
          }
        >
          Add phase
        </button>
      )}
    </PanelShell>
  );
};
