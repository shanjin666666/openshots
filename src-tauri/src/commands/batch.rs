use base64::{engine::general_purpose::STANDARD, Engine};
use std::{fs::OpenOptions, io::{Cursor, Write}, path::{Path, PathBuf}};

fn save_batch_output(directory: &Path, source_path: &Path, data_url: &str) -> Result<String, String> {
    if !directory.is_dir() { return Err("Output folder is unavailable".into()); }
    let (prefix, payload) = data_url.split_once(',').ok_or("Invalid output image")?;
    let (extension, format) = match prefix {
        "data:image/png;base64" => ("png", image::ImageFormat::Png),
        "data:image/jpeg;base64" => ("jpg", image::ImageFormat::Jpeg),
        _ => return Err("Unsupported output format".into()),
    };
    if payload.len() > 180_000_000 { return Err("Output image is too large".into()); }
    let bytes = STANDARD.decode(payload).map_err(|_| "Invalid output image")?;
    let dimensions = image::ImageReader::with_format(Cursor::new(&bytes), format)
        .into_dimensions().map_err(|_| "Invalid output image")?;
    if dimensions.0 == 0 || dimensions.1 == 0 || dimensions.0 > 8192 || dimensions.1 > 8192
        || u64::from(dimensions.0) * u64::from(dimensions.1) > 32_000_000 {
        return Err("Output exceeds the 32 megapixel or 8192 px limit".into());
    }
    let stem: String = source_path.file_stem().and_then(|s| s.to_str()).unwrap_or("image")
        .chars().take(80).map(|c| if c.is_control() || "<>:\"/\\|?*".contains(c) { '_' } else { c }).collect();
    for counter in 1..=10_000 {
        let suffix = if counter == 1 { String::new() } else { format!("-{counter}") };
        let path = directory.join(format!("{stem}-styled{suffix}.{extension}"));
        // Atomic reservation prevents overwrite even when two exports target the same folder.
        match OpenOptions::new().write(true).create_new(true).open(&path) {
            Ok(mut file) => {
                if let Err(error) = file.write_all(&bytes).and_then(|_| file.flush()) {
                    drop(file);
                    let _ = std::fs::remove_file(&path);
                    return Err(format!("Failed to write output: {error}"));
                }
                return Ok(path.to_string_lossy().into_owned());
            }
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(error) => return Err(format!("Failed to write output: {error}")),
        }
    }
    Err("Too many files with the same name".into())
}

#[tauri::command]
pub async fn save_batch_image(directory: String, source_path: String, data_url: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || save_batch_output(&PathBuf::from(directory), &PathBuf::from(source_path), &data_url))
        .await.map_err(|error| error.to_string())?
}

#[tauri::command]
pub fn open_batch_folder(app: tauri::AppHandle, directory: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let path = PathBuf::from(directory).canonicalize().map_err(|_| "Output folder is unavailable")?;
    if !path.is_dir() { return Err("Output folder is unavailable".into()); }
    app.opener().open_path(path.to_string_lossy().as_ref(), None::<&str>).map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn png() -> String {
        let image = image::DynamicImage::new_rgba8(2, 3);
        let mut bytes = Cursor::new(Vec::new());
        image.write_to(&mut bytes, image::ImageFormat::Png).unwrap();
        format!("data:image/png;base64,{}", STANDARD.encode(bytes.into_inner()))
    }
    #[test]
    fn keeps_originals_and_numbers_collisions() {
        let directory = std::env::temp_dir().join(format!("openshots-batch-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir(&directory).unwrap();
        let source = directory.join("截图.png");
        std::fs::write(&source, b"original").unwrap();
        let first = save_batch_output(&directory, &source, &png()).unwrap();
        let second = save_batch_output(&directory, &source, &png()).unwrap();
        assert!(first.ends_with("截图-styled.png"));
        assert!(second.ends_with("截图-styled-2.png"));
        assert_eq!(std::fs::read(source).unwrap(), b"original");
        assert_eq!(image::image_dimensions(&first).unwrap(), (2, 3));
        assert_eq!(std::fs::read(first).unwrap(), std::fs::read(second).unwrap());
        std::fs::remove_dir_all(directory).unwrap();
    }
    #[test]
    fn refuses_bad_data_without_creating_files() {
        let directory = std::env::temp_dir().join(format!("openshots-batch-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir(&directory).unwrap();
        assert!(save_batch_output(&directory, Path::new("photo.png"), "data:image/png;base64,bm90YW5pbWFnZQ==").is_err());
        assert!(save_batch_output(&directory, Path::new("photo.png"), "data:text/plain;base64,AAA=").is_err());
        assert_eq!(std::fs::read_dir(&directory).unwrap().count(), 0);
        std::fs::remove_dir(directory).unwrap();
    }
}
