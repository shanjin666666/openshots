use serde::Deserialize;
use tauri::menu::{IsMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::{AppHandle, Manager};
use crate::i18n::text;

pub struct RecentCaptureState(pub std::sync::Mutex<Option<Vec<RecentCapture>>>);

#[derive(Debug, Clone, Deserialize)]
pub struct RecentCapture {
    pub id: String,
    pub label: String,
}

#[tauri::command]
pub fn update_tray_menu(app: AppHandle, recents: Vec<RecentCapture>) -> Result<(), String> {
    *app.state::<RecentCaptureState>().0.lock().map_err(|e| e.to_string())? = Some(recents.clone());
    let capture_area =
        MenuItem::with_id(&app, "capture-region", text(&app, "Capture Area", "区域截图"), true, None::<&str>)
            .map_err(|e| e.to_string())?;
    let capture_screen = MenuItem::with_id(
        &app,
        "capture-screen",
        text(&app, "Capture Full Screen", "全屏截图"),
        true,
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;
    let capture_window =
        MenuItem::with_id(&app, "capture-window", text(&app, "Capture Window", "窗口截图"), true, None::<&str>)
            .map_err(|e| e.to_string())?;

    let sep1 = PredefinedMenuItem::separator(&app).map_err(|e| e.to_string())?;

    let recent_header =
        MenuItem::with_id(&app, "recent-header", text(&app, "Recent Captures", "最近截图"), false, None::<&str>)
            .map_err(|e| e.to_string())?;

    let mut items: Vec<Box<dyn IsMenuItem<tauri::Wry>>> = vec![
        Box::new(capture_area),
        Box::new(capture_screen),
        Box::new(capture_window),
        Box::new(sep1),
        Box::new(recent_header),
    ];

    if recents.is_empty() {
        let no_recents = MenuItem::with_id(
            &app,
            "no-recents",
            text(&app, "  No recent captures", "  暂无最近截图"),
            false,
            None::<&str>,
        )
        .map_err(|e| e.to_string())?;
        items.push(Box::new(no_recents));
    } else {
        for (i, recent) in recents.iter().take(3).enumerate() {
            let item = MenuItem::with_id(
                &app,
                &format!("recent-{}", i),
                &format!("  {}", recent.label),
                true,
                None::<&str>,
            )
            .map_err(|e| e.to_string())?;
            items.push(Box::new(item));
        }
    }

    let sep2 = PredefinedMenuItem::separator(&app).map_err(|e| e.to_string())?;
    let open_item = MenuItem::with_id(&app, "open", text(&app, "Open...", "打开…"), true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let prefs = MenuItem::with_id(&app, "settings", text(&app, "Preferences", "偏好设置"), true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let quit = MenuItem::with_id(&app, "quit", text(&app, "Quit OpenShots", "退出 OpenShots"), true, None::<&str>)
        .map_err(|e| e.to_string())?;

    items.push(Box::new(sep2));
    items.push(Box::new(open_item));
    items.push(Box::new(prefs));
    items.push(Box::new(quit));

    let refs: Vec<&dyn IsMenuItem<tauri::Wry>> = items.iter().map(|b| b.as_ref()).collect();
    let menu = Menu::with_items(&app, &refs).map_err(|e| e.to_string())?;

    if let Some(tray) = app.tray_by_id("main") {
        tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
    }

    Ok(())
}
