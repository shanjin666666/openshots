import { useState } from "react";
import { Check } from "lucide-react";
import { t, useLocale } from "../../lib/i18n";
import { computeImageLayout, IMAGE_LAYOUTS, type ImageLayout, type LayoutSpacing } from "../../lib/image-layout";
import { useCanvasStore, type CanvasImage } from "../../stores/canvas.store";

const SAMPLES: CanvasImage[] = Array.from({ length: 4 }, (_, index) => ({
  id: String(index), src: "", x: 0, y: 0, width: 160, height: 110, rotation: 0, cornerRadius: 8, flipX: false, flipY: false,
  shadow: { enabled: false, color: "#000", blur: 0, offsetX: 0, offsetY: 0 },
  insetBorder: { enabled: false, color: "#fff", width: 0 },
}));
const PREVIEWS = Object.fromEntries(IMAGE_LAYOUTS.map(({ id }) => [id,
  computeImageLayout(SAMPLES.slice(0, id === "grid" ? 4 : 3), 180, 108, 14, id)]));

function LayoutPreview({ layout }: { layout: ImageLayout }) {
  return <svg viewBox="0 0 180 108" className="w-full h-14" aria-hidden="true">
    {PREVIEWS[layout]!.map((image, index) => <g key={image.id} transform={`translate(${image.x} ${image.y}) rotate(${image.rotation})`}>
      <rect x={-image.width / 2} y={-image.height / 2} width={image.width} height={image.height} rx={3}
        fill={["#a5b4fc", "#7dd3fc", "#e0e7ff", "#c4b5fd"][index]} stroke="#18181b" strokeWidth={2} />
      <path d={`M ${-image.width * 0.32} ${-image.height * 0.22} h ${image.width * 0.35}`} stroke="#334155" strokeOpacity={0.4} strokeWidth={2} strokeLinecap="round" />
    </g>)}
  </svg>;
}

export default function AutoLayoutControls() {
  useLocale();
  const images = useCanvasStore((state) => state.images);
  const applyImageLayout = useCanvasStore((state) => state.applyImageLayout);
  const imageLayout = useCanvasStore((state) => state.imageLayout);
  const [preferredSpacing, setSpacing] = useState<LayoutSpacing>("balanced");
  const spacing = imageLayout?.spacing ?? preferredSpacing;
  const [error, setError] = useState("");
  const activeLayout = imageLayout?.kind ?? null;

  const apply = (layout: ImageLayout, nextSpacing = spacing) => {
    try {
      applyImageLayout(layout, nextSpacing);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  return <section aria-label={t("Auto layout")} className="space-y-3">
    <div>
      <h3 className="text-xs font-medium text-zinc-300">{t("Auto layout")}</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
        {images.length > 1 ? t("Arrange all {count} images. Undo in one step.", { count: images.length }) : t("Add at least two images to use auto layout.")}
      </p>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {IMAGE_LAYOUTS.map(({ id, label, description }) => <button key={id} type="button" aria-label={t(label)}
        aria-pressed={activeLayout === id} title={t(description)} disabled={images.length < 2} onClick={() => apply(id)}
        className={`relative overflow-hidden rounded-lg border pb-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-40 disabled:cursor-not-allowed ${activeLayout === id ? "border-blue-400/70 bg-blue-500/10 text-blue-200" : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800/70 hover:border-zinc-600 hover:text-zinc-200"}`}>
        <LayoutPreview layout={id} />
        {activeLayout === id && <Check size={12} className="absolute right-1.5 top-1.5 text-blue-300" aria-hidden="true" />}
        {t(label)}
      </button>)}
    </div>
    <div role="group" aria-label={t("Layout spacing")} className="flex items-center gap-2">
      <span className="text-[11px] text-zinc-500 shrink-0">{t("Spacing")}</span>
      <div className="flex flex-1 gap-0.5 rounded-md bg-zinc-900 p-0.5">
        {([{ id: "compact", label: "Compact" }, { id: "balanced", label: "Balanced" }, { id: "airy", label: "Airy" }] as const).map(({ id, label }) =>
          <button key={id} type="button" aria-pressed={spacing === id} onClick={() => { setSpacing(id); if (activeLayout) apply(activeLayout, id); }}
            className={`flex-1 rounded px-1 py-1 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${spacing === id ? "bg-zinc-700/70 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>
            {t(label)}
          </button>)}
      </div>
    </div>
    {activeLayout === "featured" && <p className="text-[11px] text-zinc-500">{t("The selected image is featured. Select another image and apply again to change it.")}</p>}
    {error && <p role="alert" className="text-xs text-amber-300">{t(error)}</p>}
  </section>;
}
