use blake3::Hasher;
use zeroize::ZeroizeOnDrop;

/// Derived session keys from successful SPAKE2 authentication
///
/// Contains separate keys for authentication verification and message encryption.
/// Both keys are cryptographically derived from the shared SPAKE2 output using
/// domain separation to ensure they're independent.
#[derive(Clone, ZeroizeOnDrop)]
pub struct SessionKeys {
    /// Key used for authentication challenge verification
    pub auth_key: [u8; 32],
    /// Key used for ChaCha20 message encryption
    pub encryption_key: [u8; 32],
    /// Key used for HMAC message signing
    pub signing_key: [u8; 32],
}

impl SessionKeys {
    /// Derives authentication, encryption, and signing keys from SPAKE2 shared secret
    ///
    /// Uses BLAKE3 with domain separation to create three independent 256-bit keys:
    /// - auth_key: for verifying both parties derived the same secret
    /// - encryption_key: for ChaCha20 message encryption
    /// - signing_key: for HMAC message authentication
    ///
    /// The base derivation includes the transport address and session timestamp
    /// to provide per-conversation forward secrecy even when the same shared
    /// secret is reused across multiple sessions.
    ///
    /// The "revery-v0" prefix provides version separation for future protocol changes.
    pub(crate) fn derive(shared_secret: &[u8], address: &str, timestamp: u64) -> Self {
        let mut hasher = Hasher::new();
        hasher.update(b"revery-v0"); // Protocol version prefix
        hasher.update(shared_secret);
        hasher.update(address.as_bytes());
        hasher.update(&timestamp.to_le_bytes());

        // Derive auth key with domain separation
        let mut auth_hasher = hasher.clone();
        auth_hasher.update(b"authentication");
        let auth_key: [u8; 32] = auth_hasher.finalize().into();

        // Derive encryption key with domain separation
        let mut enc_hasher = hasher.clone();
        enc_hasher.update(b"encryption");
        let encryption_key: [u8; 32] = enc_hasher.finalize().into();

        // Derive signing key with domain separation
        let mut signing_hasher = hasher.clone();
        signing_hasher.update(b"signing");
        let signing_key: [u8; 32] = signing_hasher.finalize().into();

        SessionKeys {
            auth_key,
            encryption_key,
            signing_key,
        }
    }
}
