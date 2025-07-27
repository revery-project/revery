//! # Revery
//!
//! ## Components
//!
//! - **`auth`** - SPAKE2 password-based authentication
//! - **`session`** - Encrypted messaging with ChaCha20 and forgery capabilities
//! - **`protocol`** - Wire protocol for message framing over TCP
//!
//! ## Basic Usage
//!
//! The core library works with any stream that implements `AsyncRead + AsyncWrite`.
//! For Tor integration, use the `revery-onion` crate.
//!
//! ```rust,no_run
//! use revery::{auth, protocol, session};
//! use tokio::io::{AsyncRead, AsyncWrite};
//!
//! async fn messaging_example<S>(stream: S) -> Result<(), Box<dyn std::error::Error>>
//! where
//!     S: AsyncRead + AsyncWrite + Unpin + Send + 'static,
//! {
//!     let mut wire = protocol::WireProtocol::new(stream);
//!
//!     // Authenticate
//!     let auth = auth::AuthFlow::new(auth::SessionRole::Creator, "password");
//!     let peer_msg = wire.receive_auth_message().await?;
//!     wire.send_auth_message(&auth.our_message()).await?;
//!     let shared_secret = auth.authenticate(&peer_msg)?;
//!
//!     // Set up conversation and send message
//!     let conversation = session::Conversation::new(&shared_secret, "example.onion");
//!     wire.set_conversation(conversation);
//!     wire.send_text_message("Hello!").await?;
//!
//!     Ok(())
//! }
//! ```

pub mod auth;
pub mod protocol;
pub mod session;
