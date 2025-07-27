//! Secure messaging - Encrypted conversations with deniability

mod conversation;
mod error;
pub mod message;

pub use conversation::Conversation;
pub use error::SessionError;
pub use message::{ContentType, Message};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_message_encrypt_decrypt() {
        let encryption_key = [0x42; 32];
        let signing_key = [0x43; 32];
        let sequence = 1;
        let timestamp = 1698123456;
        let plaintext = b"Hello, world!";

        let message = Message::encrypt(
            sequence,
            timestamp,
            ContentType::Text,
            plaintext,
            &encryption_key,
            &signing_key,
        );

        assert_eq!(message.sequence, sequence);
        assert_eq!(message.timestamp, timestamp);
        assert_eq!(message.content_type, ContentType::Text as u8);
        assert_ne!(message.payload, plaintext);

        let decrypted = message.decrypt(&encryption_key, &signing_key).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_message_forgery() {
        let encryption_key = [0x42; 32];
        let signing_key = [0x43; 32];
        let sequence = 5;
        let timestamp = 1698123500;

        let original_text = b"I agree to the terms";
        let original_message = Message::encrypt(
            sequence,
            timestamp,
            ContentType::Text,
            original_text,
            &encryption_key,
            &signing_key,
        );

        let forged_text = b"I disagree completely";
        let forged_message = Message::encrypt(
            sequence,
            timestamp,
            ContentType::Text,
            forged_text,
            &encryption_key,
            &signing_key,
        );

        assert_eq!(original_message.sequence, forged_message.sequence);
        assert_eq!(original_message.timestamp, forged_message.timestamp);
        assert_eq!(original_message.content_type, forged_message.content_type);

        assert_ne!(original_message.payload, forged_message.payload);

        let decrypted_original = original_message
            .decrypt(&encryption_key, &signing_key)
            .unwrap();
        let decrypted_forged = forged_message
            .decrypt(&encryption_key, &signing_key)
            .unwrap();

        assert_eq!(decrypted_original, original_text);
        assert_eq!(decrypted_forged, forged_text);
    }

    #[test]
    fn test_hmac_prevents_tampering() {
        let encryption_key = [0x42; 32];
        let signing_key = [0x43; 32];
        let sequence = 1;
        let timestamp = 1698123456;
        let plaintext = b"Original message";

        let mut message = Message::encrypt(
            sequence,
            timestamp,
            ContentType::Text,
            plaintext,
            &encryption_key,
            &signing_key,
        );

        if !message.payload.is_empty() {
            message.payload[0] ^= 0xFF;
        }

        let result = message.decrypt(&encryption_key, &signing_key);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), SessionError::HmacVerificationFailed);
    }

    #[test]
    fn test_hmac_prevents_metadata_tampering() {
        let encryption_key = [0x42; 32];
        let signing_key = [0x43; 32];
        let sequence = 1;
        let timestamp = 1698123456;
        let plaintext = b"Original message";

        let mut message = Message::encrypt(
            sequence,
            timestamp,
            ContentType::Text,
            plaintext,
            &encryption_key,
            &signing_key,
        );

        message.sequence = 999;

        let result = message.decrypt(&encryption_key, &signing_key);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), SessionError::HmacVerificationFailed);
    }

    #[test]
    fn test_conversation_created_at() {
        let shared_secret = b"test-shared-secret-data";
        let address = "test.onion";

        let before = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let conversation = Conversation::new(shared_secret, address);

        let after = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let created_at = conversation.created_at();

        // Verify the timestamp is reasonable (within a few seconds of creation)
        assert!(created_at >= before);
        assert!(created_at <= after);
    }
}
