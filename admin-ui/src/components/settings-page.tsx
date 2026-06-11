import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Shield,
  RefreshCw,
  Sparkles,
  Timer,
} from 'lucide-react'
import {
  useAdminKeys,
  useKvCacheConfig,
  useSetKvCacheConfig,
} from '@/hooks/use-credentials'
import { extractErrorMessage } from '@/lib/utils'

// ============ 密钥行 ============

interface KeyRowProps {
  title: string
  description: string
  masked: string
  full: string
  icon: React.ReactNode
  badgeText: string
  badgeClass: string
}

function KeyRow({
  title,
  description,
  masked,
  full,
  icon,
  badgeText,
  badgeClass,
}: KeyRowProps) {
  const [revealed, setRevealed] = useState(false)
  const [copying, setCopying] = useState(false)

  const handleCopy = async () => {
    try {
      setCopying(true)
      await navigator.clipboard.writeText(full)
      toast.success('已复制到剪贴板')
    } catch (e) {
      toast.error('复制失败: ' + extractErrorMessage(e))
    } finally {
      setTimeout(() => setCopying(false), 600)
    }
  }

  return (
    <Card className="glass-card shadow-apple-sm">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {icon}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold tracking-tight truncate">
                {title}
              </h3>
              <p className="text-[12px] text-muted-foreground truncate">
                {description}
              </p>
            </div>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
            {badgeText}
          </span>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/40 p-3 font-mono text-[13px] break-all select-all">
          {revealed ? full : masked}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-full"
            onClick={() => setRevealed((v) => !v)}
          >
            {revealed ? (
              <>
                <EyeOff className="h-3.5 w-3.5 mr-1" />
                隐藏
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 mr-1" />
                显示完整
              </>
            )}
          </Button>
          <Button
            size="sm"
            className="h-8 rounded-full"
            onClick={handleCopy}
            disabled={copying}
          >
            {copying ? (
              <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Copy className="h-3.5 w-3.5 mr-1" />
            )}
            复制
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============ KV 缓存配置 ============

function KvCachePanel() {
  const { data: kvCacheConfig, isLoading } = useKvCacheConfig()
  const { mutate: setKvCacheConfig, isPending: saving } = useSetKvCacheConfig()
  const [efficiency, setEfficiency] = useState(87)
  const [ttl, setTtl] = useState(3600)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (kvCacheConfig) {
      setEfficiency(Math.round(kvCacheConfig.cacheReadEfficiency * 100))
      setTtl(kvCacheConfig.kvCacheTtlSecs)
      setDirty(false)
    }
  }, [kvCacheConfig])

  const handleSave = () => {
    setKvCacheConfig(
      {
        cacheReadEfficiency: efficiency / 100,
        kvCacheTtlSecs: Math.max(60, ttl),
      },
      {
        onSuccess: () => {
          toast.success('KV Cache 配置已保存')
          setDirty(false)
        },
        onError: (err) => toast.error('保存失败: ' + extractErrorMessage(err)),
      },
    )
  }

  const handleReset = () => {
    if (kvCacheConfig) {
      setEfficiency(Math.round(kvCacheConfig.cacheReadEfficiency * 100))
      setTtl(kvCacheConfig.kvCacheTtlSecs)
      setDirty(false)
    }
  }

  const ttlReadable =
    ttl >= 3600
      ? `${Math.floor(ttl / 3600)} 小时 ${Math.round((ttl % 3600) / 60)} 分钟`
      : `${Math.round(ttl / 60)} 分钟`

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight">KV Cache 配置</h2>
            <p className="text-[12px] text-muted-foreground">
              控制本地缓存读取效率与状态过期时间
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <Button variant="outline" size="sm" className="h-8 rounded-full" onClick={handleReset}>
              取消
            </Button>
          )}
          <Button
            size="sm"
            className="h-8 rounded-full"
            onClick={handleSave}
            disabled={!dirty || saving || isLoading}
          >
            {saving ? '保存中…' : '保存配置'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass-card shadow-apple-sm">
          <CardContent className="p-5 space-y-3">
            <div>
              <h3 className="text-sm font-semibold">缓存效率系数</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                控制模拟缓存命中率。例如 87% 表示将前缀匹配折算为约 87% 的实际缓存率
              </p>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={1}
              value={efficiency}
              onChange={(e) => {
                setEfficiency(parseInt(e.target.value))
                setDirty(true)
              }}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>50%</span>
              <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                {efficiency}%
              </span>
              <span>100%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card shadow-apple-sm">
          <CardContent className="p-5 space-y-3">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Timer className="h-3.5 w-3.5" /> 缓存 TTL
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                历史 prompt 在内存中的存活时间，超时后不再参与前缀匹配
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={60}
                max={86400}
                step={60}
                value={ttl}
                onChange={(e) => {
                  setTtl(parseInt(e.target.value) || 3600)
                  setDirty(true)
                }}
                className="flex-1 h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">秒</span>
            </div>
            <p className="text-[11px] text-muted-foreground">= {ttlReadable}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============ 主页面 ============

export function SettingsPage() {
  const { data, isLoading, error, refetch, isFetching } = useAdminKeys()

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight leading-tight">
          设置
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          管理服务端密钥与本地缓存策略
        </p>
      </div>

      {/* 密钥管理 */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">密钥管理</h2>
            <p className="text-[12px] text-muted-foreground">
              查看并复制 API Key（业务调用）和 Admin API Key（后台管理）
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-full"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1 ${isFetching ? 'animate-spin' : ''}`}
            />
            刷新
          </Button>
        </div>

        {isLoading && (
          <div className="text-sm text-muted-foreground">加载中…</div>
        )}

        {error && (
          <Card className="border-destructive/40">
            <CardContent className="p-5 text-sm text-destructive">
              加载失败: {extractErrorMessage(error)}
            </CardContent>
          </Card>
        )}

        {data && (
          <div className="grid gap-4 md:grid-cols-2">
            <KeyRow
              title="API Key"
              description="客户端调用 /v1/messages 等业务端点使用"
              masked={data.apiKey.masked}
              full={data.apiKey.full}
              icon={<KeyRound className="h-4 w-4" />}
              badgeText="业务调用"
              badgeClass="bg-primary/10 text-primary"
            />
            <KeyRow
              title="Admin API Key"
              description="管理后台、查看凭据、修改配置使用"
              masked={data.adminApiKey.masked}
              full={data.adminApiKey.full}
              icon={<Shield className="h-4 w-4" />}
              badgeText="后台管理"
              badgeClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            />
          </div>
        )}

        <Card className="glass-card mt-4">
          <CardContent className="p-4 space-y-1.5 text-[12px] text-muted-foreground">
            <p>
              使用方式：
              <span className="font-mono text-[11px] mx-1 px-1.5 py-0.5 rounded bg-muted">
                Authorization: Bearer &lt;API Key&gt;
              </span>
              或
              <span className="font-mono text-[11px] mx-1 px-1.5 py-0.5 rounded bg-muted">
                x-api-key: &lt;API Key&gt;
              </span>
            </p>
            <p>密钥保存在服务端 config.json，本页面仅做查看与复制。</p>
          </CardContent>
        </Card>
      </section>

      {/* KV Cache */}
      <section>
        <KvCachePanel />
      </section>
    </div>
  )
}
