import { t, useLocale } from "../../lib/i18n";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import { applyCanvasPreset } from "../../lib/canvas-presets";
import SavedPresetManager from "../presets/SavedPresetManager";
import {
  usePresetStore,
  type CanvasPreset,
} from "../../stores/preset.store";

function isValidPresetEntry(entry: unknown): entry is Partial<CanvasPreset> {
  if (typeof entry !== "object" || entry === null) return false;
  const obj = entry as Record<string, unknown>;
  if (typeof obj.name !== "string") return false;
  if (typeof obj.canvasWidth !== "number") return false;
  if (typeof obj.canvasHeight !== "number") return false;
  if (typeof obj.background !== "object" || obj.background === null)
    return false;
  return true;
}

function fillDefaults(partial: Partial<CanvasPreset>): CanvasPreset {
  return {
    id: crypto.randomUUID(),
    name: partial.name ?? t("Imported Preset"),
    canvasWidth: partial.canvasWidth ?? 1280,
    canvasHeight: partial.canvasHeight ?? 960,
    canvasSizeMode: partial.canvasSizeMode === "padding" ? "padding" : "fixed",
    padding: partial.padding ?? 64,
    background: partial.background ?? {
      type: "solid" as const,
      color: "#1e1e2e",
      gradientColors: ["#1e1e2e", "#1e1e2e"] as [string, string],
      gradientAngle: 135,
      imageSrc: null,
      blur: 0,
      grain: 0,
    },
    cornerRadius: partial.cornerRadius ?? 12,
    shadowEnabled: partial.shadowEnabled ?? true,
    shadowBlur: partial.shadowBlur ?? 20,
    shadowOffsetY: partial.shadowOffsetY ?? 10,
    shadowColor: partial.shadowColor,
    shadowOffsetX: partial.shadowOffsetX,
    insetBorderEnabled: partial.insetBorderEnabled ?? false,
    insetBorderWidth: partial.insetBorderWidth ?? 8,
    insetBorderColor: partial.insetBorderColor,
    frame: partial.frame,
  };
}

export default function PresetPanel() {
  useLocale();
  const importPresets = usePresetStore((s) => s.importPresets);

  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (!importError) return;
    const timer = setTimeout(() => setImportError(null), 3000);
    return () => clearTimeout(timer);
  }, [importError]);

  const handleExport = async () => {
    const currentPresets = usePresetStore.getState().presets;
    if (currentPresets.length === 0) return;

    const exportObj = {
      version: 1,
      app: "openshots",
      presets: currentPresets,
    };

    const path = await save({
      defaultPath: "openshots-presets.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (!path) return;

    try {
      await invoke<string>("save_text_file", {
        path,
        contents: JSON.stringify(exportObj, null, 2),
      });
    } catch (err) {
      console.error("[OpenShots] Failed to export presets:", err);
    }
  };

  const handleImport = async () => {
    const filePath = await open({
      multiple: false,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (!filePath) return;

    try {
      const contents = await invoke<string>("read_text_file", {
        path: filePath as string,
      });

      let data: unknown;
      try {
        data = JSON.parse(contents);
      } catch {
        setImportError("Invalid JSON file");
        return;
      }

      if (typeof data !== "object" || data === null) {
        setImportError("Invalid preset file format");
        return;
      }

      const obj = data as Record<string, unknown>;
      if (!Array.isArray(obj.presets)) {
        setImportError("No presets array found in file");
        return;
      }

      const validPresets: CanvasPreset[] = [];
      for (const entry of obj.presets) {
        if (isValidPresetEntry(entry)) {
          validPresets.push(fillDefaults(entry));
        }
      }

      if (validPresets.length === 0) {
        setImportError("No valid presets found in file");
        return;
      }

      importPresets(validPresets);
      setImportError(null);
    } catch (err) {
      console.error("[OpenShots] Failed to import presets:", err);
      setImportError("Failed to read file");
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-medium text-zinc-500 tracking-wide">
        {t("Presets")}
      </h3>

      <SavedPresetManager onApply={applyCanvasPreset} />

      <div className="flex gap-2">
        <button
          onClick={handleExport}
          className="flex-1 px-3 py-2 text-[13px] rounded-md bg-zinc-800/40 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-300 transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none"
        >
          {t("Export")}
        </button>
        <button
          onClick={handleImport}
          className="flex-1 px-3 py-2 text-[13px] rounded-md bg-zinc-800/40 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-300 transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none"
        >
          {t("Import")}
        </button>
      </div>

      {importError && (
        <p className="text-[11px] text-red-400">{t(importError)}</p>
      )}
    </div>
  );
}
