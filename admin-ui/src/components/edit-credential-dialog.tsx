import { useState, useEffect } from 'react'
import { toast } from 'sonner'
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
import type { CredentialStatusItem } from '@/types/api'
import { extractErrorMessage } from '@/lib/utils'

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
  const [proxyUsername, setProxyUsername] = useState('')
  const [proxyPassword, setProxyPassword] = useState('')

  useEffect(() => {
    if (open) {
      setEmail(credential.email ?? '')
      setAuthRegion(credential.authRegion ?? '')
      setApiRegion(credential.apiRegion ?? '')
      setProxyUrl(credential.proxyUrl ?? '')
      setProxyUsername('')
      setProxyPassword('')
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
          proxyUrl: trim(proxyUrl) || null,
          proxyUsername: trim(proxyUsername) || null,
          proxyPassword: trim(proxyPassword) || null,
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
          <DialogTitle>编辑凭据 #{credential.id}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <Field label="备注邮箱">
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
              label="代理 URL"
              hint="留空表示直连；支持 http(s):// 和 socks5://"
            >
              <Input
                value={proxyUrl}
                onChange={(e) => setProxyUrl(e.target.value)}
                placeholder="socks5://127.0.0.1:1080"
                disabled={isPending}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="代理用户名">
                <Input
                  value={proxyUsername}
                  onChange={(e) => setProxyUsername(e.target.value)}
                  placeholder="可选"
                  disabled={isPending}
                  autoComplete="off"
                />
              </Field>
              <Field label="代理密码">
                <Input
                  type="password"
                  value={proxyPassword}
                  onChange={(e) => setProxyPassword(e.target.value)}
                  placeholder="可选"
                  disabled={isPending}
                  autoComplete="new-password"
                />
              </Field>
            </div>
            <p className="text-[11px] text-muted-foreground">
              留空用户名/密码表示沿用现有值，提交时会被忽略；如需清空请直接清空 URL。
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
