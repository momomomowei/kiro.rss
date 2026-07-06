import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import * as Tooltip from '@radix-ui/react-tooltip'
import { RefreshCw, ChevronUp, ChevronDown, Trash2, Loader2, Pencil, ListChecks, Database } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { SubscriptionBadge } from '@/components/subscription-badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EditCredentialDialog } from '@/components/edit-credential-dialog'
import { AvailableModelsDialog } from '@/components/available-models-dialog'
import { CachedModelsDialog } from '@/components/cached-models-dialog'
import type { CredentialStatusItem, BalanceResponse } from '@/types/api'
import { maskProxyUrl } from '@/lib/proxy-store'
import {
  useSetDisabled,
  useSetPriority,
  useDeleteCredential,
  useForceRefreshToken,
} from '@/hooks/use-credentials'

interface CredentialCardProps {
  credential: CredentialStatusItem
  selected: boolean
  onToggleSelect: () => void
  balance: BalanceResponse | null
  loadingBalance: boolean
  onRefreshBalance: (id: number) => void
  view?: 'card' | 'list'
}

function formatLastUsed(lastUsedAt: string | null): string {
  if (!lastUsedAt) return '从未使用'
  const date = new Date(lastUsedAt)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 0) return '刚刚'
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds} 秒前`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  return `${days} 天前`
}

function formatMoney(value: number): string {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatResetDate(ts: number | null): string {
  if (!ts) return '未知'
  return new Date(ts * 1000).toLocaleString('zh-CN')
}

function formatTokenTtl(expiresAt: string | null): string {
  if (!expiresAt) return 'Token有效期 -- 分钟'
  const expires = new Date(expiresAt).getTime()
  if (!Number.isFinite(expires)) return 'Token有效期 -- 分钟'
  const minutes = Math.max(0, Math.floor((expires - Date.now()) / 60000))
  return `Token有效期 ${minutes} 分钟`
}

function formatDisabledReason(reason: string): string {
  switch (reason) {
    case 'QuotaExceeded':
      return '已超额'
    case 'TooManyFailures':
      return '失败过多'
    case 'TooManyRefreshFailures':
      return '刷新失败过多'
    case 'InvalidRefreshToken':
      return 'Token 失效'
    case 'InvalidConfig':
      return '配置无效'
    case 'Manual':
      return '手动禁用'
    default:
      return reason
  }
}

function formatProxyDisplay(proxyUrl?: string): string {
  const value = proxyUrl?.trim()
  if (!value || value.toLowerCase() === 'direct') return '直连'
  return maskProxyUrl(value)
}

export function CredentialCard({
  credential,
  selected,
  onToggleSelect,
  balance,
  loadingBalance,
  onRefreshBalance,
  view = 'card',
}: CredentialCardProps) {
  const totalFailureCount = credential.totalFailureCount ?? credential.failureCount

  const [editingPriority, setEditingPriority] = useState(false)
  const [priorityValue, setPriorityValue] = useState(String(credential.priority))
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showAvailableModelsDialog, setShowAvailableModelsDialog] = useState(false)
  const [showCachedModelsDialog, setShowCachedModelsDialog] = useState(false)

  const setDisabled = useSetDisabled()
  const setPriority = useSetPriority()
  const deleteCredential = useDeleteCredential()
  const forceRefresh = useForceRefreshToken()
  const isQuotaExceeded = balance
    ? balance.remaining <= 0 || balance.usagePercentage >= 100
    : false
  const stateClasses = [
    credential.isCurrent ? 'ring-2 ring-primary/60 shadow-apple-lg' : '',
    !credential.disabled && isQuotaExceeded ? 'ring-1 ring-destructive/50' : '',
    credential.disabled ? 'opacity-70 grayscale-[0.25] ring-1 ring-muted-foreground/20 bg-muted/20' : '',
  ].filter(Boolean).join(' ')
  const badges = (
    <>
      {balance?.subscriptionTitle && (
        <SubscriptionBadge title={balance.subscriptionTitle} className="max-w-full" />
      )}
      {credential.isCurrent && (
        <StatusPill tone="green">活跃</StatusPill>
      )}
      {credential.disabled && (
        <StatusPill tone="gray">
          {credential.disabledReason ? `已禁用 · ${formatDisabledReason(credential.disabledReason)}` : '已禁用'}
        </StatusPill>
      )}
      {!credential.disabled && isQuotaExceeded && (
        <StatusPill tone="amber">已超额</StatusPill>
      )}
      {credential.hasProfileArn && (
        <StatusPill tone="gray">ide · ARN</StatusPill>
      )}
    </>
  )

  const handleToggleDisabled = () => {
    setDisabled.mutate(
      { id: credential.id, disabled: !credential.disabled },
      {
        onSuccess: (res) => {
          toast.success(res.message)
        },
        onError: (err) => {
          toast.error('操作失败: ' + (err as Error).message)
        },
      }
    )
  }

  const handlePriorityChange = () => {
    const newPriority = parseInt(priorityValue, 10)
    if (isNaN(newPriority) || newPriority < 0) {
      toast.error('优先级必须是非负整数')
      return
    }
    setPriority.mutate(
      { id: credential.id, priority: newPriority },
      {
        onSuccess: (res) => {
          toast.success(res.message)
          setEditingPriority(false)
        },
        onError: (err) => {
          toast.error('操作失败: ' + (err as Error).message)
        },
      }
    )
  }

  const handleForceRefresh = () => {
    forceRefresh.mutate(credential.id, {
      onSuccess: (res) => {
        toast.success(res.message)
      },
      onError: (err) => {
        toast.error('刷新失败: ' + (err as Error).message)
      },
    })
  }

  const handleDelete = () => {
    if (!credential.disabled) {
      toast.error('请先禁用凭据再删除')
      setShowDeleteDialog(false)
      return
    }

    deleteCredential.mutate(credential.id, {
      onSuccess: (res) => {
        toast.success(res.message)
        setShowDeleteDialog(false)
      },
      onError: (err) => {
        toast.error('删除失败: ' + (err as Error).message)
      },
    })
  }

  const dialogs = (
    <>
      <EditCredentialDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        credential={credential}
      />
      <AvailableModelsDialog
        credentialId={credential.id}
        open={showAvailableModelsDialog}
        onOpenChange={setShowAvailableModelsDialog}
      />
      <CachedModelsDialog
        credentialId={credential.id}
        open={showCachedModelsDialog}
        onOpenChange={setShowCachedModelsDialog}
      />

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除凭据</DialogTitle>
            <DialogDescription>
              您确定要删除凭据 #{credential.id} 吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteCredential.isPending}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteCredential.isPending || !credential.disabled}
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )

  if (view === 'list') {
    return (
      <>
        <div className={`group flex min-w-0 items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-all hover:bg-accent/40 hover:shadow-apple-sm ${stateClasses}`}>
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            className="h-5 w-5 shrink-0 rounded-md border-primary"
          />

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold leading-5">
              {credential.email || `凭据 #${credential.id}`}
            </div>
            <div className="mt-1 flex min-w-0 items-center gap-1 overflow-hidden [&>*]:shrink-0">
              {badges}
            </div>
          </div>

          <div className="hidden shrink-0 items-center gap-5 lg:flex">
            <div className="w-14 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">优先级</div>
              {editingPriority ? (
                <div className="mt-0.5 inline-flex items-center gap-0.5 rounded-md border border-border/60 bg-card p-0.5 shadow-apple-sm">
                  <Input
                    type="number"
                    value={priorityValue}
                    onChange={(e) => setPriorityValue(e.target.value)}
                    className="h-7 w-14 rounded-md text-sm"
                    min="0"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={handlePriorityChange}
                    disabled={setPriority.isPending}
                  >
                    ✓
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="mt-0.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-sm font-medium tabular-nums transition-colors hover:bg-accent hover:text-primary"
                  onClick={() => setEditingPriority(true)}
                  title="点击编辑优先级"
                >
                  {credential.priority}
                  <Pencil className="h-3 w-3 opacity-70" />
                </button>
              )}
            </div>
            <Metric label="失败" value={totalFailureCount} danger={totalFailureCount > 0} />
            <Metric label="刷新失败" value={credential.refreshFailureCount} danger={credential.refreshFailureCount > 0} />
            <Metric label="成功" value={credential.successCount} />
          </div>

          <div className="hidden w-44 shrink-0 xl:block">
            {loadingBalance ? (
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                查询中...
              </div>
            ) : balance ? (
              <div>
                <div className="flex items-baseline justify-between gap-2 text-xs tabular-nums">
                  <span
                    className={`font-semibold ${
                      balance.remaining < 0
                        ? 'text-red-600 dark:text-red-400'
                        : balance.remaining === 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {balance.remaining < 0
                      ? `-$${formatMoney(Math.abs(balance.remaining))}`
                      : `$${formatMoney(balance.remaining)}`}
                  </span>
                  <span className="text-muted-foreground">
                    {balance.usagePercentage.toFixed(0)}%
                  </span>
                </div>
                <Progress value={Math.max(0, Math.min(100, balance.usagePercentage))} className="mt-1 h-1.5" />
              </div>
            ) : (
              <div className="text-center text-[11px] text-muted-foreground">余额未查询</div>
            )}
          </div>

          <div className="hidden w-24 shrink-0 truncate text-right text-xs text-muted-foreground md:block">
            {formatLastUsed(credential.lastUsedAt)}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Switch
              checked={!credential.disabled}
              onCheckedChange={handleToggleDisabled}
              disabled={setDisabled.isPending}
              title={credential.disabled ? '启用' : '禁用'}
            />
            <IconTooltip label={credential.disabled ? '已禁用，无法刷新 Token' : '强制刷新 Token'}>
              <Button
                size="icon"
                variant="ghost"
                className="hidden h-8 w-8 sm:inline-flex"
                onClick={handleForceRefresh}
                disabled={forceRefresh.isPending || credential.disabled}
              >
                <RefreshCw className={`h-4 w-4 ${forceRefresh.isPending ? 'animate-spin' : ''}`} />
              </Button>
            </IconTooltip>
            <IconTooltip label={credential.disabled ? '已禁用，无法刷新额度' : '刷新本账号额度'}>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => onRefreshBalance(credential.id)}
                disabled={loadingBalance || credential.disabled}
              >
                <RefreshCw className={`h-4 w-4 ${loadingBalance ? 'animate-spin' : ''}`} />
              </Button>
            </IconTooltip>
            <IconTooltip label="查看可用模型">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setShowAvailableModelsDialog(true)}
              >
                <ListChecks className="h-4 w-4" />
              </Button>
            </IconTooltip>
            <IconTooltip label="查看已缓存模型">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setShowCachedModelsDialog(true)}
              >
                <Database className="h-4 w-4" />
              </Button>
            </IconTooltip>
            <IconTooltip label="编辑凭据">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setShowEditDialog(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </IconTooltip>
            <IconTooltip label={!credential.disabled ? '需要先禁用凭据才能删除' : '删除凭据'}>
              <Button
                size="icon"
                variant="destructive"
                className="h-8 w-8"
                onClick={() => setShowDeleteDialog(true)}
                disabled={!credential.disabled}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </IconTooltip>
          </div>
        </div>
        {dialogs}
      </>
    )
  }

  return (
    <>
      <Card className={`glass-card shadow-apple-sm hover:shadow-apple-lg flex h-full min-w-0 flex-col rounded-xl transition-all duration-200 ${stateClasses}`}>
        <CardHeader className="px-5 pb-2 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <Checkbox
                checked={selected}
                onCheckedChange={onToggleSelect}
                className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-primary"
              />
              <CardTitle className="min-w-0 flex-1">
                <span className="block min-w-0 truncate text-[15px] font-semibold leading-5">
                  {credential.email || `凭据 #${credential.id}`}
                </span>
                <span className="mt-2 flex min-h-5 flex-wrap items-center gap-1.5">
                  {badges}
                </span>
              </CardTitle>
            </div>
            <div className="flex shrink-0 items-center gap-2 pt-0.5">
              <span className="text-sm text-muted-foreground">启用</span>
              <Switch
                checked={!credential.disabled}
                onCheckedChange={handleToggleDisabled}
                disabled={setDisabled.isPending}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col space-y-4 px-5 pb-4">
          <dl className="grid grid-cols-2 gap-x-5 gap-y-2.5 text-[13px]">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <dt className="shrink-0 text-muted-foreground">优先级</dt>
              <dd className="min-w-0 text-right">
                {editingPriority ? (
                  <div className="inline-flex max-w-full items-center gap-1">
                    <Input
                      type="number"
                      value={priorityValue}
                      onChange={(e) => setPriorityValue(e.target.value)}
                      className="h-7 w-16 text-sm"
                      min="0"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={handlePriorityChange}
                      disabled={setPriority.isPending}
                    >
                      ✓
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingPriority(false)
                        setPriorityValue(String(credential.priority))
                      }}
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium tabular-nums transition-colors hover:bg-accent hover:text-primary"
                    onClick={() => setEditingPriority(true)}
                    title="点击编辑优先级"
                  >
                    {credential.priority}
                    <Pencil className="h-3 w-3 opacity-70" />
                  </button>
                )}
              </dd>
            </div>
            <InfoRow
              label="失败次数"
              value={totalFailureCount}
              danger={totalFailureCount > 0}
            />
            <InfoRow
              label="刷新失败"
              value={credential.refreshFailureCount}
              danger={credential.refreshFailureCount > 0}
            />
            <InfoRow label="成功次数" value={credential.successCount} />
            <div className="col-span-2 border-t border-border/50" />
            <div className="flex min-w-0 items-center justify-between gap-2 col-span-2">
              <dt className="shrink-0 text-muted-foreground">最后调用</dt>
              <dd className="min-w-0 truncate text-right font-medium">
                {formatLastUsed(credential.lastUsedAt)}
              </dd>
            </div>
            <div className="flex min-w-0 items-center justify-between gap-2 col-span-2">
              <dt className="shrink-0 text-muted-foreground">代理</dt>
              <dd className="min-w-0 truncate text-right font-mono text-xs">
                {formatProxyDisplay(credential.proxyUrl)}
              </dd>
            </div>
          </dl>

          <div className={`flex min-h-[150px] flex-col rounded-xl border p-4 transition-colors ${
            credential.disabled
              ? 'border-border/60 bg-muted/30'
              : isQuotaExceeded
                ? 'border-destructive/30 bg-destructive/[0.03]'
              : 'border-border/60 bg-secondary/40'
          }`}>
            {loadingBalance ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在查询余额...
              </div>
            ) : balance ? (
              <div className="space-y-3">
                <div className="flex min-w-0 items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      余额
                    </div>
                    <div
                      className={`mt-1 text-2xl font-semibold tabular-nums ${
                        credential.disabled
                          ? 'text-muted-foreground'
                          : balance.remaining <= 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {balance.remaining < 0
                        ? `-$${formatMoney(Math.abs(balance.remaining))}`
                        : `$${formatMoney(balance.remaining)}`}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Progress
                    value={Math.max(0, Math.min(100, balance.usagePercentage))}
                    indicatorClassName={credential.disabled ? 'bg-muted-foreground/35' : undefined}
                  />
                  <div className="grid grid-cols-3 gap-1 text-[11px] tabular-nums text-muted-foreground">
                    <span className="min-w-0 truncate">
                      已用 ${formatMoney(balance.currentUsage)}
                    </span>
                    <span className="text-center">
                      {balance.usagePercentage.toFixed(1)}%
                    </span>
                    <span className="min-w-0 truncate text-right">
                      额度 ${formatMoney(balance.usageLimit)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2 text-xs text-muted-foreground">
                  <span className="min-w-0 truncate">
                    下次重置：
                    <span className={`font-medium ${credential.disabled ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {formatResetDate(balance.nextResetAt)}
                    </span>
                  </span>
                  <span className={`shrink-0 font-medium ${credential.disabled ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {formatTokenTtl(credential.expiresAt)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center text-center text-[13px] text-muted-foreground">
                余额未查询，点击顶部“刷新额度”即可加载。
              </div>
            )}
          </div>

          <div className="mt-auto border-t border-border/50 pt-3">
            <div className="flex min-w-0 items-center gap-2">
              <IconTooltip label={credential.disabled ? '已禁用，无法刷新 Token' : '强制刷新 Token'}>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 shrink-0 px-2 text-muted-foreground hover:text-foreground"
                  onClick={handleForceRefresh}
                  disabled={forceRefresh.isPending || credential.disabled}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${forceRefresh.isPending ? 'animate-spin' : ''}`} />
                  刷新 Token
                </Button>
              </IconTooltip>
              <IconTooltip label={credential.priority === 0 ? '已是最高优先级' : '提高优先级'}>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    const newPriority = Math.max(0, credential.priority - 1)
                    setPriority.mutate(
                      { id: credential.id, priority: newPriority },
                      {
                        onSuccess: (res) => toast.success(res.message),
                        onError: (err) => toast.error('操作失败: ' + (err as Error).message),
                      }
                    )
                  }}
                  disabled={setPriority.isPending || credential.priority === 0}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
              </IconTooltip>
              <IconTooltip label="降低优先级">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    const newPriority = credential.priority + 1
                    setPriority.mutate(
                      { id: credential.id, priority: newPriority },
                      {
                        onSuccess: (res) => toast.success(res.message),
                        onError: (err) => toast.error('操作失败: ' + (err as Error).message),
                      }
                    )
                  }}
                  disabled={setPriority.isPending}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </IconTooltip>
              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <IconTooltip label={credential.disabled ? '已禁用，无法刷新额度' : '刷新本账号额度'}>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 shrink-0"
                    onClick={() => onRefreshBalance(credential.id)}
                    disabled={loadingBalance || credential.disabled}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingBalance ? 'animate-spin' : ''}`} />
                  </Button>
                </IconTooltip>
                <IconTooltip label="查看可用模型">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setShowAvailableModelsDialog(true)}
                  >
                    <ListChecks className="h-3.5 w-3.5" />
                  </Button>
                </IconTooltip>
                <IconTooltip label="查看已缓存模型">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setShowCachedModelsDialog(true)}
                  >
                    <Database className="h-3.5 w-3.5" />
                  </Button>
                </IconTooltip>
                <IconTooltip label="编辑凭据">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-10 shrink-0"
                    onClick={() => setShowEditDialog(true)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </IconTooltip>
                <IconTooltip label={!credential.disabled ? '需要先禁用凭据才能删除' : '删除凭据'}>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={!credential.disabled}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </IconTooltip>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {dialogs}
    </>
  )
}

function InfoRow({
  label,
  value,
  danger,
}: {
  label: string
  value: number
  danger?: boolean
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className={`tabular-nums font-medium ${danger ? 'text-destructive' : ''}`}>
        {value}
      </dd>
    </div>
  )
}

function Metric({
  label,
  value,
  danger,
}: {
  label: string
  value: number
  danger?: boolean
}) {
  return (
    <div className="w-16 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm font-medium tabular-nums ${danger ? 'text-destructive' : ''}`}>
        {value}
      </div>
    </div>
  )
}

function StatusPill({
  tone,
  children,
}: {
  tone: 'blue' | 'green' | 'red' | 'amber' | 'gray'
  children: ReactNode
}) {
  const toneClass = {
    blue: 'bg-primary text-primary-foreground',
    green: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    red: 'bg-red-500 text-white',
    amber: 'border border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300',
    gray: 'border border-border bg-background text-muted-foreground',
  }[tone]

  return (
    <span className={`inline-flex h-5 max-w-[110px] shrink-0 items-center rounded-full px-2 text-[11px] font-medium leading-none ${toneClass}`}>
      <span className="truncate">{children}</span>
    </span>
  )
}

function IconTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span className="inline-flex shrink-0">{children}</span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            align="center"
            className="z-50 rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
          >
            {label}
            <Tooltip.Arrow className="fill-popover" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
