//! Runtime cache for upstream Kiro model discovery.

use std::collections::{HashMap, HashSet};
use std::sync::OnceLock;

use parking_lot::RwLock;
use serde::Serialize;

use crate::kiro::model::available_models::UpstreamModel;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelCacheSnapshot {
    pub cached_at: Option<i64>,
    pub models: Vec<UpstreamModel>,
    pub accounts: HashMap<u64, Vec<String>>,
}

#[derive(Debug, Default)]
struct ModelCache {
    cached_at: Option<i64>,
    models: Vec<UpstreamModel>,
    account_models: HashMap<u64, Vec<String>>,
}

static MODEL_CACHE: OnceLock<RwLock<ModelCache>> = OnceLock::new();

fn cache() -> &'static RwLock<ModelCache> {
    MODEL_CACHE.get_or_init(|| RwLock::new(ModelCache::default()))
}

pub fn snapshot() -> ModelCacheSnapshot {
    let cache = cache().read();
    ModelCacheSnapshot {
        cached_at: cache.cached_at,
        models: cache.models.clone(),
        accounts: cache.account_models.clone(),
    }
}

pub fn get_models() -> Vec<UpstreamModel> {
    cache().read().models.clone()
}

pub fn set_account_models(account_id: u64, models: Vec<UpstreamModel>) {
    let mut cache = cache().write();
    cache.account_models.insert(
        account_id,
        models.iter().map(|model| model.model_id.clone()).collect(),
    );
    cache.models = merge_unique(cache.models.clone(), models);
    cache.cached_at = Some(chrono::Utc::now().timestamp());
}

pub fn replace_all(account_models: HashMap<u64, Vec<UpstreamModel>>) {
    let mut aggregate = Vec::new();
    let mut compact = HashMap::new();
    for (account_id, models) in account_models {
        compact.insert(
            account_id,
            models.iter().map(|model| model.model_id.clone()).collect(),
        );
        aggregate = merge_unique(aggregate, models);
    }

    let mut cache = cache().write();
    cache.models = aggregate;
    cache.account_models = compact;
    cache.cached_at = Some(chrono::Utc::now().timestamp());
}

pub fn map_model(requested_model: &str) -> Option<String> {
    let cache = cache().read();
    cache
        .models
        .iter()
        .find(|model| model_matches(requested_model, &model.model_id))
        .map(|model| model.model_id.clone())
}

pub fn context_window_for(requested_model: &str) -> Option<i32> {
    let cache = cache().read();
    cache.models.iter().find_map(|model| {
        if model_matches(requested_model, &model.model_id) {
            model
                .token_limits
                .as_ref()
                .and_then(|limits| limits.max_input_tokens)
                .and_then(|tokens| i32::try_from(tokens).ok())
                .filter(|tokens| *tokens > 0)
        } else {
            None
        }
    })
}

fn merge_unique(mut existing: Vec<UpstreamModel>, incoming: Vec<UpstreamModel>) -> Vec<UpstreamModel> {
    let mut seen: HashSet<String> = existing.iter().map(|model| model.model_id.clone()).collect();
    for model in incoming {
        if seen.insert(model.model_id.clone()) {
            existing.push(model);
        }
    }
    existing
}

fn model_matches(requested_model: &str, upstream_model_id: &str) -> bool {
    let requested = normalize_model_id(requested_model);
    let upstream = normalize_model_id(upstream_model_id);
    !requested.is_empty()
        && !upstream.is_empty()
        && (requested == upstream || requested.starts_with(&upstream) || upstream.starts_with(&requested))
}

fn normalize_model_id(model: &str) -> String {
    let lower = model.to_ascii_lowercase();
    let without_thinking = lower.strip_suffix("-thinking").unwrap_or(&lower);
    without_thinking
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect()
}
