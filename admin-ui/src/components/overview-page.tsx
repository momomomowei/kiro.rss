import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Activity, AlertCircle, Cpu, Database, KeyRound, Server } from 'lucide-react'
import { useCredentials, useRequestDetails } from '@/hooks/use-credentials'

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

export function OverviewPage() {
  const { data: credData } = useCredentials()
  const { data: detailsData } = useRequestDetails(500)

  const credStats = useMemo(() => {
    const list = credData?.credentials ?? []
    const total = list.length
    const available = list.filter((c) => !c.disabled).length
    const disabled = total - available
    const successCount = list.reduce((s, c) => s + (c.successCount || 0), 0)
    const failureCount = list.reduce((s, c) => s + (c.failureCount || 0), 0)
    return { total, available, disabled, successCount, failureCount }
  }, [credData])

  const reqStats = useMemo(() => {
    const list = detailsData?.records ?? []
    const total = list.length
    let inputTokens = 0
    let outputTokens = 0
    let cachedTokens = 0
    let credits = 0
    const byModel = new Map<string, { calls: number; in: number; out: number }>()
    const byCred = new Map<number, { calls: number; in: number; out: number }>()

    for (const r of list) {
      inputTokens += r.inputTokens
      outputTokens += r.outputTokens
      cachedTokens += r.cachedTokens
      credits += r.creditsUsed

      const m = byModel.get(r.model) ?? { calls: 0, in: 0, out: 0 }
      m.calls += 1
      m.in += r.inputTokens
      m.out += r.outputTokens
      byModel.set(r.model, m)

      const c = byCred.get(r.credentialId) ?? { calls: 0, in: 0, out: 0 }
      c.calls += 1
      c.in += r.inputTokens
      c.out += r.outputTokens
      byCred.set(r.credentialId, c)
    }

    const modelList = Array.from(byModel.entries())
      .map(([model, v]) => ({ model, ...v }))
      .sort((a, b) => b.calls - a.calls)

    const credList = Array.from(byCred.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 12)

    return { total, inputTokens, outputTokens, cachedTokens, credits, modelList, credList }
  }, [detailsData])

  const credBarMax = Math.max(1, ...reqStats.credList.map((c) => c.calls))
  const modelTotal = Math.max(1, reqStats.modelList.reduce((s, m) => s + m.calls, 0))

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold tracking-tight leading-tight">概览</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          基于本地最近 500 条请求明细的统计 · 数据每 30 秒自动刷新
        </p>
      </div>

      {/* 顶部 5 张卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="总调用次数"
          value={formatNumber(reqStats.total)}
        />
        <StatCard
          icon={<Cpu className="h-4 w-4" />}
          label="输入 Token"
          value={formatNumber(reqStats.inputTokens)}
          hint={<span>缓存 {formatNumber(reqStats.cachedTokens)}</span>}
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

      {/* 凭据健康 + 模型分布 */}
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
              <Row
                label="可用"
                value={`${credStats.available} / ${credStats.total}`}
              />
              {credStats.disabled > 0 && (
                <div className="flex items-center gap-2 text-[12px] text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{credStats.disabled} 个凭据被禁用</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card shadow-apple-sm">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight">按模型分布</h2>
              <span className="text-[11px] text-muted-foreground">
                共 {reqStats.modelList.length} 种模型
              </span>
            </div>
            {reqStats.modelList.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                暂无请求数据
              </div>
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
      </div>

      {/* 按凭据贡献 */}
      <Card className="glass-card shadow-apple-sm">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight">按凭据调用量 Top 12</h2>
            <span className="text-[11px] text-muted-foreground">
              基于最近 500 条请求
            </span>
          </div>
          {reqStats.credList.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              暂无请求数据
            </div>
          ) : (
            <div className="space-y-2">
              {reqStats.credList.map((c) => {
                const cred = credData?.credentials.find((cc) => cc.id === c.id)
                const label = cred?.email ?? `凭据 #${c.id}`
                const pct = (c.calls / credBarMax) * 100
                return (
                  <div key={c.id} className="space-y-1">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="truncate font-medium">{label}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {formatNumber(c.calls)} 次 · 输入 {formatNumber(c.in)} · 输出 {formatNumber(c.out)}
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
