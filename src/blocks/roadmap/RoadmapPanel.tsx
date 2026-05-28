import { type FC } from "react";
import type { BlockPanelProps } from "../defineBlock";
import { PanelShell, Field, FieldGroup, usePanelDraft } from "../panel-kit";
import {
  RoadmapBlockSchema,
  type RoadmapBlock,
  type RoadmapMilestone,
  type RoadmapTimeUnit,
  type RoadmapWorkstream,
  type RoadmapWorkstreamColor,
} from "./schema";

const TIME_UNITS: RoadmapTimeUnit[] = ["week", "month", "quarter"];
const COLORS: RoadmapWorkstreamColor[] = [
  "auto",
  "brand.primary",
  "brand.secondary",
];
const MAX_WORKSTREAMS = 8;
const MAX_MILESTONES = 12;

export const RoadmapPanel: FC<BlockPanelProps<RoadmapBlock>> = ({
  block,
  onUpdate,
  onClose,
}) => {
  const { draft, errors, update } = usePanelDraft(
    block,
    RoadmapBlockSchema,
    onUpdate,
  );

  const setWs = (i: number, patch: Partial<RoadmapWorkstream>): void =>
    update({
      ...draft,
      workstreams: draft.workstreams.map((w, idx) =>
        idx === i ? { ...w, ...patch } : w,
      ),
    });

  const milestones = draft.milestones ?? [];
  const setMilestone = (i: number, patch: Partial<RoadmapMilestone>): void =>
    update({
      ...draft,
      milestones: milestones.map((m, idx) =>
        idx === i ? { ...m, ...patch } : m,
      ),
    });

  return (
    <PanelShell title="Roadmap" onClose={onClose} width={420}>
      <Field label="Time unit">
        <select
          value={draft.timeUnit}
          onChange={(e) =>
            update({ ...draft, timeUnit: e.target.value as RoadmapTimeUnit })
          }
        >
          {TIME_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </Field>
      <div style={{ display: "flex", gap: 8 }}>
        <Field label="Start date" error={errors["startDate"]}>
          <input
            type="date"
            value={draft.startDate}
            onChange={(e) => update({ ...draft, startDate: e.target.value })}
          />
        </Field>
        <Field label="End date" error={errors["endDate"]}>
          <input
            type="date"
            value={draft.endDate}
            onChange={(e) => update({ ...draft, endDate: e.target.value })}
          />
        </Field>
      </div>

      {draft.workstreams.map((ws, i) => (
        <FieldGroup
          key={i}
          legend={`Workstream ${i + 1}`}
          {...(draft.workstreams.length > 1
            ? {
                onRemove: () =>
                  update({
                    ...draft,
                    workstreams: draft.workstreams.filter((_, idx) => idx !== i),
                  }),
              }
            : {})}
        >
          <Field label="Label" error={errors[`workstreams.${i}.label`]}>
            <input
              type="text"
              value={ws.label}
              maxLength={80}
              onChange={(e) => setWs(i, { label: e.target.value })}
            />
          </Field>
          <div style={{ display: "flex", gap: 8 }}>
            <Field label="Start" error={errors[`workstreams.${i}.startDate`]}>
              <input
                type="date"
                value={ws.startDate}
                onChange={(e) => setWs(i, { startDate: e.target.value })}
              />
            </Field>
            <Field label="End" error={errors[`workstreams.${i}.endDate`]}>
              <input
                type="date"
                value={ws.endDate}
                onChange={(e) => setWs(i, { endDate: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Color">
            <select
              value={ws.color}
              onChange={(e) =>
                setWs(i, { color: e.target.value as RoadmapWorkstreamColor })
              }
            >
              {COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </FieldGroup>
      ))}
      {draft.workstreams.length < MAX_WORKSTREAMS && (
        <button
          type="button"
          style={{ marginTop: 12 }}
          onClick={() =>
            update({
              ...draft,
              workstreams: [
                ...draft.workstreams,
                {
                  label: "Workstream",
                  startDate: draft.startDate,
                  endDate: draft.endDate,
                  color: "auto",
                },
              ],
            })
          }
        >
          Add workstream
        </button>
      )}

      <div style={{ marginTop: 16, fontSize: 12, fontWeight: 600 }}>
        Milestones
      </div>
      {milestones.map((ms, i) => (
        <FieldGroup
          key={i}
          legend={`Milestone ${i + 1}`}
          onRemove={() =>
            update({
              ...draft,
              milestones: milestones.filter((_, idx) => idx !== i),
            })
          }
        >
          <Field label="Label" error={errors[`milestones.${i}.label`]}>
            <input
              type="text"
              value={ms.label}
              maxLength={80}
              onChange={(e) => setMilestone(i, { label: e.target.value })}
            />
          </Field>
          <Field label="Date" error={errors[`milestones.${i}.date`]}>
            <input
              type="date"
              value={ms.date}
              onChange={(e) => setMilestone(i, { date: e.target.value })}
            />
          </Field>
        </FieldGroup>
      ))}
      {milestones.length < MAX_MILESTONES && (
        <button
          type="button"
          style={{ marginTop: 8 }}
          onClick={() =>
            update({
              ...draft,
              milestones: [
                ...milestones,
                { label: "Milestone", date: draft.startDate },
              ],
            })
          }
        >
          Add milestone
        </button>
      )}
    </PanelShell>
  );
};
