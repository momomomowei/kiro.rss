import { useState } from 'react'
import { toast } from 'sonner'
import { Activity, CheckCircle2, HelpCircle, Plus, Trash2, Network, XCircle } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { addProxy, checkAllProxies, checkProxy, deleteProxy, getProxyPool } from '@/api/credentials'
import { maskProxyUrl } from '@/lib/proxy-store'
import { extractErrorMessage } from '@/lib/utils'
import type { ProxyPoolEntry } from '@/types/api'

export function ProxyPage() {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [checkingId, setCheckingId] = useState<number | null>(null)
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['proxy-pool'],
    queryFn: getProxyPool,
  })
  const proxies = data?.proxies ?? []

  const addMutation = useMutation({
    mutationFn: () => addProxy({ url: url.trim(), label: label.trim() || undefined }),
    onSuccess: () => {
      toast.success('代理已添加')
      setUrl('')
      setLabel('')
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ['proxy-pool'] })
    },
    onError: (error) => toast.error('添加失败: ' + extractErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProxy,
    onSuccess: () => {
      toast.success('代理已删除')
      queryClient.invalidateQueries({ queryKey: ['proxy-pool'] })
    },
    onError: (error) => toast.error('删除失败: ' + extractErrorMessage(error)),
  })

  const checkMutation = useMutation({
    mutationFn: checkProxy,
    onMutate: (id) => setCheckingId(id),
    onSuccess: (res) => {
      if (res.health === 'healthy') {
        toast.success(`代理可用，延迟 ${res.latencyMs ?? '-'} ms`)
      } else {
        toast.error('代理测试失败')
      }
      queryClient.invalidateQueries({ queryKey: ['proxy-pool'] })
    },
    onError: (error) => toast.error('测试失败: ' + extractErrorMessage(error)),
    onSettled: () => setCheckingId(null),
  })

  const checkAllMutation = useMutation({
    mutationFn: checkAllProxies,
    onSuccess: (res) => {
      toast.success(`测试完成：可用 ${res.healthy}，异常 ${res.unhealthy}`)
      queryClient.invalidateQueries({ queryKey: ['proxy-pool'] })
    },
    onError: (error) => toast.error('全部测试失败: ' + extractErrorMessage(error)),
  })

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault()
    addMutation.mutate()
  }

  const renderHealthBadge = (proxy: ProxyPoolEntry) => {
    if (proxy.health === 'healthy') {
      return (
        <span className="inline-flex h-6 items-center gap-1 rounded-full border border-green-500/50 px-2 text-xs text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3" />
          {proxy.latencyMs != null ? `${proxy.latencyMs}ms` : '可用'}
        </span>
      )
    }
    if (proxy.health === 'unhealthy') {
      return (
        <span className="inline-flex h-6 items-center gap-1 rounded-full border border-destructive/50 px-2 text-xs text-destructive">
          <XCircle className="h-3 w-3" />
          异常
        </span>
      )
    }
    return (
      <span className="inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs text-muted-foreground">
        <HelpCircle className="h-3 w-3" />
        未检测
      </span>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">代理管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">添加后可在账号编辑里选择代理。</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => checkAllMutation.mutate()}
            size="sm"
            variant="outline"
            disabled={proxies.length === 0 || checkAllMutation.isPending}
          >
            <Activity className="h-4 w-4" />
            {checkAllMutation.isPending ? '测试中...' : '全部测试'}
          </Button>
          <Button onClick={() => setOpen(true)} size="sm">
            <Plus className="h-4 w-4" />
            添加代理
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Network className="h-4 w-4" />
            代理列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              加载中...
            </div>
          ) : proxies.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              暂无代理
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {proxies.map(proxy => (
                <div key={proxy.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="truncate font-mono text-sm">{maskProxyUrl(proxy.url)}</span>
                      {renderHealthBadge(proxy)}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{proxy.label || '未命名'}</span>
                      <span>添加于 {new Date(proxy.createdAt).toLocaleString()}</span>
                      {proxy.lastCheckedAt && (
                        <span>检测于 {new Date(proxy.lastCheckedAt).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 shrink-0 text-xs"
                    onClick={() => checkMutation.mutate(proxy.id)}
                    disabled={checkingId === proxy.id}
                    title="测试此代理"
                  >
                    <Activity className="h-3.5 w-3.5 mr-1" />
                    {checkingId === proxy.id ? '测试中' : '测试'}
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8 shrink-0"
                    onClick={() => deleteMutation.mutate(proxy.id)}
                    disabled={deleteMutation.isPending}
                    title="删除代理"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>添加代理</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 py-2">
            <label className="block space-y-1.5">
              <span className="text-[13px] font-medium">代理 URL</span>
              <Input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="socks5://user:pass@host:port"
                autoFocus
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[13px] font-medium">备注</span>
              <Input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="例如：日本 01"
              />
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={addMutation.isPending}>
                取消
              </Button>
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending ? '添加中...' : '添加'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
