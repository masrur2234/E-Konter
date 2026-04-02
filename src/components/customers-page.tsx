'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Pencil, Trash2, Eye, Users, X, Phone,
  MapPin, Mail, ChevronLeft, ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import { useActiveStoreId } from '@/lib/store'
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils/format'
import type { Customer, Transaction } from '@/lib/store'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel
} from '@/components/ui/alert-dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'

interface CustomerFormData {
  name: string
  phone: string
  address: string
  email: string
}

const emptyForm: CustomerFormData = { name: '', phone: '', address: '', email: '' }

export default function CustomersPage() {
  const storeId = useActiveStoreId()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Dialogs
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState<CustomerFormData>(emptyForm)
  const [isEditing, setIsEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Customer transactions
  const [customerTransactions, setCustomerTransactions] = useState<Transaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)

  const fetchCustomers = useCallback(async () => {
    if (!storeId) return
    setLoading(true)
    try {
      const res = await apiGet<{
        customers: Customer[]
        pagination: { totalPages: number }
      }>(
        `/api/customers?storeId=${storeId}&search=${search}&page=${page}&limit=20`
      )
      if (res.data) {
        setCustomers(res.data.customers)
        setTotalPages(res.data.pagination.totalPages)
      }
    } catch {
      toast.error('Gagal memuat pelanggan')
    } finally {
      setLoading(false)
    }
  }, [storeId, search, page])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const handleSearch = (val: string) => {
    setSearch(val)
    setPage(1)
  }

  const openCreate = () => {
    setFormData(emptyForm)
    setIsEditing(false)
    setFormOpen(true)
  }

  const openEdit = (customer: Customer) => {
    setSelectedCustomer(customer)
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      address: customer.address || '',
      email: customer.email || '',
    })
    setIsEditing(true)
    setFormOpen(true)
  }

  const openDelete = (customer: Customer) => {
    setSelectedCustomer(customer)
    setDeleteOpen(true)
  }

  const openDetail = async (customer: Customer) => {
    setSelectedCustomer(customer)
    setDetailOpen(true)
    setLoadingTransactions(true)
    try {
      const res = await apiGet<{
        transactions: Transaction[]
      }>(
        `/api/transactions?storeId=${storeId}&search=${customer.name}&limit=50`
      )
      if (res.data) {
        setCustomerTransactions(res.data.transactions)
      }
    } catch {
      toast.error('Gagal memuat transaksi pelanggan')
    } finally {
      setLoadingTransactions(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Nama pelanggan wajib diisi')
      return
    }
    setSubmitting(true)
    try {
      if (isEditing && selectedCustomer) {
        await apiPut('/api/customers', {
          id: selectedCustomer.id,
          ...formData,
        })
        toast.success('Pelanggan berhasil diperbarui')
      } else {
        await apiPost('/api/customers', {
          storeId,
          ...formData,
        })
        toast.success('Pelanggan berhasil ditambahkan')
      }
      setFormOpen(false)
      fetchCustomers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan pelanggan')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedCustomer) return
    try {
      await apiDelete(`/api/customers?id=${selectedCustomer.id}`)
      toast.success('Pelanggan berhasil dihapus')
      setDeleteOpen(false)
      fetchCustomers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus pelanggan')
    }
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
          <h1 className="text-2xl font-bold tracking-tight">Pelanggan</h1>
          <p className="text-muted-foreground text-sm">Kelola data pelanggan Anda</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" />
          Tambah Pelanggan
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="Cari nama, telepon, email..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <Users className="size-10 opacity-40" />
              <p className="text-sm font-medium">Belum ada pelanggan</p>
              <p className="text-xs">Tambahkan pelanggan pertama Anda</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Telepon</TableHead>
                    <TableHead className="hidden md:table-cell">Alamat</TableHead>
                    <TableHead>Hutang</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {customers.map((customer) => (
                      <motion.tr
                        key={customer.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-muted/50 border-b transition-colors"
                      >
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.phone || '-'}</TableCell>
                        <TableCell className="hidden max-w-[200px] truncate md:table-cell">
                          {customer.address || '-'}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'font-semibold',
                              customer.debt > 0 ? 'text-red-600 dark:text-red-400' : ''
                            )}
                          >
                            {formatCurrency(customer.debt)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDetail(customer)}
                              title="Lihat Detail"
                            >
                              <Eye className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(customer)}
                              title="Edit"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDelete(customer)}
                              title="Hapus"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
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

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Pelanggan' : 'Tambah Pelanggan'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Ubah informasi pelanggan' : 'Masukkan data pelanggan baru'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Nama *</Label>
              <Input
                id="customer-name"
                placeholder="Nama pelanggan"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">Telepon</Label>
              <Input
                id="customer-phone"
                placeholder="08xxxxxxxxxx"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-email">Email</Label>
              <Input
                id="customer-email"
                type="email"
                placeholder="email@contoh.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-address">Alamat</Label>
              <Textarea
                id="customer-address"
                placeholder="Alamat lengkap"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pelanggan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus pelanggan{' '}
              <span className="font-semibold">{selectedCustomer?.name}</span>? Tindakan ini
              tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Pelanggan</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">Nama</p>
                  <p className="text-sm font-semibold">{selectedCustomer.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">Telepon</p>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Phone className="size-3.5" />
                    {selectedCustomer.phone || '-'}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">Email</p>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Mail className="size-3.5" />
                    {selectedCustomer.email || '-'}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">Alamat</p>
                  <div className="flex items-start gap-1.5 text-sm">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" />
                    {selectedCustomer.address || '-'}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">Hutang</p>
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      selectedCustomer.debt > 0 ? 'text-red-600 dark:text-red-400' : ''
                    )}
                  >
                    {formatCurrency(selectedCustomer.debt)}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">Terdaftar</p>
                  <p className="text-sm">{formatDate(selectedCustomer.createdAt)}</p>
                </div>
              </div>

              {/* Transaction History */}
              <div className="pt-2">
                <h3 className="mb-2 text-sm font-semibold">Riwayat Transaksi</h3>
                {loadingTransactions ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : customerTransactions.length === 0 ? (
                  <p className="text-muted-foreground text-xs">Belum ada transaksi</p>
                ) : (
                  <ScrollArea className="max-h-64">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Tanggal</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerTransactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="font-mono text-xs">{tx.invoiceNo}</TableCell>
                            <TableCell className="text-xs">{formatDateTime(tx.createdAt)}</TableCell>
                            <TableCell className="text-right text-xs font-semibold">
                              {formatCurrency(tx.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
