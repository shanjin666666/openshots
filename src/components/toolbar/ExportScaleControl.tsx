import { t, useLocale } from "../../lib/i18n";
import type { ExportResolution, ExportScale } from "../../lib/export-resolution";

export default function ExportScaleControl({ value, onChange, resolution }: {
  value: ExportScale; onChange: (value: ExportScale) => void; resolution: ExportResolution;
}) {
  useLocale();
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-1" role="group" aria-label={t("Export resolution")}>
      {(["auto", 1, 2, 3] as const).map((choice) => <button key={choice} type="button" aria-pressed={value === choice}
        onClick={() => onChange(choice)} className={`px-2 py-1 text-xs rounded-md ${value === choice ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"}`}>
        {choice === "auto" ? t("High resolution (auto)") : `${choice}x`}
      </button>)}
    </div>
    <p className="text-[11px] text-zinc-500">{t("Output:")} {resolution.width} × {resolution.height} px</p>
    <p className={`text-[11px] ${resolution.downsampled ? "text-amber-300" : "text-zinc-500"}`}>
      {t(resolution.limited ? "Auto resolution is limited to 32 megapixels and 8192 px per side."
        : resolution.downsampled ? "This size reduces image detail. Choose automatic resolution to preserve it."
          : value === "auto" ? "Matches source image resolution while keeping your composition." : "Exports at the selected multiple of the canvas size.")}
    </p>
  </div>;
}
