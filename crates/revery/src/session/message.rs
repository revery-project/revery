use base64::prelude::*;
use bincode::{Decode, Encode};
use chacha20::cipher::{KeyIvInit, StreamCipher};
use chacha20::{ChaCha20, Key, Nonce};
use hmac::{Hmac, Mac};
use infer;
use sha2::Sha256;
use zeroize::ZeroizeOnDrop;

use super::error::SessionError;

type HmacSha256 = Hmac<Sha256>;

/// Encrypted message structure used in Revery conversations
///
/// The design enables perfect deniability: the same message structure
/// can be used to create forgeries that are cryptographically indistinguishable
/// from original messages when using the same key material.
#[derive(Encode, Decode, ZeroizeOnDrop)]
pub struct Message {
    pub sequence: u64,
    pub timestamp: u32,
    pub content_type: u8,
    pub payload: Vec<u8>,
    pub hmac: [u8; 32],
}

/// Message content types supported by the protocol
pub enum ContentType {
    Text = 0,
    Image = 1,
}

impl Message {
    /// Encrypts a message using ChaCha20 with a deterministic nonce and signs with HMAC
    ///
    /// The nonce is built from sequence number and timestamp, which enables
    /// forgery: anyone with the key can create a message with the same
    /// sequence/timestamp that decrypts to different content.
    pub fn encrypt(
        sequence: u64,
        timestamp: u32,
        content_type: ContentType,
        plaintext: &[u8],
        encryption_key: &[u8; 32],
        signing_key: &[u8; 32],
    ) -> Self {
        let content_type_u8 = content_type as u8;

        // Process image payload if needed
        let processed_payload = if content_type_u8 == ContentType::Image as u8 {
            let encoded = BASE64_STANDARD.encode(plaintext);

            // Detect MIME type and build data URL
            let data_url = match infer::get(plaintext) {
                Some(kind) => {
                    let mime_type = kind.mime_type();
                    format!("data:{mime_type};base64,{encoded}")
                }
                None => {
                    // Default to JPEG if we can't detect the type
                    format!("data:image/jpeg;base64,{encoded}")
                }
            };

            data_url.into_bytes()
        } else {
            plaintext.to_vec()
        };

        let nonce_bytes = Self::build_nonce(sequence, timestamp);
        let nonce = Nonce::from_slice(&nonce_bytes);
        let key = Key::from_slice(encryption_key);

        let mut cipher = ChaCha20::new(key, nonce);
        let mut payload = processed_payload;
        cipher.apply_keystream(&mut payload);

        // Create message without HMAC first
        let mut message = Message {
            sequence,
            timestamp,
            content_type: content_type_u8,
            payload,
            hmac: [0u8; 32], // Temporary placeholder
        };

        // Compute HMAC over the message structure (excluding the HMAC field itself)
        let hmac = Self::compute_hmac(&message, signing_key);
        message.hmac = hmac;

        message
    }

    /// Verifies HMAC and decrypts the message payload using the same key and nonce derivation
    pub fn decrypt(
        &self,
        encryption_key: &[u8; 32],
        signing_key: &[u8; 32],
    ) -> Result<Vec<u8>, SessionError> {
        // First verify the HMAC
        if !self.verify_hmac(signing_key) {
            return Err(SessionError::HmacVerificationFailed);
        }

        let nonce_bytes = Self::build_nonce(self.sequence, self.timestamp);
        let nonce = Nonce::from_slice(&nonce_bytes);
        let key = Key::from_slice(encryption_key);

        let mut cipher = ChaCha20::new(key, nonce);
        let mut plaintext = self.payload.clone();
        cipher.apply_keystream(&mut plaintext);

        Ok(plaintext)
    }

    /// Verifies the HMAC signature of the message
    pub fn verify_hmac(&self, signing_key: &[u8; 32]) -> bool {
        let expected_hmac = Self::compute_hmac(self, signing_key);
        expected_hmac == self.hmac
    }

    /// Computes HMAC over the message structure (excluding the HMAC field)
    fn compute_hmac(message: &Message, signing_key: &[u8; 32]) -> [u8; 32] {
        let mut mac =
            HmacSha256::new_from_slice(signing_key).expect("HMAC can take key of any size");

        // Hash the message fields in order (excluding HMAC)
        mac.update(&message.sequence.to_le_bytes());
        mac.update(&message.timestamp.to_le_bytes());
        mac.update(&[message.content_type]);
        mac.update(&message.payload);

        mac.finalize().into_bytes().into()
    }

    /// Builds a ChaCha20 nonce from sequence number and timestamp
    ///
    /// This deterministic nonce construction is what enables deniability:
    /// the same sequence/timestamp will always produce the same nonce,
    /// allowing creation of messages that decrypt differently but appear identical.
    fn build_nonce(sequence: u64, timestamp: u32) -> [u8; 12] {
        let mut nonce = [0u8; 12];
        nonce[0..8].copy_from_slice(&sequence.to_le_bytes());
        nonce[8..12].copy_from_slice(&timestamp.to_le_bytes());

        nonce
    }
}
