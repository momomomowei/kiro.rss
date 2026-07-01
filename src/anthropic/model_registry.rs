//! 全局模型注册表
//!
//! 提供运行时可热更新的模型映射表。admin 后台修改模型配置后调用 [`set_models`]，
//! anthropic 端的映射查询走 [`get_models`] / [`find_model`]，立即生效无需重启。
//!
//! 设计与 `kv_cache` 的全局配置状态保持一致（`OnceLock` + `parking_lot` 锁）。

use std::sync::OnceLock;

use parking_lot::RwLock;

use crate::model::config::ModelEntry;

static MODEL_REGISTRY: OnceLock<RwLock<Vec<ModelEntry>>> = OnceLock::new();

fn registry() -> &'static RwLock<Vec<ModelEntry>> {
    MODEL_REGISTRY.get_or_init(|| RwLock::new(Vec::new()))
}

/// 覆盖写入模型注册表（热更新，可多次调用）
pub fn set_models(models: Vec<ModelEntry>) {
    *registry().write() = models;
}

/// 读取模型注册表快照
pub fn get_models() -> Vec<ModelEntry> {
    registry().read().clone()
}
