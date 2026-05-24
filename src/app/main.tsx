import React from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { createBrowserAppDependencies } from "./providers/appDependencies";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App dependencies={createBrowserAppDependencies(window.localStorage)} />
  </React.StrictMode>,
);
