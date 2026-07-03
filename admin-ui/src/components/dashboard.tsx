import { useState, useEffect, useRef } from 'react'
import { LayoutGrid, List, RefreshCw, Upload, Trash2, CheckCircle2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CredentialCard } from '@/components/credential-card'
import { BatchImportDialog } from '@/components/batch-import-dialog'
import { BatchVerifyDialog, type VerifyResult } from '@/components/batch-verify-dialog'
import { useCredentials, useDeleteCredential } from '@/hooks/use-credentials'
import { getCredentialBalance, forceRefreshToken, refreshModelCache } from '@/api/credentials'
import { extractErrorMessage } from '@/lib/utils'
import type { BalanceResponse } from '@/types/api'

interface DashboardProps {
  onLogout: () => void
}

type CredentialViewMode = 'card' | 'list'
const VIEW_MODE_STORAGE_KEY = 'kiro-admin-credential-view-mode'

function readCredentialViewMode(): CredentialViewMode {
  if (typeof window === 'undefined') return 'card'
  return window.localStorage.getItem(VIEW_MODE_STORAGE_KEY) === 'list' ? 'list' : 'card'
}

export function Dashboard({ onLogout }: DashboardProps) {
  const [batchImportDialogOpen, setBatchImportDialogOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyProgress, setVerifyProgress] = useState({ current: 0, total: 0 })
  const [verifyResults, setVerifyResults] = useState<Map<number, VerifyResult>>(new Map())
  const [balanceMap, setBalanceMap] = useState<Map<number, BalanceResponse>>(new Map())
  const [loadingBalanceIds, setLoadingBalanceIds] = useState<Set<number>>(new Set())
  const [queryingInfo, setQueryingInfo] = useState(false)
  const [queryInfoProgress, setQueryInfoProgress] = useState({ current: 0, total: 0 })
  const [refreshingModelCache, setRefreshingModelCache] = useState(false)
  const [batchRefreshing, setBatchRefreshing] = useState(false)
  const [batchRefreshProgress, setBatchRefreshProgress] = useState({ current: 0, total: 0 })
  const cancelVerifyRef = useRef(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<CredentialViewMode>(readCredentialViewMode)
  const itemsPerPage = 12

  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch } = useCredentials()
  const { mutate: deleteCredential } = useDeleteCredential()

  // 计算分页
  const totalPages = Math.ceil((data?.credentials.length || 0) / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentCredentials = data?.credentials.slice(startIndex, endIndex) || []
  const disabledCredentialCount = data?.credentials.filter(credential => credential.disabled).length || 0
  const selectedDisabledCount = Array.from(selectedIds).filter(id => {
    const credential = data?.credentials.find(c => c.id === id)
    return Boolean(credential?.disabled)
  }).length
  const currentCredential = data?.credentials.find(c => c.id === data.currentId)

  const handleRefreshModelCache = async () => {
    setRefreshingModelCache(true)
    try {
      const res = await refreshModelCache()
      if (res.failed === 0) {
        toast.success(`模型缓存刷新完成：成功 ${res.refreshed} 个凭据，缓存 ${res.count} 个模型`)
      } else {
        toast.warning(`模型缓存刷新完成：成功 ${res.refreshed} 个，失败 ${res.failed} 个，缓存 ${res.count} 个模型`)
      }
    } catch (err) {
      toast.error('刷新模型缓存失败: ' + extractErrorMessage(err))
    } finally {
      setRefreshingModelCache(false)
    }
  }

  // 当凭据列表变化时重置到第一页
  useEffect(() => {
    setCurrentPage(1)
  }, [data?.credentials.length])

  useEffect(() => {
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode)
  }, [viewMode])

  // 只保留当前仍存在的凭据缓存，避免删除后残留旧数据
  useEffect(() => {
    if (!data?.credentials) {
      setBalanceMap(new Map())
      setLoadingBalanceIds(new Set())
      return
    }

    const validIds = new Set(data.credentials.map(credential => credential.id))

    setBalanceMap(prev => {
      const next = new Map<number, BalanceResponse>()
      let changed = false
      prev.forEach((value, id) => {
        if (validIds.has(id)) {
          next.set(id, value)
        } else {
          changed = true
        }
      })
      data.credentials.forEach(credential => {
        if (credential.balance && next.get(credential.id) !== credential.balance) {
          next.set(credential.id, credential.balance)
          changed = true
        }
      })
      return changed ? next : prev
    })

    setLoadingBalanceIds(prev => {
      if (prev.size === 0) {
        return prev
      }
      const next = new Set<number>()
      prev.forEach(id => {
        if (validIds.has(id)) {
          next.add(id)
        }
      })
      return next.size === prev.size ? prev : next
    })
  }, [data?.credentials])

  const handleViewBalance = async (id: number) => {
    setLoadingBalanceIds(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })

    try {
      const balance = await getCredentialBalance(id, true)
      setBalanceMap(prev => {
        const next = new Map(prev)
        next.set(id, balance)
        return next
      })
      if (balance.remaining <= 0 || balance.usagePercentage >= 100) {
        queryClient.invalidateQueries({ queryKey: ['credentials'] })
      }
    } catch (error) {
      toast.error('查询余额失败: ' + extractErrorMessage(error))
    } finally {
      setLoadingBalanceIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleLogout = () => onLogout()

  // 选择管理
  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  const selectAll = () => {
    setSelectedIds(new Set(data?.credentials.map(credential => credential.id) || []))
  }

  // 批量删除（仅删除已禁用项）
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error('请先选择要删除的凭据')
      return
    }

    const disabledIds = Array.from(selectedIds).filter(id => {
      const credential = data?.credentials.find(c => c.id === id)
      return Boolean(credential?.disabled)
    })

    if (disabledIds.length === 0) {
      toast.error('选中的凭据中没有已禁用项')
      return
    }

    const skippedCount = selectedIds.size - disabledIds.length
    const skippedText = skippedCount > 0 ? `（将跳过 ${skippedCount} 个未禁用凭据）` : ''

    if (!confirm(`确定要删除 ${disabledIds.length} 个已禁用凭据吗？此操作无法撤销。${skippedText}`)) {
      return
    }

    let successCount = 0
    let failCount = 0

    for (const id of disabledIds) {
      try {
        await new Promise<void>((resolve, reject) => {
          deleteCredential(id, {
            onSuccess: () => {
              successCount++
              resolve()
            },
            onError: (err) => {
              failCount++
              reject(err)
            }
          })
        })
      } catch (error) {
        // 错误已在 onError 中处理
      }
    }

    const skippedResultText = skippedCount > 0 ? `，已跳过 ${skippedCount} 个未禁用凭据` : ''

    if (failCount === 0) {
      toast.success(`成功删除 ${successCount} 个已禁用凭据${skippedResultText}`)
    } else {
      toast.warning(`删除已禁用凭据：成功 ${successCount} 个，失败 ${failCount} 个${skippedResultText}`)
    }

    deselectAll()
  }

  // 批量刷新 Token
  const handleBatchForceRefresh = async () => {
    if (selectedIds.size === 0) {
      toast.error('请先选择要刷新的凭据')
      return
    }

    const enabledIds = Array.from(selectedIds).filter(id => {
      const cred = data?.credentials.find(c => c.id === id)
      return cred && !cred.disabled
    })

    if (enabledIds.length === 0) {
      toast.error('选中的凭据中没有启用的凭据')
      return
    }

    setBatchRefreshing(true)
    setBatchRefreshProgress({ current: 0, total: enabledIds.length })

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < enabledIds.length; i++) {
      try {
        await forceRefreshToken(enabledIds[i])
        successCount++
      } catch {
        failCount++
      }
      setBatchRefreshProgress({ current: i + 1, total: enabledIds.length })
    }

    setBatchRefreshing(false)
    queryClient.invalidateQueries({ queryKey: ['credentials'] })

    if (failCount === 0) {
      toast.success(`成功刷新 ${successCount} 个凭据的 Token`)
    } else {
      toast.warning(`刷新 Token：成功 ${successCount} 个，失败 ${failCount} 个`)
    }

    deselectAll()
  }

  // 一键清除所有已禁用凭据
  const handleClearAll = async () => {
    if (!data?.credentials || data.credentials.length === 0) {
      toast.error('没有可清除的凭据')
      return
    }

    const disabledCredentials = data.credentials.filter(credential => credential.disabled)

    if (disabledCredentials.length === 0) {
      toast.error('没有可清除的已禁用凭据')
      return
    }

    if (!confirm(`确定要清除所有 ${disabledCredentials.length} 个已禁用凭据吗？此操作无法撤销。`)) {
      return
    }

    let successCount = 0
    let failCount = 0

    for (const credential of disabledCredentials) {
      try {
        await new Promise<void>((resolve, reject) => {
          deleteCredential(credential.id, {
            onSuccess: () => {
              successCount++
              resolve()
            },
            onError: (err) => {
              failCount++
              reject(err)
            }
          })
        })
      } catch (error) {
        // 错误已在 onError 中处理
      }
    }

    if (failCount === 0) {
      toast.success(`成功清除所有 ${successCount} 个已禁用凭据`)
    } else {
      toast.warning(`清除已禁用凭据：成功 ${successCount} 个，失败 ${failCount} 个`)
    }

    deselectAll()
  }

  // 查询当前页凭据信息（逐个查询，避免瞬时并发）
  const handleQueryCurrentPageInfo = async () => {
    if (currentCredentials.length === 0) {
      toast.error('当前页没有可查询的凭据')
      return
    }

    const ids = currentCredentials
      .filter(credential => !credential.disabled)
      .map(credential => credential.id)

    if (ids.length === 0) {
      toast.error('当前页没有可查询的启用凭据')
      return
    }

    setQueryingInfo(true)
    setQueryInfoProgress({ current: 0, total: ids.length })

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]

      setLoadingBalanceIds(prev => {
        const next = new Set(prev)
        next.add(id)
        return next
      })

      try {
        const balance = await getCredentialBalance(id, true)
        successCount++

        setBalanceMap(prev => {
          const next = new Map(prev)
          next.set(id, balance)
          return next
        })
      } catch (error) {
        failCount++
      } finally {
        setLoadingBalanceIds(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }

      setQueryInfoProgress({ current: i + 1, total: ids.length })
    }

    setQueryingInfo(false)
    queryClient.invalidateQueries({ queryKey: ['credentials'] })

    if (failCount === 0) {
      toast.success(`查询完成：成功 ${successCount}/${ids.length}`)
    } else {
      toast.warning(`查询完成：成功 ${successCount} 个，失败 ${failCount} 个`)
    }
  }

  // 批量验活
  const handleBatchVerify = async () => {
    if (selectedIds.size === 0) {
      toast.error('请先选择要验活的凭据')
      return
    }

    // 初始化状态
    setVerifying(true)
    cancelVerifyRef.current = false
    const ids = Array.from(selectedIds)
    setVerifyProgress({ current: 0, total: ids.length })

    let successCount = 0

    // 初始化结果，所有凭据状态为 pending
    const initialResults = new Map<number, VerifyResult>()
    ids.forEach(id => {
      initialResults.set(id, { id, status: 'pending' })
    })
    setVerifyResults(initialResults)
    setVerifyDialogOpen(true)

    // 开始验活
    for (let i = 0; i < ids.length; i++) {
      // 检查是否取消
      if (cancelVerifyRef.current) {
        toast.info('已取消验活')
        break
      }

      const id = ids[i]

      // 更新当前凭据状态为 verifying
      setVerifyResults(prev => {
        const newResults = new Map(prev)
        newResults.set(id, { id, status: 'verifying' })
        return newResults
      })

      try {
        const balance = await getCredentialBalance(id)
        successCount++

        // 更新为成功状态
        setVerifyResults(prev => {
          const newResults = new Map(prev)
          newResults.set(id, {
            id,
            status: 'success',
            usage: `${balance.currentUsage}/${balance.usageLimit}`
          })
          return newResults
        })
      } catch (error) {
        // 更新为失败状态
        setVerifyResults(prev => {
          const newResults = new Map(prev)
          newResults.set(id, {
            id,
            status: 'failed',
            error: extractErrorMessage(error)
          })
          return newResults
        })
      }

      // 更新进度
      setVerifyProgress({ current: i + 1, total: ids.length })

      // 添加延迟防止封号（最后一个不需要延迟）
      if (i < ids.length - 1 && !cancelVerifyRef.current) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    setVerifying(false)

    if (!cancelVerifyRef.current) {
      toast.success(`验活完成：成功 ${successCount}/${ids.length}`)
    }
  }

  // 取消验活
  const handleCancelVerify = () => {
    cancelVerifyRef.current = true
    setVerifying(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="text-red-500 mb-4">加载失败</div>
            <p className="text-muted-foreground mb-4">{(error as Error).message}</p>
            <div className="space-x-2">
              <Button onClick={() => refetch()}>重试</Button>
              <Button variant="outline" onClick={handleLogout}>重新登录</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      {/* 主内容 */}
      <main>
        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                凭据总数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                可用凭据
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{data?.available || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                当前活跃
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex min-w-0 items-center justify-between gap-3">
                <span
                  className="min-w-0 truncate text-sm font-semibold leading-5"
                  title={currentCredential?.email || (data?.currentId ? `#${data.currentId}` : undefined)}
                >
                  {currentCredential?.email || (data?.currentId ? `#${data.currentId}` : '-')}
                </span>
                <Badge variant="success" className="shrink-0">活跃</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 凭据列表 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold">凭据管理</h2>
                <div className="flex items-center gap-2">
                  {selectedIds.size > 0 && (
                    <Badge variant="secondary">已选择 {selectedIds.size} 个</Badge>
                  )}
                  {data?.credentials && data.credentials.length > 0 && selectedIds.size < data.credentials.length && (
                    <Button onClick={selectAll} size="sm" variant="ghost">
                      全部选择
                    </Button>
                  )}
                  {selectedIds.size > 0 && (
                    <Button onClick={deselectAll} size="sm" variant="ghost">
                      取消选择
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5">
                <div className="inline-flex h-8 items-center rounded-md border border-input bg-background p-0.5">
                  <Button
                    type="button"
                    size="icon"
                    variant={viewMode === 'card' ? 'default' : 'ghost'}
                    className="h-7 w-7"
                    onClick={() => setViewMode('card')}
                    title="卡片视图"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    className="h-7 w-7"
                    onClick={() => setViewMode('list')}
                    title="列表视图"
                  >
                    <List className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {selectedIds.size === 0 && data?.credentials && data.credentials.length > 0 && (
                  <Button
                    onClick={handleQueryCurrentPageInfo}
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs"
                    disabled={queryingInfo}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${queryingInfo ? 'animate-spin' : ''}`} />
                    {queryingInfo ? `刷新中 ${queryInfoProgress.current}/${queryInfoProgress.total}` : '刷新额度'}
                  </Button>
                )}
                {selectedIds.size > 0 && (
                  <>
                    <Button onClick={handleBatchVerify} size="sm" variant="outline" className="h-8 px-2.5 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      批量验活
                    </Button>
                    <Button
                      onClick={handleBatchForceRefresh}
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs"
                      disabled={batchRefreshing}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${batchRefreshing ? 'animate-spin' : ''}`} />
                      {batchRefreshing ? `刷新中 ${batchRefreshProgress.current}/${batchRefreshProgress.total}` : '批量刷新 Token'}
                    </Button>
                    <Button
                      onClick={handleBatchDelete}
                      size="sm"
                      variant="destructive"
                      className="h-8 px-2.5 text-xs"
                      disabled={selectedDisabledCount === 0}
                      title={selectedDisabledCount === 0 ? '只能删除已禁用凭据' : undefined}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      批量删除
                    </Button>
                  </>
                )}
                {verifying && !verifyDialogOpen && (
                  <Button onClick={() => setVerifyDialogOpen(true)} size="sm" variant="secondary" className="h-8 px-2.5 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    验活中 {verifyProgress.current}/{verifyProgress.total}
                  </Button>
                )}
                {selectedIds.size === 0 && data?.credentials && data.credentials.length > 0 && (
                  <Button
                    onClick={handleRefreshModelCache}
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs"
                    disabled={refreshingModelCache}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshingModelCache ? 'animate-spin' : ''}`} />
                    刷新模型缓存
                  </Button>
                )}
                {selectedIds.size === 0 && data?.credentials && data.credentials.length > 0 && (
                  <Button
                    onClick={handleClearAll}
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs text-destructive hover:text-destructive"
                    disabled={disabledCredentialCount === 0}
                    title={disabledCredentialCount === 0 ? '没有可清除的已禁用凭据' : undefined}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    清除已禁用
                  </Button>
                )}
                {selectedIds.size === 0 && (
                  <Button onClick={() => setBatchImportDialogOpen(true)} size="sm" variant="outline" className="h-8 px-2.5 text-xs">
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    批量导入
                  </Button>
                )}
              </div>
            </div>
          {data?.credentials.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                暂无凭据
              </CardContent>
            </Card>
          ) : (
            <>
              <div className={viewMode === 'card' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' : 'space-y-2'}>
                {currentCredentials.map((credential) => (
                  <CredentialCard
                    key={credential.id}
                    credential={credential}
                    onViewBalance={handleViewBalance}
                    selected={selectedIds.has(credential.id)}
                    onToggleSelect={() => toggleSelect(credential.id)}
                    balance={balanceMap.get(credential.id) || credential.balance || null}
                    loadingBalance={loadingBalanceIds.has(credential.id)}
                    view={viewMode}
                  />
                ))}
              </div>

              {/* 分页控件 */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    上一页
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    第 {currentPage} / {totalPages} 页（共 {data?.credentials.length} 个凭据）
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* 批量导入对话框 */}
      <BatchImportDialog
        open={batchImportDialogOpen}
        onOpenChange={setBatchImportDialogOpen}
      />

      {/* 批量验活对话框 */}
      <BatchVerifyDialog
        open={verifyDialogOpen}
        onOpenChange={setVerifyDialogOpen}
        verifying={verifying}
        progress={verifyProgress}
        results={verifyResults}
        onCancel={handleCancelVerify}
      />
    </div>
  )
}

