import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import "./theme.css";
import "./loaders.css";
import "./responsive.css";
import "./polish.css";

class ErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div
          style={{ padding: 24, textAlign: "center", fontFamily: "sans-serif" }}
        >
          <h2>Something went wrong</h2>
          <p>
            Please reload the page. If you opened this link inside WhatsApp, try
            opening it in Chrome.
          </p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
requestAnimationFrame(() => document.getElementById("boot")?.remove());
