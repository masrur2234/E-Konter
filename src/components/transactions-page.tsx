'use client'

import * as React from 'react'
import {
  Search,
  Filter,
  Eye,
  Calendar,
  FileText,
  Receipt,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Banknote,
  CreditCard,
  QrCode,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { apiGet } from '@/lib/api'
import { formatCurrency, formatDateTime } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { useActiveStoreId, useStores, type Transaction, type TransactionItem } from '@/lib/store'
import { ReceiptDialog, type ReceiptData } from '@/components/receipt-dialog'

// Status config
const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  completed: {
    label: 'Selesai',
    variant: 'outline',
    className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
  },
  pending: {
    label: 'Menunggu',
    variant: 'outline',
    className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25',
  },
  cancelled: {
    label: 'Batal',
    variant: 'outline',
    className: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25',
  },
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Tunai',
  transfer: 'Transfer',
  qris: 'QRIS',
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  completed: CheckCircle2,
  pending: Clock,
  cancelled: XCircle,
}

export default function TransactionsPage() {
  const activeStoreId = useActiveStoreId()
  const stores = useStores()
  const currentStore = stores.find((s) => s.id === activeStoreId)

  const [transactions, setTransactions] = React.useState<Transaction[]>([])
  const [loading, setLoading] = React.useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [paymentFilter, setPaymentFilter] = React.useState('all')
  const [startDate, setStartDate] = React.useState('')
  const [endDate, setEndDate] = React.useState('')

  // Detail dialog
  const [selectedTransaction, setSelectedTransaction] = React.useState<Transaction | null>(null)
  const [showDetail, setShowDetail] = React.useState(false)

  // Receipt
  const [showReceipt, setShowReceipt] = React.useState(false)
  const [receiptData, setReceiptData] = React.useState<ReceiptData | null>(null)

  // Pagination
  const [page, setPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)

  // Fetch transactions
  const fetchTransactions = React.useCallback(() => {
    if (!activeStoreId) return
    setLoading(true)

    const params = new URLSearchParams({
      storeId: activeStoreId,
      page: page.toString(),
      limit: '50',
    })

    if (searchQuery.trim()) params.set('search', searchQuery.trim())
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (paymentFilter !== 'all') params.set('paymentMethod', paymentFilter)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)

    apiGet<{
      transactions: Transaction[]
      pagination: { totalPages: number }
    }>(`/api/transactions?${params.toString()}`).then((res) => {
      if (res.data) {
        setTransactions(res.data.transactions || [])
        setTotalPages(res.data.pagination?.totalPages || 1)
      }
    }).finally(() => setLoading(false))
  }, [activeStoreId, page, searchQuery, statusFilter, paymentFilter, startDate, endDate])

  React.useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // Reset page on filter changes
  React.useEffect(() => {
    setPage(1)
  }, [searchQuery, statusFilter, paymentFilter, startDate, endDate])

  // Open detail dialog
  const openDetail = (txn: Transaction) => {
    setSelectedTransaction(txn)
    setShowDetail(true)
  }

  // Build receipt data from transaction
  const buildReceiptData = (txn: Transaction): ReceiptData => {
    return {
      store: {
        name: currentStore?.name || 'Counter Pulsa',
        address: currentStore?.address,
        phone: currentStore?.phone,
        whatsapp: currentStore?.whatsapp,
      },
      cashier: txn.cashierName || 'Kasir',
      invoiceNo: txn.invoiceNo,
      items: txn.items.map((item: TransactionItem) => ({
        name: item.productName,
        category: item.category,
        qty: item.quantity,
        price: item.sellPrice,
        total: item.total,
      })),
      subtotal: txn.subtotal,
      discount: txn.discount,
      total: txn.total,
      paid: txn.paid,
      change: txn.change,
      paymentMethod: txn.paymentMethod,
      customer: txn.customerName
        ? { id: '', name: txn.customerName }
        : null,
      createdAt: txn.createdAt,
    }
  }

  // View receipt
  const viewReceipt = (txn: Transaction) => {
    const data = buildReceiptData(txn)
    setReceiptData(data)
    setShowReceipt(true)
  }

  // Handle print from detail dialog
  const handlePrint = () => {
    if (selectedTransaction) {
      viewReceipt(selectedTransaction)
    }
  }

  // Payment method icon
  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <Banknote className="h-3.5 w-3.5" />
      case 'transfer':
        return <CreditCard className="h-3.5 w-3.5" />
      case 'qris':
        return <QrCode className="h-3.5 w-3.5" />
      default:
        return null
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Transaksi</h2>
          <p className="text-sm text-muted-foreground">
            Riwayat transaksi penjualan
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari no. invoice, kasir..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="completed">Selesai</SelectItem>
                <SelectItem value="pending">Menunggu</SelectItem>
                <SelectItem value="cancelled">Batal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Pembayaran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Metode</SelectItem>
                <SelectItem value="cash">Tunai</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="qris">QRIS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Date Range */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Periode:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="startDate" className="text-xs shrink-0">
                Dari
              </Label>
              <Input
                id="startDate"
                type="date"
                className="w-[160px]"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <span className="text-muted-foreground">—</span>
            <div className="flex items-center gap-2">
              <Label htmlFor="endDate" className="text-xs shrink-0">
                Sampai
              </Label>
              <Input
                id="endDate"
                type="date"
                className="w-[160px]"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="flex-1 overflow-hidden rounded-xl border bg-card">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Invoice</TableHead>
                <TableHead className="hidden sm:table-cell">Tanggal</TableHead>
                <TableHead className="text-center hidden md:table-cell">Item</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="hidden md:table-cell">Metode Bayar</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center text-muted-foreground">
                      <FileText className="mb-2 h-10 w-10 opacity-30" />
                      <p className="text-sm">Belum ada transaksi</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((txn) => {
                  const statusConfig = STATUS_CONFIG[txn.status] || STATUS_CONFIG.completed
                  const StatusIcon = STATUS_ICONS[txn.status] || CheckCircle2

                  return (
                    <TableRow
                      key={txn.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openDetail(txn)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="font-medium text-xs sm:text-sm">
                            {txn.invoiceNo}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                          {formatDateTime(txn.createdAt)}
                        </p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {formatDateTime(txn.createdAt)}
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell text-sm">
                        {txn.items?.length || 0} item
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">
                        {formatCurrency(txn.total)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-sm">
                          {getPaymentIcon(txn.paymentMethod)}
                          {PAYMENT_LABELS[txn.paymentMethod] || txn.paymentMethod}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={statusConfig.variant}
                          className={cn(
                            'gap-1 text-[10px]',
                            statusConfig.className
                          )}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            viewReceipt(txn)
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Struk</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground">
            Halaman {page} dari {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Selanjutnya
          </Button>
        </div>
      )}

      {/* Transaction Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Detail Transaksi
            </DialogTitle>
          </DialogHeader>

          {selectedTransaction && (
            <ScrollArea className="max-h-[calc(90vh-120px)] pr-3">
              <div className="space-y-4 py-2">
                {/* Transaction Info */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">No. Invoice</p>
                    <p className="text-sm font-semibold">
                      {selectedTransaction.invoiceNo}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tanggal</p>
                    <p className="text-sm font-medium">
                      {formatDateTime(selectedTransaction.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Kasir</p>
                    <p className="text-sm font-medium">
                      {selectedTransaction.cashierName || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Metode Bayar</p>
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      {getPaymentIcon(selectedTransaction.paymentMethod)}
                      {PAYMENT_LABELS[selectedTransaction.paymentMethod] || selectedTransaction.paymentMethod}
                    </div>
                  </div>
                  {selectedTransaction.customerName && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground">Pelanggan</p>
                      <p className="text-sm font-medium">
                        {selectedTransaction.customerName}
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Items */}
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Item Pembelian</h4>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead className="text-right">Harga</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedTransaction.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-sm font-medium">
                              {item.productName}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {formatCurrency(item.sellPrice)}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              {formatCurrency(item.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(selectedTransaction.subtotal)}</span>
                  </div>
                  {selectedTransaction.discount > 0 && (
                    <div className="flex justify-between text-sm text-orange-600 dark:text-orange-400">
                      <span>Diskon</span>
                      <span>-{formatCurrency(selectedTransaction.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">
                      {formatCurrency(selectedTransaction.total)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Dibayar</span>
                    <span>{formatCurrency(selectedTransaction.paid)}</span>
                  </div>
                  {selectedTransaction.paymentMethod === 'cash' && selectedTransaction.change > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                      <span>Kembalian</span>
                      <span className="font-medium">
                        {formatCurrency(selectedTransaction.change)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 gap-2"
                    onClick={handlePrint}
                  >
                    <Receipt className="h-4 w-4" />
                    Lihat Struk
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <ReceiptDialog
        open={showReceipt}
        onClose={() => setShowReceipt(false)}
        transaction={receiptData}
        store={currentStore
          ? {
              name: currentStore.name,
              address: currentStore.address,
              phone: currentStore.phone,
              whatsapp: currentStore.whatsapp,
            }
          : null}
      />
    </div>
  )
}
