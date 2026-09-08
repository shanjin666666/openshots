import { t, useLocale } from "../../lib/i18n";
import { useState } from "react";
import { exportCanvas, type ExportFormat, type ExportStatus } from "../../ipc/export";
import { saveProject } from "../../lib/project-file";
import { shareFile } from "../../ipc/share";
import { writeImage } from "@tauri-apps/plugin-clipboard-manager";
import { Image } from "@tauri-apps/api/image";
import Konva from "konva";
import { editorExportPixels, editorExportPng } from "../../lib/editor-export";
import type { ExportScale } from "../../lib/export-resolution";
import { useExportResolution } from "../../hooks/useExportResolution";
import ExportScaleControl from "../toolbar/ExportScaleControl";

interface ExportPanelProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export default function ExportPanel({ stageRef }: ExportPanelProps) {
  useLocale();
  const [format, setFormat] = useState<ExportFormat>("png");
  const [quality, setQuality] = useState(90);
  const [scale, setScale] = useState<ExportScale>("auto");
  const resolution = useExportResolution(scale);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [lastExport, setLastExport] = useState<ExportStatus | null>(null);

  const handleExport = async () => {
    const stage = stageRef.current;
    if (!stage) return;

    setExporting(true);
    setError("");
    try {
      const imageData = editorExportPixels(stage, resolution, format === "jpeg");

      const result = await exportCanvas(
        new Uint8Array(imageData.data.buffer),
        imageData.width,
        imageData.height,
        { format, quality, scale: 1 },
      );

      if (result) setLastExport({ kind: "image", path: result });
    } catch (err) {
      console.error("Export failed:", err);
      setError(err instanceof Error ? err.message : "Export failed. Please try a smaller output size.");
    } finally {
      setExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    const stage = stageRef.current;
    if (!stage) return;

    try {
      setError("");
      const dataUrl = editorExportPng(stage, resolution);
      const base64 = dataUrl.split(",")[1] ?? "";
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const tauriImage = await Image.fromBytes(bytes);
      await writeImage(tauriImage);
      setLastExport({ kind: "copied" });
      setTimeout(() => setLastExport(null), 2000);
    } catch (err) {
      console.error("Copy to clipboard failed:", err);
      setError(err instanceof Error ? err.message : "Export failed. Please try a smaller output size.");
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-medium text-zinc-500 tracking-wide">
        {t("Export")}
      </h3>

      {/* Format */}
      <div className="flex gap-1">
        {(["png", "jpeg", "webp"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            className={`px-2 py-1 text-[12px] rounded-md uppercase transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none ${
              format === f
                ? "bg-zinc-100 text-zinc-900"
                : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Quality */}
      {format === "jpeg" && (
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-zinc-500 w-12">{t("Quality")}</label>
          <input
            type="range"
            min={10}
            max={100}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="flex-1 accent-zinc-400"
          />
          <span className="text-[11px] text-zinc-500 w-7 text-right">
            {quality}%
          </span>
        </div>
      )}

      <ExportScaleControl value={scale} onChange={setScale} resolution={resolution} />
      {error && <p role="alert" className="text-xs text-red-300">{t(error)}</p>}

      {/* Export buttons */}
      <button
        onClick={handleExport}
        disabled={exporting}
        className="w-full px-3 py-2 text-[13px] font-medium rounded-md bg-white text-zinc-900 hover:bg-zinc-200 disabled:opacity-40 transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none"
      >
        {exporting ? t("Exporting...") : "Save to File"}
      </button>

      <button
        onClick={handleCopyToClipboard}
        className="w-full px-3 py-2 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none"
      >
        {t("Copy to Clipboard")}
      </button>

      {/* Divider */}
      <div className="border-t border-zinc-800/60" />

      <button
        onClick={async () => {
          try {
            const path = await saveProject();
            if (path) {
              setLastExport({ kind: "project", path });
              setTimeout(() => setLastExport(null), 3000);
            }
          } catch (err) {
            console.error("Save project failed:", err);
          }
        }}
        className="w-full px-3 py-2 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none"
      >
        {t("Save as Project")}
      </button>

      <button
        onClick={async () => {
          if (lastExport?.kind !== "image") return;
          try {
            await shareFile(lastExport.path);
          } catch (err) {
            console.error("Share failed:", err);
          }
        }}
        disabled={lastExport?.kind !== "image"}
        className="w-full px-3 py-2 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {t("Share Last Export")}
      </button>

      {lastExport && (
        <p className="text-[11px] text-green-400/80 truncate">{lastExport.kind === "copied" ? t("Copied to clipboard!") : lastExport.kind === "project" ? t("Saved: {path}", { path: lastExport.path }) : lastExport.path}</p>
      )}
    </div>
  );
}
