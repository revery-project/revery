use std::sync::Arc;

use eyre::{Context, ContextCompat, Result};
use revery::{auth, protocol, session};
use revery_onion::{OnionClient, OnionService};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use tokio::sync::{mpsc, Mutex};

/// Connection states for the messaging session
#[derive(Clone, Serialize)]
#[serde(tag = "type")]
enum ConnectionState {
    #[serde(rename = "disconnected")]
    Disconnected,
    #[serde(rename = "waiting")]
    WaitingForJoin { onion_address: String },
    #[serde(rename = "connected")]
    Connected,
}

/// Event payload for connection status changes
#[derive(Clone, Serialize)]
struct ConnectionStatus {
    state: ConnectionState,
}

/// Types of session updates that can be emitted
#[derive(Clone, Serialize)]
#[serde(tag = "type")]
enum UpdateType {
    #[serde(rename = "status")]
    Status,
    #[serde(rename = "info")]
    Info,
    #[serde(rename = "success")]
    Success,
    #[serde(rename = "error")]
    Error,
}

/// Event payload for session status updates sent to the frontend
#[derive(Clone, Serialize)]
struct SessionUpdate {
    #[serde(rename = "type")]
    update_type: UpdateType,
    message: String,
    data: Option<serde_json::Value>,
}

/// Event payload for received messages with content type
#[derive(Clone, Serialize)]
struct MessageReceived {
    content: String,
    content_type: u8,
}

/// Message content types
#[derive(Deserialize)]
#[serde(tag = "type")]
enum MessageContent {
    #[serde(rename = "text")]
    Text { content: String },
    #[serde(rename = "image")]
    Image { data: Vec<u8> },
}

/// Store message sender for communication with wire protocol task
type MessageSender = Arc<Mutex<Option<mpsc::Sender<MessageContent>>>>;

/// Application state - message sender for communication
struct AppState {
    message_sender: MessageSender,
}

/// Host a new Revery session
#[tauri::command]
async fn host_session(
    secret: String,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<String, String> {
    let message_sender = state.message_sender.clone();
    let app_clone = app.clone();

    tokio::spawn(async move {
        if let Err(e) = host_session_impl(&secret, &app_clone, &message_sender).await {
            let _ = app_clone.emit(
                "session_update",
                SessionUpdate {
                    update_type: UpdateType::Error,
                    message: format!("Host session failed: {e}"),
                    data: None,
                },
            );
        }
    });

    Ok("Host session started".to_string())
}

/// Join an existing Revery session
#[tauri::command]
async fn join_session(
    address: String,
    secret: String,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<String, String> {
    let message_sender = state.message_sender.clone();
    let app_clone = app.clone();

    tokio::spawn(async move {
        if let Err(e) = join_session_impl(&address, &secret, &app_clone, &message_sender).await {
            let _ = app_clone.emit(
                "session_update",
                SessionUpdate {
                    update_type: UpdateType::Error,
                    message: format!("Join session failed: {e}"),
                    data: None,
                },
            );
        }
    });

    Ok("Join session started".to_string())
}

/// Send a message
#[tauri::command]
async fn send_message(
    content: MessageContent,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<String, String> {
    // Don't hold lock across await - get sender first
    let sender = {
        let guard = state.message_sender.lock().await;
        guard.clone()
    };

    if let Some(sender) = sender {
        let (display_message, content_type) = match &content {
            MessageContent::Text { content } => (content.clone(), 0u8),
            MessageContent::Image { .. } => ("[Image]".to_string(), 1u8),
        };

        match sender.send(content).await {
            Ok(()) => {
                let _ = app.emit(
                    "message_sent",
                    MessageReceived {
                        content: display_message,
                        content_type,
                    },
                );
                Ok("Message sent".to_string())
            }
            Err(e) => Err(format!("Failed to send message: {e}")),
        }
    } else {
        Err("No active session".to_string())
    }
}

/// Disconnect the active session
#[tauri::command]
async fn disconnect_session(state: State<'_, AppState>, app: AppHandle) -> Result<String, String> {
    let mut sender_guard = state.message_sender.lock().await;
    *sender_guard = None;

    let _ = app.emit(
        "connection_status",
        ConnectionStatus {
            state: ConnectionState::Disconnected,
        },
    );

    Ok("Session disconnected".to_string())
}

/// Host session implementation
async fn host_session_impl(
    secret: &str,
    app: &AppHandle,
    message_sender: &MessageSender,
) -> Result<()> {
    app.emit(
        "session_update",
        SessionUpdate {
            update_type: UpdateType::Status,
            message: "Starting Revery host...".to_string(),
            data: None,
        },
    )?;

    app.emit(
        "session_update",
        SessionUpdate {
            update_type: UpdateType::Info,
            message: "Creating Tor onion service...".to_string(),
            data: None,
        },
    )?;

    // Create onion service
    let mut service = OnionService::new()
        .await
        .context("Failed to create onion service")?;

    let onion_address = service
        .onion_address()
        .wrap_err("Failed to get onion address")?
        .to_string();

    app.emit(
        "session_update",
        SessionUpdate {
            update_type: UpdateType::Info,
            message: "Onion service created successfully".to_string(),
            data: None,
        },
    )?;

    app.emit(
        "connection_status",
        ConnectionStatus {
            state: ConnectionState::WaitingForJoin {
                onion_address: onion_address.clone(),
            },
        },
    )?;

    app.emit(
        "session_update",
        SessionUpdate {
            update_type: UpdateType::Info,
            message: format!("Session created: {onion_address}"),
            data: None,
        },
    )?;

    app.emit(
        "session_update",
        SessionUpdate {
            update_type: UpdateType::Info,
            message: "Waiting for someone to join...".to_string(),
            data: None,
        },
    )?;

    // Wait for connection
    let stream = service
        .accept_connection()
        .await
        .context("Failed to accept connection")?;

    app.emit(
        "session_update",
        SessionUpdate {
            update_type: UpdateType::Info,
            message: "Someone connected! Authenticating...".to_string(),
            data: None,
        },
    )?;

    // Create wire protocol
    let mut wire = protocol::WireProtocol::new(stream);

    // Perform authentication - EXACTLY like CLI
    let auth = auth::AuthFlow::new(auth::SessionRole::Creator, secret);

    // Receive peer's auth message
    let peer_msg = wire
        .receive_auth_message()
        .await
        .context("Failed to receive authentication message")?;

    // Send our auth message
    wire.send_auth_message(&auth.our_message())
        .await
        .context("Failed to send authentication message")?;

    // Complete authentication
    let shared_secret = auth
        .authenticate(&peer_msg)
        .context("Authentication failed")?;

    // Exchange verification - HOST determines the timestamp
    let session_timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    // Send timestamp first so joiner can use the same one
    wire.send_timestamp(session_timestamp)
        .await
        .context("Failed to send timestamp")?;

    let our_verification =
        auth::AuthFlow::generate_challenge(&shared_secret, &onion_address, session_timestamp);
    wire.send_auth_verification(&our_verification)
        .await
        .context("Failed to send verification")?;

    let peer_verification = wire
        .receive_auth_verification()
        .await
        .context("Failed to receive verification")?;

    auth::AuthFlow::verify_challenge(
        &shared_secret,
        &onion_address,
        session_timestamp,
        &peer_verification,
    )
    .context("Verification failed")?;

    app.emit(
        "session_update",
        SessionUpdate {
            update_type: UpdateType::Success,
            message: "Authentication successful!".to_string(),
            data: None,
        },
    )?;

    // Set up conversation
    let conversation = session::Conversation::new(&shared_secret, &onion_address);
    wire.set_conversation(conversation);

    // Emit connected status
    app.emit(
        "connection_status",
        ConnectionStatus {
            state: ConnectionState::Connected,
        },
    )?;

    // Start message handling with channel
    handle_messages(wire, app, message_sender).await
}

/// Join session implementation
async fn join_session_impl(
    address: &str,
    secret: &str,
    app: &AppHandle,
    message_sender: &MessageSender,
) -> Result<()> {
    app.emit(
        "session_update",
        SessionUpdate {
            update_type: UpdateType::Status,
            message: format!("Joining Revery session at {address}..."),
            data: None,
        },
    )?;

    app.emit(
        "session_update",
        SessionUpdate {
            update_type: UpdateType::Info,
            message: "Creating Tor client...".to_string(),
            data: None,
        },
    )?;

    // Create Tor client
    let client = OnionClient::new()
        .await
        .context("Failed to create Tor client")?;

    app.emit(
        "session_update",
        SessionUpdate {
            update_type: UpdateType::Info,
            message: "Tor client created successfully".to_string(),
            data: None,
        },
    )?;

    app.emit(
        "session_update",
        SessionUpdate {
            update_type: UpdateType::Info,
            message: format!("Connecting to {address}..."),
            data: None,
        },
    )?;

    // Connect to onion service
    let stream = client
        .connect(address, 80)
        .await
        .context("Failed to connect to onion service")?;

    app.emit(
        "session_update",
        SessionUpdate {
            update_type: UpdateType::Info,
            message: "Connected! Authenticating...".to_string(),
            data: None,
        },
    )?;

    // Create wire protocol
    let mut wire = protocol::WireProtocol::new(stream);

    // Perform authentication
    let auth = auth::AuthFlow::new(auth::SessionRole::Joiner, secret);

    // Send our auth message first
    wire.send_auth_message(&auth.our_message())
        .await
        .context("Failed to send authentication message")?;

    // Receive peer's auth message
    let peer_msg = wire
        .receive_auth_message()
        .await
        .context("Failed to receive authentication message")?;

    // Complete authentication
    let shared_secret = auth
        .authenticate(&peer_msg)
        .context("Authentication failed")?;

    // Exchange verification - JOINER receives timestamp from host
    let session_timestamp = wire
        .receive_timestamp()
        .await
        .context("Failed to receive timestamp")?;

    let peer_verification = wire
        .receive_auth_verification()
        .await
        .context("Failed to receive verification")?;

    auth::AuthFlow::verify_challenge(
        &shared_secret,
        address,
        session_timestamp,
        &peer_verification,
    )
    .context("Verification failed")?;

    let our_verification =
        auth::AuthFlow::generate_challenge(&shared_secret, address, session_timestamp);
    wire.send_auth_verification(&our_verification)
        .await
        .context("Failed to send verification")?;

    app.emit(
        "session_update",
        SessionUpdate {
            update_type: UpdateType::Success,
            message: "Authentication successful!".to_string(),
            data: None,
        },
    )?;

    // Set up conversation
    let conversation = session::Conversation::new(&shared_secret, address);
    wire.set_conversation(conversation);

    // Emit connected status
    app.emit(
        "connection_status",
        ConnectionStatus {
            state: ConnectionState::Connected,
        },
    )?;

    // Start message handling with channel
    handle_messages(wire, app, message_sender).await
}

/// Handle messages using channel approach but without holding locks across awaits
async fn handle_messages<S>(
    mut wire: protocol::WireProtocol<S>,
    app: &AppHandle,
    message_sender: &MessageSender,
) -> Result<()>
where
    S: tokio::io::AsyncRead + tokio::io::AsyncWrite + Unpin + Send,
{
    // Create channel for outgoing messages
    let (tx, mut rx) = mpsc::channel::<MessageContent>(32);

    // Store sender in global state - don't hold lock across await
    {
        let mut sender_guard = message_sender.lock().await;
        *sender_guard = Some(tx);
    }

    loop {
        tokio::select! {
            // Handle outgoing messages
            message = rx.recv() => {
                match message {
                    Some(MessageContent::Text { content }) => {
                        // Don't hold any locks during send
                        if wire.send_text_message(&content).await.is_err() {
                            break;
                        }
                    }
                    Some(MessageContent::Image { data }) => {
                        // Don't hold any locks during send
                        if wire.send_image_message(&data).await.is_err() {
                            break;
                        }
                    }
                    None => break, // Channel closed
                }
            }

            // Handle incoming messages
            result = wire.receive_chat_message() => {
                match result {
                    Ok((content, content_type)) => {
                        // Convert bytes to string with better error handling
                        let message = match String::from_utf8(content.clone()) {
                            Ok(s) => s,
                            Err(e) => {
                                let error_msg = format!("Failed to decode message as UTF-8: {} (content size: {} bytes)", e, content.len());
                                let _ = app.emit(
                                    "session_update",
                                    SessionUpdate {
                                        update_type: UpdateType::Error,
                                        message: error_msg,
                                        data: None,
                                    },
                                );
                                "[Invalid message content]".to_string()
                            }
                        };

                        let _ = app.emit(
                            "message_received",
                            MessageReceived {
                                content: message,
                                content_type,
                            },
                        );
                    }
                    Err(e) => {
                        let error_msg = format!("Failed to receive message: {e:?}");
                        let _ = app.emit(
                            "session_update",
                            SessionUpdate {
                                update_type: UpdateType::Error,
                                message: error_msg,
                                data: None,
                            },
                        );
                        // Connection error - break loop
                        break;
                    }
                }
            }
        }
    }

    // Clean up
    {
        let mut sender_guard = message_sender.lock().await;
        *sender_guard = None;
    }

    let _ = app.emit(
        "connection_status",
        ConnectionStatus {
            state: ConnectionState::Disconnected,
        },
    );

    Ok(())
}

/// Main Tauri application entry point
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            message_sender: Arc::new(Mutex::new(None)),
        })
        .invoke_handler(tauri::generate_handler![
            host_session,
            join_session,
            send_message,
            disconnect_session
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
