//! Wire protocol utilities for Revery messaging

mod error;
mod wire;

pub use error::WireError;
pub use wire::{MessageType, WireProtocol};

/// Maximum message size (10MB) - for JPEG/PNG images
const MAX_MESSAGE_SIZE: usize = 10 * 1024 * 1024;

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        auth::{AuthMessage, AuthVerification},
        session::ContentType,
    };

    use tokio::net::{TcpListener, TcpStream};

    async fn create_test_connection() -> (WireProtocol<TcpStream>, WireProtocol<TcpStream>) {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        let client_stream = TcpStream::connect(addr).await.unwrap();
        let (server_stream, _) = listener.accept().await.unwrap();

        (
            WireProtocol::new(client_stream),
            WireProtocol::new(server_stream),
        )
    }

    #[tokio::test]
    async fn test_auth_message_roundtrip() {
        let (mut client, mut server) = create_test_connection().await;

        let auth_msg = AuthMessage {
            exchange_message: vec![1, 2, 3, 4, 5],
        };

        client.send_auth_message(&auth_msg).await.unwrap();

        let received = server.receive_auth_message().await.unwrap();
        assert_eq!(auth_msg.exchange_message, received.exchange_message);
    }

    #[tokio::test]
    async fn test_auth_verification_roundtrip() {
        let (mut client, mut server) = create_test_connection().await;

        let verification = AuthVerification {
            challenge_hash: vec![1, 2, 3, 4, 5, 6, 7, 8],
        };

        client.send_auth_verification(&verification).await.unwrap();

        let received = server.receive_auth_verification().await.unwrap();
        assert_eq!(verification.challenge_hash, received.challenge_hash);
    }

    #[tokio::test]
    async fn test_text_message_roundtrip() {
        use crate::auth::SessionKeys;

        let (mut client, mut server) = create_test_connection().await;

        let keys = SessionKeys {
            auth_key: [0x01; 32],
            encryption_key: [0x02; 32],
            signing_key: [0x03; 32],
        };

        let client_conv = crate::session::Conversation::from_keys(keys.clone());
        let server_conv = crate::session::Conversation::from_keys(keys);

        client.set_conversation(client_conv);
        server.set_conversation(server_conv);

        client.send_text_message("Hello, world!").await.unwrap();

        let received = server.receive_chat_message().await.unwrap();
        assert_eq!(
            received,
            ("Hello, world!".as_bytes().to_vec(), ContentType::Text as u8)
        );
    }
}
