'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
  AlertTriangle,
  X,
  Loader2,
  Filter,
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
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import { formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { useStore, useActiveStoreId, useProducts, type Product, type Category } from '@/lib/store'

// Product types
const PRODUCT_TYPES = [
  { value: 'phone', label: 'HP' },
  { value: 'accessory', label: 'Aksesoris' },
  { value: 'pulsa', label: 'Pulsa' },
  { value: 'paket_data', label: 'Paket Data' },
  { value: 'token_listrik', label: 'Token Listrik' },
]

const CONDITIONS = [
  { value: 'new', label: 'Baru' },
  { value: 'used', label: 'Bekas' },
  { value: 'refurbished', label: 'Refurbished' },
]

interface ProductFormData {
  name: string
  type: string
  categoryId: string
  sku: string
  description: string
  // HP specific
  brand: string
  model: string
  ram: string
  storage: string
  color: string
  imei: string
  condition: string
  // Pricing
  buyPrice: string
  sellPrice: string
  // Stock
  stock: string
  minStock: string
}

const emptyForm: ProductFormData = {
  name: '',
  type: 'phone',
  categoryId: '',
  sku: '',
  description: '',
  brand: '',
  model: '',
  ram: '',
  storage: '',
  color: '',
  imei: '',
  condition: 'new',
  buyPrice: '0',
  sellPrice: '0',
  stock: '0',
  minStock: '5',
}

export default function ProductsPage() {
  const activeStoreId = useActiveStoreId()
  const products = useProducts()
  const storeSetProducts = useStore((s) => s.setProducts)

  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [typeFilter, setTypeFilter] = React.useState('all')
  const [categoryFilter, setCategoryFilter] = React.useState('all')

  // Dialog state
  const [showForm, setShowForm] = React.useState(false)
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null)
  const [formData, setFormData] = React.useState<ProductFormData>(emptyForm)
  const [saving, setSaving] = React.useState(false)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = React.useState<Product | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  // Categories
  const [categories, setCategories] = React.useState<Category[]>([])

  // Fetch products
  const fetchProducts = React.useCallback(() => {
    if (!activeStoreId) return
    setLoading(true)
    apiGet<{ products: Product[] }>(
      `/api/products?storeId=${activeStoreId}&limit=200`
    ).then((res) => {
      if (res.data) {
        const prods = res.data.products || []
        storeSetProducts(prods)
      }
    }).finally(() => setLoading(false))
  }, [activeStoreId])

  // Fetch categories
  React.useEffect(() => {
    if (!activeStoreId) return
    apiGet<Category[]>(
      `/api/categories?storeId=${activeStoreId}`
    ).then((res) => {
      if (res.data) setCategories(res.data)
    })
  }, [activeStoreId])

  React.useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Filter products
  const filteredProducts = React.useMemo(() => {
    let filtered = products
    if (typeFilter !== 'all') {
      filtered = filtered.filter((p) => p.type === typeFilter)
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((p) => p.categoryId === categoryFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.model?.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [products, typeFilter, categoryFilter, searchQuery])

  // Open form for add
  const openAddForm = () => {
    setEditingProduct(null)
    setFormData(emptyForm)
    setShowForm(true)
  }

  // Open form for edit
  const openEditForm = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      type: product.type,
      categoryId: product.categoryId || '',
      sku: product.sku || '',
      description: product.description || '',
      brand: product.brand || '',
      model: product.model || '',
      ram: product.ram || '',
      storage: product.storage || '',
      color: product.color || '',
      imei: product.imei || '',
      condition: product.condition || 'new',
      buyPrice: product.buyPrice.toString(),
      sellPrice: product.sellPrice.toString(),
      stock: product.stock.toString(),
      minStock: product.minStock.toString(),
    })
    setShowForm(true)
  }

  // Handle save
  const handleSave = async () => {
    if (!activeStoreId || !formData.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        storeId: activeStoreId,
        name: formData.name,
        type: formData.type,
        categoryId: formData.categoryId || null,
        sku: formData.sku || null,
        description: formData.description || null,
        brand: formData.brand || null,
        model: formData.model || null,
        ram: formData.ram || null,
        storage: formData.storage || null,
        color: formData.color || null,
        imei: formData.imei || null,
        condition: formData.condition || null,
        buyPrice: parseFloat(formData.buyPrice) || 0,
        sellPrice: parseFloat(formData.sellPrice) || 0,
        stock: parseInt(formData.stock) || 0,
        minStock: parseInt(formData.minStock) || 5,
      }

      if (editingProduct) {
        await apiPut(`/api/products/${editingProduct.id}`, payload)
      } else {
        await apiPost('/api/products', payload)
      }

      setShowForm(false)
      fetchProducts()
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiDelete(`/api/products/${deleteTarget.id}`)
      setDeleteTarget(null)
      fetchProducts()
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setDeleting(false)
    }
  }

  // Update form field
  const updateField = (field: keyof ProductFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const typeLabels: Record<string, string> = {
    phone: 'HP',
    accessory: 'Aksesoris',
    pulsa: 'Pulsa',
    paket_data: 'Paket Data',
    token_listrik: 'Token Listrik',
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Produk</h2>
          <p className="text-sm text-muted-foreground">
            Kelola produk dan inventaris toko
          </p>
        </div>
        <Button onClick={openAddForm} className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Produk
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari produk, SKU, merek..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="mr-2 h-3.5 w-3.5" />
              <SelectValue placeholder="Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              {PRODUCT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products Table */}
      <div className="flex-1 overflow-hidden rounded-xl border bg-card">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Nama</TableHead>
                <TableHead className="hidden md:table-cell">Tipe</TableHead>
                <TableHead className="hidden lg:table-cell">Kategori</TableHead>
                <TableHead className="hidden md:table-cell text-right">Harga Beli</TableHead>
                <TableHead className="text-right">Harga Jual</TableHead>
                <TableHead className="text-center">Stok</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <div className="flex flex-col items-center text-muted-foreground">
                      <Package className="mb-2 h-10 w-10 opacity-30" />
                      <p className="text-sm">Belum ada produk</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const isOutOfStock = product.stock <= 0
                  const isLowStock =
                    !isOutOfStock && product.stock <= product.minStock

                  return (
                    <TableRow key={product.id} className="group">
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.sku && (
                            <p className="text-xs text-muted-foreground">
                              SKU: {product.sku}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="text-xs">
                          {typeLabels[product.type] || product.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {product.category?.name || '-'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right text-sm">
                        {formatCurrency(product.buyPrice)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(product.sellPrice)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            'text-sm font-medium',
                            isOutOfStock && 'text-destructive',
                            isLowStock && 'text-amber-600 dark:text-amber-400'
                          )}
                        >
                          {product.stock}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {isOutOfStock ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Habis
                          </Badge>
                        ) : isLowStock ? (
                          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25 text-[10px]">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Stok Rendah
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            Tersedia
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditForm(product)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(product)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Product Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-140px)] pr-3">
            <div className="space-y-6 py-2">
              {/* Basic Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Informasi Dasar
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="name">Nama Produk *</Label>
                    <Input
                      id="name"
                      placeholder="Masukkan nama produk"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipe Produk *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(v) => updateField('type', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Kategori</Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(v) => updateField('categoryId', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      placeholder="Kode SKU"
                      value={formData.sku}
                      onChange={(e) => updateField('sku', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="description">Deskripsi</Label>
                    <Textarea
                      id="description"
                      placeholder="Deskripsi produk (opsional)"
                      value={formData.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* HP Specific Fields */}
              <AnimatePresence>
                {formData.type === 'phone' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Spesifikasi HP
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="brand">Merek</Label>
                        <Input
                          id="brand"
                          placeholder="Samsung, Apple, dll"
                          value={formData.brand}
                          onChange={(e) => updateField('brand', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="model">Model</Label>
                        <Input
                          id="model"
                          placeholder="Galaxy S24, iPhone 15"
                          value={formData.model}
                          onChange={(e) => updateField('model', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="color">Warna</Label>
                        <Input
                          id="color"
                          placeholder="Hitam, Putih"
                          value={formData.color}
                          onChange={(e) => updateField('color', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ram">RAM</Label>
                        <Input
                          id="ram"
                          placeholder="8GB"
                          value={formData.ram}
                          onChange={(e) => updateField('ram', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="storage">Penyimpanan</Label>
                        <Input
                          id="storage"
                          placeholder="128GB"
                          value={formData.storage}
                          onChange={(e) => updateField('storage', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="imei">IMEI</Label>
                        <Input
                          id="imei"
                          placeholder="Nomor IMEI"
                          value={formData.imei}
                          onChange={(e) => updateField('imei', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="condition">Kondisi</Label>
                        <Select
                          value={formData.condition}
                          onValueChange={(v) => updateField('condition', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONDITIONS.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Pricing */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Harga
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="buyPrice">Harga Beli</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">
                        Rp
                      </span>
                      <Input
                        id="buyPrice"
                        type="number"
                        placeholder="0"
                        className="pl-9"
                        value={formData.buyPrice}
                        onChange={(e) => updateField('buyPrice', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sellPrice">Harga Jual *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">
                        Rp
                      </span>
                      <Input
                        id="sellPrice"
                        type="number"
                        placeholder="0"
                        className="pl-9"
                        value={formData.sellPrice}
                        onChange={(e) => updateField('sellPrice', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Stock */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Stok
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stok Saat Ini</Label>
                    <Input
                      id="stock"
                      type="number"
                      placeholder="0"
                      value={formData.stock}
                      onChange={(e) => updateField('stock', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minStock">Batas Stok Minimum (Alert)</Label>
                    <Input
                      id="minStock"
                      type="number"
                      placeholder="5"
                      value={formData.minStock}
                      onChange={(e) => updateField('minStock', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name.trim() || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : editingProduct ? (
                'Simpan Perubahan'
              ) : (
                'Tambah Produk'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Produk</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus produk{' '}
              <strong className="text-foreground">{deleteTarget?.name}</strong>?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                'Hapus'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

