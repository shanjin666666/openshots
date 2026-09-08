import { useEffect, useState } from "react";
import { readImageFile } from "../../ipc/capture";
import { loadBatchImage, renderBatchImage } from "../../lib/batch/render";
import type { BatchSettings } from "../../lib/batch/layout";
import { t, useLocale } from "../../lib/i18n";

export default function BatchPreview({ path, settings, paused }: { path: string | null; settings: BatchSettings; paused: boolean }) {
  useLocale();
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [background, setBackground] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState("");
  const [backgroundError, setBackgroundError] = useState("");
  const [renderError, setRenderError] = useState("");
  const [preview, setPreview] = useState<{ url: string; width: number; height: number } | null>(null);

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
    if (!source || paused || (settings.background.type === "image" && !background)) return;
    const timer = setTimeout(() => {
      let canvas: HTMLCanvasElement | undefined;
      try {
        const result = renderBatchImage(source, settings, background, 1000);
        canvas = result.canvas;
        setPreview({ url: canvas.toDataURL("image/png"), width: result.width, height: result.height });
      } catch (error) { setRenderError(error instanceof Error ? error.message : String(error)); }
      finally { if (canvas) { canvas.width = 0; canvas.height = 0; } }
    }, 120);
    return () => clearTimeout(timer);
  }, [source, background, settings, paused]);

  const error = loadError || backgroundError || renderError;
  return <div className="flex-1 min-w-0 flex flex-col p-6 bg-zinc-900/30 overflow-hidden">
    <div className="flex items-center justify-between text-xs text-zinc-500 mb-4">
      <span>{t("Live preview")}</span>
      {preview && <span>{preview.width} × {preview.height} px</span>}
    </div>
    <div className="flex-1 min-h-0 flex items-center justify-center">
      {preview ? <img src={preview.url} alt={t("Batch result preview")} className="max-w-full max-h-full object-contain shadow-2xl" />
        : <p className={`text-sm text-center max-w-xs ${error ? "text-red-300" : "text-zinc-500"}`}>
          {error ? t(error) : paused ? t("Processing images…") : !path ? t("Add images to preview your batch style")
            : settings.background.type === "image" && !settings.background.imageSrc ? t("Choose a background image first") : t("Loading")}
        </p>}
    </div>
    <p className="text-[11px] text-zinc-500 mt-4 text-center">{t("Each image is exported separately. Source files stay unchanged.")}</p>
  </div>;
}
