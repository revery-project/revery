use std::sync::Arc;

use arti_client::{TorClient, TorClientConfig};
use futures::stream::{Stream, StreamExt};
use rand::Rng;
use tor_cell::relaycell::msg::Connected;
use tor_hsservice::{
    HsNickname, RendRequest, RunningOnionService, config::OnionServiceConfigBuilder,
};
use tor_proto::stream::DataStream;
use tor_rtcompat::PreferredRuntime;

use crate::OnionError;

/// Strategy for generating onion service addresses
#[derive(Debug, Default, Clone)]
pub enum OnionAddressStrategy {
    /// Generate a random onion address (default)
    #[default]
    Random,
}

/// Tor onion service host for accepting incoming connections
///
/// Creates and manages a Tor hidden service that can accept connections
/// from onion clients. Handles service creation, address generation,
/// and connection acceptance.
pub struct OnionService {
    onion_address: Option<String>,
    tor_client: Option<TorClient<PreferredRuntime>>,
    running_service: Option<Arc<RunningOnionService>>,
    rend_requests: Option<Box<dyn Stream<Item = RendRequest> + Send + Unpin>>,
    strategy: OnionAddressStrategy,
}

impl OnionService {
    /// Creates a new onion service with the default address strategy
    pub async fn new() -> Result<Self, OnionError> {
        Self::with_strategy(OnionAddressStrategy::default()).await
    }

    /// Creates a new onion service with the specified address generation strategy
    pub async fn with_strategy(strategy: OnionAddressStrategy) -> Result<Self, OnionError> {
        let tor_client = TorClient::create_bootstrapped(TorClientConfig::default())
            .await
            .map_err(|e| OnionError::TorClientFailed(e.to_string()))?;

        let mut rng = rand::rng();
        let random_suffix: u32 = rng.random_range(100000..999999);
        let nickname_str = format!("revery-{random_suffix}");

        let nickname = HsNickname::new(nickname_str)
            .map_err(|e| OnionError::ServiceCreationFailed(format!("Invalid nickname: {e}")))?;

        let hs_config = OnionServiceConfigBuilder::default()
            .nickname(nickname)
            .build()
            .map_err(|e| OnionError::ServiceCreationFailed(format!("Config build failed: {e}")))?;

        let (running_service, rend_stream) = tor_client
            .launch_onion_service(hs_config)
            .map_err(|e| OnionError::ServiceCreationFailed(e.to_string()))?;

        let onion_address = running_service.onion_address().map(|addr| addr.to_string());

        Ok(OnionService {
            onion_address,
            tor_client: Some(tor_client),
            running_service: Some(running_service),
            rend_requests: Some(Box::new(rend_stream)),
            strategy,
        })
    }

    /// Returns the .onion address for this service, if available
    pub fn onion_address(&self) -> Option<&str> {
        self.onion_address.as_deref()
    }

    /// Accepts an incoming connection to this onion service
    ///
    /// Blocks until a client connects to the service, then returns a data stream
    /// for communication. This method handles the Tor rendezvous protocol
    /// and stream establishment automatically.
    pub async fn accept_connection(&mut self) -> Result<DataStream, OnionError> {
        let rend_requests = self.rend_requests.as_mut().ok_or_else(|| {
            OnionError::ServiceCreationFailed("Service not properly initialized".to_string())
        })?;

        let rend_request = rend_requests
            .next()
            .await
            .ok_or_else(|| OnionError::ConnectionFailed("Rendezvous stream ended".to_string()))?;

        let mut stream_requests = rend_request
            .accept()
            .await
            .map_err(|e| OnionError::ConnectionFailed(format!("Failed to accept request: {e}")))?;

        let stream_request = stream_requests.next().await.ok_or_else(|| {
            OnionError::ConnectionFailed("Stream request stream ended".to_string())
        })?;

        let data_stream = stream_request
            .accept(Connected::new_empty())
            .await
            .map_err(|e| OnionError::ConnectionFailed(format!("Failed to accept stream: {e}")))?;

        Ok(data_stream)
    }

    /// Shuts down the onion service and cleans up resources
    pub async fn shutdown(mut self) -> Result<(), OnionError> {
        self.rend_requests = None;

        if let Some(running_service) = self.running_service.take() {
            drop(running_service);
        }

        self.tor_client = None;

        Ok(())
    }

    /// Returns the address generation strategy used by this service
    pub fn strategy(&self) -> &OnionAddressStrategy {
        &self.strategy
    }
}
