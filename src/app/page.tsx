'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '@/lib/store'
import { apiGet } from '@/lib/api'
import type { User, Store as StoreType } from '@/lib/store'
import { AuthPage } from '@/components/auth-page'
import { AppLayout } from '@/components/app-layout'
import { DashboardPage } from '@/components/dashboard-page'
import PosPage from '@/components/pos-page'
import ProductsPage from '@/components/products-page'
import TransactionsPage from '@/components/transactions-page'
import CustomersPage from '@/components/customers-page'
import FinancePage from '@/components/finance-page'
import ReportsPage from '@/components/reports-page'
import SettingsPage from '@/components/settings-page'
import SubscriptionPage from '@/components/subscription-page'
import AdminPage from '@/components/admin-page'
import { AdminUsersPage, AdminLogsPage } from '@/components/admin-pages'
import { Skeleton } from '@/components/ui/skeleton'

// ==================== MAIN ROUTER ====================

export default function Home() {
  const isAuthenticated = useStore((s) => s.isAuthenticated)
  const user = useStore((s) => s.user)
  const activeStoreId = useStore((s) => s.activeStoreId)
  const currentPage = useStore((s) => s.currentPage)
  const token = useStore((s) => s.token)
  const loginFn = useStore((s) => s.login)
  const logoutFn = useStore((s) => s.logout)
  const setStoresFn = useStore((s) => s.setStores)
  const setActiveStoreFn = useStore((s) => s.setActiveStore)

  const [ready, setReady] = useState(false)
  const initializedRef = useRef(false)

  const markReady = useCallback(() => {
    setReady(true)
  }, [])

  // Handle hydration and session check
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const finish = () => requestAnimationFrame(markReady)

    // If we have a token but no user, try to restore session
    if (token && !user) {
      apiGet<{
        user: User
        stores: StoreType[]
      }>('/api/auth/session').then((res) => {
        if (res.data && res.data.user) {
          loginFn(res.data.user, token)
          if (res.data.stores) {
            setStoresFn(res.data.stores)
            if (!activeStoreId && res.data.stores.length > 0) {
              setActiveStoreFn(res.data.stores[0].id)
            }
          }
        } else {
          logoutFn()
        }
        finish()
      }).catch(() => {
        logoutFn()
        finish()
      })
    } else {
      finish()
    }
  }, [token, user, activeStoreId, loginFn, logoutFn, setStoresFn, setActiveStoreFn, markReady])

  // Show loading screen while hydrating or checking session
  if (!ready) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 animate-pulse" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    )
  }

  // Show auth page if not authenticated
  if (!isAuthenticated || !user) {
    return <AuthPage />
  }

  // Show store selection prompt if no active store
  if (!activeStoreId) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🏪</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">Tidak Ada Toko</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Akun Anda belum memiliki toko aktif. Silakan buat toko baru di halaman pengaturan atau hubungi administrator.
          </p>
          <button
            onClick={() => useStore.getState().logout()}
            className="text-sm text-emerald-600 hover:underline dark:text-emerald-400"
          >
            Kembali ke halaman login
          </button>
        </div>
      </div>
    )
  }

  // Render page content based on currentPage
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />
      case 'pos':
        return <PosPage />
      case 'products':
        return <ProductsPage />
      case 'transactions':
        return <TransactionsPage />
      case 'customers':
        return <CustomersPage />
      case 'finance':
        return <FinancePage />
      case 'reports':
        return <ReportsPage />
      case 'settings':
        return <SettingsPage />
      case 'subscription':
        return <SubscriptionPage />
      case 'admin':
        return <AdminPage />
      case 'admin-users':
        return <AdminUsersPage />
      case 'admin-logs':
        return <AdminLogsPage />
      default:
        return <DashboardPage />
    }
  }

  // Render authenticated app
  return (
    <AppLayout>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>
    </AppLayout>
  )
}
