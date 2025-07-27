use thiserror::Error;

/// Errors that can occur during SPAKE2 authentication
#[derive(Debug, Error)]
pub enum AuthError {
    /// SPAKE2 protocol error (typically wrong password or malformed messages)
    #[error("SPAKE2 authentication failed")]
    AuthenticationFailed(#[from] spake2::Error),
    /// AuthFlow was already consumed or challenge verification failed
    #[error("AuthFlow has already been consumed")]
    InvalidState,
}
