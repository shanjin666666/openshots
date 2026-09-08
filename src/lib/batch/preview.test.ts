import { describe, expect, it } from "vitest";
import { batchPreviewSize } from "./preview";

describe("batch preview resolution", () => {
  it("uses Retina pixels for the user's 3104 px screenshot instead of a 1000 px thumbnail", () => {
    const size = batchPreviewSize(3104, 1816, 960, 600, 2, "fit");
    expect(size.displayWidth).toBe(960);
    expect(size.displayHeight).toBeCloseTo(561.6495);
    expect(size.renderEdge).toBe(1920);
  });

  it("fits portrait images by height and adapts to resized windows and screen density", () => {
    for (const density of [1, 2, 3]) {
      for (const [width, height] of [[900, 600], [400, 300]]) {
        const size = batchPreviewSize(2000, 4000, width!, height!, density, "fit");
        expect(size.displayHeight).toBe(height);
        expect(size.displayWidth).toBe(height! / 2);
        expect(size.renderEdge).toBe(height! * density);
      }
    }
  });

  it("does not magnify a small image or create pixels beyond the output", () => {
    const size = batchPreviewSize(400, 200, 1000, 700, 2, "fit");
    expect(size).toEqual({ displayWidth: 200, displayHeight: 100, renderEdge: 400 });
  });

  it("renders all output pixels in detail mode, even when the image needs scrolling", () => {
    for (const density of [1, 2, 3]) {
      const size = batchPreviewSize(7680, 4000, 900, 600, density, "pixels");
      expect(size.renderEdge).toBe(7680);
      expect(size.displayWidth * density).toBe(7680);
      expect(size.displayHeight * density).toBe(4000);
    }
  });

  it("rounds fractional display sizes up so the preview is never under-resolved", () => {
    const size = batchPreviewSize(3000, 2000, 815.25, 600, 1.5, "fit");
    expect(size.renderEdge).toBe(1223);
    expect(size.displayWidth).toBeCloseTo(815.25);
  });
});
