'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, UserCheck, UserX, Clock, ChevronLeft, ChevronRight,
  Filter, Power, PowerOff, CalendarPlus, Users, FileText
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { apiGet, apiPatch } from '@/lib/api'
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils/format'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { ScrollArea } from '@/components/ui/scroll-area'

// ==================== TYPES ====================

interface AdminUser {
  id: string
  email: string
  name: string
  phone: string | null
  role: string
  status: string
  subscriptionStatus: string
  trialStart: string | null
  trialEnd: string | null
  subscriptionStart: string | null
  subscriptionEnd: string | null
  planType: string | null
  createdAt: string
  updatedAt: string
  _count: {
    stores: number
    transactions: number
    products: number
  }
}

interface ActivityLog {
  id: string
  userId: string
  storeId: string | null
  action: string
  description: string | null
  metadata: string | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  } | null
  store: {
    id: string
    name: string
  } | null
}

// ==================== ADMIN USERS PAGE ====================

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [subscriptionFilter, setSubscriptionFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Extend subscription dialog
  const [extendOpen, setExtendOpen] = useState(false)
  const [extendTarget, setExtendTarget] = useState<AdminUser | null>(null)
  const [extendDays, setExtendDays] = useState('30')
  const [extendPlan, setExtendPlan] = useState('monthly')
  const [extending, setExtending] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (subscriptionFilter) params.set('subscription', subscriptionFilter)
      params.set('page', String(page))
      params.set('limit', '20')

      const res = await apiGet<{
        users: AdminUser[]
        pagination: { totalPages: number }
      }>(`/api/admin/users?${params}`)
      if (res.data) {
        setUsers(res.data.users)
        setTotalPages(res.data.pagination.totalPages)
      }
    } catch {
      toast.error('Gagal memuat pengguna')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, subscriptionFilter, page])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleToggleStatus = async (user: AdminUser) => {
    const action = user.status === 'active' ? 'suspend' : 'activate'
    const label = action === 'suspend' ? 'Suspend' : 'Aktifkan'
    try {
      await apiPatch('/api/admin/users', {
        userId: user.id,
        action,
      })
      toast.success(`Pengguna berhasil ${label.toLowerCase()}`)
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Gagal ${label.toLowerCase()}`)
    }
  }

  const openExtend = (user: AdminUser) => {
    setExtendTarget(user)
    setExtendDays('30')
    setExtendPlan('monthly')
    setExtendOpen(true)
  }

  const handleExtend = async () => {
    if (!extendTarget || !extendDays) return
    setExtending(true)
    try {
      await apiPatch('/api/admin/users', {
        userId: extendTarget.id,
        action: 'extend_subscription',
        data: {
          days: parseInt(extendDays),
          planType: extendPlan,
        },
      })
      toast.success(`Langganan ${extendTarget.name} berhasil diperpanjang ${extendDays} hari`)
      setExtendOpen(false)
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperpanjang langganan')
    } finally {
      setExtending(false)
    }
  }

  const resetFilters = () => {
    setSearch('')
    setStatusFilter('')
    setSubscriptionFilter('')
    setPage(1)
  }

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Aktif</Badge>
    }
    if (status === 'suspended') {
      return <Badge variant="destructive">Suspend</Badge>
    }
    return <Badge variant="secondary">Tidak Aktif</Badge>
  }

  const getSubscriptionBadge = (status: string) => {
    if (status === 'trial') {
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 gap-1"><Clock className="size-3" />Trial</Badge>
    }
    if (status === 'active') {
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Aktif</Badge>
    }
    return <Badge variant="destructive">Expired</Badge>
  }

  const getPlanLabel = (plan: string | null) => {
    if (!plan) return '-'
    return plan === 'monthly' ? 'Bulanan' : plan === 'yearly' ? 'Tahunan' : plan
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kelola Pengguna</h1>
        <p className="text-muted-foreground text-sm">Kelola semua pengguna platform</p>
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
                  placeholder="Nama, email, telepon..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-full sm:w-36">
              <Label className="mb-1 block text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="suspended">Suspend</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-36">
              <Label className="mb-1 block text-xs">Langganan</Label>
              <Select value={subscriptionFilter} onValueChange={(v) => { setSubscriptionFilter(v === 'all' ? '' : v); setPage(1) }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
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
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <Users className="size-10 opacity-40" />
              <p className="text-sm font-medium">Tidak ada pengguna ditemukan</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="hidden lg:table-cell">Toko</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Langganan</TableHead>
                      <TableHead className="hidden lg:table-cell">Paket</TableHead>
                      <TableHead className="hidden xl:table-cell">Expired</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {users.map((u) => (
                        <motion.tr
                          key={u.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-muted/50 border-b transition-colors"
                        >
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{u.name}</p>
                              <p className="text-xs text-muted-foreground md:hidden">{u.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{u.email}</TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">{u._count.stores}</TableCell>
                          <TableCell>{getStatusBadge(u.status)}</TableCell>
                          <TableCell className="hidden sm:table-cell">{getSubscriptionBadge(u.subscriptionStatus)}</TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">{getPlanLabel(u.planType)}</TableCell>
                          <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                            {u.subscriptionEnd ? formatDate(u.subscriptionEnd) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openExtend(u)}
                                title="Perpanjang"
                                className="gap-1 text-xs"
                              >
                                <CalendarPlus className="size-3.5" />
                                <span className="hidden lg:inline">Perpanjang</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleStatus(u)}
                                title={u.status === 'active' ? 'Suspend' : 'Aktifkan'}
                                className={cn(
                                  u.status === 'active'
                                    ? 'text-destructive hover:text-destructive'
                                    : 'text-emerald-600 hover:text-emerald-600'
                                )}
                              >
                                {u.status === 'active' ? (
                                  <PowerOff className="size-4" />
                                ) : (
                                  <Power className="size-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>

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

      {/* Extend Subscription Dialog */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Perpanjang Langganan</DialogTitle>
            <DialogDescription>
              Perpanjang langganan untuk {extendTarget?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {extendTarget?.subscriptionEnd && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Berakhir saat ini</p>
                <p className="text-sm font-semibold">{formatDate(extendTarget.subscriptionEnd)}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Tambah Hari</Label>
              <Select value={extendDays} onValueChange={setExtendDays}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Hari</SelectItem>
                  <SelectItem value="14">14 Hari</SelectItem>
                  <SelectItem value="30">30 Hari</SelectItem>
                  <SelectItem value="90">90 Hari</SelectItem>
                  <SelectItem value="365">365 Hari</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Paket</Label>
              <Select value={extendPlan} onValueChange={setExtendPlan}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Bulanan</SelectItem>
                  <SelectItem value="yearly">Tahunan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendOpen(false)} disabled={extending}>
              Batal
            </Button>
            <Button onClick={handleExtend} disabled={extending}>
              {extending ? 'Memproses...' : 'Perpanjang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

// ==================== ADMIN LOGS PAGE ====================

export function AdminLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (actionFilter) params.set('action', actionFilter)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      params.set('page', String(page))
      params.set('limit', '50')

      const res = await apiGet<{
        logs: ActivityLog[]
        pagination: { totalPages: number }
      }>(`/api/admin/logs?${params}`)
      if (res.data) {
        setLogs(res.data.logs)
        setTotalPages(res.data.pagination.totalPages)
      }
    } catch {
      toast.error('Gagal memuat log aktivitas')
    } finally {
      setLoading(false)
    }
  }, [actionFilter, startDate, endDate, page])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const resetFilters = () => {
    setActionFilter('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const getActionBadge = (action: string) => {
    const actionLower = action.toLowerCase()

    if (actionLower.includes('login') || actionLower.includes('register')) {
      return <Badge variant="secondary" className="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">{action}</Badge>
    }
    if (actionLower.includes('create') || actionLower.includes('add')) {
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{action}</Badge>
    }
    if (actionLower.includes('update') || actionLower.includes('edit')) {
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{action}</Badge>
    }
    if (actionLower.includes('delete') || actionLower.includes('remove')) {
      return <Badge variant="destructive">{action}</Badge>
    }
    if (actionLower.includes('admin')) {
      return <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">{action}</Badge>
    }
    if (actionLower.includes('suspend')) {
      return <Badge variant="destructive">{action}</Badge>
    }
    if (actionLower.includes('activate') || actionLower.includes('subscription')) {
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{action}</Badge>
    }
    return <Badge variant="outline">{action}</Badge>
  }

  const ACTION_OPTIONS = [
    'LOGIN',
    'REGISTER',
    'CREATE_',
    'UPDATE_',
    'DELETE_',
    'ADMIN_',
    'ACTIVATE_',
    'SUSPEND',
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Log Aktivitas</h1>
        <p className="text-muted-foreground text-sm">Riwayat aktivitas seluruh pengguna</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full sm:w-48">
              <Label className="mb-1 block text-xs">Tipe Aksi</Label>
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v === 'all' ? '' : v); setPage(1) }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Aksi</SelectItem>
                  {ACTION_OPTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-36">
              <Label className="mb-1 block text-xs">Dari Tanggal</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
              />
            </div>
            <div className="w-full sm:w-36">
              <Label className="mb-1 block text-xs">Sampai Tanggal</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
              />
            </div>
            <Button variant="outline" size="sm" onClick={resetFilters} className="gap-1.5">
              <Filter className="size-3.5" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <FileText className="size-10 opacity-40" />
              <p className="text-sm font-medium">Tidak ada log ditemukan</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className="hidden lg:table-cell">Toko</TableHead>
                      <TableHead>Aksi</TableHead>
                      <TableHead className="hidden md:table-cell">Deskripsi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {logs.map((log) => (
                        <motion.tr
                          key={log.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-muted/50 border-b transition-colors"
                        >
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateTime(log.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">
                                {log.user?.name || 'Sistem'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {log.user?.email || '-'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                            {log.store?.name || '-'}
                          </TableCell>
                          <TableCell>
                            {getActionBadge(log.action)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell max-w-[300px] truncate text-sm text-muted-foreground">
                            {log.description || '-'}
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>

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
    </motion.div>
  )
}
