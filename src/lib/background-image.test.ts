import { describe, expect, it } from "vitest";
import { backgroundImageCrop } from "./background-image";

describe("background image fitting", () => {
  it("fills a landscape canvas from a square wallpaper without distortion", () => {
    expect(backgroundImageCrop(6000, 6000, 1920, 1080)).toEqual({ x: 0, y: 1312.5, width: 6000, height: 3375 });
  });
  it("crops the sides of a landscape wallpaper on a portrait canvas", () => {
    expect(backgroundImageCrop(1600, 900, 600, 1200)).toEqual({ x: 575, y: 0, width: 450, height: 900 });
  });
  it("preserves the entire source at the same aspect ratio", () => {
    expect(backgroundImageCrop(1600, 900, 3200, 1800)).toEqual({ x: 0, y: 0, width: 1600, height: 900 });
  });
});
