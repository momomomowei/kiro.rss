import { useEffect, useMemo, useState } from 'react'
import { CheckCircle, RefreshCw, Trash2, Users, XCircle, Network } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useCredentials, useRequestDetails, useClearRequestDetails } from '@/hooks/use-credentials'
import { extractErrorMessage } from '@/lib/utils'

type RecordFilter = 'all' | 'hit' | 'miss'

function formatTime(isoString: string): string {
  const d = new Date(isoString)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatCost(usd: number): string {
  if (usd < 0.001) return `$${usd.toFixed(6)}`
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(3)}`
}

function formatTokens(n: number): string {
  if (!n) return '-'
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

function modelShortName(model: string): string {
  if (model.includes('opus')) return 'Opus'
  if (model.includes('sonnet')) return 'Sonnet'
  if (model.includes('haiku')) return 'Haiku'
  return model || '-'
}

function modelColor(model: string): string {
  if (model.includes('opus')) return 'text-purple-600 dark:text-purple-400'
  if (model.includes('sonnet')) return 'text-blue-600 dark:text-blue-400'
  if (model.includes('haiku')) return 'text-emerald-600 dark:text-emerald-400'
  return ''
}

function cacheRatioBar(ratio: number) {
  const pct = Math.round(ratio * 100)
  const color = pct > 70 ? 'bg-emerald-500' : pct > 30 ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  )
}

const controlClass =
  'h-8 rounded-md border border-input bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function RequestDetailsPanel() {
  const [limit, setLimit] = useState(100)
  const [filter, setFilter] = useState<RecordFilter>('all')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const { data: credentialsData } = useCredentials()
  const { data, isLoading, refetch } = useRequestDetails(limit)
  const { mutate: clearDetails, isPending: isClearing } = useClearRequestDetails()

  useEffect(() => {
    if (!autoRefresh) return
    const timer = window.setInterval(() => refetch(), 5000)
    return () => window.clearInterval(timer)
  }, [autoRefresh, refetch])

  const records = data?.records || []
  const summary = useMemo(() => {
    const totalCost = records.reduce((sum, r) => sum + r.costUsd, 0)
    const totalInput = records.reduce((sum, r) => sum + r.inputTokens + r.cachedTokens, 0)
    const totalOutput = records.reduce((sum, r) => sum + r.outputTokens, 0)
    const cacheHitCount = records.filter(r => r.cacheHit).length
    return { totalCost, totalInput, totalOutput, cacheHitCount }
  }, [records])
  const failedCount = records.filter(r => r.inputTokens + r.cachedTokens + r.outputTokens === 0).length
  const successCount = Math.max((data?.total ?? records.length) - failedCount, 0)

  const filteredRecords = records.filter(r => {
    if (filter === 'hit') return r.cacheHit
    if (filter === 'miss') return !r.cacheHit
    return true
  })

  const handleClear = () => {
    if (!confirm('确定要清空所有请求记录吗？此操作无法撤销。')) return
    clearDetails(undefined, {
      onSuccess: () => toast.success('请求记录已清空'),
      onError: (err) => toast.error('清空失败: ' + extractErrorMessage(err)),
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="text-sm text-muted-foreground">账号</div>
              <div className="mt-1 text-2xl font-bold tabular-nums">{credentialsData?.total ?? 0}</div>
              <div className="mt-1 text-xs font-semibold uppercase">{credentialsData?.available ?? 0} 可用</div>
            </div>
            <Users className="h-5 w-5 text-muted-foreground/60" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="text-sm text-muted-foreground">请求</div>
              <div className="mt-1 text-2xl font-bold tabular-nums">{data?.total ?? 0}</div>
              <div className="mt-1 text-xs font-semibold uppercase">{formatTokens(summary.totalInput + summary.totalOutput)} TOKENS</div>
            </div>
            <Network className="h-5 w-5 text-muted-foreground/60" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="text-sm text-muted-foreground">成功</div>
              <div className="mt-1 text-2xl font-bold tabular-nums">{successCount}</div>
              <div className="mt-1 text-xs text-muted-foreground">已完成</div>
            </div>
            <CheckCircle className="h-5 w-5 text-muted-foreground/60" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="text-sm text-muted-foreground">失败</div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-red-500">{failedCount}</div>
              <div className="mt-1 text-xs text-muted-foreground">错误</div>
            </div>
            <XCircle className="h-5 w-5 text-red-400/70" />
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-lg">
      <CardHeader className="space-y-3 px-5 py-4">
        <div className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold">请求记录</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as RecordFilter)}
              className={`${controlClass} w-28`}
              aria-label="筛选请求记录"
            >
              <option value="all">全部记录</option>
              <option value="hit">缓存命中</option>
              <option value="miss">未命中</option>
            </select>
            <select
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
              className={`${controlClass} w-24`}
              aria-label="显示条数"
            >
              {[50, 100, 200, 500].map(n => (
                <option key={n} value={n}>{n} 条</option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isLoading} className="h-8 px-3 text-xs">
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <label className="flex h-8 items-center gap-2 rounded-md border px-3 text-xs text-muted-foreground">
              <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
              自动刷新
            </label>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleClear}
              disabled={isClearing || !records.length}
              className="h-8 px-3 text-xs"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              清空
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <span>总计: <strong className="text-foreground">{data?.total ?? 0}</strong></span>
          <span>当前显示: <strong className="text-foreground">{filteredRecords.length}</strong></span>
          <span>缓存命中: <strong className="text-foreground">{summary.cacheHitCount}</strong></span>
          <span>Token: <strong className="text-foreground">{formatTokens(summary.totalInput + summary.totalOutput)}</strong></span>
          <span>费用: <strong className="text-foreground">{formatCost(summary.totalCost)}</strong></span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="max-h-[60vh] overflow-auto border-t bg-muted/10" style={{ minHeight: 180 }}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center text-sm text-muted-foreground" style={{ minHeight: 180 }}>
              <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
              加载中...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ minHeight: 180 }}>暂无请求记录</div>
          ) : (
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b bg-card">
                  <th className="sticky top-0 z-10 whitespace-nowrap bg-card px-3 py-2 text-left font-medium text-muted-foreground">时间</th>
                  <th className="sticky top-0 z-10 whitespace-nowrap bg-card px-3 py-2 text-left font-medium text-muted-foreground">状态</th>
                  <th className="sticky top-0 z-10 whitespace-nowrap bg-card px-3 py-2 text-left font-medium text-muted-foreground">端点</th>
                  <th className="sticky top-0 z-10 whitespace-nowrap bg-card px-3 py-2 text-left font-medium text-muted-foreground">模型</th>
                  <th className="sticky top-0 z-10 whitespace-nowrap bg-card px-3 py-2 text-right font-medium text-muted-foreground">输入</th>
                  <th className="sticky top-0 z-10 whitespace-nowrap bg-card px-3 py-2 text-right font-medium text-muted-foreground">缓存读取</th>
                  <th className="sticky top-0 z-10 whitespace-nowrap bg-card px-3 py-2 text-right font-medium text-muted-foreground">输出</th>
                  <th className="sticky top-0 z-10 whitespace-nowrap bg-card px-3 py-2 text-left font-medium text-muted-foreground">缓存率</th>
                  <th className="sticky top-0 z-10 whitespace-nowrap bg-card px-3 py-2 text-right font-medium text-muted-foreground">费用</th>
                  <th className="sticky top-0 z-10 whitespace-nowrap bg-card px-3 py-2 text-center font-medium text-muted-foreground">模式</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r, i) => (
                  <tr key={r.requestId + i} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground tabular-nums">{formatTime(r.recordedAt)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${r.cacheHit ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                        {r.cacheHit ? 'HIT' : 'MISS'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.endpoint.replace('/v1/', '')}</td>
                    <td className="px-3 py-2">
                      <span className={`font-medium ${modelColor(r.model)}`}>{modelShortName(r.model)}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatTokens(r.inputTokens)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.cachedTokens > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">{formatTokens(r.cachedTokens)}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatTokens(r.outputTokens)}</td>
                    <td className="px-3 py-2">{cacheRatioBar(r.cacheRatio)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCost(r.costUsd)}</td>
                    <td className="px-3 py-2 text-center">
                      <Badge variant={r.stream ? 'secondary' : 'outline'} className="px-1.5 py-0 text-[10px]">
                        {r.stream ? 'SSE' : 'Sync'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>
      </Card>
    </div>
  )
}
