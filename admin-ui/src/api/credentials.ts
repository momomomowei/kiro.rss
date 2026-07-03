import axios from 'axios'
import { storage } from '@/lib/storage'
import type {
  CredentialsStatusResponse,
  BalanceResponse,
  SuccessResponse,
  SetDisabledRequest,
  SetPriorityRequest,
  AddCredentialRequest,
  AddCredentialResponse,
  RequestDetailsResponse,
  AvailableModelsResponse,
  ModelCacheResponse,
  UpdateCredentialRequest,
  AdminKeysResponse,
  SetOverageRequest,
  ProxyPoolResponse,
  ProxyPoolEntry,
  AddProxyRequest,
  ProxyCheckResponse,
  ProxyCheckAllResponse,
} from '@/types/api'

// 创建 axios 实例
const api = axios.create({
  baseURL: '/api/admin',
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器添加 API Key
api.interceptors.request.use((config) => {
  const apiKey = storage.getApiKey()
  if (apiKey) {
    config.headers['x-api-key'] = apiKey
  }
  return config
})

// 获取所有凭据状态
export async function getCredentials(): Promise<CredentialsStatusResponse> {
  const { data } = await api.get<CredentialsStatusResponse>('/credentials')
  return data
}

// 设置凭据禁用状态
export async function setCredentialDisabled(
  id: number,
  disabled: boolean
): Promise<SuccessResponse> {
  const { data } = await api.post<SuccessResponse>(
    `/credentials/${id}/disabled`,
    { disabled } as SetDisabledRequest
  )
  return data
}

// 设置凭据优先级
export async function setCredentialPriority(
  id: number,
  priority: number
): Promise<SuccessResponse> {
  const { data } = await api.post<SuccessResponse>(
    `/credentials/${id}/priority`,
    { priority } as SetPriorityRequest
  )
  return data
}

// 重置失败计数
export async function resetCredentialFailure(
  id: number
): Promise<SuccessResponse> {
  const { data } = await api.post<SuccessResponse>(`/credentials/${id}/reset`)
  return data
}

// 强制刷新 Token
export async function forceRefreshToken(
  id: number
): Promise<SuccessResponse> {
  const { data } = await api.post<SuccessResponse>(`/credentials/${id}/refresh`)
  return data
}

// 获取凭据余额
export async function getCredentialBalance(id: number, force = false): Promise<BalanceResponse> {
  const { data } = await api.get<BalanceResponse>(`/credentials/${id}/balance`, {
    params: force ? { force: true } : undefined,
  })
  return data
}

export async function getCredentialModels(id: number): Promise<AvailableModelsResponse> {
  const { data } = await api.get<AvailableModelsResponse>(`/credentials/${id}/models`)
  return data
}

export async function getModelCache(): Promise<ModelCacheResponse> {
  const { data } = await api.get<ModelCacheResponse>('/model-cache')
  return data
}

// 添加新凭据
export async function addCredential(
  req: AddCredentialRequest
): Promise<AddCredentialResponse> {
  const { data } = await api.post<AddCredentialResponse>('/credentials', req)
  return data
}

// 删除凭据
export async function deleteCredential(id: number): Promise<SuccessResponse> {
  const { data } = await api.delete<SuccessResponse>(`/credentials/${id}`)
  return data
}

// 获取负载均衡模式
export async function getLoadBalancingMode(): Promise<{ mode: 'priority' | 'balanced' }> {
  const { data } = await api.get<{ mode: 'priority' | 'balanced' }>('/config/load-balancing')
  return data
}

// 设置负载均衡模式
export async function setLoadBalancingMode(mode: 'priority' | 'balanced'): Promise<{ mode: 'priority' | 'balanced' }> {
  const { data } = await api.put<{ mode: 'priority' | 'balanced' }>('/config/load-balancing', { mode })
  return data
}

// KV 缓存配置
export interface KvCacheConfig {
  cacheReadEfficiency: number
  kvCacheTtlSecs: number
  requestDetailsRetentionDays: number
}

// 获取 KV 缓存配置
export async function getKvCacheConfig(): Promise<KvCacheConfig> {
  const { data } = await api.get<KvCacheConfig>('/config/kv-cache')
  return data
}

// 设置 KV 缓存配置
export async function setKvCacheConfig(config: Partial<KvCacheConfig>): Promise<KvCacheConfig> {
  const { data } = await api.put<KvCacheConfig>('/config/kv-cache', config)
  return data
}

// 模型配置
export interface ModelEntry {
  id: string
  displayName: string
  kiroModelId: string
  contextWindow: number
  maxTokens: number
  matchKeywords: string[]
  created: number
}

export interface ModelsConfig {
  models: ModelEntry[]
}

export interface RefreshModelCacheResponse {
  success: boolean
  refreshed: number
  failed: number
  count: number
}

// 获取模型配置
export async function getModelsConfig(): Promise<ModelsConfig> {
  const { data } = await api.get<ModelsConfig>('/config/models')
  return data
}

// 设置模型配置（保存即热更新生效）
export async function setModelsConfig(models: ModelEntry[]): Promise<ModelsConfig> {
  const { data } = await api.put<ModelsConfig>('/config/models', { models })
  return data
}

export async function refreshModelCache(): Promise<RefreshModelCacheResponse> {
  const { data } = await api.post<RefreshModelCacheResponse>('/model-cache/refresh')
  return data
}

// 重启服务（进程退出，由容器 restart 策略拉起）
export async function restartService(): Promise<{ success: boolean; message: string }> {
  const { data } = await api.post<{ success: boolean; message: string }>('/restart')
  return data
}


// 获取请求明细
export async function getRequestDetails(limit?: number, retentionDays?: number): Promise<RequestDetailsResponse> {
  const params = {
    ...(limit ? { limit } : {}),
    ...(retentionDays ? { retentionDays } : {}),
  }
  const { data } = await api.get<RequestDetailsResponse>('/details', { params })
  return data
}

// 清空请求明细
export async function clearRequestDetails(): Promise<SuccessResponse> {
  const { data } = await api.delete<SuccessResponse>('/details')
  return data
}

// 更新凭据（PATCH）
export async function updateCredential(
  id: number,
  req: UpdateCredentialRequest
): Promise<SuccessResponse> {
  const { data } = await api.patch<SuccessResponse>(`/credentials/${id}`, req)
  return data
}

// 设置凭据超额开关
export async function setCredentialOverage(
  id: number,
  enabled: boolean
): Promise<SuccessResponse> {
  const { data } = await api.post<SuccessResponse>(
    `/credentials/${id}/overage`,
    { enabled } as SetOverageRequest
  )
  return data
}

// 获取 Admin Keys 信息
export async function getAdminKeys(): Promise<AdminKeysResponse> {
  const { data } = await api.get<AdminKeysResponse>('/keys')
  return data
}

export async function getProxyPool(): Promise<ProxyPoolResponse> {
  const { data } = await api.get<ProxyPoolResponse>('/proxy-pool')
  return data
}

export async function addProxy(req: AddProxyRequest): Promise<ProxyPoolEntry> {
  const { data } = await api.post<ProxyPoolEntry>('/proxy-pool', req)
  return data
}

export async function deleteProxy(id: number): Promise<SuccessResponse> {
  const { data } = await api.delete<SuccessResponse>(`/proxy-pool/${id}`)
  return data
}

export async function checkProxy(id: number): Promise<ProxyCheckResponse> {
  const { data } = await api.post<ProxyCheckResponse>(`/proxy-pool/${id}/check`)
  return data
}

export async function checkAllProxies(): Promise<ProxyCheckAllResponse> {
  const { data } = await api.post<ProxyCheckAllResponse>('/proxy-pool/check-all')
  return data
}
