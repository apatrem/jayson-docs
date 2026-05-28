import { type FC } from "react";
import type { BlockPanelProps } from "../defineBlock";
import { PanelShell, Field, FieldGroup, usePanelDraft } from "../panel-kit";
import {
  RiskMatrixBlockSchema,
  riskMatrixDimension,
  defaultRiskMatrixItem,
  type RiskMatrixBlock,
  type RiskMatrixGridSize,
  type RiskMatrixItem,
  type RiskSeverity,
} from "./schema";

const GRID_SIZES: RiskMatrixGridSize[] = ["2x2", "3x3"];
const SEVERITIES: RiskSeverity[] = ["low", "medium", "high", "critical"];
const MAX_RISKS = 20;

export const RiskMatrixPanel: FC<BlockPanelProps<RiskMatrixBlock>> = ({
  block,
  onUpdate,
  onClose,
}) => {
  const { draft, errors, update } = usePanelDraft(
    block,
    RiskMatrixBlockSchema,
    onUpdate,
  );
  const dim = riskMatrixDimension(draft.gridSize);

  const setRisk = (i: number, patch: Partial<RiskMatrixItem>): void =>
    update({
      ...draft,
      risks: draft.risks.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    });

  return (
    <PanelShell title="Risk Matrix" onClose={onClose}>
      <Field label="Grid size">
        <select
          value={draft.gridSize}
          onChange={(e) =>
            update({ ...draft, gridSize: e.target.value as RiskMatrixGridSize })
          }
        >
          {GRID_SIZES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </Field>
      <Field label="X axis label" error={errors["xAxisLabel"]}>
        <input
          type="text"
          value={draft.xAxisLabel}
          maxLength={40}
          onChange={(e) => update({ ...draft, xAxisLabel: e.target.value })}
        />
      </Field>
      <Field label="Y axis label" error={errors["yAxisLabel"]}>
        <input
          type="text"
          value={draft.yAxisLabel}
          maxLength={40}
          onChange={(e) => update({ ...draft, yAxisLabel: e.target.value })}
        />
      </Field>

      {draft.risks.map((risk, i) => (
        <FieldGroup
          key={i}
          legend={`Risk ${i + 1}`}
          {...(draft.risks.length > 1
            ? {
                onRemove: () =>
                  update({
                    ...draft,
                    risks: draft.risks.filter((_, idx) => idx !== i),
                  }),
              }
            : {})}
        >
          <Field label="Label" error={errors[`risks.${i}.label`]}>
            <input
              type="text"
              value={risk.label}
              maxLength={40}
              onChange={(e) => setRisk(i, { label: e.target.value })}
            />
          </Field>
          <div style={{ display: "flex", gap: 8 }}>
            <Field label={`X (1–${dim})`} error={errors[`risks.${i}.x`]}>
              <input
                type="number"
                min={1}
                max={dim}
                value={risk.x}
                style={{ width: 60 }}
                onChange={(e) => setRisk(i, { x: Number(e.target.value) })}
              />
            </Field>
            <Field label={`Y (1–${dim})`} error={errors[`risks.${i}.y`]}>
              <input
                type="number"
                min={1}
                max={dim}
                value={risk.y}
                style={{ width: 60 }}
                onChange={(e) => setRisk(i, { y: Number(e.target.value) })}
              />
            </Field>
          </div>
          <Field label="Severity">
            <select
              value={risk.severity}
              onChange={(e) =>
                setRisk(i, { severity: e.target.value as RiskSeverity })
              }
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </FieldGroup>
      ))}

      {draft.risks.length < MAX_RISKS && (
        <button
          type="button"
          style={{ marginTop: 12 }}
          onClick={() =>
            update({
              ...draft,
              risks: [...draft.risks, defaultRiskMatrixItem("New risk", 1, 1)],
            })
          }
        >
          Add risk
        </button>
      )}
    </PanelShell>
  );
};
