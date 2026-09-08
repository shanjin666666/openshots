import { t, useLocale } from "../../lib/i18n";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useCanvasStore } from "../../stores/canvas.store";
import { useToolStore, COLOR_PRESETS } from "../../stores/tool.store";
import { extractDominantColor } from "../../lib/colorAnalysis";
import AutoLayoutControls from "./AutoLayoutControls";

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 w-full text-left text-[11px] font-medium text-zinc-400 tracking-wide hover:text-zinc-200 transition-colors"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {title}
      </button>
      {open && <div className="mt-2 space-y-3">{children}</div>}
    </div>
  );
}

export default function ElementProperties() {
  useLocale();
  const selectedId = useCanvasStore((s) => s.selectedId);
  const images = useCanvasStore((s) => s.images);
  const annotations = useCanvasStore((s) => s.annotations);
  const privacyRegions = useCanvasStore((s) => s.privacyRegions);
  const updateImage = useCanvasStore((s) => s.updateImage);
  const updateAnnotation = useCanvasStore((s) => s.updateAnnotation);
  const updatePrivacyRegion = useCanvasStore((s) => s.updatePrivacyRegion);
  const padding = useCanvasStore((s) => s.padding);
  const setPadding = useCanvasStore((s) => s.setPadding);
  const setStrokeWidth = useToolStore((s) => s.setStrokeWidth);
  const setStrokeColor = useToolStore((s) => s.setStrokeColor);

  const selected = images.find((img) => img.id === selectedId);
  const selectedAnnotation = annotations.find((a) => a.id === selectedId);
  const selectedPrivacy = privacyRegions.find((r) => r.id === selectedId);

  if (!selected && !selectedAnnotation && !selectedPrivacy) {
    return <p className="p-4 text-sm text-zinc-500">{t("Select an image or annotation to edit its properties")}</p>;
  }

  const handleAutoInsetBorder = () => {
    if (!selected) return;
    const imgEl = new window.Image();
    imgEl.crossOrigin = "anonymous";
    imgEl.src = selected.src;
    imgEl.onload = () => {
      const color = extractDominantColor(imgEl);
      updateImage(selected.id, {
        insetBorder: { enabled: true, color, width: 8 },
      });
    };
  };

  return (
    <div className="p-4 space-y-5">
      {selected && <AutoLayoutControls />}

      {/* Image controls */}
      {selected && (
        <Section title={t("Image Properties")} defaultOpen>
          <ImageControls
            selected={selected}
            updateImage={updateImage}
            padding={padding}
            setPadding={setPadding}
            onAutoInsetBorder={handleAutoInsetBorder}
          />
        </Section>
      )}

      {/* Annotation controls */}
      {selectedAnnotation && (
        <Section title={t("Shape Properties")} defaultOpen>
          <AnnotationControls
            annotation={selectedAnnotation}
            updateAnnotation={updateAnnotation}
            setStrokeColor={setStrokeColor}
            setStrokeWidth={setStrokeWidth}
          />
        </Section>
      )}

      {/* Privacy region controls */}
      {selectedPrivacy && (
        <Section title={t("Blur / Pixelate")} defaultOpen>
          <PrivacyControls
            region={selectedPrivacy}
            updatePrivacyRegion={updatePrivacyRegion}
          />
        </Section>
      )}
    </div>
  );
}

// --------------- Image Controls ---------------

function ImageControls({
  selected,
  updateImage,
  padding,
  setPadding,
  onAutoInsetBorder,
}: {
  selected: ReturnType<typeof useCanvasStore.getState>["images"][0];
  updateImage: ReturnType<typeof useCanvasStore.getState>["updateImage"];
  padding: number;
  setPadding: (v: number) => void;
  onAutoInsetBorder: () => void;
}) {
  useLocale();
  return (
    <>
      {/* Padding */}
      <div className="flex items-center gap-2">
        <label className="text-[11px] text-zinc-500 w-12">{t("Padding")}</label>
        <input
          type="range"
          min={0}
          max={200}
          aria-label={t("Padding")}
          value={padding}
          onChange={(e) => setPadding(Number(e.target.value))}
          className="flex-1 accent-zinc-400"
        />
        <span className="text-[11px] text-zinc-500 w-7 text-right">
          {padding}
        </span>
      </div>

      {/* Corner radius */}
      <div className="flex items-center gap-2">
        <label className="text-[11px] text-zinc-500 w-12">{t("Corners")}</label>
        <input
          type="range"
          min={0}
          max={48}
          aria-label={t("Corners")}
          value={selected.cornerRadius}
          onChange={(e) =>
            updateImage(selected.id, {
              cornerRadius: Number(e.target.value),
            })
          }
          className="flex-1 accent-zinc-400"
        />
        <span className="text-[11px] text-zinc-500 w-7 text-right">
          {selected.cornerRadius}
        </span>
      </div>

      {/* Shadow toggle & controls */}
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected.shadow.enabled}
            onChange={(e) =>
              updateImage(selected.id, {
                shadow: { ...selected.shadow, enabled: e.target.checked },
              })
            }
            className="rounded accent-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-500"
          />
          <span className="text-[13px] text-zinc-300">{t("Drop Shadow")}</span>
        </label>

        {selected.shadow.enabled && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-zinc-500 w-12">{t("Blur")}</label>
              <input
                type="range"
                min={0}
                max={60}
                aria-label={t("Shadow blur")}
                value={selected.shadow.blur}
                onChange={(e) =>
                  updateImage(selected.id, {
                    shadow: { ...selected.shadow, blur: Number(e.target.value) },
                  })
                }
                className="flex-1 accent-zinc-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-zinc-500 w-12">{t("Offset Y")}</label>
              <input
                type="range"
                min={-40}
                max={40}
                aria-label={t("Offset Y")}
                value={selected.shadow.offsetY}
                onChange={(e) =>
                  updateImage(selected.id, {
                    shadow: { ...selected.shadow, offsetY: Number(e.target.value) },
                  })
                }
                className="flex-1 accent-zinc-400"
              />
            </div>
          </>
        )}
      </div>

      {/* Inset border */}
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected.insetBorder.enabled}
            onChange={(e) =>
              updateImage(selected.id, {
                insetBorder: {
                  ...selected.insetBorder,
                  enabled: e.target.checked,
                },
              })
            }
            className="rounded accent-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-500"
          />
          <span className="text-[13px] text-zinc-300">{t("Inset Border")}</span>
        </label>

        {selected.insetBorder.enabled && (
          <button
            onClick={onAutoInsetBorder}
            className="w-full px-3 py-2 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none"
          >
            {t("Auto-match color")}
          </button>
        )}
      </div>

      {/* Flip */}
      <div className="flex gap-2">
        <button
          onClick={() =>
            updateImage(selected.id, { flipX: !selected.flipX })
          }
          className="flex-1 px-3 py-2 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none"
        >
          {t("Flip H")}
        </button>
        <button
          onClick={() =>
            updateImage(selected.id, { flipY: !selected.flipY })
          }
          className="flex-1 px-3 py-2 text-[13px] rounded-md bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none"
        >
          {t("Flip V")}
        </button>
      </div>

      {/* Frame / Mockup */}
      <div>
        <label className="text-[11px] text-zinc-500 mb-1 block">{t("Frame")}</label>
        <div className="flex flex-wrap gap-1">
          {[
            { label: t("None"), type: undefined, variant: undefined },
            { label: "macOS", type: "window-chrome" as const, variant: "macos" },
            { label: "Windows", type: "window-chrome" as const, variant: "windows" },
            { label: "iPhone", type: "device-mockup" as const, variant: "iphone" },
            { label: "iPad", type: "device-mockup" as const, variant: "ipad" },
            { label: "MacBook", type: "device-mockup" as const, variant: "macbook" },
          ].map((opt) => {
            const isActive = opt.type === undefined
              ? !selected.frame
              : selected.frame?.type === opt.type && selected.frame?.variant === opt.variant;
            return (
              <button
                key={opt.label}
                onClick={() =>
                  updateImage(selected.id, {
                    frame: opt.type ? { type: opt.type, variant: opt.variant!, theme: selected.frame?.theme ?? "dark" } : undefined,
                  })
                }
                className={`px-2 py-1 text-[11px] rounded-md transition-colors duration-150 ${
                  isActive
                    ? "bg-zinc-100 text-zinc-900"
                    : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {selected.frame && (
          <div className="flex gap-1 mt-1">
            {(["light", "dark"] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => updateImage(selected.id, { frame: { ...selected.frame!, theme } })}
                className={`px-2 py-1 text-[11px] rounded-md transition-colors duration-150 ${
                  (selected.frame?.theme ?? "dark") === theme
                    ? "bg-zinc-100 text-zinc-900"
                    : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60"
                }`}
              >
                {t(theme === "light" ? "Light" : "Dark")}
              </button>
            ))}
          </div>
        )}
      </div>

    </>
  );
}

// --------------- Annotation Controls ---------------

function AnnotationControls({
  annotation,
  updateAnnotation,
  setStrokeColor,
  setStrokeWidth,
}: {
  annotation: ReturnType<typeof useCanvasStore.getState>["annotations"][0];
  updateAnnotation: ReturnType<typeof useCanvasStore.getState>["updateAnnotation"];
  setStrokeColor: (c: string) => void;
  setStrokeWidth: (w: number) => void;
}) {
  useLocale();
  return (
    <>
      <h3 className="text-[11px] font-medium text-zinc-500 tracking-wide">
        {t("Annotation")}
      </h3>

      {/* Color row */}
      <div className="space-y-2">
        <label className="text-[11px] text-zinc-500">{t("Color")}</label>
        <div className="flex flex-wrap gap-1 mt-1">
          {COLOR_PRESETS.map((color) => {
            const currentColor =
              annotation.type === "text" || annotation.type === "callout"
                ? (annotation as { fill: string }).fill
                : (annotation as { stroke: string }).stroke;
            return (
              <button
                key={color}
                onClick={() => {
                  setStrokeColor(color);
                  switch (annotation.type) {
                    case "arrow":
                      updateAnnotation(annotation.id, { stroke: color, fill: color });
                      break;
                    case "rectangle":
                      updateAnnotation(annotation.id, {
                        stroke: color,
                        fill: `${color}14`,
                      });
                      break;
                    case "ellipse":
                      updateAnnotation(annotation.id, {
                        stroke: color,
                        fill: `${color}14`,
                      });
                      break;
                    case "text":
                      updateAnnotation(annotation.id, { fill: color });
                      break;
                    case "callout":
                      updateAnnotation(annotation.id, { fill: color });
                      break;
                  }
                }}
                className={`w-6 h-6 rounded-md border transition-[transform,border-color] duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none ${
                  currentColor === color
                    ? "border-white scale-110"
                    : "border-zinc-700 hover:border-zinc-500"
                }`}
                style={{ backgroundColor: color }}
              />
            );
          })}
        </div>
      </div>

      {/* Fill Color -- shapes and arrows */}
      {(annotation.type === "rectangle" || annotation.type === "ellipse" || annotation.type === "arrow") && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] text-zinc-500">{t("Fill")}</label>
            <button
              onClick={() => {
                const current = (annotation as { fill?: string }).fill ?? (annotation as { stroke: string }).stroke;
                updateAnnotation(annotation.id, {
                  fill: current === "transparent" ? `${(annotation as { stroke: string }).stroke}40` : "transparent",
                });
              }}
              className={`px-2 py-0.5 text-[11px] rounded-md transition-colors duration-150 ${
                (annotation as { fill?: string }).fill === "transparent"
                  ? "bg-zinc-800/60 text-zinc-500"
                  : "bg-zinc-700/60 text-zinc-300"
              }`}
            >
              {(annotation as { fill?: string }).fill === "transparent" ? t("None") : t("On")}
            </button>
          </div>
          {(annotation as { fill?: string }).fill !== "transparent" && (
            <div className="flex flex-wrap gap-1">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={`fill-${color}`}
                  onClick={() => updateAnnotation(annotation.id, { fill: color })}
                  className={`w-6 h-6 rounded-md border transition-[transform,border-color] duration-150 ${
                    (annotation as { fill?: string }).fill === color
                      ? "border-white scale-110"
                      : "border-zinc-700 hover:border-zinc-500"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              {/* Semi-transparent versions */}
              {["20", "40", "60", "80"].map((alpha) => {
                const baseColor = (annotation as { stroke: string }).stroke;
                const fillVal = `${baseColor}${alpha}`;
                return (
                  <button
                    key={`fill-alpha-${alpha}`}
                    onClick={() => updateAnnotation(annotation.id, { fill: fillVal })}
                    className={`w-6 h-6 rounded-md border transition-[transform,border-color] duration-150 text-[9px] text-zinc-400 ${
                      (annotation as { fill?: string }).fill === fillVal
                        ? "border-white scale-110"
                        : "border-zinc-700 hover:border-zinc-500"
                    }`}
                    style={{ backgroundColor: fillVal }}
                  >
                    {Number(alpha) / 100 * 100}%
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Stroke Width presets */}
      {(annotation.type === "arrow" ||
        annotation.type === "rectangle" ||
        annotation.type === "ellipse") && (
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-zinc-500 w-12">{t("Stroke")}</label>
          <div className="flex gap-1">
            {[1, 2, 4, 8].map((w) => (
              <button
                key={w}
                onClick={() => {
                  updateAnnotation(annotation.id, { strokeWidth: w });
                  setStrokeWidth(w);
                }}
                className={`px-3 py-1 text-[12px] rounded-md transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none ${
                  (annotation as { strokeWidth: number }).strokeWidth === w
                    ? "bg-zinc-100 text-zinc-900"
                    : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60"
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dash Pattern presets */}
      {(annotation.type === "arrow" ||
        annotation.type === "rectangle" ||
        annotation.type === "ellipse") && (
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-zinc-500 w-12">{t("Dash")}</label>
          <div className="flex gap-1">
            {(
              [
                { label: t("Solid line"), value: undefined },
                { label: t("Dashed"), value: [10, 5] },
                { label: t("Dotted"), value: [2, 6] },
              ] as const
            ).map((preset) => {
              const currentDash = (annotation as { dash?: number[] }).dash;
              const isActive =
                preset.value === undefined
                  ? !currentDash || currentDash.length === 0
                  : JSON.stringify(currentDash) ===
                    JSON.stringify(preset.value);
              return (
                <button
                  key={preset.label}
                  onClick={() =>
                    updateAnnotation(annotation.id, {
                      dash: preset.value as number[] | undefined,
                    })
                  }
                  className={`px-2 py-1 text-[12px] rounded-md transition-colors duration-150 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 outline-none ${
                    isActive
                      ? "bg-zinc-100 text-zinc-900"
                      : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Font Size -- text annotations only */}
      {/* Font Size -- text annotations */}
      {annotation.type === "text" && (
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-zinc-500 w-12">{t("Size")}</label>
          <input
            type="range"
            min={10}
            max={120}
            step={2}
            value={(annotation as { fontSize: number }).fontSize}
            onChange={(e) =>
              updateAnnotation(annotation.id, {
                fontSize: Number(e.target.value),
              })
            }
            className="flex-1 accent-zinc-400"
          />
          <span className="text-[11px] text-zinc-500 w-7 text-right">
            {(annotation as { fontSize: number }).fontSize}
          </span>
        </div>
      )}

      {/* Speech Bubble controls */}
      {annotation.type === "speech-bubble" && (() => {
        const bubble = annotation as import("../../stores/canvas.store").SpeechBubbleAnnotation;
        return (
          <>
            {/* Text color */}
            <div>
              <label className="text-[11px] text-zinc-500">{t("Text Color")}</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={`tc-${color}`}
                    onClick={() => updateAnnotation(annotation.id, { textColor: color })}
                    className={`w-6 h-6 rounded-md border transition-[transform,border-color] duration-150 ${
                      bubble.textColor === color ? "border-white scale-110" : "border-zinc-700 hover:border-zinc-500"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Fill color */}
            <div>
              <label className="text-[11px] text-zinc-500">{t("Bubble Fill")}</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {["#ffffff", "#f4f4f5", "#18181b", "#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7"].map((color) => (
                  <button
                    key={`bf-${color}`}
                    onClick={() => updateAnnotation(annotation.id, { fill: color })}
                    className={`w-6 h-6 rounded-md border transition-[transform,border-color] duration-150 ${
                      bubble.fill === color ? "border-white scale-110" : "border-zinc-700 hover:border-zinc-500"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Font size */}
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-zinc-500 w-12">{t("Size")}</label>
              <input
                type="range"
                min={10}
                max={48}
                step={1}
                value={bubble.fontSize}
                onChange={(e) => updateAnnotation(annotation.id, { fontSize: Number(e.target.value) })}
                className="flex-1 accent-zinc-400"
              />
              <span className="text-[11px] text-zinc-500 w-7 text-right">{bubble.fontSize}</span>
            </div>

            {/* Tail direction */}
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-zinc-500 w-12">{t("Tail")}</label>
              <div className="flex gap-1">
                {(["bottom", "top", "left", "right"] as const).map((dir) => (
                  <button
                    key={dir}
                    onClick={() => updateAnnotation(annotation.id, { tailDirection: dir })}
                    className={`px-2 py-1 text-[11px] rounded-md transition-colors duration-150 ${
                      bubble.tailDirection === dir
                        ? "bg-zinc-100 text-zinc-900"
                        : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60"
                    }`}
                  >
                    {dir.charAt(0).toUpperCase() + dir.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Corner radius */}
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-zinc-500 w-12">{t("Round")}</label>
              <input
                type="range"
                min={0}
                max={24}
                value={bubble.cornerRadius}
                onChange={(e) => updateAnnotation(annotation.id, { cornerRadius: Number(e.target.value) })}
                className="flex-1 accent-zinc-400"
              />
              <span className="text-[11px] text-zinc-500 w-7 text-right">{bubble.cornerRadius}</span>
            </div>
          </>
        );
      })()}

      {/* Spotlight controls */}
      {annotation.type === "spotlight" && (() => {
        const spot = annotation as import("../../stores/canvas.store").SpotlightAnnotation;
        return (
          <>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-zinc-500 w-12">{t("Opacity")}</label>
              <input
                type="range"
                min={10}
                max={90}
                value={Math.round((spot.overlayOpacity ?? 0.5) * 100)}
                onChange={(e) => updateAnnotation(annotation.id, { overlayOpacity: Number(e.target.value) / 100 })}
                className="flex-1 accent-zinc-400"
              />
              <span className="text-[11px] text-zinc-500 w-7 text-right">
                {Math.round((spot.overlayOpacity ?? 0.5) * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-zinc-500 w-12">{t("Round")}</label>
              <input
                type="range"
                min={0}
                max={50}
                value={spot.cornerRadius ?? 0}
                onChange={(e) => updateAnnotation(annotation.id, { cornerRadius: Number(e.target.value) })}
                className="flex-1 accent-zinc-400"
              />
              <span className="text-[11px] text-zinc-500 w-7 text-right">{spot.cornerRadius ?? 0}</span>
            </div>
          </>
        );
      })()}
    </>
  );
}

// --------------- Privacy Controls ---------------

function PrivacyControls({
  region,
  updatePrivacyRegion,
}: {
  region: ReturnType<typeof useCanvasStore.getState>["privacyRegions"][0];
  updatePrivacyRegion: ReturnType<typeof useCanvasStore.getState>["updatePrivacyRegion"];
}) {
  useLocale();
  return (
    <>
      <h3 className="text-[11px] font-medium text-zinc-500 tracking-wide">
        {region.type === "blur" ? t("Blur") : t("Pixelate")} {t("Region")}
      </h3>

      <div className="flex items-center gap-2">
        <label className="text-[11px] text-zinc-500 w-12">{t("Intensity")}</label>
        <input
          type="range"
          min={1}
          max={region.type === "blur" ? 40 : 32}
          value={region.intensity}
          onChange={(e) =>
            updatePrivacyRegion(region.id, {
              intensity: Number(e.target.value),
            })
          }
          className="flex-1 accent-zinc-400"
        />
        <span className="text-[11px] text-zinc-500 w-7 text-right">
          {region.intensity}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-[11px] text-zinc-500 w-12">{t("Opacity")}</label>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round((region.opacity ?? 1) * 100)}
          onChange={(e) =>
            updatePrivacyRegion(region.id, {
              opacity: Number(e.target.value) / 100,
            })
          }
          className="flex-1 accent-zinc-400"
        />
        <span className="text-[11px] text-zinc-500 w-7 text-right">
          {Math.round((region.opacity ?? 1) * 100)}%
        </span>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-[11px] text-zinc-500 w-12">{t("Color")}</label>
        <input
          type="color"
          value={
            region.fill ||
            (region.type === "blur" ? "#d4d4d4" : "#a3a3a3")
          }
          onChange={(e) =>
            updatePrivacyRegion(region.id, {
              fill: e.target.value,
            })
          }
          className="w-8 h-8 rounded-md border border-zinc-700 bg-transparent cursor-pointer"
        />
        <span className="text-[11px] text-zinc-500">
          {region.fill || "default"}
        </span>
      </div>
    </>
  );
}
