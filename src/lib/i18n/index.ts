import { create } from "zustand";
import { zhCN } from "./messages";

export type Locale = "zh-CN" | "en";
export const LOCALE_STORAGE_KEY = "openshots-locale";
export const normalizeLocale = (value: unknown): Locale => value === "en" ? "en" : "zh-CN";

function readLocale(): Locale {
  try { return normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY)); }
  catch { return "zh-CN"; }
}

const languageStore = create<{ locale: Locale }>(() => ({ locale: readLocale() }));
export const getLocale = () => languageStore.getState().locale;
export const useLocale = () => languageStore((state) => state.locale);

export function setLocale(locale: Locale): void {
  const next = normalizeLocale(locale);
  try { localStorage.setItem(LOCALE_STORAGE_KEY, next); } catch { /* In-memory switching still works. */ }
  languageStore.setState({ locale: next });
}

/** English is the fallback for untranslated messages; interpolate values without translating user content. */
export function translate(locale: Locale, key: string, values: Record<string, string | number> = {}): string {
  const message = locale === "zh-CN" && Object.prototype.hasOwnProperty.call(zhCN, key) ? zhCN[key]! : key;
  return message.replace(/\{(\w+)\}/g, (token, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : token);
}

/** Read at call time so async actions and native dialogs use the latest language. */
export function t(key: string, values?: Record<string, string | number>): string {
  return translate(getLocale(), key, values);
}

// Local storage events keep the editor and existing floating previews in sync.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === LOCALE_STORAGE_KEY || event.key === null) {
      languageStore.setState({ locale: readLocale() });
    }
  });
}
