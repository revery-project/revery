//! Tor onion service integration for Revery messaging
//!
//! This crate provides high-level interfaces for creating Tor onion services
//! and connecting to them as clients. It abstracts the complexity of Tor
//! integration while providing the anonymity and NAT traversal capabilities
//! needed for secure messaging.
//!
//! # Examples
//!
//! Creating an onion service:
//! ```no_run
//! use revery_onion::OnionService;
//!
//! async fn host_example() -> Result<(), Box<dyn std::error::Error>> {
//!     let mut service = OnionService::new().await?;
//!     let address = service.onion_address().unwrap();
//!     println!("Service available at: {}", address);
//!
//!     let stream = service.accept_connection().await?;
//!     // Use stream for Revery messaging...
//!     Ok(())
//! }
//! ```
//!
//! Connecting to an onion service:
//! ```no_run
//! use revery_onion::OnionClient;
//!
//! async fn client_example() -> Result<(), Box<dyn std::error::Error>> {
//!     let client = OnionClient::new().await?;
//!     let stream = client.connect("example.onion", 80).await?;
//!     // Use stream for Revery messaging...
//!     Ok(())
//! }
//! ```

mod client;
mod error;
mod service;

pub use client::OnionClient;
pub use error::OnionError;
pub use service::OnionService;

pub use tor_proto::stream::DataStream;
