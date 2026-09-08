import { useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { invoke } from "@tauri-apps/api/core";
import { t, useLocale } from "../../lib/i18n";
import { useBatchStore } from "../../stores/batch.store";
import { useAppStore } from "../../stores/app.store";
import { runBatch } from "../../lib/batch/run";
import { exportBatchItem } from "../../lib/batch/export";
import { loadBatchImage } from "../../lib/batch/render";
import BatchPreview from "./BatchPreview";
import BatchControls from "./BatchControls";

const buttonClass = "px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors";
const statusLabels = { pending: "Pending", working: "Processing…", done: "Exported", failed: "Failed" };

export default function BatchPage({ onBack }: { onBack: () => void }) {
  useLocale();
  const { settings, items, selectedPath, directory, setSettings, addPaths, updateItem, removeItem } = useBatchStore();
  const [running, setRunning] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof runBatch>> | null>(null);
  const [runPaths, setRunPaths] = useState<string[]>([]);
  const busy = useRef(false);
  const cancel = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    useAppStore.setState({ batchOpen: true });
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type === "drop" && !busy.current) {
        addPaths(event.payload.paths.filter((path) => /\.(png|jpe?g|webp|bmp)$/i.test(path)));
      }
    }).then((stop) => { if (disposed) stop(); else unlisten = stop; }).catch(() => { /* Native file picker remains available. */ });
    return () => { mounted.current = false; disposed = true; cancel.current = true; unlisten?.(); useAppStore.setState({ batchOpen: false }); };
  }, [addPaths]);

  const addImages = async () => {
    try {
      const paths = await open({ multiple: true, title: t("Add images"), filters: [{ name: t("Images"), extensions: ["png", "jpg", "jpeg", "webp", "bmp"] }] });
      if (paths) { addPaths(Array.isArray(paths) ? paths : [paths]); setSummary(null); }
    } catch (err) { setError(String(err)); }
  };
  const chooseDirectory = async () => {
    const path = await open({ directory: true, multiple: false, title: t("Choose output folder") });
    if (typeof path === "string") { useBatchStore.setState({ directory: path }); return path; }
    return null;
  };
  const start = async (retry = false) => {
    if (busy.current) return;
    busy.current = true; cancel.current = false; setRunning(true); setStopping(false); setError(""); setSummary(null);
    let background: HTMLImageElement | null = null;
    try {
      const targetDirectory = directory || await chooseDirectory();
      if (!targetDirectory) return;
      const snapshot = structuredClone(settings);
      const queue = items.filter((item) => !retry || item.status === "failed");
      setRunPaths(queue.map((item) => item.path));
      queue.forEach((item) => updateItem(item.path, { status: "pending", output: undefined, error: undefined }));
      if (snapshot.background.type === "image") {
        if (!snapshot.background.imageSrc) throw new Error("Choose a background image first");
        background = await loadBatchImage(snapshot.background.imageSrc);
      }
      const result = await runBatch(queue,
        (item) => exportBatchItem(item.path, targetDirectory, snapshot, background, () => cancel.current),
        () => cancel.current, updateItem);
      if (mounted.current) setSummary(result);
    } catch (err) { if (mounted.current) setError(err instanceof Error ? err.message : String(err)); }
    finally {
      if (background) background.src = "";
      busy.current = false;
      if (mounted.current) { setRunning(false); setStopping(false); }
    }
  };
  const completed = items.filter((item) => runPaths.includes(item.path) && (item.status === "done" || item.status === "failed")).length;
  const failed = items.filter((item) => item.status === "failed").length;

  return <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
    <header className="flex items-center gap-4 px-5 py-3 border-b border-zinc-800 shrink-0">
      <button className={buttonClass} disabled={running} onClick={onBack}>{t("Back to editor")}</button>
      <div className="flex-1"><h1 className="text-base font-medium">{t("Batch beautify")}</h1><p className="text-xs text-zinc-500 mt-1">{t("One style. A whole folder of images.")}</p></div>
      <button className={buttonClass} disabled={running} onClick={() => void addImages()}>{t("Add images")}</button>
    </header>
    <div className="flex flex-1 min-h-0">
      <aside className="w-56 shrink-0 border-r border-zinc-800 flex flex-col">
        <div className="px-4 py-3 flex items-center justify-between text-xs text-zinc-500"><span>{t("{count} images", { count: items.length })}</span>
          <button disabled={running || !items.length} className="hover:text-zinc-200 disabled:opacity-40" onClick={() => { useBatchStore.setState({ items: [], selectedPath: null }); setSummary(null); }}>{t("Clear list")}</button></div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {!items.length && <div className="p-5 text-center text-xs text-zinc-500 border border-dashed border-zinc-700 rounded-xl">{t("Choose multiple images or drop them here")}</div>}
          {items.map((item, index) => <div key={item.path} className={`group flex items-start gap-1 rounded-lg border ${selectedPath === item.path ? "bg-zinc-800 border-zinc-600" : "border-transparent hover:bg-zinc-900"}`}>
            <button disabled={running} className="min-w-0 flex-1 text-left py-3 px-2" title={item.path} onClick={() => useBatchStore.setState({ selectedPath: item.path })}>
              <span className="text-xs text-zinc-300 block truncate">{index + 1}. {item.name}</span>
              <span className={`text-[11px] mt-1 block ${item.status === "failed" ? "text-red-400" : item.status === "done" ? "text-emerald-400" : "text-zinc-500"}`}>{t(statusLabels[item.status])}</span>
              {item.error && <span className="text-[10px] text-red-300 block break-words mt-1">{t(item.error)}</span>}
            </button>
            <button disabled={running} aria-label={t("Remove {name}", { name: item.name })} className="px-2 py-2 text-zinc-500 hover:text-white disabled:opacity-30" onClick={() => removeItem(item.path)}>×</button>
          </div>)}
        </div>
      </aside>
      <BatchPreview path={selectedPath} settings={settings} paused={running} />
      <fieldset disabled={running} className="w-72 shrink-0 border-l border-zinc-800 overflow-y-auto disabled:opacity-60"><BatchControls settings={settings} onChange={setSettings} onError={setError} /></fieldset>
    </div>
    <footer className="border-t border-zinc-800 px-5 py-3 space-y-2 shrink-0">
      {error && <p role="alert" className="text-xs text-red-300">{t(error)}</p>}
      <div className="flex items-center gap-3">
        <button className={buttonClass} disabled={running} onClick={() => void chooseDirectory().catch((err) => setError(String(err)))}>{t("Output folder")}</button>
        <span className="text-xs text-zinc-400 truncate flex-1" title={directory}>{directory || t("Choose a folder before exporting")}</span>
        {directory && <button className="text-xs text-blue-400" onClick={() => void invoke("open_batch_folder", { directory }).catch((err) => setError(String(err)))}>{t("Open folder")}</button>}
        {!running && failed > 0 && <button className={buttonClass} onClick={() => void start(true)}>{t("Retry failed ({count})", { count: failed })}</button>}
        {running ? <button className={buttonClass} disabled={stopping} onClick={() => { cancel.current = true; setStopping(true); }}>{t(stopping ? "Stopping…" : "Cancel batch")}</button>
          : <button disabled={!items.length} onClick={() => void start()} className="px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed">{t("Export {count} images", { count: items.length })}</button>}
      </div>
      {running ? <div role="status" className="flex items-center gap-3 text-xs text-zinc-400"><progress className="flex-1 h-1.5 accent-blue-400" max={Math.max(1, runPaths.length)} value={completed} />{completed} / {runPaths.length}</div>
        : summary ? <p role="status" className="text-xs text-zinc-400">{t(summary.cancelled ? "Batch stopped. {completed} exported, {failed} failed." : "Batch finished. {completed} exported, {failed} failed.", { completed: summary.completed, failed: summary.failed })}</p>
          : <p className="text-[11px] text-zinc-500">{t("Files use the original name + -styled. Existing files are never overwritten.")}</p>}
    </footer>
  </div>;
}
