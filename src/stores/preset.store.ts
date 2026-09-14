import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CanvasBackground, CanvasImage } from "./canvas.store";
import { DEFAULT_PRESETS } from "../lib/default-presets";

export interface CanvasPreset {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  canvasSizeMode?: "fixed" | "padding";
  padding: number;
  background: CanvasBackground;
  cornerRadius: number;
  shadowEnabled: boolean;
  shadowBlur: number;
  shadowOffsetY: number;
  shadowColor?: string;
  shadowOffsetX?: number;
  insetBorderEnabled: boolean;
  insetBorderWidth: number;
  insetBorderColor?: string;
  // null explicitly clears a frame; older presets omit this setting.
  frame?: CanvasImage["frame"] | null;
}

interface PresetState {
  presets: CanvasPreset[];
  addPreset: (preset: CanvasPreset) => void;
  renamePreset: (id: string, name: string) => void;
  removePreset: (id: string) => void;
  importPresets: (presets: CanvasPreset[]) => void;
}

export const usePresetStore = create<PresetState>()(
  persist(
    (set) => ({
      presets: [],
      addPreset: (preset) =>
        set((s) => ({ presets: [...s.presets, structuredClone(preset)] })),
      renamePreset: (id, name) => {
        const trimmedName = name.trim();
        if (!trimmedName) return;
        set((s) => ({
          presets: s.presets.map((preset) =>
            preset.id === id ? { ...preset, name: trimmedName } : preset,
          ),
        }));
      },
      removePreset: (id) =>
        set((s) => ({ presets: s.presets.filter((p) => p.id !== id) })),
      importPresets: (incoming) =>
        set((s) => ({
          presets: [
            ...s.presets,
            ...incoming.map((p) => ({ ...structuredClone(p), id: crypto.randomUUID() })),
          ],
        })),
    }),
    { name: "preset-store" },
  ),
);

// Seed default presets on first launch (empty store after hydration)
const unsub = usePresetStore.persist.onFinishHydration(() => {
  const state = usePresetStore.getState();
  if (state.presets.length === 0) {
    const defaults = DEFAULT_PRESETS.map((p) => ({
      ...p,
      id: crypto.randomUUID(),
    }));
    usePresetStore.setState({ presets: defaults });
  }
  unsub();
});
