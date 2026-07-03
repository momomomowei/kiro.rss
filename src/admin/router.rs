//! Admin API 路由配置

use axum::{
    Router, middleware,
    routing::{delete, get, post},
};

use super::{
    handlers::{
        add_credential, add_proxy, check_all_proxies, check_proxy, clear_request_details,
        delete_credential, delete_proxy, force_refresh_token,
        get_admin_keys, get_all_credentials, get_credential_balance, get_credential_models,
        get_kv_cache_config, get_load_balancing_mode, get_model_cache, get_models_config, get_proxy_pool,
        get_request_details, refresh_all_models, refresh_credential_models,
        reset_failure_count, restart_service, set_credential_disabled, set_credential_overage,
        set_credential_priority, set_kv_cache_config, set_load_balancing_mode, set_models_config,
        update_credential,
    },
    middleware::{AdminState, admin_auth_middleware},
};

/// 创建 Admin API 路由
///
/// # 端点
/// - `GET /credentials` - 获取所有凭据状态
/// - `POST /credentials` - 添加新凭据
/// - `DELETE /credentials/:id` - 删除凭据
/// - `POST /credentials/:id/disabled` - 设置凭据禁用状态
/// - `POST /credentials/:id/priority` - 设置凭据优先级
/// - `POST /credentials/:id/reset` - 重置失败计数
/// - `POST /credentials/:id/refresh` - 强制刷新 Token
/// - `GET /credentials/:id/balance` - 获取凭据余额
/// - `GET /details` - 获取请求明细
/// - `DELETE /details` - 清空请求明细
/// - `GET /config/load-balancing` - 获取负载均衡模式
/// - `PUT /config/load-balancing` - 设置负载均衡模式
///
/// # 认证
/// 需要 Admin API Key 认证，支持：
/// - `x-api-key` header
/// - `Authorization: Bearer <token>` header
pub fn create_admin_router(state: AdminState) -> Router {
    Router::new()
        .route(
            "/credentials",
            get(get_all_credentials).post(add_credential),
        )
        .route(
            "/credentials/{id}",
            delete(delete_credential).patch(update_credential),
        )
        .route("/credentials/{id}/disabled", post(set_credential_disabled))
        .route("/credentials/{id}/priority", post(set_credential_priority))
        .route("/credentials/{id}/reset", post(reset_failure_count))
        .route("/credentials/{id}/refresh", post(force_refresh_token))
        .route("/credentials/{id}/balance", get(get_credential_balance))
        .route("/credentials/{id}/models", get(get_credential_models))
        .route("/credentials/{id}/models/refresh", post(refresh_credential_models))
        .route("/model-cache", get(get_model_cache))
        .route("/model-cache/refresh", post(refresh_all_models))
        .route("/credentials/{id}/overage", post(set_credential_overage))
        .route("/proxy-pool", get(get_proxy_pool).post(add_proxy))
        .route("/proxy-pool/check-all", post(check_all_proxies))
        .route("/proxy-pool/{id}/check", post(check_proxy))
        .route("/proxy-pool/{id}", delete(delete_proxy))
        .route("/keys", get(get_admin_keys))
        .route("/details", get(get_request_details).delete(clear_request_details))
        .route(
            "/config/load-balancing",
            get(get_load_balancing_mode).put(set_load_balancing_mode),
        )
        .route(
            "/config/kv-cache",
            get(get_kv_cache_config).put(set_kv_cache_config),
        )
        .route(
            "/config/models",
            get(get_models_config).put(set_models_config),
        )
        .route("/restart", post(restart_service))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            admin_auth_middleware,
        ))
        .with_state(state)
}
