import {
  Component,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type FC,
  type ReactNode,
} from "react";
import {
  RenderFailedPlaceholder,
  type RenderFailedReason,
} from "./RenderFailedPlaceholder";

export const DEFAULT_RENDER_BUDGET_MS = 50;
export const WATCHDOG_UNMOUNT_GRACE_MS = 100;

export interface RenderWatchdogOptions {
  budgetMs?: number;
  // When true, synchronous render errors are caught and shown as RenderFailedPlaceholder
  // instead of bubbling to the nearest React error boundary. Enable for individual blocks;
  // leave false (default) for component-level wrappers where AppErrorBoundary should handle.
  catchErrors?: boolean;
}

interface ErrorBoundaryState {
  failedReason: "render-threw" | null;
  detail: string | undefined;
}

class RenderErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { failedReason: null, detail: undefined };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      failedReason: "render-threw",
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  override render(): ReactNode {
    const { failedReason, detail } = this.state;
    if (failedReason !== null) {
      return (
        <RenderFailedPlaceholder
          reason={failedReason}
          {...(detail !== undefined ? { detail } : {})}
        />
      );
    }
    return this.props.children;
  }
}

export function withRenderWatchdog<P extends object>(
  Component: ComponentType<P>,
  options: RenderWatchdogOptions = {},
): FC<P> {
  const budgetMs = options.budgetMs ?? DEFAULT_RENDER_BUDGET_MS;
  const catchErrors = options.catchErrors ?? false;

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
    const inner = <Component {...props} />;
    return catchErrors ? <RenderErrorBoundary>{inner}</RenderErrorBoundary> : inner;
  };

  Watchdogged.displayName = `Watchdog(${Component.displayName ?? Component.name ?? "Component"})`;
  return Watchdogged;
}
