import React from "react";
import ReactDOM from "react-dom/client";
import LanguageSync from "./lib/i18n/LanguageSync";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LanguageSync />
    <App />
  </React.StrictMode>,
);
