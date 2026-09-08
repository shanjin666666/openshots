import { Image, Paintbrush } from "lucide-react";
import { t, useLocale } from "../../lib/i18n";
import { useCanvasStore } from "../../stores/canvas.store";
import BackgroundProperties from "./BackgroundProperties";
import ElementProperties from "./ElementProperties";

export type EditorPanel = "background" | "element";

export default function EditorSidebar({ panel, onPanelChange }: {
  panel: EditorPanel;
  onPanelChange: (panel: EditorPanel) => void;
}) {
  useLocale();
  const elementLabel = useCanvasStore((state) =>
    state.annotations.some((item) => item.id === state.selectedId) ? "Shape Properties"
      : state.privacyRegions.some((item) => item.id === state.selectedId) ? "Blur / Pixelate" : "Image Properties");

  const selectPanel = (next: EditorPanel) => {
    const store = useCanvasStore.getState();
    if (next === "element" && !store.selectedId && store.images[0]) store.setSelectedId(store.images[0].id);
    onPanelChange(next);
  };

  return <aside aria-label={t("Editing sidebar")} className="w-72 shrink-0 min-h-0 flex flex-col border-r border-zinc-800/60 bg-zinc-950">
    <div className="flex gap-1 p-3 border-b border-zinc-800/60 shrink-0">
      {([{ id: "background", label: "Background", Icon: Paintbrush }, { id: "element", label: elementLabel, Icon: Image }] as const).map(({ id, label, Icon }) =>
        <button key={id} type="button" aria-pressed={panel === id} aria-controls={`editor-${id}-panel`}
          onClick={() => selectPanel(id)}
          className={`flex-1 flex items-center justify-center gap-2 rounded-md px-2 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${panel === id ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900"}`}>
          <Icon size={14} aria-hidden="true" />{t(label)}
        </button>)}
    </div>
    <div id="editor-background-panel" role="region" aria-label={t("Background")} hidden={panel !== "background"} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <BackgroundProperties active={panel === "background"} />
    </div>
    <div id="editor-element-panel" role="region" aria-label={t(elementLabel)} hidden={panel !== "element"} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <ElementProperties />
    </div>
  </aside>;
}
