import { Component, type ErrorInfo, type ReactNode } from "react";

export interface AppErrorBoundaryProps {
  children: ReactNode;
  onTryReopen: () => Promise<void> | void;
  onBackToWelcome: () => void;
  resetKey: string;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  override state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Document render failed", error, errorInfo);
  }

  override componentDidUpdate(previousProps: AppErrorBoundaryProps): void {
    if (
      previousProps.resetKey !== this.props.resetKey &&
      this.state.error !== null
    ) {
      this.setState({ error: null });
    }
  }

  override render(): ReactNode {
    if (this.state.error === null) {
      return this.props.children;
    }

    return (
      <section role="alert" aria-label="Document render error">
        <p>
          Document failed to render — unsaved edits may be lost. Try reopening
          the file, or return to the welcome screen.
        </p>
        <button
          type="button"
          onClick={() => {
            this.setState({ error: null });
            void this.props.onTryReopen();
          }}
        >
          Try reopen
        </button>
        <button
          type="button"
          onClick={() => {
            this.setState({ error: null });
            this.props.onBackToWelcome();
          }}
        >
          Back to welcome screen
        </button>
      </section>
    );
  }
}
