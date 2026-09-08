import Konva from "konva";
import { describe, expect, it, vi } from "vitest";
import { renderEditorExport } from "./editor-export";

describe("raw editor export", () => {
  it.each([0.137, 0.5, 1, 1.333, 2.5])("renders exact output pixels independently of editor zoom %s", (zoom) => {
    const root = new Konva.Group({ scaleX: zoom, scaleY: zoom });
    const photo = new Konva.Rect({ width: 400, height: 200 });
    const selection = new Konva.Transformer({ nodes: [photo] });
    root.add(photo, selection);
    const encoder = vi.spyOn(root, "toDataURL");
    const renderer = vi.spyOn(root, "toCanvas").mockImplementation((options) => {
      expect(selection.visible()).toBe(false);
      expect(photo.visible()).toBe(true);
      expect(Math.floor(options!.width! * options!.pixelRatio!)).toBe(3184);
      expect(Math.floor(options!.height! * options!.pixelRatio!)).toBe(1829);
      return { width: 3184, height: 1829 } as HTMLCanvasElement;
    });
    renderEditorExport(root as unknown as Konva.Stage, { scale: 1.99, width: 3184, height: 1829, limited: false, downsampled: false });
    expect(renderer).toHaveBeenCalledOnce();
    expect(encoder).not.toHaveBeenCalled();
    expect(root.scaleX()).toBe(zoom);
    expect(selection.visible()).toBe(true);
    root.destroy();
  });

  it("restores editing controls if rendering raw pixels fails", () => {
    const root = new Konva.Group();
    const selection = new Konva.Transformer(); root.add(selection);
    vi.spyOn(root, "toCanvas").mockImplementation(() => { throw new Error("Out of memory"); });
    expect(() => renderEditorExport(root as unknown as Konva.Stage, { scale: 1, width: 100, height: 100, limited: false, downsampled: false })).toThrow("Out of memory");
    expect(selection.visible()).toBe(true);
    root.destroy();
  });

  it("rejects oversized exports before allocating a canvas", () => {
    const root = new Konva.Group(); const renderer = vi.spyOn(root, "toCanvas");
    expect(() => renderEditorExport(root as unknown as Konva.Stage, { scale: 3, width: 12000, height: 8000, limited: false, downsampled: false })).toThrow("limit");
    expect(renderer).not.toHaveBeenCalled(); root.destroy();
  });
});
