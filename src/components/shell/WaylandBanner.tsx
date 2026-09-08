import { t, useLocale } from "../../lib/i18n";
import { useAppStore } from "../../stores/app.store";

export default function WaylandBanner() {
  useLocale();
  const isWayland = useAppStore((s) => s.isWayland);

  if (!isWayland) return null;

  return (
    <div className="bg-amber-950/30 border-b border-amber-900/40 px-4 py-2 text-[13px] text-amber-300/80">
      <span className="font-medium">{t("Wayland detected")}</span> — {t("Wayland hotkeys unavailable")}
    </div>
  );
}
