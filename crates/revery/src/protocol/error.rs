use thiserror::Error;

use crate::session::SessionError;

/// Errors that can occur during wire protocol operations
#[derive(Debug, Error)]
pub enum WireError {
    /// Underlying I/O error (network, stream, etc.)
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    /// Message exceeds the maximum allowed size (1MB)
    #[error("Message too large: {0} bytes")]
    MessageTooLarge(usize),
    /// Message could not be parsed or has invalid structure
    #[error("Invalid message format")]
    InvalidFormat,
    /// Remote peer closed the connection unexpectedly
    #[error("Connection closed unexpectedly")]
    ConnectionClosed,
    /// Session-level error (HMAC verification, decryption, etc.)
    #[error("Session error: {0}")]
    Session(#[from] SessionError),
}
