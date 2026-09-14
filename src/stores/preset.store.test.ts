import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CanvasPreset } from "./preset.store";

const storageKey = "preset-store";
let storage: Map<string, string>;

function installStorage(entries: [string, string][] = []) {
  storage = new Map(entries);
  const values = storage;
  const localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("window", { localStorage });
}

function preset(id: string, name = id): CanvasPreset {
  return {
    id,
    name,
    canvasWidth: 1920,
    canvasHeight: 1080,
    padding: 64,
    background: {
      type: "linear-gradient",
      color: "#101010",
      gradientColors: ["#123456", "#abcdef"],
      gradientAngle: 35,
      imageSrc: null,
      blur: 6,
      grain: 3,
    },
    cornerRadius: 24,
    shadowEnabled: true,
    shadowBlur: 32,
    shadowOffsetY: 14,
    shadowColor: "#22334499",
    shadowOffsetX: -8,
    insetBorderEnabled: true,
    insetBorderWidth: 3,
    insetBorderColor: "#eeddcc",
    frame: { type: "window-chrome", variant: "macos", theme: "dark" },
  };
}

async function loadStore() {
  return (await import("./preset.store")).usePresetStore;
}

beforeEach(() => {
  vi.resetModules();
  installStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("saved style presets", () => {
  it("renames one preset without changing its ID, order, or style", async () => {
    const store = await loadStore();
    const first = preset("first", "午后");
    const second = preset("second", "工作");
    store.getState().addPreset(first);
    store.getState().addPreset(second);

    store.getState().renamePreset("first", "  午后暖色  ");
    expect(store.getState().presets).toEqual([
      { ...first, name: "午后暖色" },
      second,
    ]);
    expect(JSON.parse(storage.get(storageKey)!).state.presets).toEqual(store.getState().presets);

    store.getState().renamePreset("second", "工作截图");
    expect(store.getState().presets.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: "first", name: "午后暖色" },
      { id: "second", name: "工作截图" },
    ]);
  });

  it("rejects empty names and leaves other presets untouched for an unknown ID", async () => {
    const store = await loadStore();
    const original = preset("first", "午后");
    store.getState().addPreset(original);

    for (const name of ["", " \t\n "]) store.getState().renamePreset("first", name);
    store.getState().renamePreset("missing", "新名称");

    expect(store.getState().presets).toEqual([original]);
    expect(JSON.parse(storage.get(storageKey)!).state.presets).toEqual([original]);
  });

  it("restores renamed presets and all style details from persisted JSON after a restart", async () => {
    const store = await loadStore();
    const framed = preset("framed");
    framed.canvasSizeMode = "padding";
    const noFrame = { ...preset("unframed"), frame: null };
    store.getState().addPreset(framed);
    store.getState().addPreset(noFrame);
    store.getState().renamePreset("framed", "深色外框");
    store.getState().renamePreset("unframed", "无外框");

    const savedJson = storage.get(storageKey)!;
    const expected = [
      { ...framed, name: "深色外框" },
      { ...noFrame, name: "无外框" },
    ];
    expect(JSON.parse(savedJson).state.presets).toEqual(expected);

    vi.resetModules();
    installStorage([[storageKey, savedJson]]);
    const restartedStore = await loadStore();
    await restartedStore.persist.rehydrate();

    expect(restartedStore).not.toBe(store);
    expect(restartedStore.getState().presets).toEqual(expected);
    restartedStore.getState().renamePreset("framed", "重新命名");
    expect(JSON.parse(storage.get(storageKey)!).state.presets).toEqual([
      { ...framed, name: "重新命名" },
      expected[1],
    ]);
  });

  it("loads, renames, and imports legacy presets without inventing missing style settings", async () => {
    const legacy = preset("legacy", "旧预设");
    delete legacy.shadowColor;
    delete legacy.shadowOffsetX;
    delete legacy.insetBorderColor;
    delete legacy.frame;
    storage.set(storageKey, JSON.stringify({ state: { presets: [legacy] }, version: 0 }));

    const store = await loadStore();
    await store.persist.rehydrate();
    expect(store.getState().presets).toEqual([legacy]);
    store.getState().renamePreset("legacy", "保留旧样式");
    store.getState().importPresets([legacy]);

    const imported = store.getState().presets[1]!;
    expect(imported.id).not.toBe("legacy");
    expect(imported).toEqual({ ...legacy, id: imported.id });
    const saved = JSON.parse(storage.get(storageKey)!).state.presets;
    expect(saved).toEqual([{ ...legacy, name: "保留旧样式" }, imported]);
    for (const entry of saved) {
      expect(entry).not.toHaveProperty("shadowColor");
      expect(entry).not.toHaveProperty("shadowOffsetX");
      expect(entry).not.toHaveProperty("insetBorderColor");
      expect(entry).not.toHaveProperty("frame");
    }
  });

  it("takes independent snapshots when saving or importing mutable style objects", async () => {
    const store = await loadStore();
    const input = preset("original");
    const expected = structuredClone(input);
    store.getState().addPreset(input);
    store.getState().importPresets([input, input]);
    const importedIds = store.getState().presets.slice(1).map(({ id }) => id);
    expect(new Set([input.id, ...importedIds]).size).toBe(3);

    input.background.gradientColors[0] = "#ffffff";
    input.background.blur = 60;
    input.frame!.theme = "light";

    expect(store.getState().presets).toEqual([
      expected,
      ...importedIds.map((id) => ({ ...expected, id })),
    ]);
    expect(JSON.parse(storage.get(storageKey)!).state.presets).toEqual(store.getState().presets);
    const [saved, firstImport, secondImport] = store.getState().presets;
    expect(saved!.background).not.toBe(firstImport!.background);
    expect(firstImport!.background.gradientColors).not.toBe(secondImport!.background.gradientColors);
    expect(firstImport!.frame).not.toBe(secondImport!.frame);
  });
});
