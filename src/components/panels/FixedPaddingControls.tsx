import { useState } from "react";
import { t, useLocale } from "../../lib/i18n";
import { useCanvasStore } from "../../stores/canvas.store";
import { MAX_FIXED_PADDING } from "../../lib/fixed-padding";

export function FixedPaddingField() {
  useLocale();
  const padding = useCanvasStore((s) => s.padding);
  const setFixedPadding = useCanvasStore((s) => s.setFixedPadding);
  const [error, setError] = useState(false);
  return <div className="space-y-2">
    <label className="flex items-center justify-between gap-2 text-[11px] text-zinc-400">
      {t("Padding on each side (px)")}
      <input type="number" min={0} max={MAX_FIXED_PADDING} step={1} value={padding}
        aria-label={t("Padding on each side (px)")} onChange={(event) => setError(!setFixedPadding(Number(event.target.value)))}
        onBlur={(event) => { event.currentTarget.value = String(padding); }}
        className="w-20 min-w-0 rounded-md bg-zinc-800/60 border border-zinc-700/50 px-2 py-1 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-500" />
    </label>
    {error && <p role="alert" className="text-[11px] text-amber-300">{t("The expanded image exceeds 8192 px per side or 32 megapixels. Reduce the padding.")}</p>}
  </div>;
}

export default function FixedPaddingControls({ beforeChange }: { beforeChange?: () => void }) {
  useLocale();
  const mode = useCanvasStore((s) => s.canvasSizeMode);
  const count = useCanvasStore((s) => s.images.length);
  const width = useCanvasStore((s) => s.canvasWidth);
  const height = useCanvasStore((s) => s.canvasHeight);
  const [error, setError] = useState(false);
  const expanded = mode === "padding";
  const change = (expand: boolean) => {
    beforeChange?.();
    const state = useCanvasStore.getState();
    setError(false);
    if (expand) setError(!state.setFixedPadding(state.padding));
    else state.setCanvasSize(state.canvasWidth, state.canvasHeight);
  };
  return <div className="space-y-2">
    <div role="group" aria-label={t("Canvas size mode")} className="grid grid-cols-2 gap-1">
      {[false, true].map((expand) => <button key={String(expand)} type="button" aria-pressed={expanded === expand}
        disabled={expand && count > 1} onClick={() => change(expand)}
        className={`rounded-md px-2 py-2 text-[12px] transition-colors disabled:opacity-40 ${expanded === expand
          ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800/60 text-zinc-400 enabled:hover:bg-zinc-700/60 enabled:hover:text-zinc-200"}`}>
        {t(expand ? "Fixed pixel padding" : "Aspect ratio / custom")}
      </button>)}
    </div>
    {count > 1 && <p className="text-[11px] text-zinc-500">{t("Use one image for fixed pixel padding, or batch processing for multiple images.")}</p>}
    {error && <p role="alert" className="text-[11px] text-amber-300">{t("The expanded image exceeds 8192 px per side or 32 megapixels. Reduce the padding.")}</p>}
    {expanded && <>
      <p className="text-[11px] leading-relaxed text-zinc-500">{t("Keep the original image pixels and add equal padding outside all four edges. Frames are included before padding.")}</p>
      <FixedPaddingField />
      {count > 0 && <p className="text-[11px] text-zinc-400">{t("Output:")} {width} × {height} px</p>}
    </>}
  </div>;
}
