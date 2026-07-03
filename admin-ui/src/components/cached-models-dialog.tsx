import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useModelCache } from '@/hooks/use-credentials'

interface CachedModelsDialogProps {
  credentialId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CachedModelsDialog({
  credentialId,
  open,
  onOpenChange,
}: CachedModelsDialogProps) {
  const { data, isLoading, error } = useModelCache(open)
  const models = credentialId != null ? data?.accounts[String(credentialId)] ?? [] : []
  const cachedAt = data?.cachedAt
    ? new Date(data.cachedAt * 1000).toLocaleString('zh-CN')
    : '尚未缓存'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>凭据 #{credentialId} 已缓存模型</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>
        )}

        {error && (
          <div className="py-8 text-center text-sm text-destructive">读取模型缓存失败</div>
        )}

        {data && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">缓存时间</span>
              <span className="truncate pl-3 font-medium">{cachedAt}</span>
            </div>

            {models.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                该凭据还没有已缓存模型，请先刷新模型缓存
              </div>
            ) : (
              <div className="max-h-[60vh] space-y-2 overflow-auto pr-1">
                {models.map((modelId) => (
                  <div
                    key={modelId}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2.5"
                  >
                    <span className="truncate font-mono text-xs">{modelId}</span>
                    <Badge variant="secondary" className="shrink-0">已缓存</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
