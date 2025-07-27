# Revery Protocol (RYP), v0.0.0

## 1. Overview & Goals

RYP enables secure and deniable communication for activists, journalists, etc. It optimizes for plausible deniability in worst case scenarios of coercion or device seizure. Unlike traditional secure messaging, conversations work like spoken words: they happen, then they're gone.

The approach is peer-to-peer messaging with no persistence — in identity or messages. Messages are encrypted and transported over temporary Tor onion services authenticated by a shared secret.

## 2. Threat Model

RYP protects against after-conversation seizure and coercion to reveal content. It doesn't protect against message tampering — that's actually a feature for deniability since the protocol enables forging messages after the fact.

Assumes the shared secret is exchanged securely (in person, existing secure channel, etc).

## 3. Technical Specs

### 3.1 Crypto Primitives

- **Key Exchange**: SPAKE2 over Ed25519
- **Key Derivation**: BLAKE3 with domain separation
- **Encryption**: ChaCha20
- **Authentication**: HMAC-SHA256
- **Serialization**: bincode

### 3.2 Constants

```
MAX_MESSAGE_SIZE = 10MB
PROTOCOL_VERSION = "revery-v0"
SPAKE2_IDENTITY_A = "revery-joiner"
SPAKE2_IDENTITY_B = "revery-creator"
AUTH_CHALLENGE = "revery-auth-challenge"
```

### 3.3 Key Derivation

From SPAKE2 shared secret `K`:

```
base = BLAKE3(PROTOCOL_VERSION || K || address || timestamp)
auth_key = BLAKE3(base || "authentication")
encryption_key = BLAKE3(base || "encryption")
signing_key = BLAKE3(base || "signing")
```

Where:

- `address` is the transport address (e.g., `.onion` address)
- `timestamp` is the session establishment time (Unix seconds, 8 bytes LE)

This provides per-conversation forward secrecy even when the same shared secret is reused across multiple sessions.

## 4. Wire Protocol

### 4.1 Message Format

```
┌──────────┬───────────────┬────────────────┐
│ type(u8) │ length(u32le) │ payload(bytes) │
├──────────┼───────────────┼────────────────┤
│    1     │       4       │    variable    │
└──────────┴───────────────┴────────────────┘

Total message size = 1 + 4 + payload_length
Maximum total size = 5MB
```

### 4.2 Message Types

```
0x01 = Auth (SPAKE2 exchange)
0x02 = AuthVerification (challenge/response)
0x03 = Chat (encrypted message)
```

### 4.3 Content Types

```
0x00 = Text (UTF-8 string)
0x01 = Image (JPEG, PNG)
```

### 4.4 Structures

**Auth Message**:

```rust
struct AuthMessage {
    exchange_message: Vec<u8>  // SPAKE2 data
}
```

**Chat Message**:

```rust
struct Message {
    sequence: u64,
    timestamp: u32,   // Unix seconds
    content_type: u8, // 0 = text
    payload: Vec<u8>, // ChaCha20 encrypted
    hmac: [u8; 32]    // HMAC-SHA256
}
```

**Auth Verification**:

```rust
struct AuthVerification {
    challenge_hash: Vec<u8>
}
```

## 5. Protocol Flow

### 5.1 Setup (Host)

1. Create Tor hidden service with random nickname
2. Initialize SPAKE2 as party B with shared secret
3. Share `.onion` address with peer

### 5.2 Connection (Joiner)

1. Connect to onion address through Tor
2. Initialize SPAKE2 as party A with shared secret

### 5.3 Authentication

1. **SPAKE2 Exchange**:

```
Joiner → Host: [0x01][msg_len][spake2_msg_1]
Host → Joiner: [0x01][msg_len][spake2_msg_2]
Both parties derive session keys from SPAKE2 output
```

2. **Challenge Verification**:

```
challenge = BLAKE3(AUTH_CHALLENGE || auth_key)
Host → Joiner: [0x02][hash_len][challenge]
Joiner → Host: [0x02][hash_len][challenge]  // Echo back same value
```

### 5.4 Message Encryption

**Nonce**: Built from sequence + timestamp:

```rust
nonce[0:8] = sequence.to_le_bytes();
nonce[8:12] = timestamp.to_le_bytes();
// Remaining 4 bytes are zero-padded
```

**Process**:

1. Build nonce from sequence/timestamp
2. Encrypt with ChaCha20(encryption_key, nonce)
3. Compute HMAC over: `sequence || timestamp || content_type || payload`
4. Send message with HMAC attached

**Chat Message Wire Format**:

```
[0x02][msg_len][sequence][timestamp][content_type][encrypted_payload][hmac]
```

### 5.5 Decryption

1. Parse message structure
2. Verify HMAC over sequence
3. Rebuild nonce from sequence/timestamp
4. Decrypt with `ChaCha20(encryption_key, nonce)`
5. Process content based on content_type

## 6. Deniability

### 6.1 Message Forgery

The deterministic nonce lets anyone with the keys create alternative messages using the same sequence/timestamp that decrypt to different content. Both real and forged messages are cryptographically identical.

### 6.2 No Persistent Identity

- Ephemeral onion addresses
- No long-term keys
- Service shuts down after conversation

### 6.3 No Message History

- Nothing stored to disk
- Keys wiped from memory
- No conversation logs

## 7. Security Notes

### 7.1 Forward Secrecy

Provides per-conversation forward secrecy when the same shared secret is reused. Each conversation derives unique session keys by including the transport address and session timestamp in the base derivation. If session keys leak, only that specific conversation can be decrypted. The forgery capability provides additional protection — you can't prove which messages are real.

### 7.2 Replay Protection

Basic sequence numbers prevent replay within a session, but no cross-session protection (by design).

### 7.3 Traffic Analysis

Communication over Tor provides strong anonymity, but no additional padding/timing obfuscation.

## 8. Example Flow

**Host**:

```rust
// 1. Create onion service
let service = OnionService::new().await?;
let address = service.onion_address();

// 2. SPAKE2 auth as party B
let auth = AuthFlow::new(SessionRole::Creator, secret);
// ... exchange messages, derive keys

// 3. Message loop
let conversation = Conversation::new(keys, address);
```

**Joiner**:

```rust
// 1. Connect to onion
let stream = client.connect(address, 80).await?;

// 2. SPAKE2 auth as party A
let auth = AuthFlow::new(SessionRole::Joiner, secret);
// ... exchange messages, derive keys

// 3. Message loop
let conversation = Conversation::new(keys, address);
```

## 9. Limitations

- Shared secret reuse not recommended for maximum security
- Requires operational security for secret sharing

Version 0.0.0 — expect changes during development.
