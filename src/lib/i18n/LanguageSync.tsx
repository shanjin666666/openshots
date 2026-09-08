import { useEffect } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { t, useLocale } from "./index";

// Serialize native menu updates so rapid language changes cannot finish out of order.
let nativeSync = Promise.resolve();
export default function LanguageSync({ preview = false }: { preview?: boolean }) {
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = preview ? t("OpenShots Preview") : "OpenShots";
    if (!preview && isTauri()) {
      nativeSync = nativeSync.then(() => invoke<void>("set_language", { locale }))
        .catch((error: unknown) => console.error("Language menu sync failed:", error));
    }
  }, [locale, preview]);
  return null;
}
