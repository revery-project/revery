use arti_client::{TorClient, TorClientConfig};
use tor_proto::stream::DataStream;
use tor_rtcompat::PreferredRuntime;

use crate::OnionError;

/// Tor onion service client for connecting to hidden services
///
/// Provides a high-level interface for establishing connections to .onion addresses
/// through the Tor network, handling bootstrapping and connection management.
pub struct OnionClient {
    client: TorClient<PreferredRuntime>,
}

impl OnionClient {
    /// Creates a new Tor client and bootstraps connection to the Tor network
    pub async fn new() -> Result<Self, OnionError> {
        let client = TorClient::create_bootstrapped(TorClientConfig::default())
            .await
            .map_err(|e| OnionError::TorClientFailed(e.to_string()))?;

        Ok(OnionClient { client })
    }

    /// Connects to a Tor onion service at the specified address and port
    pub async fn connect(&self, onion_address: &str, port: u16) -> Result<DataStream, OnionError> {
        let target = (onion_address, port);

        let stream = self
            .client
            .connect(target)
            .await
            .map_err(|e| OnionError::ConnectionFailed(format!("Tor connection failed: {e}")))?;

        Ok(stream)
    }

    pub async fn bootstrap(&self) -> Result<(), OnionError> {
        self.client
            .bootstrap()
            .await
            .map_err(|e| OnionError::TorClientFailed(format!("Bootstrap failed: {e}")))
    }

    /// Returns whether the Tor client is ready for traffic
    pub fn is_bootstrapped(&self) -> bool {
        self.client.bootstrap_status().ready_for_traffic()
    }
}
