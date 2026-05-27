import type { FC } from "react";
import { useBrandTokens } from "../brand-tokens/useBrandTokens";

export type RenderFailedReason =
  | "render-budget-exceeded"
  | "render-threw"
  | "render-error";

export interface RenderFailedPlaceholderProps {
  reason: RenderFailedReason;
  detail?: string;
}

export const RenderFailedPlaceholder: FC<RenderFailedPlaceholderProps> = ({
  reason,
  detail,
}) => {
  const brand = useBrandTokens();
  const label =
    reason === "render-budget-exceeded"
      ? "This block exceeded the render time budget."
      : reason === "render-threw"
        ? "This block threw an error during render."
        : "This block failed to render.";

  return (
    <div
      role="alert"
      data-render-failed={reason}
      style={{
        padding: brand.spacing.unit * 2,
        border: `1px dashed ${brand.colors.neutral["400"]}`,
        color: brand.colors.neutral["700"],
        fontFamily: brand.typography.fonts.body.family,
        fontSize: brand.typography.scale.caption,
        backgroundColor: brand.colors.neutral["50"],
      }}
    >
      <strong>{label}</strong>
      {detail ? <div>{detail}</div> : null}
    </div>
  );
};
