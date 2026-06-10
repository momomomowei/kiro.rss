import { useState, useEffect, lazy, Suspense } from 'react'
import { storage } from '@/lib/storage'
import { LoginPage } from '@/components/login-page'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Activity, KeyRound, Server, LogOut, Moon, Sun } from 'lucide-react'

const Dashboard = lazy(() =>
  import('@/components/dashboard').then((m) => ({ default: m.Dashboard })),
)
const OverviewPage = lazy(() =>
  import('@/components/overview-page').then((m) => ({ default: m.OverviewPage })),
)
const KeysPage = lazy(() =>
  import('@/components/keys-page').then((m) => ({ default: m.KeysPage })),
)

type Tab = 'overview' | 'credentials' | 'keys'

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: '概览', icon: <Activity className="h-3.5 w-3.5" /> },
  { key: 'credentials', label: '凭据管理', icon: <Server className="h-3.5 w-3.5" /> },
  { key: 'keys', label: '密钥管理', icon: <KeyRound className="h-3.5 w-3.5" /> },
]

function readTabFromHash(): Tab {
  const h = window.location.hash.replace(/^#\/?/, '')
  if (h === 'credentials' || h === 'keys' || h === 'overview') return h
  return 'overview'
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [tab, setTab] = useState<Tab>(readTabFromHash)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return false
  })

  useEffect(() => {
    if (storage.getApiKey()) setIsLoggedIn(true)
  }, [])

  useEffect(() => {
    const onHash = () => setTab(readTabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const switchTab = (next: Tab) => {
    window.location.hash = `#/${next}`
    setTab(next)
  }

  const handleLogin = () => setIsLoggedIn(true)
  const handleLogout = () => {
    storage.removeApiKey()
    setIsLoggedIn(false)
  }
  const toggleDarkMode = () => {
    setDarkMode((v) => !v)
    document.documentElement.classList.toggle('dark')
  }

  if (!isLoggedIn) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster position="top-center" />
      </>
    )
  }

  return (
    <>
      {/* 顶部 Tab 导航 */}
      <header className="sticky top-0 z-50 w-full glass">
        <div className="mx-auto max-w-[1400px] flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-semibold">
              K
            </div>
            <span className="font-semibold tracking-tight">Kiro Admin</span>
            <div className="ml-4 hidden sm:flex items-center gap-1 rounded-full border border-border/60 p-0.5">
              {TABS.map((t) => (
                <Button
                  key={t.key}
                  size="sm"
                  variant={tab === t.key ? 'default' : 'ghost'}
                  className="h-7 rounded-full px-3 text-xs"
                  onClick={() => switchTab(t.key)}
                >
                  {t.icon}
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              title="切换主题"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="退出登录"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* 移动端 Tab 行 */}
        <div className="sm:hidden mx-auto max-w-[1400px] flex items-center gap-1 px-4 pb-2">
          {TABS.map((t) => (
            <Button
              key={t.key}
              size="sm"
              variant={tab === t.key ? 'default' : 'ghost'}
              className="h-7 rounded-full px-3 text-xs flex-1"
              onClick={() => switchTab(t.key)}
            >
              {t.icon}
              {t.label}
            </Button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 md:px-8 py-8">
        <Suspense
          fallback={
            <div className="text-sm text-muted-foreground">加载中…</div>
          }
        >
          {tab === 'overview' && <OverviewPage />}
          {tab === 'credentials' && <Dashboard onLogout={handleLogout} />}
          {tab === 'keys' && <KeysPage />}
        </Suspense>
      </main>

      <Toaster position="top-center" />
    </>
  )
}

export default App
