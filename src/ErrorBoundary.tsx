import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Atlasforge editor error", error, info.componentStack);
  }
  render() {
    if (this.state.error)
      return (
        <div className="loading-screen wood">
          <h1>ATLASFORGE</h1>
          <p>
            The editor stopped unexpectedly. Your last autosaved project is kept
            in this browser.
          </p>
          <button className="button brass" onClick={() => location.reload()}>
            Reload saved project
          </button>
        </div>
      );
    return this.props.children;
  }
}
