import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { ErrorBoundary } from "./ErrorBoundary";
import "./style.css";
registerSW({ immediate: true });
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
