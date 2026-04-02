'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, TrendingUp, TrendingDown, Wallet, Filter,
  ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { apiGet, apiPost } from '@/lib/api'
import { useActiveStoreId } from '@/lib/store'
import { formatCurrency, formatDateTime } from '@/lib/utils/format'
import type { Cashflow } from '@/lib/store'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

const CATEGORIES_INCOME = ['Penjualan', 'Pulsa', 'Paket Data', 'Token Listrik', 'Lain-lain']
const CATEGORIES_EXPENSE = ['Gaji', 'Sewa', 'Listrik', 'Operasional', 'Lain-lain']

interface CashflowFormData {
  type: 'income' | 'expense'
  category: string
  amount: string
  description: string
}

const emptyForm: CashflowFormData = {
  type: 'income',
  category: '',
  amount: '',
  description: '',
}

interface CashflowSummary {
  income: number
  expense: number
  balance: number
}

export default function FinancePage() {
  const storeId = useActiveStoreId()
  const [cashflows, setCashflows] = useState<Cashflow[]>([])
  const [summary, setSummary] = useState<CashflowSummary>({ income: 0, expense: 0, balance: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Form
  const [formOpen, setFormOpen] = useState(false)
  const [formData, setFormData] = useState<CashflowFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams()
    params.set('storeId', storeId || '')
    if (search) params.set('search', search)
    if (typeFilter) params.set('type', typeFilter)
    if (dateFrom) params.set('startDate', dateFrom)
    if (dateTo) params.set('endDate', dateTo)
    params.set('page', String(page))
    params.set('limit', '50')
    return params.toString()
  }, [storeId, search, typeFilter, dateFrom, dateTo, page])

  const fetchCashflow = useCallback(async () => {
    if (!storeId) return
    setLoading(true)
    try {
      const query = buildQuery()
      const res = await apiGet<{
        cashflows: Cashflow[]
        summary: CashflowSummary
        pagination: { totalPages: number }
      }>(`/api/cashflow?${query}`)
      if (res.data) {
        setCashflows(res.data.cashflows)
        setSummary(res.data.summary)
        setTotalPages(res.data.pagination.totalPages)
      }
    } catch {
      toast.error('Gagal memuat data keuangan')
    } finally {
      setLoading(false)
    }
  }, [storeId, buildQuery])

  useEffect(() => {
    fetchCashflow()
  }, [fetchCashflow])

  const resetFilters = () => {
    setSearch('')
    setTypeFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const openCreate = () => {
    setFormData(emptyForm)
    setFormOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Jumlah harus lebih dari 0')
      return
    }
    if (!formData.category) {
      toast.error('Kategori wajib dipilih')
      return
    }
    setSubmitting(true)
    try {
      await apiPost('/api/cashflow', {
        storeId,
        type: formData.type,
        category: formData.category,
        amount: parseFloat(formData.amount),
        description: formData.description || undefined,
      })
      toast.success('Transaksi berhasil ditambahkan')
      setFormOpen(false)
      fetchCashflow()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menambahkan transaksi')
    } finally {
      setSubmitting(false)
    }
  }

  const categories = formData.type === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE

  const getTypeBadge = (type: string) => {
    if (type === 'income') {
      return (
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
          <ArrowUpRight className="size-3" />
          Masuk
        </Badge>
      )
    }
    if (type === 'expense') {
      return (
        <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 gap-1">
          <ArrowDownRight className="size-3" />
          Keluar
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="gap-1">
        Transfer
      </Badge>
    )
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
          <h1 className="text-2xl font-bold tracking-tight">Keuangan</h1>
          <p className="text-muted-foreground text-sm">Kelola arus kas toko Anda</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" />
          Tambah Transaksi
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs font-medium">Total Kas Masuk</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(summary.income)}
                  </p>
                </div>
                <div className="bg-emerald-100 flex size-10 items-center justify-center rounded-full dark:bg-emerald-900/30">
                  <TrendingUp className="size-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs font-medium">Total Kas Keluar</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(summary.expense)}
                  </p>
                </div>
                <div className="bg-red-100 flex size-10 items-center justify-center rounded-full dark:bg-red-900/30">
                  <TrendingDown className="size-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-l-4 border-l-sky-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs font-medium">Saldo</p>
                  <p className={cn(
                    'text-xl font-bold',
                    summary.balance >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-red-600 dark:text-red-400'
                  )}>
                    {formatCurrency(summary.balance)}
                  </p>
                </div>
                <div className="bg-sky-100 flex size-10 items-center justify-center rounded-full dark:bg-sky-900/30">
                  <Wallet className="size-5 text-sky-600 dark:text-sky-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label className="mb-1 block text-xs">Cari</Label>
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  placeholder="Deskripsi..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-full sm:w-40">
              <Label className="mb-1 block text-xs">Tipe</Label>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v === 'all' ? '' : v); setPage(1) }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Semua tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="income">Masuk</SelectItem>
                  <SelectItem value="expense">Keluar</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-36">
              <Label className="mb-1 block text-xs">Dari Tanggal</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              />
            </div>
            <div className="w-full sm:w-36">
              <Label className="mb-1 block text-xs">Sampai Tanggal</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              />
            </div>
            <Button variant="outline" size="sm" onClick={resetFilters} className="gap-1.5">
              <Filter className="size-3.5" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : cashflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <Wallet className="size-10 opacity-40" />
              <p className="text-sm font-medium">Belum ada transaksi</p>
              <p className="text-xs">Tambahkan transaksi keuangan pertama Anda</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="hidden lg:table-cell">Deskripsi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {cashflows.map((cf) => (
                      <motion.tr
                        key={cf.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-muted/50 border-b transition-colors"
                      >
                        <TableCell className="text-sm">{formatDateTime(cf.createdAt)}</TableCell>
                        <TableCell>{getTypeBadge(cf.type)}</TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{cf.category || '-'}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              'text-sm font-semibold',
                              cf.type === 'income'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            )}
                          >
                            {cf.type === 'income' ? '+' : '-'}
                            {formatCurrency(cf.amount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden max-w-[250px] truncate text-sm lg:table-cell">
                          {cf.description || '-'}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-muted-foreground text-sm">
                    Halaman {page} dari {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="size-4" />
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      Selanjutnya
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Transaction Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Transaksi</DialogTitle>
            <DialogDescription>Masukkan detail transaksi keuangan</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipe Transaksi</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v as 'income' | 'expense', category: '' })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Kas Masuk</SelectItem>
                  <SelectItem value="expense">Kas Keluar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cashflow-amount">Jumlah (Rp)</Label>
              <Input
                id="cashflow-amount"
                type="number"
                placeholder="0"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cashflow-desc">Deskripsi</Label>
              <Textarea
                id="cashflow-desc"
                placeholder="Keterangan transaksi (opsional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
