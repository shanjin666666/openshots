use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

const DESKTOP_PICTURES: &str = "/System/Library/Desktop Pictures";
const ASSET_ROOTS: &[&str] = &[
    "/System/Library/AssetsV2/com_apple_MobileAsset_DesktopPicture",
    "/System/Library/Assets/com_apple_MobileAsset_DesktopPicture",
];

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemWallpaper {
    name: String,
    path: String,
    thumbnail_path: String,
    available: bool,
}

fn is_image(path: &Path) -> bool {
    path.extension().and_then(|ext| ext.to_str()).is_some_and(|ext| {
        matches!(ext.to_ascii_lowercase().as_str(), "heic" | "jpg" | "jpeg" | "png")
    })
}

fn image_name(path: &Path) -> String {
    path.file_stem().unwrap_or_default().to_string_lossy().to_string()
}

fn originals(desktop: &Path, asset_roots: &[PathBuf]) -> BTreeMap<String, PathBuf> {
    let mut images = BTreeMap::new();
    if let Ok(entries) = std::fs::read_dir(desktop) {
        for path in entries.flatten().map(|entry| entry.path()) {
            if path.is_file() && is_image(&path) {
                images.insert(image_name(&path), path);
            }
        }
    }
    for root in asset_roots {
        let pattern = format!("{}/*.asset/AssetData/**/*", glob::Pattern::escape(&root.to_string_lossy()));
        if let Ok(entries) = glob::glob(&pattern) {
            for path in entries.flatten() {
                if path.is_file() && is_image(&path)
                    && !path.components().any(|part| matches!(part.as_os_str().to_str(), Some(".thumbnails" | "thumbnails")))
                {
                    images.entry(image_name(&path)).or_insert(path);
                }
            }
        }
    }
    images
}

fn catalog(desktop: &Path, asset_roots: &[PathBuf]) -> Vec<SystemWallpaper> {
    let originals = originals(desktop, asset_roots);
    let mut thumbnails = BTreeMap::new();
    if let Ok(entries) = std::fs::read_dir(desktop.join(".thumbnails")) {
        for path in entries.flatten().map(|entry| entry.path()) {
            if path.is_file() && is_image(&path) {
                thumbnails.insert(image_name(&path), path);
            }
        }
    }
    // Include originals that have no matching thumbnail (e.g. built-in iMac wallpapers).
    for (name, path) in &originals {
        thumbnails.entry(name.clone()).or_insert_with(|| path.clone());
    }
    let mut wallpapers: Vec<_> = thumbnails.into_iter().map(|(name, thumbnail)| {
        let original = originals.get(&name);
        SystemWallpaper {
            name,
            path: original.unwrap_or(&thumbnail).to_string_lossy().to_string(),
            thumbnail_path: thumbnail.to_string_lossy().to_string(),
            available: original.is_some(),
        }
    }).collect();
    wallpapers.sort_by(|a, b| b.available.cmp(&a.available).then(a.name.cmp(&b.name)));
    wallpapers
}

fn resolve(path: &Path, desktop: &Path, asset_roots: &[PathBuf]) -> Result<PathBuf, String> {
    if path.parent().is_some_and(|parent| parent.ends_with(".thumbnails")) {
        // Old callers may still pass a thumbnail. Never enlarge it as a substitute.
        originals(desktop, asset_roots).remove(&image_name(path))
            .ok_or_else(|| "WALLPAPER_ORIGINAL_NOT_AVAILABLE".to_string())
    } else if path.is_file() {
        Ok(path.to_path_buf())
    } else {
        Err("WALLPAPER_ORIGINAL_NOT_AVAILABLE".to_string())
    }
}

pub fn list() -> Vec<SystemWallpaper> {
    catalog(Path::new(DESKTOP_PICTURES), &ASSET_ROOTS.iter().map(PathBuf::from).collect::<Vec<_>>())
}

pub fn resolve_original(path: &str) -> Result<PathBuf, String> {
    resolve(Path::new(path), Path::new(DESKTOP_PICTURES), &ASSET_ROOTS.iter().map(PathBuf::from).collect::<Vec<_>>())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn separates_thumbnails_from_originals_and_finds_downloaded_assets() {
        let root = std::env::temp_dir().join(format!("openshots-wallpapers-{}", uuid::Uuid::new_v4()));
        let desktop = root.join("Desktop Pictures");
        let assets = root.join("Assets");
        std::fs::create_dir_all(desktop.join(".thumbnails")).unwrap();
        std::fs::create_dir_all(assets.join("example.asset/AssetData")).unwrap();
        for name in ["Local", "Downloaded", "Missing"] {
            std::fs::write(desktop.join(format!(".thumbnails/{name}.heic")), b"thumbnail").unwrap();
        }
        std::fs::write(desktop.join("Local.heic"), b"original").unwrap();
        std::fs::write(desktop.join("No thumbnail.heic"), b"original").unwrap();
        let downloaded = assets.join("example.asset/AssetData/Downloaded.heic");
        std::fs::write(&downloaded, b"original").unwrap();
        let roots = [assets];
        let list = catalog(&desktop, &roots);
        assert_eq!(list.len(), 4);
        assert_eq!(list.last().unwrap().name, "Missing");
        assert!(!list.last().unwrap().available);
        assert_eq!(resolve(&desktop.join(".thumbnails/Local.heic"), &desktop, &roots).unwrap(), desktop.join("Local.heic"));
        assert_eq!(resolve(&desktop.join(".thumbnails/Downloaded.heic"), &desktop, &roots).unwrap(), downloaded);
        assert_eq!(resolve(&desktop.join(".thumbnails/Missing.heic"), &desktop, &roots).unwrap_err(), "WALLPAPER_ORIGINAL_NOT_AVAILABLE");
        assert!(list.iter().filter(|wp| wp.available).all(|wp| !wp.path.contains(".thumbnails")));
        std::fs::remove_dir_all(root).unwrap();
    }
}
