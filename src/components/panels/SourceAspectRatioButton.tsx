import { selectedSourceCanvasSize } from "../../lib/aspectRatios";
import { t, useLocale } from "../../lib/i18n";
import { useCanvasStore } from "../../stores/canvas.store";

export default function SourceAspectRatioButton({ onResize }: { onResize: (width: number, height: number) => void }) {
  useLocale();
  const images = useCanvasStore((state) => state.images);
  const selectedId = useCanvasStore((state) => state.selectedId);
  const width = useCanvasStore((state) => state.canvasWidth);
  const height = useCanvasStore((state) => state.canvasHeight);
  const size = selectedSourceCanvasSize(images, selectedId);
  const active = size !== null && Math.abs(width * size.height - height * size.width) <= Math.max(size.width, size.height) / 2;
  const help = !images.length ? "Add an image to use its aspect ratio."
    : !size ? "This image aspect ratio exceeds the supported canvas dimensions."
      : "Match the selected image's original aspect ratio, or the first image when none is selected.";

  return <button type="button" disabled={!size} aria-pressed={active}
    title={t(help)} onClick={() => { if (size) onResize(size.width, size.height); }}
    className={`col-span-3 px-2 py-1.5 text-[12px] rounded-md transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 outline-none disabled:opacity-40 disabled:cursor-not-allowed ${active
      ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800/60 text-zinc-400 enabled:hover:text-zinc-200 enabled:hover:bg-zinc-700/60"}`}>
    {t("Match source aspect ratio")}
  </button>;
}
