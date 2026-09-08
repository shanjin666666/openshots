import Konva from "konva";
import { describe, expect, it, vi } from "vitest";
import { EDITOR_OVERLAY_NAME, exportStageImage } from "./export-stage";

function scene() {
  // Real Konva nodes exercise selector traversal and inherited visibility;
  // only the browser's pixel encoder is replaced in these Node tests.
  const root = new Konva.Group({ scaleX: 0.5, scaleY: 0.5 });
  const artwork = new Konva.Group({ x: 120, y: 80, rotation: 15 });
  const photo = new Konva.Rect({ name: "photo", width: 80, height: 50 });
  const frame = new Konva.Rect({ name: "frame", width: 90, height: 60, stroke: "white" });
  artwork.add(frame, photo);
  const annotation = new Konva.Rect({ name: "annotation", width: 30, height: 20 });
  const privacy = new Konva.Rect({ name: "privacy", width: 15, height: 15 });
  const transformers = [artwork, annotation, privacy].map((node) => new Konva.Transformer({ nodes: [node] }));
  const guides = new Konva.Group({ name: EDITOR_OVERLAY_NAME });
  guides.add(new Konva.Rect({ name: "guide", width: 1, height: 200 }));
  const hidden = new Konva.Group({ name: EDITOR_OVERLAY_NAME, visible: false });
  root.add(artwork, annotation, privacy, ...transformers, guides, hidden);
  return { root, artwork, transformers, guides, hidden };
}

describe("exportStageImage", () => {
  it.each(["image/png", "image/jpeg", "image/webp"])("excludes editing controls while retaining artwork for %s", (mimeType) => {
    const { root, artwork, transformers, guides, hidden } = scene();
    const before = artwork.toJSON();
    const options = { mimeType, pixelRatio: 4, quality: 0.9 };
    const encoder = vi.spyOn(root, "toDataURL").mockImplementation(() => {
      expect(transformers.every((node) => !node.isVisible())).toBe(true);
      expect(guides.findOne(".guide")!.isVisible()).toBe(false);
      const visibleArt = root.find("Rect").filter((node) => node.isVisible()).map((node) => node.name());
      expect(visibleArt).toEqual(["frame", "photo", "annotation", "privacy"]);
      return "data:clean-artwork";
    });

    expect(exportStageImage(root, options)).toBe("data:clean-artwork");
    expect(encoder).toHaveBeenCalledWith(options);
    expect(transformers.every((node) => node.visible())).toBe(true);
    expect(transformers[0]!.nodes()).toEqual([artwork]);
    expect(guides.visible()).toBe(true);
    expect(hidden.visible()).toBe(false);
    expect(artwork.toJSON()).toBe(before);
    expect(root.scale()).toEqual({ x: 0.5, y: 0.5 });
    root.destroy();
  });

  it("restores the selected object's controls even when encoding fails", () => {
    const { root, artwork, transformers, guides, hidden } = scene();
    transformers[1]!.hide();
    vi.spyOn(root, "toDataURL").mockImplementation(() => { throw new Error("Canvas encoding failed"); });

    expect(() => exportStageImage(root, { mimeType: "image/png" })).toThrow("Canvas encoding failed");
    expect(transformers.map((node) => node.visible())).toEqual([true, false, true]);
    expect(transformers[0]!.nodes()).toEqual([artwork]);
    expect(guides.visible()).toBe(true);
    expect(hidden.visible()).toBe(false);
    root.destroy();
  });
});
