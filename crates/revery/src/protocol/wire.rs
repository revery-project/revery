use bincode::{Decode, Encode};
use std::time::Duration;
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt};

use crate::{
    auth::{AuthMessage, AuthVerification},
    protocol::{MAX_MESSAGE_SIZE, WireError},
    session::{Conversation, Message},
};

/// Message types used in the Revery wire protocol
#[repr(u8)]
#[derive(Debug, Clone, Copy)]
pub enum MessageType {
    Auth = 0x01,
    AuthVerification = 0x02,
    Chat = 0x03,
    Timestamp = 0x04,
}

impl TryFrom<u8> for MessageType {
    type Error = WireError;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            0x01 => Ok(MessageType::Auth),
            0x02 => Ok(MessageType::AuthVerification),
            0x03 => Ok(MessageType::Chat),
            0x04 => Ok(MessageType::Timestamp),
            _ => Err(WireError::InvalidFormat),
        }
    }
}

/// Wire protocol handler for Revery messaging over any stream
///
/// Handles message framing, serialization, and encryption for Revery conversations.
/// Works with any stream that implements AsyncRead + AsyncWrite (TCP, Tor streams, etc.)
pub struct WireProtocol<S> {
    stream: S,
    conversation: Option<Conversation>,
    timeout: Duration,
}

impl<S> WireProtocol<S>
where
    S: AsyncRead + AsyncWrite + Unpin,
{
    /// Creates a new wire protocol handler for the given stream
    pub fn new(stream: S) -> Self {
        Self {
            stream,
            conversation: None,
            timeout: Duration::from_secs(30), // Default 30 second timeout
        }
    }

    /// Creates a new wire protocol handler with custom timeout
    pub fn with_timeout(stream: S, timeout: Duration) -> Self {
        Self {
            stream,
            conversation: None,
            timeout,
        }
    }

    /// Sets the conversation context for encrypting/decrypting messages
    pub fn set_conversation(&mut self, conversation: Conversation) {
        self.conversation = Some(conversation);
    }

    /// Sends a bincode-encodable message with the specified type
    async fn send_message<T: Encode>(
        &mut self,
        msg_type: MessageType,
        data: &T,
    ) -> Result<(), WireError> {
        let payload = bincode::encode_to_vec(data, bincode::config::standard())
            .map_err(|_| WireError::InvalidFormat)?;

        self.send_raw_message(msg_type, &payload).await
    }

    /// Receives and decodes a message of the expected type
    async fn receive_message<T: Decode<()>>(
        &mut self,
        expected_type: MessageType,
    ) -> Result<T, WireError> {
        let (msg_type, payload) = self.receive_raw_message().await?;

        if msg_type as u8 != expected_type as u8 {
            return Err(WireError::InvalidFormat);
        }

        bincode::decode_from_slice(&payload, bincode::config::standard())
            .map(|(result, _)| result)
            .map_err(|_| WireError::InvalidFormat)
    }

    /// Sends a SPAKE2 authentication message during the handshake phase
    pub async fn send_auth_message(&mut self, message: &AuthMessage) -> Result<(), WireError> {
        self.send_message(MessageType::Auth, message).await
    }

    /// Receives a SPAKE2 authentication message during the handshake phase
    pub async fn receive_auth_message(&mut self) -> Result<AuthMessage, WireError> {
        self.receive_message(MessageType::Auth).await
    }

    /// Sends an authentication verification message
    pub async fn send_auth_verification(
        &mut self,
        verification: &AuthVerification,
    ) -> Result<(), WireError> {
        self.send_message(MessageType::AuthVerification, verification)
            .await
    }

    /// Receives an authentication verification message
    pub async fn receive_auth_verification(&mut self) -> Result<AuthVerification, WireError> {
        self.receive_message(MessageType::AuthVerification).await
    }

    /// Sends a timestamp for session synchronization
    pub async fn send_timestamp(&mut self, timestamp: u64) -> Result<(), WireError> {
        self.send_message(MessageType::Timestamp, &timestamp).await
    }

    /// Receives a timestamp for session synchronization
    pub async fn receive_timestamp(&mut self) -> Result<u64, WireError> {
        self.receive_message(MessageType::Timestamp).await
    }

    /// Encrypts and sends a text message through the established conversation
    pub async fn send_text_message(&mut self, content: &str) -> Result<(), WireError> {
        let conversation = self.conversation.as_mut().ok_or(WireError::InvalidFormat)?;
        let message = conversation.create_text_message(content);

        self.send_message(MessageType::Chat, &message).await
    }

    /// Encrypts and sends an image message through the established conversation
    pub async fn send_image_message(&mut self, image_data: &[u8]) -> Result<(), WireError> {
        let conversation = self.conversation.as_mut().ok_or(WireError::InvalidFormat)?;
        let message = conversation.create_image_message(image_data);

        self.send_message(MessageType::Chat, &message).await
    }

    /// Receives and decrypts a chat message, returning content and content type
    pub async fn receive_chat_message(&mut self) -> Result<(Vec<u8>, u8), WireError> {
        let message: Message = self.receive_message(MessageType::Chat).await?;
        let conversation = self.conversation.as_ref().ok_or(WireError::InvalidFormat)?;
        let content = conversation.decrypt_message(&message)?;

        Ok((content, message.content_type))
    }

    /// Sends a raw message with type byte, length prefix, and payload
    ///
    /// Wire format: [type:1][length:4][payload:length]
    async fn send_raw_message(
        &mut self,
        msg_type: MessageType,
        payload: &[u8],
    ) -> Result<(), WireError> {
        if payload.len() > MAX_MESSAGE_SIZE {
            return Err(WireError::MessageTooLarge(payload.len()));
        }

        // Send with timeout
        let send_timeout = if payload.len() > 1024 * 1024 {
            self.timeout * 3 // 3x timeout for large messages
        } else {
            self.timeout
        };

        let type_bytes = [msg_type as u8];
        match tokio::time::timeout(send_timeout, self.stream.write_all(&type_bytes)).await {
            Ok(Ok(())) => {}
            Ok(Err(e)) => return Err(WireError::Io(e)),
            Err(_) => return Err(WireError::ConnectionClosed),
        }

        let len_bytes = (payload.len() as u32).to_le_bytes();
        match tokio::time::timeout(send_timeout, self.stream.write_all(&len_bytes)).await {
            Ok(Ok(())) => {}
            Ok(Err(e)) => return Err(WireError::Io(e)),
            Err(_) => return Err(WireError::ConnectionClosed),
        }

        match tokio::time::timeout(send_timeout, self.stream.write_all(payload)).await {
            Ok(Ok(())) => {}
            Ok(Err(e)) => return Err(WireError::Io(e)),
            Err(_) => return Err(WireError::ConnectionClosed),
        }

        match tokio::time::timeout(self.timeout, self.stream.flush()).await {
            Ok(Ok(())) => {}
            Ok(Err(e)) => return Err(WireError::Io(e)),
            Err(_) => return Err(WireError::ConnectionClosed),
        }

        Ok(())
    }

    /// Receives a raw message and parses the wire format with timeout
    ///
    /// Wire format: [type:1][length:4][payload:length]
    async fn receive_raw_message(&mut self) -> Result<(MessageType, Vec<u8>), WireError> {
        // Read message type with timeout
        let mut type_buf = [0u8; 1];
        match tokio::time::timeout(self.timeout, self.stream.read_exact(&mut type_buf)).await {
            Ok(Ok(_)) => {}
            Ok(Err(e)) => return Err(WireError::Io(e)),
            Err(_) => return Err(WireError::ConnectionClosed),
        }
        let msg_type = MessageType::try_from(type_buf[0])?;

        // Read length with timeout
        let mut len_buf = [0u8; 4];
        match tokio::time::timeout(self.timeout, self.stream.read_exact(&mut len_buf)).await {
            Ok(Ok(_)) => {}
            Ok(Err(e)) => return Err(WireError::Io(e)),
            Err(_) => return Err(WireError::ConnectionClosed),
        }
        let payload_len = u32::from_le_bytes(len_buf) as usize;

        if payload_len > MAX_MESSAGE_SIZE {
            return Err(WireError::MessageTooLarge(payload_len));
        }

        // Read payload with timeout (longer for large messages)
        let read_timeout = if payload_len > 1024 * 1024 {
            self.timeout * 3 // 3x timeout for large messages
        } else {
            self.timeout
        };

        let mut payload = vec![0u8; payload_len];
        match tokio::time::timeout(read_timeout, self.stream.read_exact(&mut payload)).await {
            Ok(Ok(_)) => {}
            Ok(Err(e)) => return Err(WireError::Io(e)),
            Err(_) => return Err(WireError::ConnectionClosed),
        }

        Ok((msg_type, payload))
    }

    pub fn stream(&self) -> &S {
        &self.stream
    }

    pub fn into_stream(self) -> S {
        self.stream
    }
}
