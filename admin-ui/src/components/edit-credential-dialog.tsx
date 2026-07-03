import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUpdateCredential } from '@/hooks/use-credentials'
import { getProxyPool } from '@/api/credentials'
import type { CredentialStatusItem } from '@/types/api'
import { extractErrorMessage } from '@/lib/utils'
import { maskProxyUrl } from '@/lib/proxy-store'

interface EditCredentialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  credential: CredentialStatusItem
}

export function EditCredentialDialog({
  open,
  onOpenChange,
  credential,
}: EditCredentialDialogProps) {
  const [email, setEmail] = useState('')
  const [authRegion, setAuthRegion] = useState('')
  const [apiRegion, setApiRegion] = useState('')
  const [proxyUrl, setProxyUrl] = useState('')
  const { data: proxyPool } = useQuery({
    queryKey: ['proxy-pool'],
    queryFn: getProxyPool,
    enabled: open,
  })

  useEffect(() => {
    if (open) {
      setEmail(credential.email ?? '')
      setAuthRegion(credential.authRegion ?? '')
      setApiRegion(credential.apiRegion ?? '')
      setProxyUrl(credential.proxyUrl || 'direct')
    }
  }, [open, credential])

  const { mutate, isPending } = useUpdateCredential()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trim = (s: string) => s.trim()
    mutate(
      {
        id: credential.id,
        req: {
          email: trim(email) || null,
          authRegion: trim(authRegion) || null,
          apiRegion: trim(apiRegion) || null,
          proxyUrl: trim(proxyUrl) || 'direct',
        },
      },
      {
        onSuccess: (res) => {
          toast.success(res.message || '更新成功')
          onOpenChange(false)
        },
        onError: (err) => {
          toast.error('更新失败: ' + extractErrorMessage(err))
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <span className="block truncate">
              {credential.email || `凭据 #${credential.id}`}
            </span>
            {credential.email && (
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                凭据 #{credential.id}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <Field label="邮箱">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@domain.com"
              disabled={isPending}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Auth Region" hint="OIDC token 刷新区域">
              <Input
                value={authRegion}
                onChange={(e) => setAuthRegion(e.target.value)}
                placeholder="us-east-1"
                disabled={isPending}
              />
            </Field>
            <Field label="API Region" hint="getUsageLimits 区域">
              <Input
                value={apiRegion}
                onChange={(e) => setApiRegion(e.target.value)}
                placeholder="us-east-1"
                disabled={isPending}
              />
            </Field>
          </div>

          <div className="space-y-3 rounded-xl border border-border/60 p-3 bg-muted/30">
            <div className="text-[13px] font-medium">代理设置</div>
            <Field
              label="账号代理"
              hint="从代理管理中选择"
            >
              <select
                value={proxyUrl}
                onChange={(e) => setProxyUrl(e.target.value)}
                disabled={isPending}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="direct">直连</option>
                {proxyPool?.proxies.map(proxy => (
                  <option key={proxy.id} value={proxy.url}>
                    {proxy.label ? `${proxy.label} - ` : ''}{maskProxyUrl(proxy.url)}
                  </option>
                ))}
              </select>
            </Field>
            <p className="text-[11px] text-muted-foreground">
              代理地址在“代理管理”页面添加；选择“直连”表示不使用代理。
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '保存中…' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium">{label}</span>
        {hint && (
          <span className="text-[11px] text-muted-foreground">{hint}</span>
        )}
      </div>
      {children}
    </label>
  )
}
