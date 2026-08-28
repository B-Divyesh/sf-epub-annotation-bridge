use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use rusqlite::{Connection, OpenFlags};
use serde::Serialize;
use std::{fs, path::{Path, PathBuf}, sync::Mutex};
use tauri::{Emitter, State};
use walkdir::WalkDir;

#[derive(Default)]
struct WatchState(Mutex<Vec<RecommendedWatcher>>);

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Book {
    id: String,
    title: String,
    author: String,
    path: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AnnotationFile {
    path: String,
    name: String,
    content: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Annotation {
    id: String,
    book_id: String,
    title: String,
    author: String,
    chapter: String,
    quote: String,
    note: String,
    cfi: String,
    created_at: String,
    source: String,
    r#match: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ScanResult {
    books: Vec<Book>,
    annotation_files: Vec<AnnotationFile>,
    annotations: Vec<Annotation>,
}

fn open_read_only(path: &Path) -> Result<Connection, String> {
    Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX)
        .map_err(|error| format!("Could not read {}: {error}", path.display()))
}

fn scan_calibre(root: &Path) -> Result<Vec<Book>, String> {
    let database = root.join("metadata.db");
    if !database.is_file() {
        return Err("The chosen Calibre folder has no metadata.db file.".into());
    }
    let connection = open_read_only(&database)?;
    let mut statement = connection.prepare(
        "SELECT b.id, b.title, b.path, COALESCE(group_concat(a.name, ', '), '')
         FROM books b LEFT JOIN books_authors_link l ON l.book = b.id
         LEFT JOIN authors a ON a.id = l.author GROUP BY b.id, b.title, b.path ORDER BY b.title"
    ).map_err(|error| format!("The Calibre catalog could not be read: {error}"))?;
    let rows = statement.query_map([], |row| {
        let id: i64 = row.get(0)?;
        let relative: String = row.get(2)?;
        let folder = root.join(relative);
        let epub = fs::read_dir(&folder).ok().and_then(|entries| entries.flatten()
            .map(|entry| entry.path()).find(|path| path.extension().is_some_and(|value| value.eq_ignore_ascii_case("epub"))));
        Ok(Book { id: format!("calibre-{id}"), title: row.get(1)?, path: epub.unwrap_or(folder).display().to_string(), author: row.get(3)? })
    }).map_err(|error| format!("The Calibre catalog could not be listed: {error}"))?;
    Ok(rows.filter_map(Result::ok).collect())
}

fn scan_annotation_files(root: &Path) -> Vec<AnnotationFile> {
    WalkDir::new(root).max_depth(6).follow_links(false).into_iter().filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_file())
        .filter_map(|entry| {
            let path = entry.path();
            let name = path.file_name()?.to_string_lossy().to_string();
            let lower = name.to_lowercase();
            if !(lower.ends_with(".lua") || lower.ends_with(".csv") || lower.ends_with(".json")) { return None; }
            let metadata = entry.metadata().ok()?;
            if metadata.len() > 8_000_000 { return None; }
            let content = fs::read_to_string(path).ok()?;
            Some(AnnotationFile { path: path.display().to_string(), name, content })
        }).collect()
}

fn scan_kobo(root: &Path) -> Vec<Annotation> {
    let database = root.join(".kobo").join("KoboReader.sqlite");
    let Ok(connection) = open_read_only(&database) else { return Vec::new() };
    let sql = "SELECT COALESCE(BookmarkID,''), COALESCE(VolumeID,''), COALESCE(Text,''),
               COALESCE(Annotation,''), COALESCE(DateCreated,''), COALESCE(ContentID,'')
               FROM Bookmark WHERE COALESCE(Text,'') <> '' AND COALESCE(Hidden,'false') = 'false'";
    let Ok(mut statement) = connection.prepare(sql) else { return Vec::new() };
    let Ok(rows) = statement.query_map([], |row| {
        let volume: String = row.get(1)?;
        let content: String = row.get(5)?;
        let title = volume.rsplit('/').next().unwrap_or("Unknown EPUB").trim_end_matches(".epub").replace(['-', '_'], " ");
        let cfi = content.split('#').nth(1).filter(|part| part.starts_with("epubcfi" )).unwrap_or("").to_string();
        Ok(Annotation {
            id: row.get(0)?, book_id: volume.clone(), title, author: "Unknown author".into(),
            chapter: content.split('#').next().unwrap_or("Unknown chapter").rsplit('/').next().unwrap_or("Unknown chapter").into(),
            quote: row.get(2)?, note: row.get(3)?, created_at: row.get(4)?, cfi: cfi.clone(),
            source: "Kobo".into(), r#match: if cfi.is_empty() { "unmatched".into() } else { "exact".into() },
        })
    }) else { return Vec::new() };
    rows.filter_map(Result::ok).collect()
}

fn watch_directory<F>(path: &Path, handler: F) -> Result<RecommendedWatcher, String>
where
    F: FnMut(Result<notify::Event, notify::Error>) + Send + 'static,
{
    let mut watcher = notify::recommended_watcher(handler)
        .map_err(|error| format!("The folder watcher could not start: {error}"))?;
    watcher.watch(path, RecursiveMode::Recursive)
        .map_err(|error| format!("{} could not be watched: {error}", path.display()))?;
    Ok(watcher)
}

#[tauri::command]
fn scan_sources(calibre_path: String, reader_path: String) -> Result<ScanResult, String> {
    let calibre = PathBuf::from(calibre_path);
    let reader = PathBuf::from(reader_path);
    if !calibre.is_dir() || !reader.is_dir() { return Err("Choose two folders that still exist.".into()); }
    Ok(ScanResult { books: scan_calibre(&calibre)?, annotation_files: scan_annotation_files(&reader), annotations: scan_kobo(&reader) })
}

#[tauri::command]
fn watch_paths(app: tauri::AppHandle, state: State<'_, WatchState>, paths: Vec<String>) -> Result<(), String> {
    let mut active = state.0.lock().map_err(|_| "The folder watcher could not start.".to_string())?;
    active.clear();
    for raw in paths {
        let path = PathBuf::from(&raw);
        if !path.is_dir() { return Err(format!("{} is no longer available.", path.display())); }
        let handle = app.clone();
        let watcher = watch_directory(&path, move |event: Result<notify::Event, notify::Error>| {
            if let Ok(event) = event { let _ = handle.emit("source-changed", event.paths.iter().map(|path| path.display().to_string()).collect::<Vec<_>>()); }
        })?;
        active.push(watcher);
    }
    Ok(())
}

fn safe_sidecar_path(directory: &Path) -> Result<PathBuf, String> {
    if !directory.is_dir() { return Err("The sidecar folder does not exist.".into()); }
    let first = directory.join("epub-annotations.sidecar.json");
    if !first.exists() { return Ok(first); }
    for number in 2..10_000 {
        let candidate = directory.join(format!("epub-annotations.sidecar-{number}.json"));
        if !candidate.exists() { return Ok(candidate); }
    }
    Err("The sidecar folder has too many existing exports.".into())
}

#[tauri::command]
fn write_sidecar(directory: String, contents: String) -> Result<String, String> {
    let path = safe_sidecar_path(Path::new(&directory))?;
    fs::write(&path, contents).map_err(|error| format!("The sidecar could not be written: {error}"))?;
    Ok(path.display().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default().manage(WatchState::default()).plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![scan_sources, watch_paths, write_sidecar])
        .run(tauri::generate_context!()).expect("error while running EPUB Annotation Bridge");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn claim_safe_sidecar_preserves_existing_file() {
        let root = std::env::temp_dir().join(format!("epub-bridge-test-{}", std::process::id()));
        fs::create_dir_all(&root).unwrap();
        let original = root.join("epub-annotations.sidecar.json");
        fs::write(&original, "original").unwrap();
        let next = safe_sidecar_path(&root).unwrap();
        assert!(next.ends_with("epub-annotations.sidecar-2.json"));
        assert_eq!(fs::read_to_string(original).unwrap(), "original");
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn claim_folder_watcher_reports_a_change() {
        use std::{sync::mpsc, time::Duration};
        let root = std::env::temp_dir().join(format!("epub-bridge-watch-test-{}", std::process::id()));
        fs::create_dir_all(&root).unwrap();
        let (sender, receiver) = mpsc::channel();
        let _watcher = watch_directory(&root, move |event| { let _ = sender.send(event); }).unwrap();
        fs::write(root.join("new-note.txt"), "changed").unwrap();
        let event = receiver.recv_timeout(Duration::from_secs(5)).expect("watcher event");
        assert!(event.is_ok());
        let _ = fs::remove_dir_all(root);
    }
}
