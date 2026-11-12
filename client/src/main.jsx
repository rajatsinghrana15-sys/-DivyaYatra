import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import "./theme.css";
import "./loaders.css";
import "./responsive.css";
import "./polish.css";

createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
// Remove the pre-JS splash once React has painted.
requestAnimationFrame(() => document.getElementById("boot")?.remove());
