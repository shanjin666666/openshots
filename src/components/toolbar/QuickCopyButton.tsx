import { t, useLocale } from "../../lib/i18n";
import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { writeImage } from "@tauri-apps/plugin-clipboard-manager";
import { Image } from "@tauri-apps/api/image";
import Konva from "konva";
import { exportStageImage } from "../../lib/export-stage";

interface QuickCopyButtonProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export default function QuickCopyButton({ stageRef }: QuickCopyButtonProps) {
  useLocale();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const stage = stageRef.current;
    if (!stage) return;

    try {
      const currentScale = stage.scaleX();
      const pixelRatio = 2 / currentScale;
      const dataUrl = exportStageImage(stage, { pixelRatio, mimeType: "image/png" });
      const base64 = dataUrl.split(",")[1] ?? "";
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const tauriImage = await Image.fromBytes(bytes);
      await writeImage(tauriImage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[QuickCopy] Failed:", err);
    }
  }, [stageRef]);

  return (
    <button
      onClick={() => void handleCopy()}
      className="h-8 shrink-0 flex items-center gap-1.5 rounded-md bg-zinc-800/80 px-3 select-none hover:bg-zinc-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
    >
      {copied ? (
        <Check className="w-4 h-4 text-emerald-400" />
      ) : (
        <Copy className="w-4 h-4 text-zinc-500" />
      )}
      <span className="text-[13px] text-zinc-300 whitespace-nowrap" aria-live="polite">
        {copied ? t("Copied!") : t("Quick Copy")}
      </span>
    </button>
  );
}
