use thiserror::Error;

#[derive(Debug, Error)]
pub enum OnionError {
    /// Failed to start Tor client
    #[error("Tor client failed: {0}")]
    TorClientFailed(String),
    /// Failed to create hidden service
    #[error("Service creation failed: {0}")]
    ServiceCreationFailed(String),
    /// Failed to connect to hidden service
    #[error("Connection failed: {0}")]
    ConnectionFailed(String),
    /// Invalid onion address format
    #[error("Invalid onion address: {0}")]
    InvalidAddress(String),
    /// Network timeout
    #[error("Operation timed out")]
    Timeout,
    /// IO error
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}
