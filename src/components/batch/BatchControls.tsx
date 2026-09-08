import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readImageFile } from "../../ipc/capture";
import { BATCH_POSITIONS, POSITION_LABELS, type BatchSettings } from "../../lib/batch/layout";
import { BUILTIN_IMAGE_PRESETS } from "../../lib/builtin-image-presets";
import { usePresetStore } from "../../stores/preset.store";
import { useBatchStore } from "../../stores/batch.store";
import { EDITOR_STYLE_KEY } from "../../lib/batch/presets";
import { type FrameType, getFrameConfig } from "../composition/frames";
import { t, useLocale } from "../../lib/i18n";

const inputClass = "w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-200";
function NumberField({ label, value, min = 0, max, onChange }: { label: string; value: number; min?: number; max: number; onChange: (n: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const number = draft.trim() ? Number(draft) : value;
    const next = Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : value;
    setDraft(String(next));
    onChange(next);
  };
  return <label className="flex items-center justify-between gap-3 text-xs text-zinc-400">
    <span>{label}</span><input aria-label={label} className={`${inputClass} max-w-24`} type="number" min={min} max={max} value={draft}
      onChange={(event) => {
        const text = event.target.value;
        setDraft(text);
        const number = Number(text);
        // Keep incomplete edits (including a leading minus) until the user finishes typing.
        if (text.trim() && Number.isFinite(number) && number >= min && number <= max) onChange(number);
      }} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />
  </label>;
}

export default function BatchControls({ settings: s, onChange, onError }: { settings: BatchSettings; onChange: (patch: Partial<BatchSettings>) => void; onError: (message: string) => void }) {
  useLocale();
  const saved = usePresetStore((state) => state.presets);
  const activePresetKey = useBatchStore((state) => state.activePresetKey);
  const applyPreset = useBatchStore((state) => state.applyPreset);
  const useEditorStyle = useBatchStore((state) => state.useEditorStyle);
  const selectedPresetKey = activePresetKey === EDITOR_STYLE_KEY
    || BUILTIN_IMAGE_PRESETS.some((preset) => activePresetKey === `builtin:${preset.name}`)
    || saved.some((preset) => activePresetKey === `saved:${preset.id}`) ? activePresetKey ?? "" : "";
  const changeBackground = (patch: Partial<BatchSettings["background"]>) => onChange({ background: { ...s.background, ...patch } });
  const chooseBackground = async () => {
    try {
      const path = await open({ multiple: false, filters: [{ name: t("Images"), extensions: ["png", "jpg", "jpeg", "webp", "bmp"] }] });
      if (typeof path === "string") changeBackground({ type: "image", imageSrc: await readImageFile(path) });
    } catch (error) { onError(String(error)); }
  };
  return <div className="space-y-6 p-4">
    <section className="space-y-3">
      <h2 className="text-sm font-medium">{t("Style template")}</h2>
      <select aria-label={t("Style template")} value={selectedPresetKey} className={inputClass} onChange={(event) => {
        const key = event.target.value;
        const preset = key.startsWith("builtin:")
          ? BUILTIN_IMAGE_PRESETS.find((item) => key === `builtin:${item.name}`)
          : saved.find((item) => key === `saved:${item.id}`);
        if (preset) applyPreset(preset, key);
      }}>
        <option value="" disabled>{t("Custom style")}</option>
        {selectedPresetKey === EDITOR_STYLE_KEY && <option value={EDITOR_STYLE_KEY} disabled>{t("Editor style")}</option>}
        <optgroup label={t("Built-in presets")}>{BUILTIN_IMAGE_PRESETS.map((preset) => <option key={preset.name} value={`builtin:${preset.name}`}>{t(preset.name)}</option>)}</optgroup>
        {saved.length > 0 && <optgroup label={t("Saved presets")}>{saved.map((preset) => <option key={preset.id} value={`saved:${preset.id}`}>{preset.name}</option>)}</optgroup>}
      </select>
      <button type="button" onClick={useEditorStyle} className="text-xs text-blue-400 hover:text-blue-300">{t("Use editor style")}</button>
    </section>
    <section className="space-y-3 border-t border-zinc-800 pt-4">
      <h2 className="text-sm font-medium">{t("Background")}</h2>
      <select aria-label={t("Background type")} className={inputClass} value={s.background.type} onChange={(event) => changeBackground({ type: event.target.value as BatchSettings["background"]["type"] })}>
        <option value="solid">{t("Solid")}</option><option value="linear-gradient">{t("Linear")}</option>
        <option value="radial-gradient">{t("Radial")}</option><option value="image">{t("Custom image")}</option>
      </select>
      {s.background.type === "image" ? <button type="button" onClick={() => void chooseBackground()} className={`${inputClass} text-left`}>{t(s.background.imageSrc ? "Change image" : "Upload image")}</button>
        : s.background.type === "solid" ? <label className="flex justify-between text-xs text-zinc-400">{t("Color")}<input type="color" aria-label={t("Background color")} value={s.background.color.slice(0, 7)} onChange={(event) => changeBackground({ color: event.target.value })} /></label>
          : <><div className="flex justify-between"><label className="text-xs text-zinc-400">{t("Start color")}<input className="block mt-1" type="color" value={s.background.gradientColors[0]} onChange={(event) => changeBackground({ gradientColors: [event.target.value, s.background.gradientColors[1]] })} /></label>
            <label className="text-xs text-zinc-400">{t("End color")}<input className="block mt-1" type="color" value={s.background.gradientColors[1]} onChange={(event) => changeBackground({ gradientColors: [s.background.gradientColors[0], event.target.value] })} /></label></div>
            {s.background.type === "linear-gradient" && <NumberField label={t("Angle")} value={s.background.gradientAngle} max={360} onChange={(gradientAngle) => changeBackground({ gradientAngle })} />}</>}
      <NumberField label={t("Background blur")} value={s.background.blur} max={60} onChange={(blur) => changeBackground({ blur })} />
    </section>
    <section className="space-y-3 border-t border-zinc-800 pt-4">
      <h2 className="text-sm font-medium">{t("Canvas and position")}</h2>
      <select aria-label={t("Canvas size mode")} className={inputClass} value={s.sizeMode} onChange={(event) => onChange({ sizeMode: event.target.value as "original" | "fixed" })}>
        <option value="original">{t("Original image + padding")}</option><option value="fixed">{t("Fixed canvas size")}</option>
      </select>
      {s.sizeMode === "fixed" && <><NumberField label={t("Width")} value={s.width} min={64} max={8192} onChange={(width) => onChange({ width })} />
        <NumberField label={t("Height")} value={s.height} min={64} max={8192} onChange={(height) => onChange({ height })} /></>}
      <NumberField label={t("Padding")} value={s.padding} max={1024} onChange={(padding) => onChange({ padding })} />
      <NumberField label={t("Image size (%)")} value={s.imageScale} min={10} max={100} onChange={(imageScale) => onChange({ imageScale })} />
      <div className="flex justify-between items-center gap-3"><span className="text-xs text-zinc-400">{t("Image position")}</span>
        <div className="grid grid-cols-3 gap-1" role="group" aria-label={t("Image position")}>{BATCH_POSITIONS.map((position) => <button type="button" key={position}
          aria-label={t(POSITION_LABELS[position])} title={t(POSITION_LABELS[position])} aria-pressed={s.position === position}
          onClick={() => onChange({ position })} className={`w-8 h-7 rounded border text-xs ${s.position === position ? "border-blue-400 bg-blue-500/20 text-blue-300" : "border-zinc-700 bg-zinc-800 text-zinc-500"}`}>●</button>)}</div>
      </div>
      <p className="text-[11px] text-zinc-500">{t("Images keep their proportions and fit inside the padding.")}</p>
    </section>
    <section className="space-y-3 border-t border-zinc-800 pt-4">
      <h2 className="text-sm font-medium">{t("Image style")}</h2>
      <label className="flex items-center justify-between gap-3 text-xs text-zinc-400"><span>{t("Frame")}</span>
        <select aria-label={t("Frame")} className={`${inputClass} max-w-32`} value={s.frame?.variant ?? "none"} onChange={(event) => {
          const variant = event.target.value as FrameType;
          onChange({ frame: getFrameConfig(variant) ? { type: variant === "macos" || variant === "windows" ? "window-chrome" : "device-mockup", variant, theme: s.frame?.theme ?? "dark" } : undefined });
        }}>
          <option value="none">{t("None")}</option><option value="macos">macOS</option><option value="windows">Windows</option>
          <option value="iphone">iPhone</option><option value="ipad">iPad</option><option value="macbook">MacBook</option>
        </select>
      </label>
      <NumberField label={t("Corners")} value={s.cornerRadius} max={200} onChange={(cornerRadius) => onChange({ cornerRadius })} />
      <label className="flex justify-between text-xs text-zinc-400">{t("Drop Shadow")}<input type="checkbox" checked={s.shadow.enabled} onChange={(event) => onChange({ shadow: { ...s.shadow, enabled: event.target.checked } })} /></label>
      {s.shadow.enabled && <><NumberField label={t("Shadow blur")} value={s.shadow.blur} max={100} onChange={(blur) => onChange({ shadow: { ...s.shadow, blur } })} />
        <NumberField label={t("Offset Y")} value={s.shadow.offsetY} min={-100} max={100} onChange={(offsetY) => onChange({ shadow: { ...s.shadow, offsetY } })} /></>}
      <label className="flex justify-between text-xs text-zinc-400">{t("Inset Border")}<input type="checkbox" checked={s.border.enabled} onChange={(event) => onChange({ border: { ...s.border, enabled: event.target.checked } })} /></label>
      {s.border.enabled && <><NumberField label={t("Border width")} value={s.border.width} max={32} onChange={(width) => onChange({ border: { ...s.border, width } })} />
        <label className="flex justify-between text-xs text-zinc-400">{t("Border color")}<input type="color" value={s.border.color.slice(0, 7)} onChange={(event) => onChange({ border: { ...s.border, color: event.target.value } })} /></label></>}
    </section>
    <section className="space-y-3 border-t border-zinc-800 pt-4">
      <h2 className="text-sm font-medium">{t("Output format")}</h2>
      <select aria-label={t("Output format")} className={inputClass} value={s.format} onChange={(event) => onChange({ format: event.target.value as "png" | "jpeg" })}>
        <option value="png">PNG · {t("Lossless")}</option><option value="jpeg">JPEG · {t("High quality")}</option>
      </select>
    </section>
  </div>;
}
