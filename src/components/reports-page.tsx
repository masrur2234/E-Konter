'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  FileBarChart, Package, TrendingUp, Download, Printer,
  AlertTriangle, ShoppingCart, DollarSign, BarChart3
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { apiGet } from '@/lib/api'
import { useActiveStoreId } from '@/lib/store'
import { formatCurrency, formatNumber, formatPercentage, formatDateTime } from '@/lib/utils/format'
import type { Product } from '@/lib/store'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'

type ReportType = 'sales' | 'stock' | 'profit_loss'
type DatePreset = 'today' | '7days' | '30days' | 'month' | 'custom'

interface DateRange {
  startDate: string
  endDate: string
}

function getDateRange(preset: DatePreset): DateRange {
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  switch (preset) {
    case 'today':
      return { startDate: today, endDate: today }
    case '7days': {
      const d = new Date(now)
      d.setDate(d.getDate() - 6)
      return { startDate: d.toISOString().split('T')[0], endDate: today }
    }
    case '30days': {
      const d = new Date(now)
      d.setDate(d.getDate() - 29)
      return { startDate: d.toISOString().split('T')[0], endDate: today }
    }
    case 'month': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1)
      return { startDate: d.toISOString().split('T')[0], endDate: today }
    }
    default:
      return { startDate: today, endDate: today }
  }
}

const PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Hari Ini',
  '7days': '7 Hari',
  '30days': '30 Hari',
  month: 'Bulan Ini',
  custom: 'Kustom',
}

type ReportData = Record<string, unknown>

export default function ReportsPage() {
  const storeId = useActiveStoreId()
  const [activeTab, setActiveTab] = useState<ReportType>('sales')
  const [datePreset, setDatePreset] = useState<DatePreset>('30days')
  const [dateRange, setDateRange] = useState<DateRange>(getDateRange('30days'))
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const [reportData, setReportData] = useState<ReportData>(null)
  const [loading, setLoading] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const fetchReport = useCallback(async (type: ReportType) => {
    if (!storeId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        storeId,
        type,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      const res = await apiGet<ReportData>(`/api/reports?${params}`)
      if (res.data) {
        setReportData(res.data)
      }
    } catch {
      toast.error('Gagal memuat laporan')
    } finally {
      setLoading(false)
    }
  }, [storeId, dateRange])

  useEffect(() => {
    fetchReport(activeTab)
  }, [activeTab, fetchReport])

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset)
    if (preset !== 'custom') {
      setDateRange(getDateRange(preset))
    }
  }

  const applyCustomDate = () => {
    if (customFrom && customTo) {
      setDateRange({ startDate: customFrom, endDate: customTo })
      setDatePreset('custom')
    }
  }

  const handleExport = () => {
    window.print()
  }

  const getPaymentLabel = (method: string) => {
    const map: Record<string, string> = {
      cash: 'Tunai',
      transfer: 'Transfer',
      qris: 'QRIS',
      debit: 'Debit',
      credit: 'Kredit',
      debt: 'Hutang',
    }
    return map[method] || method
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laporan</h1>
          <p className="text-muted-foreground text-sm">Analisis dan ringkasan bisnis Anda</p>
        </div>
        <Button variant="outline" onClick={handleExport} className="gap-2 print:hidden">
          <Download className="size-4" />
          Export PDF
        </Button>
      </div>

      {/* Date Filter */}
      <Card className="print:hidden">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full sm:w-40">
              <Label className="mb-1 block text-xs">Periode</Label>
              <Select value={datePreset} onValueChange={(v) => handlePresetChange(v as DatePreset)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRESET_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {datePreset === 'custom' && (
              <>
                <div className="w-full sm:w-36">
                  <Label className="mb-1 block text-xs">Dari</Label>
                  <Input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-36">
                  <Label className="mb-1 block text-xs">Sampai</Label>
                  <Input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                  />
                </div>
                <Button size="sm" onClick={applyCustomDate} disabled={!customFrom || !customTo}>
                  Terapkan
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      <div ref={printRef}>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportType)}>
          <TabsList className="print:hidden">
            <TabsTrigger value="sales" className="gap-1.5">
              <ShoppingCart className="size-4" />
              Penjualan
            </TabsTrigger>
            <TabsTrigger value="stock" className="gap-1.5">
              <Package className="size-4" />
              Stok
            </TabsTrigger>
            <TabsTrigger value="profit_loss" className="gap-1.5">
              <TrendingUp className="size-4" />
              Laba Rugi
            </TabsTrigger>
          </TabsList>

          {/* Sales Report */}
          <TabsContent value="sales">
            {loading ? (
              <SalesSkeleton />
            ) : reportData ? (
              <SalesReport data={reportData} getPaymentLabel={getPaymentLabel} />
            ) : (
              <EmptyState />
            )}
          </TabsContent>

          {/* Stock Report */}
          <TabsContent value="stock">
            {loading ? (
              <StockSkeleton />
            ) : reportData ? (
              <StockReport data={reportData} />
            ) : (
              <EmptyState />
            )}
          </TabsContent>

          {/* Profit Loss Report */}
          <TabsContent value="profit_loss">
            {loading ? (
              <ProfitLossSkeleton />
            ) : reportData ? (
              <ProfitLossReport data={reportData} />
            ) : (
              <EmptyState />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  )
}

// ============ SALES REPORT ============
function SalesReport({ data, getPaymentLabel }: { data: ReportData; getPaymentLabel: (m: string) => string }) {
  const { summary, byPaymentMethod, transactions } = data

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium">Total Penjualan</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(summary.totalSales)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium">Jumlah Transaksi</p>
            <p className="text-lg font-bold">{formatNumber(summary.transactionCount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium">Item Terjual</p>
            <p className="text-lg font-bold">{formatNumber(summary.totalItemsSold)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium">Rata-rata/Transaksi</p>
            <p className="text-lg font-bold">{formatCurrency(summary.avgTransaction)}</p>
          </CardContent>
        </Card>
      </div>

      {/* By Payment Method */}
      {byPaymentMethod && Object.keys(byPaymentMethod).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Menurut Metode Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Object.entries(byPaymentMethod).map(([method, info]: [string, { total: number; count: number }]) => (
                <div key={method} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{getPaymentLabel(method)}</p>
                  <p className="text-sm font-bold">{formatCurrency(info.total)}</p>
                  <p className="text-xs text-muted-foreground">{info.count} transaksi</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      {transactions && transactions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Transaksi Terakhir</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Pembayaran</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.slice(0, 20).map((tx: { id: string; invoiceNo: string; createdAt: string; paymentMethod: string; total: number }) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-xs">{tx.invoiceNo}</TableCell>
                      <TableCell className="text-xs">{formatDateTime(tx.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getPaymentLabel(tx.paymentMethod)}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        {formatCurrency(tx.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============ STOCK REPORT ============
function StockReport({ data }: { data: ReportData }) {
  const { summary, byType, products } = data

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium">Total Produk</p>
            <p className="text-lg font-bold">{formatNumber(summary.totalProducts)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium">Nilai Stok (Modal)</p>
            <p className="text-lg font-bold">{formatCurrency(summary.totalStockValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium">Nilai Jual</p>
            <p className="text-lg font-bold">{formatCurrency(summary.totalSellValue)}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 text-red-500" />
              <p className="text-muted-foreground text-xs font-medium">Stok Rendah</p>
            </div>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">
              {formatNumber(summary.lowStockCount)}
              <span className="text-muted-foreground text-xs font-normal ml-1">
                / {summary.outOfStockCount} habis
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* By Type */}
      {byType && Object.keys(byType).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Menurut Tipe</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Object.entries(byType).map(([type, info]: [string, { count: number; totalStock: number; value: number }]) => (
                <div key={type} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground capitalize">{type.replace(/_/g, ' ')}</p>
                  <p className="text-sm font-bold">{info.count} produk</p>
                  <p className="text-xs text-muted-foreground">{info.totalStock} unit · {formatCurrency(info.value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      {products && products.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Daftar Produk</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead className="hidden sm:table-cell">Kategori</TableHead>
                    <TableHead className="text-right">Stok</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Harga Modal</TableHead>
                    <TableHead className="text-right">Harga Jual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p: Product) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-sm">{p.name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {p.category?.name || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={p.stock <= p.minStock ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {p.stock}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right text-xs text-muted-foreground">
                        {formatCurrency(p.buyPrice)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        {formatCurrency(p.sellPrice)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============ PROFIT LOSS REPORT ============
function ProfitLossReport({ data }: { data: ReportData }) {
  const { summary, expenseBreakdown } = data
  const isProfit = summary.netProfit >= 0

  return (
    <div className="space-y-4">
      {/* Main Summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Pendapatan</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Pendapatan</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(summary.totalRevenue)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Harga Pokok (HPP)</span>
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                -{formatCurrency(summary.totalCOGS)}
              </span>
            </div>
            <div className="border-t pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Laba Kotor</span>
                <span className={cn('text-sm font-bold', isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                  {formatCurrency(summary.grossProfit)}
                </span>
              </div>
              <Progress
                value={summary.totalRevenue > 0 ? (summary.grossProfit / summary.totalRevenue) * 100 : 0}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Pengeluaran</span>
              <span className="text-sm font-bold text-red-600 dark:text-red-400">
                {formatCurrency(summary.totalExpenses)}
              </span>
            </div>
            <div className="border-t pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Laba Bersih</span>
                <span className={cn(
                  'text-lg font-bold',
                  isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                )}>
                  {formatCurrency(summary.netProfit)}
                </span>
              </div>
              <p className={cn(
                'text-xs',
                isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              )}>
                Margin: {formatPercentage(summary.profitMargin / 100)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Net Profit Card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card className={cn(
          'text-center',
          isProfit
            ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20'
            : 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20'
        )}>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">Laba Bersih Periode Ini</p>
            <p className={cn(
              'mt-1 text-3xl font-bold',
              isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            )}>
              {formatCurrency(summary.netProfit)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.transactionCount} transaksi · Diskon {formatCurrency(summary.totalDiscount)}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Expense Breakdown */}
      {expenseBreakdown && Object.keys(expenseBreakdown).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Rincian Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-right">Persentase</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(expenseBreakdown)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([category, amount]: [string, number]) => (
                      <TableRow key={category}>
                        <TableCell className="text-sm font-medium">{category}</TableCell>
                        <TableCell className="text-right text-sm font-semibold text-red-600 dark:text-red-400">
                          {formatCurrency(amount)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {summary.totalExpenses > 0
                            ? formatPercentage(amount / summary.totalExpenses)
                            : '0%'}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============ SKELETONS ============
function SalesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-4"><Skeleton className="h-32 w-full" /></CardContent></Card>
    </div>
  )
}

function StockSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent></Card>
    </div>
  )
}

function ProfitLossSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-40 w-full" /></CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-6"><Skeleton className="mx-auto h-16 w-48" /></CardContent></Card>
    </div>
  )
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <FileBarChart className="size-10 opacity-40" />
        <p className="text-sm font-medium">Belum ada data laporan</p>
        <p className="text-xs">Pilih periode dan jenis laporan</p>
      </CardContent>
    </Card>
  )
}
