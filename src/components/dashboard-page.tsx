'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Package,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { apiGet } from '@/lib/api'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils/format'

// ==================== TYPES ====================

interface DashboardData {
  todaySales: number
  todayTransactionCount: number
  todayProfit: number
  totalRevenue: number
  totalTransactions: number
  topProducts: Array<{
    productName: string
    quantitySold: number
    revenue: number
  }>
  lowStockProducts: Array<{
    id: string
    name: string
    type: string
    stock: number
    minStock: number
    sellPrice: number
  }>
  recentTransactions: Array<{
    id: string
    invoiceNo: string
    type: string
    total: number
    paymentMethod: string
    status: string
    customerName?: string | null
    createdAt: string
  }>
  salesByDay: Array<{
    date: string
    sales: number
    count: number
  }>
  salesByPaymentMethod: Array<{ method: string; total: number; count: number }>
  salesByType: Array<{ type: string; total: number; count: number }>
}

// ==================== CHART CONFIG ====================

const chartConfig = {
  sales: {
    label: 'Penjualan',
    color: 'oklch(0.646 0.222 41.116)',
  },
}

// ==================== ANIMATION VARIANTS ====================

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
}

// ==================== STAT CARD ====================

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  accent,
  loading,
}: {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  description?: string
  accent: string
  loading?: boolean
}) {
  return (
    <motion.div {...fadeInUp}>
      <Card className="relative overflow-hidden">
        <CardContent className="p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <p className="text-sm text-muted-foreground truncate">{title}</p>
              {loading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                <p className="text-2xl lg:text-3xl font-bold tracking-tight truncate">
                  {value}
                </p>
              )}
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </div>
            <div
              className={cn(
                'flex size-10 lg:size-12 items-center justify-center rounded-xl shrink-0',
                accent
              )}
            >
              <Icon className="size-5 lg:size-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ==================== DASHBOARD PAGE ====================

export function DashboardPage() {
  const user = useStore((s) => s.user)
  const activeStoreId = useStore((s) => s.activeStoreId)
  const setDashboardStats = useStore((s) => s.setDashboardStats)

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeStoreId) return

    let cancelled = false

    async function fetchDashboard() {
      setLoading(true)
      try {
        const res = await apiGet<DashboardData>(
          `/api/dashboard?storeId=${activeStoreId}`
        )
        if (!cancelled && res.data) {
          setData(res.data)
          setDashboardStats({
            todaySales: res.data.todaySales,
            totalTransactions: res.data.totalTransactions,
            totalRevenue: res.data.totalRevenue,
            topProducts: res.data.topProducts.map((p) => ({
              productId: '',
              productName: p.productName,
              quantity: p.quantitySold,
              revenue: p.revenue,
            })),
            lowStockProducts: res.data.lowStockProducts as any,
            recentTransactions: res.data.recentTransactions as any,
            salesByDay: res.data.salesByDay.map((d) => ({
              date: d.date,
              total: d.sales,
            })),
          })
        }
      } catch {
        // Error handled by API client
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchDashboard()
    return () => {
      cancelled = true
    }
  }, [activeStoreId, setDashboardStats])

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Selamat Pagi'
    if (hour < 15) return 'Selamat Siang'
    if (hour < 18) return 'Selamat Sore'
    return 'Selamat Malam'
  }

  const getCurrentDate = () => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ]
    const now = new Date()
    const day = now.getDate()
    const month = months[now.getMonth()]
    const year = now.getFullYear()
    return `${day} ${month} ${year}`
  }

  // Format chart date labels
  const formatChartDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
    return dayNames[date.getDay()]
  }

  const formatChartTooltipDate = (dateStr: string) => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
    ]
    const date = new Date(dateStr)
    return `${date.getDate()} ${months[date.getMonth()]}`
  }

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Tunai',
      transfer: 'Transfer',
      qris: 'QRIS',
      debit: 'Debit',
      credit: 'Kredit',
      ewallet: 'E-Wallet',
    }
    return labels[method] || method
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div {...fadeInUp}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {getGreeting()}, {user?.name?.split(' ')[0]}! 👋
            </h2>
            <p className="text-muted-foreground text-sm">{getCurrentDate()}</p>
          </div>
          {data && (
            <Badge
              variant="outline"
              className="self-start border-emerald-300 text-emerald-700 dark:border-emerald-600 dark:text-emerald-300"
            >
              <TrendingUp className="size-3 mr-1" />
              {data.todayTransactionCount} transaksi hari ini
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Penjualan Hari Ini"
          value={loading ? '' : formatCurrency(data?.todaySales || 0)}
          icon={ShoppingCart}
          description={loading ? '' : `${data?.todayTransactionCount || 0} transaksi`}
          accent="bg-gradient-to-br from-green-500 to-emerald-600"
          loading={loading}
        />

        <StatCard
          title="Total Transaksi"
          value={loading ? '' : formatNumber(data?.totalTransactions || 0)}
          icon={BarChart3}
          description="Semua waktu"
          accent="bg-gradient-to-br from-sky-500 to-cyan-600"
          loading={loading}
        />

        <StatCard
          title="Pendapatan"
          value={loading ? '' : formatCurrency(data?.totalRevenue || 0)}
          icon={DollarSign}
          description="Total pendapatan"
          accent="bg-gradient-to-br from-emerald-500 to-teal-600"
          loading={loading}
        />

        <StatCard
          title="Stok Menipis"
          value={loading ? '' : data?.lowStockProducts?.length || 0}
          icon={AlertTriangle}
          description={loading ? '' : 'Perlu restock segera'}
          accent="bg-gradient-to-br from-amber-500 to-orange-600"
          loading={loading}
        />
      </div>

      {/* Sales Chart & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Sales Chart - Last 7 Days */}
        <motion.div {...fadeInUp} className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Penjualan 7 Hari Terakhir</CardTitle>
              <CardDescription>Grafik total penjualan harian</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <BarChart data={data?.salesByDay || []} barSize={32}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartDate}
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={formatChartTooltipDate}
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                      }
                    />
                    <Bar
                      dataKey="sales"
                      fill="var(--color-sales)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div {...fadeInUp}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Transaksi Terbaru</CardTitle>
              <CardDescription>5 transaksi terakhir</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : data?.recentTransactions && data.recentTransactions.length > 0 ? (
                <div className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
                  {data.recentTransactions.slice(0, 5).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex size-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 shrink-0">
                        <ShoppingCart className="size-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{tx.invoiceNo}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.customerName || tx.type} &middot; {formatDateTime(tx.createdAt)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">{formatCurrency(tx.total)}</p>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {getPaymentMethodLabel(tx.paymentMethod)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ShoppingCart className="size-10 mb-2 opacity-40" />
                  <p className="text-sm">Belum ada transaksi</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Top Products & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Top Products */}
        <motion.div {...fadeInUp}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Produk Terlaris</CardTitle>
              <CardDescription>5 produk terlaris berdasarkan jumlah terjual</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-5 w-5 rounded" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : data?.topProducts && data.topProducts.length > 0 ? (
                <div className="space-y-1">
                  {data.topProducts.slice(0, 5).map((product, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className={cn(
                          'flex size-6 items-center justify-center rounded-md text-xs font-bold shrink-0',
                          index === 0 && 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
                          index === 1 && 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                          index === 2 && 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400',
                          index > 2 && 'bg-muted text-muted-foreground'
                        )}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.productName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">{product.quantitySold} pcs</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(product.revenue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Package className="size-10 mb-2 opacity-40" />
                  <p className="text-sm">Belum ada data produk</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Low Stock Alerts */}
        <motion.div {...fadeInUp}>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Peringatan Stok</CardTitle>
                  <CardDescription>Produk dengan stok menipis</CardDescription>
                </div>
                {data?.lowStockProducts && data.lowStockProducts.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800">
                    <AlertTriangle className="size-3 mr-1" />
                    {data.lowStockProducts.length} item
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-5 w-12 rounded" />
                    </div>
                  ))}
                </div>
              ) : data?.lowStockProducts && data.lowStockProducts.length > 0 ? (
                <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                  {data.lowStockProducts.map((product) => (
                    <div
                      key={product.id}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg transition-colors',
                        product.stock === 0
                          ? 'bg-destructive/5 border border-destructive/20'
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <div
                        className={cn(
                          'flex size-10 items-center justify-center rounded-lg shrink-0',
                          product.stock === 0
                            ? 'bg-destructive/10'
                            : 'bg-amber-100 dark:bg-amber-950/50'
                        )}
                      >
                        <Package
                          className={cn(
                            'size-5',
                            product.stock === 0
                              ? 'text-destructive'
                              : 'text-amber-600 dark:text-amber-400'
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Min. stok: {product.minStock}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={cn(
                            'text-sm font-bold',
                            product.stock === 0
                              ? 'text-destructive'
                              : 'text-amber-600 dark:text-amber-400'
                          )}
                        >
                          {product.stock === 0 ? 'Habis' : `${product.stock} sisa`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(product.sellPrice)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Package className="size-10 mb-2 opacity-40" />
                  <p className="text-sm">Semua stok aman</p>
                  <p className="text-xs mt-1">Tidak ada produk dengan stok menipis</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

// ==================== HELPERS ====================

function formatNumber(num: number): string {
  if (num === 0) return '0'
  const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return formatted
}
