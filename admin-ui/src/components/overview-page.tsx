import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Activity,
  AlertCircle,
  Cpu,
  Database,
  KeyRound,
  Server,
  Sparkles,
  Inbox,
} from 'lucide-react'
import { useCredentials, useRequestDetails, useKvCacheConfig } from '@/hooks/use-credentials'

function formatNumber(n: number): string {
  return n.toLocaleString('zh-CN')
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: React.ReactNode
}) {
  return (
    <Card className="glass-card shadow-apple-sm hover:shadow-apple transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <div className="mt-2 flex items-end justify-between gap-2">
          <span className="text-3xl font-semibold tracking-tight tabular-nums">
            {value}
          </span>
          {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="h-12 w-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-[12px] text-muted-foreground mt-1 max-w-xs">{desc}</p>
    </div>
  )
}

export function OverviewPage() {
  const { data: credData } = useCredentials()
  const { data: detailsData } = useRequestDetails(500)
  const { data: kvCacheConfig } = useKvCacheConfig()

  const credStats = useMemo(() => {
    const list = credData?.credentials ?? []
    const total = list.length
    const available = list.filter((c) => !c.disabled).length
    const disabled = total - available
    const successCount = list.reduce((s, c) => s + (c.successCount || 0), 0)
    const failureCount = list.reduce((s, c) => s + (c.failureCount || 0), 0)
    const totalAttempts = successCount + failureCount
    const successRate = totalAttempts > 0 ? (successCount / totalAttempts) * 100 : 100

    // 按 successCount 排序的 Top 12（即使 details 没数据，也能展示凭据贡献）
    const credLeaderboard = [...list]
      .filter((c) => (c.successCount || 0) > 0)
      .sort((a, b) => (b.successCount || 0) - (a.successCount || 0))
      .slice(0, 12)

    return {
      total,
      available,
      disabled,
      successCount,
      failureCount,
      successRate,
      credLeaderboard,
    }
  }, [credData])

  const reqStats = useMemo(() => {
    const list = detailsData?.records ?? []
    const summary = detailsData?.summary
    const total = summary?.totalCalls ?? detailsData?.total ?? list.length
    let inputTokens = summary?.inputTokens ?? 0
    let outputTokens = summary?.outputTokens ?? 0
    let cachedTokens = summary?.cachedTokens ?? 0
    let credits = 0
    let cacheHitCount = summary?.cacheHitCount ?? 0
    const byModel = new Map<string, { calls: number; in: number; out: number }>()

    for (const r of list) {
      if (!summary) {
        inputTokens += r.inputTokens
        outputTokens += r.outputTokens
        cachedTokens += r.cachedTokens
        if (r.cacheHit) cacheHitCount += 1
      }
      credits += r.costUsd

      const m = byModel.get(r.model) ?? { calls: 0, in: 0, out: 0 }
      m.calls += 1
      m.in += r.inputTokens
      m.out += r.outputTokens
      byModel.set(r.model, m)
    }

    const cacheHitRate = total > 0 ? (cacheHitCount / total) * 100 : 0
    const inputTotal = inputTokens + cachedTokens
    const cachedRatio = inputTotal > 0 ? (cachedTokens / inputTotal) * 100 : 0

    const modelList = Array.from(byModel.entries())
      .map(([model, v]) => ({ model, ...v }))
      .sort((a, b) => b.calls - a.calls)

    return {
      total,
      inputTokens,
      outputTokens,
      cachedTokens,
      credits,
      cacheHitRate,
      cachedRatio,
      modelList,
    }
  }, [detailsData])

  const credBarMax = Math.max(1, ...credStats.credLeaderboard.map((c) => c.successCount || 0))
  const modelTotal = Math.max(1, reqStats.modelList.reduce((s, m) => s + m.calls, 0))
  const hasRequestData = reqStats.total > 0
  const hasCredBoard = credStats.credLeaderboard.length > 0

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold tracking-tight leading-tight">概览</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          基于本地最近 500 条请求明细统计 · 数据每 30 秒自动刷新
        </p>
      </div>

      {/* 顶部 5 张卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="总调用次数"
          value={formatNumber(reqStats.total)}
          hint={
            hasRequestData ? (
              <span>成功率 {credStats.successRate.toFixed(1)}%</span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">暂无记录</span>
            )
          }
        />
        <StatCard
          icon={<Cpu className="h-4 w-4" />}
          label="输入 Token"
          value={formatNumber(reqStats.inputTokens)}
          hint={
            hasRequestData ? (
              <span>缓存 {formatNumber(reqStats.cachedTokens)}</span>
            ) : null
          }
        />
        <StatCard
          icon={<Cpu className="h-4 w-4" />}
          label="输出 Token"
          value={formatNumber(reqStats.outputTokens)}
        />
        <StatCard
          icon={<Database className="h-4 w-4" />}
          label="Credits 消耗"
          value={reqStats.credits.toFixed(2)}
        />
        <StatCard
          icon={<KeyRound className="h-4 w-4" />}
          label="可用 / 总凭据"
          value={`${credStats.available} / ${credStats.total}`}
          hint={
            credStats.disabled > 0 ? (
              <span className="text-destructive">禁用 {credStats.disabled}</span>
            ) : (
              <span>全部启用</span>
            )
          }
        />
      </div>

      {/* 凭据健康 + 缓存命中 */}
      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        <Card className="glass-card shadow-apple-sm">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight">凭据健康</h2>
              <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                <Server className="h-3 w-3" />
                {credStats.total} 个凭据
              </span>
            </div>
            <div className="space-y-3 text-sm">
              <Row
                label="累计成功"
                value={formatNumber(credStats.successCount)}
                color="text-emerald-600 dark:text-emerald-400"
              />
              <Row
                label="累计失败"
                value={formatNumber(credStats.failureCount)}
                color="text-rose-600 dark:text-rose-400"
              />
              <Row label="可用" value={`${credStats.available} / ${credStats.total}`} />
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[12px]">
                  <span className="text-muted-foreground">总成功率</span>
                  <span className="tabular-nums font-medium">
                    {credStats.successRate.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ease-apple ${
                      credStats.successRate >= 95
                        ? 'bg-emerald-500'
                        : credStats.successRate >= 80
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                    }`}
                    style={{ width: `${credStats.successRate}%` }}
                  />
                </div>
              </div>
              {credStats.disabled > 0 && (
                <div className="flex items-center gap-2 text-[12px] text-amber-600 dark:text-amber-400 pt-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{credStats.disabled} 个凭据被禁用</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card shadow-apple-sm">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight">KV 缓存命中</h2>
              <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                效率系数{' '}
                {kvCacheConfig
                  ? `${Math.round(kvCacheConfig.cacheReadEfficiency * 100)}%`
                  : '--'}
              </span>
            </div>
            {hasRequestData ? (
              <div className="space-y-3 text-sm">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-muted-foreground">请求级命中率</span>
                    <span className="tabular-nums font-medium">
                      {reqStats.cacheHitRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 ease-apple"
                      style={{ width: `${reqStats.cacheHitRate}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-muted-foreground">Token 级缓存占比</span>
                    <span className="tabular-nums font-medium">
                      {reqStats.cachedRatio.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-accent-foreground/70 transition-all duration-300 ease-apple"
                      style={{ width: `${reqStats.cachedRatio}%` }}
                    />
                  </div>
                </div>
                <Row label="缓存读取 Token" value={formatNumber(reqStats.cachedTokens)} />
                <Row label="TTL" value={kvCacheConfig ? `${kvCacheConfig.kvCacheTtlSecs} 秒` : '--'} />
              </div>
            ) : (
              <EmptyState
                icon={<Inbox className="h-5 w-5" />}
                title="还没有请求记录"
                desc="发起业务请求后，这里会显示缓存命中率与 Token 节省统计"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* 模型分布 + 凭据贡献 */}
      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        <Card className="glass-card shadow-apple-sm">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight">按模型分布</h2>
              <span className="text-[11px] text-muted-foreground">
                共 {reqStats.modelList.length} 种模型
              </span>
            </div>
            {reqStats.modelList.length === 0 ? (
              <EmptyState
                icon={<Inbox className="h-5 w-5" />}
                title="暂无请求数据"
                desc="发起对话后，按模型的调用分布将在这里呈现"
              />
            ) : (
              <div className="space-y-2 max-h-64 overflow-auto pr-1">
                {reqStats.modelList.map((m) => {
                  const pct = (m.calls / modelTotal) * 100
                  return (
                    <div key={m.model} className="space-y-1">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="truncate font-medium">{m.model}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {formatNumber(m.calls)} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300 ease-apple"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card shadow-apple-sm">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight">凭据贡献 Top 12</h2>
              <span className="text-[11px] text-muted-foreground">
                按累计成功次数排序
              </span>
            </div>
            {!hasCredBoard ? (
              <EmptyState
                icon={<KeyRound className="h-5 w-5" />}
                title="还没有凭据成功记录"
                desc="导入或添加凭据并发起请求后，凭据贡献会按成功次数排名"
              />
            ) : (
              <div className="space-y-2 max-h-72 overflow-auto pr-1">
                {credStats.credLeaderboard.map((c) => {
                  const label = c.email ?? `凭据 #${c.id}`
                  const success = c.successCount || 0
                  const pct = (success / credBarMax) * 100
                  return (
                    <div key={c.id} className="space-y-1">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="truncate font-medium">{label}</span>
                        <span className="text-muted-foreground tabular-nums">
                          成功 {formatNumber(success)}
                          {c.failureCount > 0 && (
                            <span className="ml-1 text-rose-500">
                              · 失败 {formatNumber(c.failureCount)}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-primary/80 transition-all duration-300 ease-apple"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums font-medium ${color ?? ''}`}>{value}</span>
    </div>
  )
}
