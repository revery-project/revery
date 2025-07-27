use std::time::{SystemTime, UNIX_EPOCH};

use zeroize::ZeroizeOnDrop;

use crate::auth::SessionKeys;
use crate::session::error::SessionError;
use crate::session::message::{ContentType, Message};

/// Manages an encrypted conversation session with deniability features
///
/// A conversation maintains sequence counters and encryption keys for a messaging
/// session. Importantly, it provides methods to create both legitimate messages
/// and cryptographically indistinguishable forgeries after the fact.
#[derive(ZeroizeOnDrop)]
pub struct Conversation {
    session_keys: SessionKeys,
    next_sequence: u64,
    created_at: u64,
}

impl Conversation {
    /// Creates a new conversation by deriving session keys from shared secret
    pub fn new(shared_secret: &[u8], address: &str) -> Self {
        let created_at = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("Time went backwards")
            .as_secs();

        let session_keys = SessionKeys::derive(shared_secret, address, created_at);

        Self {
            session_keys,
            next_sequence: 1,
            created_at,
        }
    }

    /// Creates a new conversation from existing session keys (for testing)
    #[cfg(test)]
    pub fn from_keys(session_keys: SessionKeys) -> Self {
        let created_at = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("Time went backwards")
            .as_secs();

        Self {
            session_keys,
            next_sequence: 1,
            created_at,
        }
    }

    /// Returns the timestamp when this conversation was created
    pub fn created_at(&self) -> u64 {
        self.created_at
    }

    /// Creates and encrypts a text message with the next sequence number
    pub fn create_text_message(&mut self, content: &str) -> Message {
        let sequence = self.next_sequence;
        let timestamp = Self::current_unix_timestamp();
        let plaintext = content.as_bytes();

        self.next_sequence += 1;

        Message::encrypt(
            sequence,
            timestamp,
            ContentType::Text,
            plaintext,
            &self.session_keys.encryption_key,
            &self.session_keys.signing_key,
        )
    }

    /// Creates and encrypts an image message with the next sequence number
    pub fn create_image_message(&mut self, image_data: &[u8]) -> Message {
        let sequence = self.next_sequence;
        let timestamp = Self::current_unix_timestamp();

        self.next_sequence += 1;

        Message::encrypt(
            sequence,
            timestamp,
            ContentType::Image,
            image_data,
            &self.session_keys.encryption_key,
            &self.session_keys.signing_key,
        )
    }

    /// Decrypts a received message using the session encryption key and verifies HMAC
    pub fn decrypt_message(&self, message: &Message) -> Result<Vec<u8>, SessionError> {
        message.decrypt(
            &self.session_keys.encryption_key,
            &self.session_keys.signing_key,
        )
    }

    /// Creates a forged message that appears identical to an original
    ///
    /// This is the core of Revery's deniability: given the same sequence number
    /// and timestamp as a previous message, this creates a new message that
    /// decrypts to different content but is cryptographically indistinguishable
    /// from the original. This enables plausible deniability about what was
    /// actually said in a conversation.
    pub fn create_forged_text_message(
        &self,
        sequence: u64,
        timestamp: u32,
        fake_content: &str,
    ) -> Message {
        let plaintext = fake_content.as_bytes();

        Message::encrypt(
            sequence,
            timestamp,
            ContentType::Text,
            plaintext,
            &self.session_keys.encryption_key,
            &self.session_keys.signing_key,
        )
    }

    /// Returns the next sequence number that will be used for outgoing messages
    pub fn current_sequence(&self) -> u64 {
        self.next_sequence
    }

    /// Gets the current Unix timestamp as a 32-bit value
    fn current_unix_timestamp() -> u32 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("Time went backwards")
            .as_secs() as u32
    }
}
