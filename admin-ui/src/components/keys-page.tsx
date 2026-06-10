import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, Eye, EyeOff, KeyRound, Shield, RefreshCw } from 'lucide-react'
import { useAdminKeys } from '@/hooks/use-credentials'
import { extractErrorMessage } from '@/lib/utils'

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

export function KeysPage() {
  const { data, isLoading, error, refetch, isFetching } = useAdminKeys()

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight leading-tight">
            密钥管理
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            查看并复制 API Key（用于业务调用）和 Admin API Key（用于管理后台）
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-full"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
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

      <Card className="glass-card mt-6">
        <CardContent className="p-5 space-y-2 text-[13px] text-muted-foreground">
          <p className="font-medium text-foreground">使用方式</p>
          <p>
            <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted">
              Authorization: Bearer &lt;API Key&gt;
            </span>{' '}
            或{' '}
            <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted">
              x-api-key: &lt;API Key&gt;
            </span>
          </p>
          <p>密钥保存在服务端 config.json，本页面仅做查看与复制。</p>
        </CardContent>
      </Card>
    </div>
  )
}
