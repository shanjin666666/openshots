import { createRoot } from "react-dom/client";
import LanguageSync from "./lib/i18n/LanguageSync";
import PreviewWindow from "./components/preview/PreviewWindow";
import "./index.css";

createRoot(document.getElementById("preview-root")!).render(<><LanguageSync preview /><PreviewWindow /></>);
