import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App Error Boundary caught an error:", error, errorInfo);
    this.state = { ...this.state, errorInfo };
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          fontFamily: "Inter, system-ui, sans-serif",
          backgroundColor: "#0f172a",
          color: "#f1f5f9"
        }}>
          <div style={{
            maxWidth: "500px",
            textAlign: "center"
          }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
              Something went wrong
            </h1>
            <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
              The application encountered an unexpected error. Please try reloading the page.
            </p>
            <button
              onClick={this.handleReload}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontWeight: 500,
                marginBottom: "1.5rem"
              }}
            >
              Reload Page
            </button>
            <details style={{
              textAlign: "left",
              backgroundColor: "#1e293b",
              padding: "1rem",
              borderRadius: "0.5rem",
              marginTop: "1rem"
            }}>
              <summary style={{ cursor: "pointer", color: "#94a3b8", marginBottom: "0.5rem" }}>
                Error Details
              </summary>
              <pre style={{
                fontSize: "0.75rem",
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: "#f87171"
              }}>
                {this.state.error?.toString()}
                {"\n\n"}
                {this.state.error?.stack}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
