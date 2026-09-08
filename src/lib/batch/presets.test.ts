import { afterEach, describe, expect, it } from "vitest";
import { useCanvasStore, type CanvasImage } from "../../stores/canvas.store";
import { useBatchStore } from "../../stores/batch.store";
import { applyCanvasPreset, createCanvasPreset } from "../canvas-presets";
import { DEFAULT_BATCH_SETTINGS, batchLayout } from "./layout";
import { batchSettingsFromEditor, batchSettingsFromPreset, EDITOR_STYLE_KEY } from "./presets";

const editorInitial = useCanvasStore.getState();
const batchInitial = useBatchStore.getState();
const image = (id: string): CanvasImage => ({
  id, src: `original-${id}`, x: 400, y: 300, width: 600, height: 400, naturalWidth: 1800, naturalHeight: 1200,
  cornerRadius: 32, rotation: 0, flipX: false, flipY: false,
  shadow: { enabled: true, color: "#234567", blur: 31, offsetX: -12, offsetY: 19 },
  insetBorder: { enabled: true, color: "#ffeeaa", width: 9 },
  frame: { type: "window-chrome", variant: "macos", theme: "light" },
});
const savedStyle = () => createCanvasPreset({ ...editorInitial, canvasWidth: 1200, canvasHeight: 900, padding: 60,
  images: [image("saved")], selectedId: "saved", background: { ...editorInitial.background, blur: 7, grain: 3 } }, "常用样式");

afterEach(() => {
  useCanvasStore.setState(editorInitial); useCanvasStore.temporal.getState().clear();
  useBatchStore.setState(batchInitial);
});

describe("presets shared by the editor and batch beautification", () => {
  it("applies the saved canvas dimensions instead of silently keeping original-size mode or previous placement", () => {
    const preset = savedStyle();
    const previous = { ...structuredClone(DEFAULT_BATCH_SETTINGS), imageScale: 40, position: "bottom-right" as const, format: "jpeg" as const };
    const settings = { ...previous, ...batchSettingsFromPreset(preset, previous) };
    expect(settings).toMatchObject({ sizeMode: "fixed", width: 1200, height: 900, padding: 60, imageScale: 100, position: "center", format: "jpeg" });
    for (const [width, height] of [[600, 400], [2000, 3000]]) {
      expect(batchLayout(width!, height!, settings)).toMatchObject({ width: 1200, height: 900 });
    }
  });

  it("uses identical background, corners, complete shadow, border and frame settings in both editing modes", () => {
    const preset = savedStyle();
    useCanvasStore.setState({ images: [image("new-source")], imageLayout: null });
    applyCanvasPreset(preset);
    const editor = useCanvasStore.getState();
    const picture = editor.images[0]!;
    const batch = batchSettingsFromPreset(preset, structuredClone(DEFAULT_BATCH_SETTINGS));
    expect(batch).toMatchObject({ width: editor.canvasWidth, height: editor.canvasHeight, padding: editor.padding,
      background: editor.background, cornerRadius: picture.cornerRadius,
      shadow: picture.shadow, border: picture.insetBorder, frame: picture.frame });
    expect(batch.background).not.toBe(preset.background);
    expect(batch.frame).not.toBe(preset.frame);
    expect(picture.src).toBe("original-new-source");
  });

  it("copies the selected editor image rather than the first image, including the frame theme", () => {
    const first = { ...image("first"), cornerRadius: 3, frame: undefined };
    const second = image("selected");
    useCanvasStore.setState({ images: [first, second], selectedId: second.id });
    const patch = batchSettingsFromEditor(useCanvasStore.getState(), DEFAULT_BATCH_SETTINGS);
    expect(patch).toMatchObject({ sizeMode: "fixed", cornerRadius: 32, shadow: second.shadow, frame: second.frame });
    expect(batchSettingsFromEditor({ ...useCanvasStore.getState(), selectedId: null }, DEFAULT_BATCH_SETTINGS)).toMatchObject({ cornerRadius: 3, frame: undefined });
  });

  it("explicitly clears a saved no-frame style while retaining omitted settings from legacy presets", () => {
    const previous = { ...structuredClone(DEFAULT_BATCH_SETTINGS), frame: image("target").frame };
    const legacy = savedStyle();
    delete legacy.frame; delete legacy.insetBorderColor; delete legacy.shadowColor; delete legacy.shadowOffsetX;
    expect(batchSettingsFromPreset(legacy, previous)).toMatchObject({ frame: previous.frame,
      border: { color: previous.border.color }, shadow: { color: "rgba(0,0,0,0.3)", offsetX: 0 } });
    expect(batchSettingsFromPreset({ ...legacy, frame: null }, previous).frame).toBeUndefined();
  });

  it("normalizes canvas dimensions and large padding consistently with the editor", () => {
    const preset = { ...savedStyle(), canvasWidth: 480.4, canvasHeight: 360.7, padding: 900, insetBorderWidth: 100 };
    useCanvasStore.setState({ images: [image("source")], imageLayout: null });
    applyCanvasPreset(preset);
    const editor = useCanvasStore.getState();
    const patch = batchSettingsFromPreset(preset, DEFAULT_BATCH_SETTINGS);
    expect(patch).toMatchObject({ width: editor.canvasWidth, height: editor.canvasHeight, padding: editor.padding, border: editor.images[0]!.insetBorder });
  });

  it("keeps queue and output choices when applying presets, and tracks the selected preset by stable ID", () => {
    const items = [{ path: "/tmp/source.png", name: "source.png", status: "pending" as const }];
    useBatchStore.setState({ items, selectedPath: items[0]!.path, directory: "/tmp/results", settings: { ...DEFAULT_BATCH_SETTINGS, format: "jpeg" } });
    const preset = savedStyle();
    useBatchStore.getState().applyPreset(preset, `saved:${preset.id}`);
    expect(useBatchStore.getState()).toMatchObject({ items, selectedPath: items[0]!.path, directory: "/tmp/results",
      activePresetKey: `saved:${preset.id}`, settings: { format: "jpeg", sizeMode: "fixed", frame: preset.frame } });
    useBatchStore.getState().setSettings({ format: "png" });
    useBatchStore.getState().setSettings({ padding: preset.padding });
    expect(useBatchStore.getState().activePresetKey).toBe(`saved:${preset.id}`);
    useBatchStore.getState().setSettings({ padding: preset.padding + 1 });
    expect(useBatchStore.getState().activePresetKey).toBeNull();
  });

  it("syncs current editor style explicitly without changing queued files", () => {
    useCanvasStore.setState({ images: [image("editor")], canvasWidth: 1600, canvasHeight: 1000 });
    useBatchStore.getState().addPaths(["/tmp/a.png", "/tmp/b.png"]);
    useBatchStore.getState().useEditorStyle();
    expect(useBatchStore.getState()).toMatchObject({ activePresetKey: EDITOR_STYLE_KEY,
      settings: { sizeMode: "fixed", width: 1600, height: 1000, frame: image("editor").frame } });
    expect(useBatchStore.getState().items.map((item) => item.path)).toEqual(["/tmp/a.png", "/tmp/b.png"]);
  });
});
