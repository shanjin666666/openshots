import { useState, type CSSProperties } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { t, useLocale } from "../../lib/i18n";
import { createCanvasPreset } from "../../lib/canvas-presets";
import { useCanvasStore } from "../../stores/canvas.store";
import { usePresetStore, type CanvasPreset } from "../../stores/preset.store";

const buttonClass = "rounded-md px-2 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400";

function PresetNameForm({ initialName, onSave, onCancel }: {
  initialName: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  return (
    <form
      className="space-y-2 rounded-md bg-zinc-800/40 p-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim()) onSave(name.trim());
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape" && !event.nativeEvent.isComposing) {
          event.preventDefault();
          onCancel();
        }
        if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault();
      }}
    >
      <label className="block space-y-1 text-[11px] text-zinc-400">
        <span>{t("Preset name")}</span>
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-[13px] text-zinc-100 outline-none focus:border-blue-400"
        />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={!name.trim()} className={`${buttonClass} flex-1 bg-zinc-100 text-zinc-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40`}>
          {t("Save")}
        </button>
        <button type="button" onClick={onCancel} className={`${buttonClass} flex-1 bg-zinc-700/60 text-zinc-300 hover:bg-zinc-700`}>
          {t("Cancel")}
        </button>
      </div>
    </form>
  );
}

function thumbnailStyle(preset: CanvasPreset): CSSProperties {
  const background = preset.background;
  if (background.type === "image" && background.imageSrc) {
    return { backgroundImage: `url(${JSON.stringify(background.imageSrc)})`, backgroundPosition: "center", backgroundSize: "cover" };
  }
  if (background.type === "solid") return { background: background.color };
  const colors = `${background.gradientColors[0]}, ${background.gradientColors[1]}`;
  return { background: background.type === "radial-gradient"
    ? `radial-gradient(circle, ${colors})`
    : `linear-gradient(${background.gradientAngle}deg, ${colors})` };
}

export default function SavedPresetManager({ onApply }: { onApply: (preset: CanvasPreset) => void }) {
  useLocale();
  const presets = usePresetStore((state) => state.presets);
  const addPreset = usePresetStore((state) => state.addPreset);
  const renamePreset = usePresetStore((state) => state.renamePreset);
  const removePreset = usePresetStore((state) => state.removePreset);
  const [editing, setEditing] = useState<{ id: string | null; name: string } | null>(null);

  const startSaving = () => {
    let count = presets.length + 1;
    let name = t("Preset {count}", { count });
    while (presets.some((preset) => preset.name === name)) {
      name = t("Preset {count}", { count: ++count });
    }
    setEditing({ id: null, name });
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] leading-relaxed text-zinc-500">
        {t("Save canvas size, background, padding, corners, shadows, borders and frames for one-click reuse. Source images are not included.")}
      </p>
      <p className="text-[11px] leading-relaxed text-zinc-500">
        {t("Uses the selected image's style, or the first image when none is selected. Applies the style to all canvas images.")}
      </p>
      {editing?.id === null ? (
        <PresetNameForm
          key="new-preset"
          initialName={editing.name}
          onSave={(name) => {
            addPreset(createCanvasPreset(useCanvasStore.getState(), name));
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <button type="button" onClick={startSaving} className={`${buttonClass} flex w-full items-center justify-center gap-1.5 bg-zinc-800/60 py-2 text-zinc-300 hover:bg-zinc-700/60`}>
          <Plus size={14} aria-hidden="true" />
          {t("Save current style")}
        </button>
      )}

      {presets.length === 0 && <p className="text-[11px] text-zinc-500">{t("No saved presets")}</p>}
      <div className="space-y-1">
        {presets.map((preset) => editing?.id === preset.id ? (
          <PresetNameForm
            key={preset.id}
            initialName={editing.name}
            onSave={(name) => {
              renamePreset(preset.id, name);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <div key={preset.id} className="flex items-center gap-1 rounded-md bg-zinc-800/40 p-1">
            <button
              type="button"
              onClick={() => onApply(preset)}
              title={t("Apply preset {name}", { name: preset.name })}
              aria-label={t("Apply preset {name}", { name: preset.name })}
              className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1.5 text-left text-[13px] text-zinc-300 hover:bg-zinc-700/50 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <span aria-hidden="true" className="h-5 w-7 shrink-0 rounded-sm border border-zinc-700/50" style={thumbnailStyle(preset)} />
              <span className="truncate">{preset.name}</span>
            </button>
            <button
              type="button"
              onClick={() => setEditing({ id: preset.id, name: preset.name })}
              title={t("Rename preset {name}", { name: preset.name })}
              aria-label={t("Rename preset {name}", { name: preset.name })}
              className={`${buttonClass} shrink-0 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-100`}
            >
              <Pencil size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => removePreset(preset.id)}
              title={t("Delete preset {name}", { name: preset.name })}
              aria-label={t("Delete preset {name}", { name: preset.name })}
              className={`${buttonClass} shrink-0 text-zinc-500 hover:bg-zinc-700/50 hover:text-red-400`}
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
