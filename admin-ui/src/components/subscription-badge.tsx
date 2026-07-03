import { Crown, Gem, Sparkles, Tag, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SubscriptionBadgeProps {
  title?: string | null
  size?: 'sm' | 'md'
  className?: string
}

type Tier = 'free' | 'pro' | 'pro_plus' | 'power' | 'unknown'

function detectTier(title?: string | null): Tier {
  if (!title) return 'unknown'
  const upper = title.toUpperCase()
  if (upper.includes('POWER')) return 'power'
  if (upper.includes('PRO+') || upper.includes('PRO PLUS')) return 'pro_plus'
  if (upper.includes('PRO')) return 'pro'
  if (upper.includes('FREE')) return 'free'
  return 'unknown'
}

function getTierStyle(tier: Tier, original?: string | null) {
  const fallback = original?.replace(/^KIRO\s+/i, '').trim() || '未知'
  switch (tier) {
    case 'power':
      return {
        Icon: Gem,
        label: 'POWER',
        className: 'border-transparent bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-[0_2px_8px_-2px_rgba(168,85,247,0.5)]',
      }
    case 'pro_plus':
      return {
        Icon: Crown,
        label: 'PRO+',
        className: 'border-transparent bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_2px_8px_-2px_rgba(245,158,11,0.5)]',
      }
    case 'pro':
      return {
        Icon: Sparkles,
        label: 'PRO',
        className: 'border-transparent bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-[0_2px_8px_-2px_rgba(59,130,246,0.45)]',
      }
    case 'free':
      return {
        Icon: Zap,
        label: 'FREE',
        className: 'border border-border/70 bg-secondary text-muted-foreground',
      }
    default:
      return {
        Icon: Tag,
        label: fallback,
        className: 'border border-border/70 bg-muted text-muted-foreground',
      }
  }
}

export function SubscriptionBadge({ title, size = 'sm', className }: SubscriptionBadgeProps) {
  const { Icon, label, className: tierClassName } = getTierStyle(detectTier(title), title)
  const sizing =
    size === 'md'
      ? 'h-7 gap-1.5 px-2.5 text-[12px] [&_svg]:h-3.5 [&_svg]:w-3.5'
      : 'h-5 gap-1 px-1.5 text-[10px] [&_svg]:h-3 [&_svg]:w-3'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold uppercase tracking-wide',
        sizing,
        tierClassName,
        className,
      )}
      title={title || undefined}
    >
      <Icon />
      <span>{label}</span>
    </span>
  )
}
