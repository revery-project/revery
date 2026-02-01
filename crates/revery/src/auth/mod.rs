//! Authentication module - SPAKE2 password-based key exchange

mod error;
mod flow;
mod keys;

pub use error::AuthError;
pub use flow::{AuthFlow, AuthMessage, AuthVerification, SessionRole};
pub use keys::SessionKeys;

#[cfg(test)]
mod tests {
    use super::*;
    use zeroize::Zeroize;

    #[test]
    fn test_successful_authentication() {
        let creator = AuthFlow::new(SessionRole::Creator, "secret");
        let joiner = AuthFlow::new(SessionRole::Joiner, "secret");

        let creator_message = creator.our_message();
        let joiner_message = joiner.our_message();

        let creator_shared_secret = creator.authenticate(&joiner_message).unwrap();
        let joiner_shared_secret = joiner.authenticate(&creator_message).unwrap();

        // Both should produce the same shared secret
        assert_eq!(creator_shared_secret, joiner_shared_secret);

        // Derive keys to verify they match
        let creator_keys = SessionKeys::derive(&creator_shared_secret, "test.onion", 1234567890);
        let joiner_keys = SessionKeys::derive(&joiner_shared_secret, "test.onion", 1234567890);

        assert_eq!(creator_keys.encryption_key, joiner_keys.encryption_key);
        assert_eq!(creator_keys.auth_key, joiner_keys.auth_key);
    }

    #[test]
    fn test_different_secrets() {
        let creator = AuthFlow::new(SessionRole::Creator, "secret 1");
        let joiner = AuthFlow::new(SessionRole::Joiner, "secret 2");

        let creator_message = creator.our_message();
        let joiner_message = joiner.our_message();

        let creator_shared_secret = creator.authenticate(&joiner_message).unwrap();
        let joiner_shared_secret = joiner.authenticate(&creator_message).unwrap();

        // Different secrets should produce different shared secrets
        assert_ne!(creator_shared_secret, joiner_shared_secret);

        // Derive keys to verify they're different
        let creator_keys = SessionKeys::derive(&creator_shared_secret, "test.onion", 1234567890);
        let joiner_keys = SessionKeys::derive(&joiner_shared_secret, "test.onion", 1234567890);

        assert_ne!(creator_keys.encryption_key, joiner_keys.encryption_key);
        assert_ne!(creator_keys.auth_key, joiner_keys.auth_key);
    }

    #[test]
    fn test_forward_secrecy_different_address() {
        let creator1 = AuthFlow::new(SessionRole::Creator, "secret");
        let joiner1 = AuthFlow::new(SessionRole::Joiner, "secret");

        let joiner_message1 = joiner1.our_message();

        // Different SPAKE2 instances produce different shared secrets even with same secret
        let shared_secret = creator1.authenticate(&joiner_message1).unwrap();

        // But when we use the same shared secret with different addresses, we get different keys
        let keys1 = SessionKeys::derive(&shared_secret, "address1.onion", 1234567890);
        let keys2 = SessionKeys::derive(&shared_secret, "address2.onion", 1234567890);

        assert_ne!(keys1.encryption_key, keys2.encryption_key);
        assert_ne!(keys1.auth_key, keys2.auth_key);
        assert_ne!(keys1.signing_key, keys2.signing_key);
    }

    #[test]
    fn test_forward_secrecy_different_timestamp() {
        let creator1 = AuthFlow::new(SessionRole::Creator, "secret");
        let joiner1 = AuthFlow::new(SessionRole::Joiner, "secret");

        let joiner_message1 = joiner1.our_message();

        // Different SPAKE2 instances produce different shared secrets even with same secret
        let shared_secret = creator1.authenticate(&joiner_message1).unwrap();

        // But when we use the same shared secret with different timestamps, we get different keys
        let keys1 = SessionKeys::derive(&shared_secret, "test.onion", 1234567890);
        let keys2 = SessionKeys::derive(&shared_secret, "test.onion", 1234567899);

        assert_ne!(keys1.encryption_key, keys2.encryption_key);
        assert_ne!(keys1.auth_key, keys2.auth_key);
        assert_ne!(keys1.signing_key, keys2.signing_key);
    }

    #[test]
    fn test_session_keys_zeroize() {
        // Verify SessionKeys properly implements Zeroize via the derive macro
        let mut keys = SessionKeys::derive(b"test-secret", "test.onion", 1234567890);

        // Keys should be non-zero after derivation
        assert_ne!(keys.auth_key, [0u8; 32]);
        assert_ne!(keys.encryption_key, [0u8; 32]);
        assert_ne!(keys.signing_key, [0u8; 32]);

        // Manually zeroize (same behavior as ZeroizeOnDrop on drop)
        keys.zeroize();

        // All keys should now be zeroed
        assert_eq!(keys.auth_key, [0u8; 32]);
        assert_eq!(keys.encryption_key, [0u8; 32]);
        assert_eq!(keys.signing_key, [0u8; 32]);
    }
}
