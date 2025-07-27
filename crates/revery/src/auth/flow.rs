use bincode::{Decode, Encode};
use blake3::Hasher;
use spake2::{Ed25519Group, Identity, Password, Spake2};

use crate::auth::{AuthError, SessionKeys};

/// Defines which role a party plays in the SPAKE2 key exchange
#[derive(Clone, Copy)]
pub enum SessionRole {
    /// Session creator (hosts onion service) - SPAKE2 party B
    Creator,
    /// Session joiner (connects to service) - SPAKE2 party A
    Joiner,
}

/// Internal state for SPAKE2 key exchange
struct State {
    spake2: Spake2<Ed25519Group>,
    exchange_message: Vec<u8>,
}

impl State {
    /// Starts SPAKE2 key exchange based on session role
    fn initiate(role: SessionRole, password: &str) -> Self {
        match role {
            SessionRole::Creator => {
                // Host acts as SPAKE2 party B
                let (s, message) = Spake2::<Ed25519Group>::start_b(
                    &Password::new(password),
                    &Identity::new(b"revery-joiner"),
                    &Identity::new(b"revery-creator"),
                );

                Self {
                    spake2: s,
                    exchange_message: message,
                }
            }
            SessionRole::Joiner => {
                // Client acts as SPAKE2 party A
                let (s, message) = Spake2::<Ed25519Group>::start_a(
                    &Password::new(password),
                    &Identity::new(b"revery-joiner"),
                    &Identity::new(b"revery-creator"),
                );

                Self {
                    spake2: s,
                    exchange_message: message,
                }
            }
        }
    }

    /// Completes SPAKE2 exchange and derives shared secret
    fn finish(self, message: &[u8]) -> Result<Vec<u8>, AuthError> {
        let key = self.spake2.finish(message)?;

        Ok(key)
    }
}

/// Manages the authentication flow between two parties using SPAKE2
pub struct AuthFlow {
    state: Option<State>,
}

#[derive(Encode, Decode)]
pub struct AuthMessage {
    pub exchange_message: Vec<u8>,
}

#[derive(Encode, Decode)]
pub struct AuthVerification {
    pub challenge_hash: Vec<u8>,
}

impl AuthFlow {
    /// Creates a new authentication flow for the given role and password
    pub fn new(role: SessionRole, password: &str) -> Self {
        let state = State::initiate(role, password);

        AuthFlow { state: Some(state) }
    }

    /// Returns our SPAKE2 exchange message to send to the peer
    pub fn our_message(&self) -> AuthMessage {
        let state = self.state.as_ref().expect("AuthFlow already consumed");

        AuthMessage {
            exchange_message: state.exchange_message.clone(),
        }
    }

    /// Completes authentication using the peer's message and returns shared secret
    pub fn authenticate(mut self, peer_message: &AuthMessage) -> Result<Vec<u8>, AuthError> {
        let state = self.state.take().ok_or(AuthError::InvalidState)?;
        let output = state.finish(&peer_message.exchange_message)?;

        Ok(output)
    }

    /// Generates a challenge hash to verify both parties derived the same keys
    pub fn generate_challenge(
        shared_secret: &[u8],
        address: &str,
        timestamp: u64,
    ) -> AuthVerification {
        let keys = SessionKeys::derive(shared_secret, address, timestamp);
        let mut hasher = Hasher::new();
        hasher.update(b"revery-auth-challenge");
        hasher.update(&keys.auth_key);

        let challenge_hash = hasher.finalize().as_bytes().to_vec();

        AuthVerification { challenge_hash }
    }

    /// Verifies the peer's challenge hash matches our expected value
    pub fn verify_challenge(
        shared_secret: &[u8],
        address: &str,
        timestamp: u64,
        peer_verification: &AuthVerification,
    ) -> Result<(), AuthError> {
        let expected = Self::generate_challenge(shared_secret, address, timestamp);

        if expected.challenge_hash != peer_verification.challenge_hash {
            return Err(AuthError::InvalidState);
        }

        Ok(())
    }
}
