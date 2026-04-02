'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Pencil, Trash2, Store, MapPin, Phone, Globe,
  Check, Building2, X
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import { useActiveStoreId, useStores, useStore as useZustandStore, useUser } from '@/lib/store'
import { formatDateTime } from '@/lib/utils/format'
import type { Store as StoreType } from '@/lib/store'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

interface StoreFormData {
  name: string
  address: string
  phone: string
  whatsapp: string
  logo: string
}

const emptyForm: StoreFormData = {
  name: '',
  address: '',
  phone: '',
  whatsapp: '',
  logo: '',
}

export default function SettingsPage() {
  const stores = useStores()
  const activeStoreId = useActiveStoreId()
  const user = useUser()
  const { setActiveStore, setStores } = useZustandStore()

  const [loading, setLoading] = useState(true)
  const [activeStore, setActiveStoreData] = useState<StoreType | null>(null)
  const [editForm, setEditForm] = useState<StoreFormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<StoreFormData>(emptyForm)
  const [creating, setCreating] = useState(false)

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<StoreType | null>(null)

  const fetchStores = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<StoreType[]>('/api/stores')
      if (res.data) {
        setStores(res.data)
        // Find active store
        if (activeStoreId) {
          const found = res.data.find((s) => s.id === activeStoreId)
          if (found) {
            setActiveStoreData(found)
            setEditForm({
              name: found.name,
              address: found.address || '',
              phone: found.phone || '',
              whatsapp: found.whatsapp || '',
              logo: found.logo || '',
            })
          }
        }
      }
    } catch {
      toast.error('Gagal memuat toko')
    } finally {
      setLoading(false)
    }
  }, [activeStoreId, setStores])

  useEffect(() => {
    fetchStores()
  }, [fetchStores])

  // Switch active store
  const switchStore = (store: StoreType) => {
    setActiveStore(store.id)
    setActiveStoreData(store)
    setEditForm({
      name: store.name,
      address: store.address || '',
      phone: store.phone || '',
      whatsapp: store.whatsapp || '',
      logo: store.logo || '',
    })
  }

  // Save current store
  const handleSave = async () => {
    if (!activeStore) return
    if (!editForm.name.trim()) {
      toast.error('Nama toko wajib diisi')
      return
    }
    setSaving(true)
    try {
      await apiPut('/api/stores', {
        id: activeStore.id,
        ...editForm,
      })
      toast.success('Toko berhasil diperbarui')
      fetchStores()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  // Create new store
  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      toast.error('Nama cabang wajib diisi')
      return
    }
    setCreating(true)
    try {
      await apiPost('/api/stores', createForm)
      toast.success('Cabang berhasil ditambahkan')
      setCreateOpen(false)
      setCreateForm(emptyForm)
      fetchStores()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menambahkan cabang')
    } finally {
      setCreating(false)
    }
  }

  // Delete store
  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      // The API doesn't have a DELETE endpoint for stores
      // We'll use PUT to deactivate
      await apiPut('/api/stores', {
        id: deleteTarget.id,
        isActive: false,
      })
      toast.success('Cabang berhasil dihapus')
      setDeleteOpen(false)
      setDeleteTarget(null)
      fetchStores()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus cabang')
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
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
          <p className="text-muted-foreground text-sm">Kelola informasi toko dan cabang</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Tambah Cabang
        </Button>
      </div>

      {/* Store Info Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="size-5" />
            Informasi Toko
          </CardTitle>
          <CardDescription>Pilih cabang dan kelola informasinya</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Store Selector */}
          <div>
            <Label className="mb-2 block text-xs font-medium">Cabang Aktif</Label>
            <div className="flex flex-wrap gap-2">
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-28" />
                ))
              ) : (
                stores.map((store) => (
                  <Button
                    key={store.id}
                    variant={store.id === activeStoreId ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => switchStore(store)}
                    className="gap-1.5"
                  >
                    <Building2 className="size-3.5" />
                    {store.name}
                    {store.isActive && (
                      <Check className="size-3" />
                    )}
                  </Button>
                ))
              )}
            </div>
          </div>

          <Separator />

          {/* Edit Form */}
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          ) : activeStore ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="store-name">Nama Toko *</Label>
                <Input
                  id="store-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Nama toko"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-phone">Telepon</Label>
                <div className="relative">
                  <Phone className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="store-phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="store-address">Alamat</Label>
                <div className="relative">
                  <MapPin className="text-muted-foreground absolute top-3 left-3 size-4" />
                  <Textarea
                    id="store-address"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    placeholder="Alamat lengkap toko"
                    rows={2}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-whatsapp">WhatsApp</Label>
                <div className="relative">
                  <Globe className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="store-whatsapp"
                    value={editForm.whatsapp}
                    onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-logo">URL Logo</Label>
                <Input
                  id="store-logo"
                  value={editForm.logo}
                  onChange={(e) => setEditForm({ ...editForm, logo: e.target.value })}
                  placeholder="https://contoh.com/logo.png"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <Store className="size-10 opacity-40" />
              <p className="text-sm font-medium">Belum ada toko</p>
              <p className="text-xs">Tambahkan cabang pertama Anda</p>
            </div>
          )}

          {activeStore && (
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? 'Menyimpan...' : (
                  <>
                    <Check className="size-4" />
                    Simpan Perubahan
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Branches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-5" />
            Semua Cabang
          </CardTitle>
          <CardDescription>Daftar semua cabang toko Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : stores.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <Building2 className="size-10 opacity-40" />
                <p className="text-sm font-medium">Belum ada cabang</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {stores.map((store) => (
                  <motion.div
                    key={store.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <Card
                      className={cn(
                        'cursor-pointer transition-all hover:shadow-md',
                        store.id === activeStoreId && 'ring-2 ring-primary'
                      )}
                      onClick={() => switchStore(store)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm">{store.name}</p>
                              <Badge variant="secondary" className="text-[10px]">
                                {store.id === activeStoreId ? 'Aktif' : 'Cabang'}
                              </Badge>
                            </div>
                            {store.address && (
                              <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                                {store.address}
                              </p>
                            )}
                            {store.phone && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {store.phone}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={(e) => {
                                e.stopPropagation()
                                switchStore(store)
                              }}
                              title="Edit"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            {store.id !== activeStoreId && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeleteTarget(store)
                                  setDeleteOpen(true)
                                }}
                                title="Hapus"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Create Store Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Cabang Baru</DialogTitle>
            <DialogDescription>Masukkan informasi cabang baru</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Nama Cabang *</Label>
              <Input
                id="new-name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Nama cabang"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-phone">Telepon</Label>
              <Input
                id="new-phone"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="08xxxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-address">Alamat</Label>
              <Textarea
                id="new-address"
                value={createForm.address}
                onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                placeholder="Alamat lengkap"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-whatsapp">WhatsApp</Label>
              <Input
                id="new-whatsapp"
                value={createForm.whatsapp}
                onChange={(e) => setCreateForm({ ...createForm, whatsapp: e.target.value })}
                placeholder="08xxxxxxxxxx"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Batal
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? 'Menambahkan...' : 'Tambah Cabang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Cabang</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus cabang{' '}
              <span className="font-semibold">{deleteTarget?.name}</span>?
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
    </motion.div>
  )
}
