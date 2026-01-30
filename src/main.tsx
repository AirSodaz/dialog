import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

/**
 * Application entry point.
 * Mounts the React application to the DOM.
 */
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
