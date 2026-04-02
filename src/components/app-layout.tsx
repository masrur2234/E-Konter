'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Users,
  Wallet,
  BarChart3,
  Settings,
  CreditCard,
  Shield,
  UsersRound,
  ScrollText,
  LogOut,
  Menu,
  Bell,
  Moon,
  Sun,
  Store,
  ChevronDown,
  User as UserIcon,
  AlertTriangle,
  Wallet as WalletIcon,
  CreditCard as CreditCardIcon,
  ShoppingCart as ShoppingCartIcon,
  Info,
  CheckCheck,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useStore, type PageType, type Store as StoreType } from '@/lib/store'
import { useNotificationStore, type Notification } from '@/lib/notifications'
import { apiGet } from '@/lib/api'
import { formatRelativeTime } from '@/lib/utils/format'

// ==================== NAVIGATION CONFIG ====================

interface NavItem {
  page: PageType
  label: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'pos', label: 'Kasir / POS', icon: ShoppingCart },
  { page: 'products', label: 'Produk', icon: Package },
  { page: 'transactions', label: 'Transaksi', icon: Receipt },
  { page: 'customers', label: 'Pelanggan', icon: Users },
  { page: 'finance', label: 'Keuangan', icon: Wallet },
  { page: 'reports', label: 'Laporan', icon: BarChart3 },
  { page: 'settings', label: 'Pengaturan', icon: Settings },
  { page: 'subscription', label: 'Langganan', icon: CreditCard },
  { page: 'admin', label: 'Admin Dashboard', icon: Shield, adminOnly: true },
  { page: 'admin-users', label: 'Kelola User', icon: UsersRound, adminOnly: true },
  { page: 'admin-logs', label: 'Log Aktivitas', icon: ScrollText, adminOnly: true },
]

const PAGE_TITLES: Record<PageType, string> = {
  dashboard: 'Dashboard',
  pos: 'Kasir / POS',
  products: 'Produk',
  transactions: 'Transaksi',
  customers: 'Pelanggan',
  finance: 'Keuangan',
  reports: 'Laporan',
  settings: 'Pengaturan',
  subscription: 'Langganan',
  admin: 'Admin Dashboard',
  'admin-users': 'Kelola User',
  'admin-logs': 'Log Aktivitas',
}

// ==================== NOTIFICATION HELPERS ====================

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'low_stock':
      return <AlertTriangle className="size-4 text-amber-500" />
    case 'debt_reminder':
      return <WalletIcon className="size-4 text-red-500" />
    case 'subscription_expiring':
      return <CreditCardIcon className="size-4 text-orange-500" />
    case 'transaction':
      return <ShoppingCartIcon className="size-4 text-emerald-500" />
    case 'system':
      return <Info className="size-4 text-blue-500" />
    default:
      return <Bell className="size-4 text-muted-foreground" />
  }
}

// ==================== SIDEBAR CONTENT ====================

function SidebarContent({
  currentPage,
  activeStoreId,
  stores,
  user,
  setActivePage,
  setActiveStore,
  handleLogout,
  onNavigate,
}: {
  currentPage: PageType
  activeStoreId: string | null
  stores: StoreType[]
  user: { name: string; role: string; email: string; avatar?: string } | null
  setActivePage: (page: PageType) => void
  setActiveStore: (id: string) => void
  handleLogout: () => void
  onNavigate?: () => void
}) {
  const activeStore = stores.find((s) => s.id === activeStoreId)
  const isAdmin = user?.role === 'super_admin'

  const filteredNavItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)

  const handleNavClick = (page: PageType) => {
    setActivePage(page)
    onNavigate?.()
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Store Header */}
      <div className="p-4 pb-2">
        {stores.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between gap-2 h-auto py-2.5 px-3 font-medium"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Store className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="truncate text-sm">{activeStore?.name || 'Pilih Toko'}</span>
                </div>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Ganti Toko</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {stores.map((store) => (
                <DropdownMenuItem
                  key={store.id}
                  onClick={() => setActiveStore(store.id)}
                  className={cn(
                    'cursor-pointer',
                    store.id === activeStoreId && 'bg-accent'
                  )}
                >
                  <Store className="size-4 mr-2" />
                  <span className="truncate">{store.name}</span>
                  {store.id === activeStoreId && (
                    <Badge variant="secondary" className="ml-auto text-[10px] px-1.5">
                      Aktif
                    </Badge>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2 px-1 py-1">
            <Store className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-medium truncate">{activeStore?.name || 'Toko'}</span>
          </div>
        )}
      </div>

      <Separator className="mx-4 w-auto" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-2">
        <nav className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = currentPage === item.page
            const Icon = item.icon

            return (
              <Tooltip key={item.page}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start gap-3 h-10 px-3 text-sm font-normal',
                      isActive && 'font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/70'
                    )}
                    onClick={() => handleNavClick(item.page)}
                  >
                    <Icon
                      className={cn(
                        'size-4 shrink-0',
                        isActive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-muted-foreground'
                      )}
                    />
                    <span>{item.label}</span>
                    {item.adminOnly && (
                      <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 border-amber-300 text-amber-600 dark:border-amber-600 dark:text-amber-400">
                        Admin
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="lg:hidden">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </nav>
      </ScrollArea>

      {/* User Info & Logout */}
      <Separator />
      <div className="p-3 space-y-1">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-md">
            <Avatar className="size-8">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate capitalize">
                {user.role === 'super_admin' ? 'Super Admin' : user.role}
              </p>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-10 px-3 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          <span>Keluar</span>
        </Button>
      </div>
    </div>
  )
}

// ==================== MAIN APP LAYOUT ====================

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme()
  const currentPage = useStore((s) => s.currentPage)
  const activeStoreId = useStore((s) => s.activeStoreId)
  const stores = useStore((s) => s.stores)
  const user = useStore((s) => s.user)
  const setActivePage = useStore((s) => s.setActivePage)
  const setActiveStore = useStore((s) => s.setActiveStore)
  const logout = useStore((s) => s.logout)

  const sidebarOpen = useStore((s) => s.sidebarOpen)
  const setSidebarOpen = useStore((s) => s.setSidebarOpen)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Notification state
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    setNotifications,
  } = useNotificationStore()

  const activeStore = stores.find((s) => s.id === activeStoreId)
  const isAdmin = user?.role === 'super_admin'

  const handleLogout = () => {
    logout()
  }

  const pageTitle = PAGE_TITLES[currentPage] || 'Dashboard'

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!activeStoreId) return
    try {
      const res = await apiGet<Array<{
        type: Notification['type']
        title: string
        message: string
        link?: string
      }>>(`/api/notifications?storeId=${activeStoreId}`)

      if (res.data && Array.isArray(res.data)) {
        // Convert API response to stored notifications
        const now = new Date()
        const newNotifications: Notification[] = res.data.map((n, i) => ({
          id: `api-${now.getTime()}-${i}`,
          type: n.type,
          title: n.title,
          message: n.message,
          read: false,
          createdAt: now.toISOString(),
          link: n.link,
        }))

        setNotifications(newNotifications)
      }
    } catch {
      // Silently fail - notifications are non-critical
    }
  }, [activeStoreId, setNotifications])

    // Fetch on mount and every 30 seconds (NOT on every page change)
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    if (notification.link) {
      setActivePage(notification.link as PageType)
    }
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r bg-card/50 dark:bg-card/30 transition-all duration-300 shrink-0',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        <div className={cn('flex-1 overflow-hidden', !sidebarOpen && 'overflow-y-auto')}>
          <SidebarContent
            currentPage={currentPage}
            activeStoreId={activeStoreId}
            stores={stores}
            user={user}
            setActivePage={setActivePage}
            setActiveStore={setActiveStore}
            handleLogout={handleLogout}
          />
        </div>
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
          <SidebarContent
            currentPage={currentPage}
            activeStoreId={activeStoreId}
            stores={stores}
            user={user}
            setActivePage={setActivePage}
            setActiveStore={setActiveStore}
            handleLogout={handleLogout}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2.5 lg:px-6 lg:pt-2.5 lg:pb-2.5 shrink-0">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
            <span className="sr-only">Menu</span>
          </Button>

          {/* Collapse button (desktop) */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="size-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>

          {/* Page Title */}
          <h1 className="text-lg font-semibold truncate">{pageTitle}</h1>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Store Badge */}
          {activeStore && (
            <Badge
              variant="outline"
              className="hidden sm:flex items-center gap-1.5 text-xs py-1"
            >
              <Store className="size-3 text-emerald-600 dark:text-emerald-400" />
              <span className="max-w-[120px] truncate">{activeStore.name}</span>
            </Badge>
          )}

          {/* Notification Bell with Dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="size-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                    <span className="sr-only">Notifikasi</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>
                {unreadCount > 0
                  ? `${unreadCount} notifikasi belum dibaca`
                  : 'Tidak ada notifikasi'}
              </TooltipContent>
            </Tooltip>

            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span className="text-sm font-semibold">Notifikasi</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5">
                    {unreadCount} baru
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {notifications.length === 0 ? (
                <div className="py-8 flex flex-col items-center text-muted-foreground">
                  <Bell className="size-8 opacity-30 mb-2" />
                  <p className="text-sm">Tidak ada notifikasi</p>
                </div>
              ) : (
                <>
                  <ScrollArea className="max-h-72">
                    <div className="px-1">
                      {notifications.slice(0, 10).map((notification) => (
                        <DropdownMenuItem
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={cn(
                            'flex items-start gap-3 p-3 cursor-pointer rounded-lg',
                            !notification.read && 'bg-emerald-50/50 dark:bg-emerald-950/20'
                          )}
                        >
                          <div className="mt-0.5 shrink-0">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={cn(
                                'text-sm truncate',
                                !notification.read && 'font-semibold'
                              )}>
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {formatRelativeTime(notification.createdAt)}
                            </p>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  </ScrollArea>

                  <DropdownMenuSeparator />

                  <div className="flex items-center justify-between px-2 py-1">
                    <DropdownMenuItem
                      onClick={markAllAsRead}
                      disabled={unreadCount === 0}
                      className="text-xs cursor-pointer p-1.5"
                    >
                      <CheckCheck className="size-3.5 mr-1.5" />
                      Tandai semua dibaca
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setActivePage('dashboard')}
                      className="text-xs cursor-pointer p-1.5"
                    >
                      Lihat Semua
                    </DropdownMenuItem>
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <Sun className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle tema</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
            </TooltipContent>
          </Tooltip>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2 h-9">
                <Avatar className="size-7">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                    {user?.name ? getInitials(user.name) : '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-sm max-w-[100px] truncate">
                  {user?.name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="normal-case">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setActivePage('settings')}>
                <Settings className="size-4 mr-2" />
                Pengaturan
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => setActivePage('admin')}>
                  <Shield className="size-4 mr-2" />
                  Admin Panel
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="size-4 mr-2" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
