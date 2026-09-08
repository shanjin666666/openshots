use std::sync::Mutex;
use tauri::{menu::{Menu, MenuItem, PredefinedMenuItem, Submenu}, AppHandle, Manager};
use tauri_plugin_store::StoreExt;

pub struct LanguageState(pub Mutex<String>);

pub fn text(app: &AppHandle, en: &str, zh: &str) -> String {
    let state = app.state::<LanguageState>();
    let locale = state.0.lock().unwrap_or_else(|error| error.into_inner());
    if locale.as_str() == "en" { en.to_owned() } else { zh.to_owned() }
}

pub fn app_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let open = MenuItem::with_id(app, "file-open", text(app, "Open Project…", "打开项目…"), true, Some("CmdOrCtrl+O"))?;
    let save = MenuItem::with_id(app, "file-save", text(app, "Save Project", "保存项目"), true, Some("CmdOrCtrl+S"))?;
    let export = MenuItem::with_id(app, "file-export", text(app, "Export…", "导出…"), true, Some("CmdOrCtrl+E"))?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = PredefinedMenuItem::quit(app, Some(&text(app, "Quit OpenShots", "退出 OpenShots")))?;
    let file = Submenu::with_items(app, text(app, "File", "文件"), true, &[&open, &save, &separator, &export, &quit])?;
    let undo = PredefinedMenuItem::undo(app, Some(&text(app, "Undo", "撤销")))?;
    let redo = PredefinedMenuItem::redo(app, Some(&text(app, "Redo", "重做")))?;
    let cut = PredefinedMenuItem::cut(app, Some(&text(app, "Cut", "剪切")))?;
    let copy = PredefinedMenuItem::copy(app, Some(&text(app, "Copy", "复制")))?;
    let paste = PredefinedMenuItem::paste(app, Some(&text(app, "Paste", "粘贴")))?;
    let select_all = PredefinedMenuItem::select_all(app, Some(&text(app, "Select All", "全选")))?;
    let edit = Submenu::with_items(app, text(app, "Edit", "编辑"), true, &[&undo, &redo, &cut, &copy, &paste, &select_all])?;
    Menu::with_items(app, &[&file, &edit])
}

pub fn initialize(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let store = app.store("language.json")?;
    let locale = store.get("locale").and_then(|value| value.as_str().map(str::to_owned));
    *app.state::<LanguageState>().0.lock().unwrap_or_else(|error| error.into_inner()) =
        if locale.as_deref() == Some("en") { "en" } else { "zh-CN" }.to_owned();
    app.set_menu(app_menu(app)?)?;
    Ok(())
}

#[tauri::command]
pub fn set_language(app: AppHandle, locale: String) -> Result<(), String> {
    if locale != "en" && locale != "zh-CN" {
        return Err("Unsupported language".to_owned());
    }
    *app.state::<LanguageState>().0.lock().map_err(|error| error.to_string())? = locale.clone();
    app.set_menu(app_menu(&app).map_err(|error| error.to_string())?).map_err(|error| error.to_string())?;
    crate::refresh_tray_language(&app).map_err(|error| error.to_string())?;
    if let Some(preview) = app.get_webview_window("preview") {
        preview.set_title(&text(&app, "OpenShots Preview", "OpenShots 预览")).map_err(|error| error.to_string())?;
    }
    let store = app.store("language.json").map_err(|error| error.to_string())?;
    store.set("locale", serde_json::json!(locale));
    store.save().map_err(|error| error.to_string())?;
    Ok(())
}
