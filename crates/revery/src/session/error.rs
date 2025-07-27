use thiserror::Error;

/// Errors that can occur during session operations
#[derive(Error, Debug, PartialEq)]
pub enum SessionError {
    /// HMAC verification failed - message may have been tampered with
    #[error("HMAC verification failed")]
    HmacVerificationFailed,
    /// Failed to strip EXIF from JPEG
    #[error("Failed to strip EXIF from image")]
    ExifStripFailed,
}
