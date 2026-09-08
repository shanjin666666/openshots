import { invoke } from "@tauri-apps/api/core";
import { readImageFile } from "../../ipc/capture";
import { loadBatchImage, renderBatchImage } from "./render";
import type { BatchSettings } from "./layout";

export async function exportBatchItem(path: string, directory: string, settings: BatchSettings, background: HTMLImageElement | null, cancelled: () => boolean) {
  const source = await loadBatchImage(await readImageFile(path));
  let canvas: HTMLCanvasElement | undefined;
  try {
    if (cancelled()) throw new Error("Cancelled");
    canvas = renderBatchImage(source, settings, background).canvas;
    // Transfer encoded image bytes, not a JS number array of all RGBA pixels.
    const dataUrl = canvas.toDataURL(settings.format === "jpeg" ? "image/jpeg" : "image/png", 0.95);
    if (dataUrl === "data:,") throw new Error("Unable to render this image");
    // Yield between rendering and saving so Cancel can take effect.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    if (cancelled()) throw new Error("Cancelled");
    return await invoke<string>("save_batch_image", { directory, sourcePath: path, dataUrl });
  } finally {
    source.src = "";
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}
