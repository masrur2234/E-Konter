'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Users, UserCheck, UserX, ShoppingCart, DollarSign,
  Store, Package, TrendingUp, AlertTriangle, Clock,
  BarChart3, UserCog, FileText, ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { apiGet } from '@/lib/api'
import { useStore } from '@/lib/store'
import { formatCurrency, formatNumber } from '@/lib/utils/format'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'

interface AdminStats {
  users: {
    total: number
    active: number
    suspended: number
    bySubscription: {
      trial: number
      active: number
      expired: number
    }
    recentRegistrations: number
  }
  subscription: {
    planDistribution: { plan: string; count: number }[]
  }
  platform: {
    totalStores: number
    totalTransactions: number
    totalRevenue: number
    totalProducts: number
    totalCustomers: number
  }
  dailyRegistrations: Record<string, number>
}

export default function AdminPage() {
  const { setActivePage } = useStore()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [nearExpiryUsers, setNearExpiryUsers] = useState<Array<{
    id: string
    name: string
    email: string
    subscriptionEnd: string | null
    subscriptionStatus: string
  }>>([])

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<AdminStats>('/api/admin/stats')
      if (res.data) {
        setStats(res.data)
      }
    } catch {
      toast.error('Gagal memuat statistik platform')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchNearExpiry = useCallback(async () => {
    try {
      const res = await apiGet<{
        users: Array<{
          id: string; name: string; email: string
          subscriptionEnd: string | null; subscriptionStatus: string
        }>
      }>('/api/admin/users?limit=50&subscription=active')
      if (res.data) {
        const threeDaysFromNow = new Date()
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
        const nearExpiry = res.data.users.filter((u) => {
          if (!u.subscriptionEnd) return false
          return new Date(u.subscriptionEnd) <= threeDaysFromNow
        })
        setNearExpiryUsers(nearExpiry)
      }
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    fetchStats()
    fetchNearExpiry()
  }, [fetchStats, fetchNearExpiry])

  const statCards = stats ? [
    {
      title: 'Total Pengguna',
      value: formatNumber(stats.users.total),
      icon: Users,
      color: 'text-slate-600 dark:text-slate-300',
      bg: 'bg-slate-100 dark:bg-slate-900/30',
    },
    {
      title: 'Pengguna Aktif',
      value: formatNumber(stats.users.active),
      icon: UserCheck,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      title: 'Pengguna Expired',
      value: formatNumber(stats.users.bySubscription.expired),
      icon: UserX,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
    },
    {
      title: 'Total Transaksi',
      value: formatNumber(stats.platform.totalTransactions),
      icon: ShoppingCart,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-100 dark:bg-violet-900/30',
    },
    {
      title: 'Pendapatan Platform',
      value: formatCurrency(stats.platform.totalRevenue),
      icon: DollarSign,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
  ] : []

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Admin</h1>
        <p className="text-muted-foreground text-sm">Ringkasan statistik platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          : statCards.map((card, idx) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * idx }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-xs font-medium">{card.title}</p>
                        <p className="mt-1 text-xl font-bold">{card.value}</p>
                      </div>
                      <div className={cn('flex size-10 items-center justify-center rounded-full', card.bg)}>
                        <card.icon className={cn('size-5', card.color)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
      </div>

      {/* Platform Overview & Subscription */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Platform Stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <BarChart3 className="size-4" />
                Statistik Platform
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : stats ? (
                <div className="space-y-3">
                  {[
                    { label: 'Total Toko', value: formatNumber(stats.platform.totalStores), icon: Store },
                    { label: 'Total Produk', value: formatNumber(stats.platform.totalProducts), icon: Package },
                    { label: 'Total Pelanggan', value: formatNumber(stats.platform.totalCustomers), icon: Users },
                    { label: 'Total Pendapatan', value: formatCurrency(stats.platform.totalRevenue), icon: DollarSign },
                    { label: 'Pendaftaran Baru (30 hari)', value: formatNumber(stats.users.recentRegistrations), icon: TrendingUp },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <item.icon className="text-muted-foreground size-4" />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      <span className="text-sm font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>

        {/* Subscription Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="size-4" />
                Distribusi Pengguna
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : stats ? (
                <div className="space-y-4">
                  {/* Subscription Status */}
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Status Langganan</p>
                    <div className="space-y-2">
                      {[
                        { label: 'Trial', count: stats.users.bySubscription.trial, color: 'bg-amber-500' },
                        { label: 'Aktif', count: stats.users.bySubscription.active, color: 'bg-emerald-500' },
                        { label: 'Expired', count: stats.users.bySubscription.expired, color: 'bg-red-500' },
                      ].map((item) => (
                        <div key={item.label} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{item.label}</span>
                            <span className="font-semibold">{item.count}</span>
                          </div>
                          <Progress
                            value={stats.users.total > 0 ? (item.count / stats.users.total) * 100 : 0}
                            className="h-2"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Plan Distribution */}
                  {stats.subscription.planDistribution.length > 0 && (
                    <div className="pt-2">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">Paket Langganan</p>
                      <div className="flex flex-wrap gap-2">
                        {stats.subscription.planDistribution.map((p) => (
                          <Badge key={p.plan} variant="outline" className="gap-1">
                            {p.plan === 'monthly' ? 'Bulanan' : p.plan === 'yearly' ? 'Tahunan' : p.plan || 'Gratis'}
                            <span className="font-semibold">({p.count})</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Near Expiry Alert */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="size-4 text-amber-500" />
              Pengguna Akan Expired (3 Hari ke Depan)
            </CardTitle>
            <CardDescription>
              {nearExpiryUsers.length === 0
                ? 'Tidak ada pengguna yang akan expired dalam 3 hari ke depan'
                : `${nearExpiryUsers.length} pengguna akan expired`}
            </CardDescription>
          </CardHeader>
          {nearExpiryUsers.length > 0 && (
            <CardContent className="p-4 pt-0">
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {nearExpiryUsers.slice(0, 10).map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20"
                  >
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <Badge variant="destructive" className="gap-1 text-xs">
                      <Clock className="size-3" />
                      {u.subscriptionEnd ? new Date(u.subscriptionEnd).toLocaleDateString('id-ID') : '-'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Menu Cepat</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Button
                variant="outline"
                className="h-auto justify-start gap-3 p-4"
                onClick={() => setActivePage('admin-users')}
              >
                <UserCog className="size-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="text-sm font-medium">Kelola Pengguna</p>
                  <p className="text-xs text-muted-foreground">Aktifkan, suspend, perpanjang</p>
                </div>
                <ArrowRight className="ml-auto size-4" />
              </Button>
              <Button
                variant="outline"
                className="h-auto justify-start gap-3 p-4"
                onClick={() => setActivePage('admin-logs')}
              >
                <FileText className="size-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="text-sm font-medium">Log Aktivitas</p>
                  <p className="text-xs text-muted-foreground">Lihat riwayat aktivitas</p>
                </div>
                <ArrowRight className="ml-auto size-4" />
              </Button>
              <Button
                variant="outline"
                className="h-auto justify-start gap-3 p-4"
                onClick={() => setActivePage('reports')}
              >
                <BarChart3 className="size-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="text-sm font-medium">Laporan Platform</p>
                  <p className="text-xs text-muted-foreground">Statistik dan analitik</p>
                </div>
                <ArrowRight className="ml-auto size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
