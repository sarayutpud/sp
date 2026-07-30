use tokio::io::AsyncWriteExt;
use tokio::net::TcpListener;
use tokio::sync::broadcast;

const FEED_PORT: u16 = 9700;

#[tauri::command]
fn app_schema_version() -> i32 {
  1
}

#[tauri::command]
async fn broadcast_feed(state: tauri::State<'_, FeedState>, message: String) -> Result<(), String> {
  let _ = state.tx.send(message);
  Ok(())
}

pub struct FeedState {
  tx: broadcast::Sender<String>,
}

async fn run_feed_server(tx: broadcast::Sender<String>) {
  let listener = match TcpListener::bind(("0.0.0.0", FEED_PORT)).await {
    Ok(l) => l,
    Err(e) => {
      eprintln!("SP feed bind error: {e}");
      return;
    }
  };
  eprintln!("SP feed listening on :{FEED_PORT}");

  loop {
    let Ok((mut socket, _addr)) = listener.accept().await else {
      continue;
    };
    let mut rx = tx.subscribe();
    tokio::spawn(async move {
      // hello
      let hello = r#"{"kind":"HEARTBEAT","version":"sp-feed/v1","ts":0}"#;
      let _ = socket.write_all(format!("{hello}\n").as_bytes()).await;
      while let Ok(msg) = rx.recv().await {
        if socket.write_all(format!("{msg}\n").as_bytes()).await.is_err() {
          break;
        }
      }
    });
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let (tx, _rx) = broadcast::channel::<String>(256);
  let feed_tx = tx.clone();

  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(
      tauri_plugin_sql::Builder::default()
        .add_migrations(
          "sqlite:sp_courtside.db",
          vec![tauri_plugin_sql::Migration {
            version: 1,
            description: "day1_local",
            sql: include_str!("../migrations/001_init.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
          }],
        )
        .build(),
    )
    .manage(FeedState { tx })
    .setup(move |_app| {
      let tx = feed_tx;
      tauri::async_runtime::spawn(async move {
        run_feed_server(tx).await;
      });
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![app_schema_version, broadcast_feed])
    .run(tauri::generate_context!())
    .expect("error while running SP Courtside");
}
