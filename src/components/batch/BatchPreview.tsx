import { useEffect, useRef, useState } from "react";
import { readImageFile } from "../../ipc/capture";
import { loadBatchImage, renderBatchImage } from "../../lib/batch/render";
import { batchLayout, type BatchSettings } from "../../lib/batch/layout";
import { batchPreviewSize, type BatchPreviewMode } from "../../lib/batch/preview";
import { t, useLocale } from "../../lib/i18n";

export default function BatchPreview({ path, settings, paused }: { path: string | null; settings: BatchSettings; paused: boolean }) {
  useLocale();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0, density: 1 });
  const [mode, setMode] = useState<BatchPreviewMode>("fit");
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [background, setBackground] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState("");
  const [backgroundError, setBackgroundError] = useState("");
  const [renderError, setRenderError] = useState("");
  const [preview, setPreview] = useState<{ url: string; width: number; height: number; displayWidth: number; displayHeight: number } | null>(null);

  useEffect(() => {
    const element = viewportRef.current!;
    let screen: MediaQueryList;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      const density = window.devicePixelRatio || 1;
      setViewport((previous) => previous.width === width && previous.height === height && previous.density === density
        ? previous : { width, height, density });
    };
    const watchScreen = () => {
      screen?.removeEventListener("change", watchScreen);
      measure();
      screen = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      screen.addEventListener("change", watchScreen);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    watchScreen();
    return () => { observer.disconnect(); screen.removeEventListener("change", watchScreen); };
  }, []);

  useEffect(() => { viewportRef.current?.scrollTo(0, 0); }, [path, mode]);

  useEffect(() => {
    let disposed = false;
    let loaded: HTMLImageElement | null = null;
    setSource(null); setLoadError(""); setPreview(null);
    if (path && !paused) {
      void readImageFile(path).then(loadBatchImage).then((image) => {
        loaded = image;
        if (disposed) image.src = ""; else setSource(image);
      }).catch(() => { if (!disposed) setLoadError("Unable to read this image"); });
    }
    return () => { disposed = true; if (loaded) loaded.src = ""; };
  }, [path, paused]);

  useEffect(() => {
    let disposed = false;
    let loaded: HTMLImageElement | null = null;
    setBackground(null); setBackgroundError("");
    if (settings.background.type === "image" && settings.background.imageSrc && !paused) {
      void loadBatchImage(settings.background.imageSrc).then((image) => {
        loaded = image;
        if (disposed) image.src = ""; else setBackground(image);
      }).catch(() => { if (!disposed) setBackgroundError("Unable to read the background image"); });
    }
    return () => { disposed = true; if (loaded) loaded.src = ""; };
  }, [settings.background.type, settings.background.imageSrc, paused]);

  useEffect(() => {
    setRenderError(""); setPreview(null);
    if (!source || paused || !viewport.width || !viewport.height || (settings.background.type === "image" && !background)) return;
    let disposed = false;
    let url: string | undefined;
    const timer = setTimeout(() => {
      let canvas: HTMLCanvasElement | undefined;
      try {
        const { width, height } = batchLayout(source.naturalWidth, source.naturalHeight, settings);
        const size = batchPreviewSize(width, height, viewport.width, viewport.height, viewport.density, mode);
        const result = renderBatchImage(source, settings, background, size.renderEdge);
        canvas = result.canvas;
        canvas.toBlob((blob) => {
          if (disposed) return;
          if (!blob) { setRenderError("Unable to render this image"); return; }
          url = URL.createObjectURL(blob);
          setPreview({ url, width, height, displayWidth: size.displayWidth, displayHeight: size.displayHeight });
        }, "image/png");
      } catch (error) { setRenderError(error instanceof Error ? error.message : String(error)); }
      finally { if (canvas) { canvas.width = 0; canvas.height = 0; } }
    }, 120);
    return () => { disposed = true; clearTimeout(timer); if (url) URL.revokeObjectURL(url); };
  }, [source, background, settings, paused, viewport, mode]);

  const error = loadError || backgroundError || renderError;
  return <div className="flex-1 min-w-0 flex flex-col p-6 bg-zinc-900/30 overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 mb-4">
      <span>{t("Live preview")}</span>
      <div className="flex gap-1" role="group" aria-label={t("Preview size")}>
        {(["fit", "pixels"] as const).map((value) => <button key={value} type="button" aria-pressed={mode === value}
          title={value === "pixels" ? t("One output pixel per screen pixel. Scroll to inspect details.") : t("Fit to preview")}
          onClick={() => setMode(value)} className={`px-2 py-1 rounded ${mode === value ? "bg-zinc-700 text-zinc-100" : "hover:bg-zinc-800"}`}>
          {t(value === "fit" ? "Fit to preview" : "Actual pixels")}
        </button>)}
      </div>
      {preview && <span>{t("Output")}: {preview.width} × {preview.height} px</span>}
    </div>
    <div ref={viewportRef} className="flex-1 min-h-0 overflow-auto" tabIndex={0} aria-label={t("Batch result preview")}>
      <div className="grid place-items-center min-w-full min-h-full w-max">
      {preview ? <img src={preview.url} alt={t("Batch result preview")} draggable={false} className="block max-w-none shadow-2xl"
          style={{ width: preview.displayWidth, height: preview.displayHeight }} />
        : <p className={`text-sm text-center max-w-xs ${error ? "text-red-300" : "text-zinc-500"}`}>
          {error ? t(error) : paused ? t("Processing images…") : !path ? t("Add images to preview your batch style")
            : settings.background.type === "image" && !settings.background.imageSrc ? t("Choose a background image first") : t("Loading")}
        </p>}
      </div>
    </div>
    <p className="text-[11px] text-zinc-500 mt-4 text-center">{t(mode === "pixels" ? "One output pixel per screen pixel. Scroll to inspect details." : "Each image is exported separately. Source files stay unchanged.")}</p>
  </div>;
}
