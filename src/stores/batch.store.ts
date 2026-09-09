import { create } from "zustand";
import { DEFAULT_BATCH_SETTINGS, type BatchSettings } from "../lib/batch/layout";
import type { BatchItem } from "../lib/batch/run";
import type { CanvasPreset } from "./preset.store";
import { useCanvasStore } from "./canvas.store";
import { batchSettingsFromEditor, batchSettingsFromPreset, EDITOR_STYLE_KEY } from "../lib/batch/presets";

// Retain the queue and style while navigating between the editor and batch view.
export const useBatchStore = create<{
  settings: BatchSettings; items: BatchItem[]; selectedPath: string | null; directory: string;
  activePresetKey: string | null;
  setSettings: (patch: Partial<BatchSettings>) => void;
  applyPreset: (preset: Omit<CanvasPreset, "id">, key: string) => void;
  useEditorStyle: () => void;
  addPaths: (paths: string[]) => void;
  updateItem: (path: string, patch: Partial<BatchItem>) => void;
  removeItem: (path: string) => void;
}>((set) => ({
  settings: structuredClone(DEFAULT_BATCH_SETTINGS), items: [], selectedPath: null, directory: "",
  activePresetKey: null,
  setSettings: (patch) => set((state) => ({
    settings: { ...state.settings, ...patch },
    activePresetKey: Object.entries(patch).some(([key, value]) => key !== "format" && key !== "exportScale" && value !== state.settings[key as keyof BatchSettings])
      ? null : state.activePresetKey,
  })),
  applyPreset: (preset, key) => set((state) => ({
    settings: { ...state.settings, ...batchSettingsFromPreset(preset, state.settings) }, activePresetKey: key,
  })),
  useEditorStyle: () => set((state) => ({
    settings: { ...state.settings, ...batchSettingsFromEditor(useCanvasStore.getState(), state.settings) }, activePresetKey: EDITOR_STYLE_KEY,
  })),
  addPaths: (paths) => set((state) => {
    const unique = [...new Set(paths)].filter((path) => !state.items.some((item) => item.path === path));
    return {
      items: [...state.items, ...unique.map((path): BatchItem => ({ path, name: path.split(/[/\\]/).pop() || path, status: "pending" }))],
      selectedPath: state.selectedPath || unique[0] || null,
    };
  }),
  updateItem: (path, patch) => set((state) => ({ items: state.items.map((item) => item.path === path ? { ...item, ...patch } : item) })),
  removeItem: (path) => set((state) => {
    const items = state.items.filter((item) => item.path !== path);
    return { items, selectedPath: state.selectedPath === path ? items[0]?.path || null : state.selectedPath };
  }),
}));
