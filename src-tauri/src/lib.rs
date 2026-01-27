// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::path::{Path, PathBuf, Component};
use std::fs;

fn ensure_safe_path(path_str: &str) -> Result<PathBuf, String> {
    // 1. Get current working directory
    let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
    let cwd = fs::canonicalize(&cwd).map_err(|e| e.to_string())?;

    // 2. Resolve target path
    let path = Path::new(path_str);
    let target = if path.is_absolute() {
        path.to_path_buf()
    } else {
        cwd.join(path)
    };

    // 3. Check existing ancestor
    let mut current = target.clone();
    // We want to find the longest prefix that exists
    while !current.exists() {
        if let Some(parent) = current.parent() {
            current = parent.to_path_buf();
        } else {
            // Reached root and it doesn't exist? Should not happen for absolute path.
            break;
        }
    }

    // 4. Canonicalize the existing ancestor
    let canonical_ancestor = fs::canonicalize(&current).map_err(|e| format!("Invalid path: {}", e))?;

    // 5. Verify ancestor is within CWD
    if !canonical_ancestor.starts_with(&cwd) {
        return Err("Access denied: Path is outside working directory".to_string());
    }

    // 6. Check the non-existing suffix for ".."
    let suffix = target.strip_prefix(&current).map_err(|_| "Path error".to_string())?;

    for component in suffix.components() {
        if let Component::ParentDir = component {
             return Err("Access denied: Path contains '..' in non-existing portion".to_string());
        }
    }

    Ok(target)
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn read_json(path: String) -> Result<String, String> {
    let safe_path = ensure_safe_path(&path)?;
    fs::read_to_string(safe_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_json(path: String, content: String) -> Result<(), String> {
    let safe_path = ensure_safe_path(&path)?;
    if let Some(parent) = safe_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(safe_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_cwd() -> Result<String, String> {
    std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn join_path(parts: Vec<String>) -> Result<String, String> {
    let mut path = PathBuf::new();
    for part in parts {
        path.push(part);
    }
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn list_files(path: String) -> Result<Vec<String>, String> {
    let safe_path = ensure_safe_path(&path)?;
    let mut files = Vec::new();
    let entries = fs::read_dir(safe_path).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_file() {
            if let Some(name) = path.file_name() {
                if let Some(name_str) = name.to_str() {
                    files.push(name_str.to_string());
                }
            }
        }
    }
    Ok(files)
}

#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    let safe_path = ensure_safe_path(&path)?;
    fs::remove_file(safe_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_binary_file(path: String, content: Vec<u8>) -> Result<(), String> {
    let safe_path = ensure_safe_path(&path)?;
    if let Some(parent) = safe_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(safe_path, content).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            read_json,
            write_json,
            delete_file,
            list_files,
            get_cwd,
            join_path,
            write_binary_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
