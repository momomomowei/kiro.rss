import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useCredentialModels } from '@/hooks/use-credentials'
import { extractErrorMessage } from '@/lib/utils'

interface AvailableModelsDialogProps {
  credentialId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('zh-CN').format(n)
}

export function AvailableModelsDialog({
  credentialId,
  open,
  onOpenChange,
}: AvailableModelsDialogProps) {
  const { data, isLoading, error } = useCredentialModels(open ? credentialId : null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>凭据 #{credentialId} 可用模型</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>
        )}

        {error && (
          <div className="py-8 text-center text-sm text-destructive">
            读取可用模型失败: {extractErrorMessage(error)}
          </div>
        )}

        {data && data.models.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            该凭据当前没有可用模型
          </div>
        )}

        {data && data.models.length > 0 && (
          <div className="max-h-[60vh] space-y-2 overflow-auto pr-1">
            {data.models.map((model) => (
              <div
                key={model.modelId}
                className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {model.modelName || model.modelId}
                  </span>
                  {model.maxInputTokens != null && (
                    <Badge variant="secondary" className="shrink-0 tabular-nums">
                      {formatNumber(model.maxInputTokens)}
                    </Badge>
                  )}
                </div>
                {model.modelName && model.modelName !== model.modelId && (
                  <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                    {model.modelId}
                  </div>
                )}
                {model.description && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {model.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
