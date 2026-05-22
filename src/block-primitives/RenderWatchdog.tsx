import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type FC,
} from "react";
import {
  RenderFailedPlaceholder,
  type RenderFailedReason,
} from "./RenderFailedPlaceholder";

export const DEFAULT_RENDER_BUDGET_MS = 50;
export const WATCHDOG_UNMOUNT_GRACE_MS = 100;

export interface RenderWatchdogOptions {
  budgetMs?: number;
}

export function withRenderWatchdog<P extends object>(
  Component: ComponentType<P>,
  options: RenderWatchdogOptions = {},
): FC<P> {
  const budgetMs = options.budgetMs ?? DEFAULT_RENDER_BUDGET_MS;

  const Watchdogged: FC<P> = (props) => {
    const [failedReason, setFailedReason] = useState<RenderFailedReason | null>(
      null,
    );
    const renderStartedAt = useRef(0);

    useLayoutEffect(() => {
      if (failedReason) return;
      const elapsed = performance.now() - renderStartedAt.current;
      if (elapsed > budgetMs) {
        setFailedReason("render-budget-exceeded");
      }
      // Measure each render completion; failedReason in deps stops re-triggering.
      // eslint-disable-next-line react-hooks/exhaustive-deps -- budgetMs is stable per HOC
    }, [failedReason]);

    if (failedReason) {
      return <RenderFailedPlaceholder reason={failedReason} />;
    }

    renderStartedAt.current = performance.now();
    return <Component {...props} />;
  };

  Watchdogged.displayName = `Watchdog(${Component.displayName ?? Component.name ?? "Component"})`;
  return Watchdogged;
}
