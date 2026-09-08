import { afterEach, describe, expect, it, vi } from "vitest";
import { getLocale, LOCALE_STORAGE_KEY, normalizeLocale, setLocale, t, translate } from "./index";
import { zhCN } from "./messages";

afterEach(() => { setLocale("zh-CN"); vi.unstubAllGlobals(); });

describe("language selection", () => {
  it("defaults unsupported or missing preferences to Simplified Chinese", () => {
    expect(normalizeLocale(null)).toBe("zh-CN");
    expect(normalizeLocale("fr")).toBe("zh-CN");
    expect(normalizeLocale("en")).toBe("en");
  });
  it("persists language and changes translations without recreating the app", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", { setItem });
    setLocale("en");
    expect(setItem).toHaveBeenCalledWith(LOCALE_STORAGE_KEY, "en");
    expect(getLocale()).toBe("en");
    expect(t("Settings")).toBe("Settings");
    setLocale("zh-CN");
    expect(t("Settings")).toBe("设置");
  });
  it("restores preferences and synchronizes changes from another window", async () => {
    vi.resetModules();
    let saved: string | null = "en";
    const events = new EventTarget();
    vi.stubGlobal("window", events);
    vi.stubGlobal("localStorage", { getItem: () => saved, setItem: vi.fn() });
    const restored = await import("./index");
    expect(restored.getLocale()).toBe("en");
    saved = "zh-CN";
    events.dispatchEvent(Object.assign(new Event("storage"), { key: LOCALE_STORAGE_KEY }));
    expect(restored.t("Settings")).toBe("设置");
    saved = null;
    events.dispatchEvent(Object.assign(new Event("storage"), { key: null }));
    expect(restored.getLocale()).toBe("zh-CN");
  });
  it("still switches when storage is unavailable", () => {
    vi.stubGlobal("localStorage", { setItem: () => { throw new Error("unavailable"); } });
    expect(() => setLocale("en")).not.toThrow();
    expect(t("Save")).toBe("Save");
  });
});

describe("message catalog", () => {
  it("preserves interpolation placeholders for every translation", () => {
    const tokens = (text: string) => [...text.matchAll(/\{\w+\}/g)].map((match) => match[0]).sort();
    for (const [key, message] of Object.entries(zhCN)) {
      expect(message.trim(), key).not.toBe("");
      expect(tokens(message), key).toEqual(tokens(key));
    }
  });
  it("interpolates paths and counts without interpreting user content", () => {
    expect(translate("zh-CN", "Saved: {path}", { path: "/截图/{count}.openshots" }))
      .toBe("已保存：/截图/{count}.openshots");
    expect(translate("en", "{count}m ago", { count: 3 })).toBe("3m ago");
    expect(translate("zh-CN", "{count}m ago", { count: 3 })).toBe("3 分钟前");
  });
  it("falls back safely for unknown keys and prototype names", () => {
    expect(translate("zh-CN", "Custom user title")).toBe("Custom user title");
    expect(translate("zh-CN", "toString")).toBe("toString");
  });
});
