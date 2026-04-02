'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  X,
  ShoppingBag,
  User,
  Check,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { apiGet, apiPost } from '@/lib/api'
import { formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { useStore, useCart, useUser, useActiveStoreId, useStores, type Product, type Customer, type CartItem } from '@/lib/store'
import { ReceiptDialog, type ReceiptData } from '@/components/receipt-dialog'

// Category filter tabs
const CATEGORY_TABS = [
  { key: 'all', label: 'Semua' },
  { key: 'phone', label: 'HP' },
  { key: 'accessory', label: 'Aksesoris' },
  { key: 'pulsa', label: 'Pulsa' },
  { key: 'paket_data', label: 'Paket Data' },
]

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Tunai', icon: Banknote },
  { value: 'transfer', label: 'Transfer', icon: CreditCard },
  { value: 'qris', label: 'QRIS', icon: QrCode },
]

export default function PosPage() {
  const {
    cart,
    selectedCustomer,
    discount,
    paymentMethod,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    setSelectedCustomer,
    setDiscount,
    setPaymentMethod,
    clearCart: resetCart,
  } = useStore()

  const user = useUser()
  const activeStoreId = useActiveStoreId()
  const stores = useStores()

  const [products, setProducts] = React.useState<Product[]>([])
  const [searchQuery, setSearchQuery] = React.useState('')
  const [activeCategory, setActiveCategory] = React.useState('all')
  const [loading, setLoading] = React.useState(true)
  const [checkingOut, setCheckingOut] = React.useState(false)
  const [cartOpen, setCartOpen] = React.useState(false)

  // Payment state
  const [paidAmount, setPaidAmount] = React.useState('')

  // Customer search
  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [customerSearch, setCustomerSearch] = React.useState('')

  // Receipt
  const [showReceipt, setShowReceipt] = React.useState(false)
  const [receiptData, setReceiptData] = React.useState<ReceiptData | null>(null)

  // Computed
  const subtotal = React.useMemo(
    () => cart.reduce((sum, item) => sum + item.product.sellPrice * item.quantity, 0),
    [cart]
  )
  const total = React.useMemo(() => Math.max(0, subtotal - discount), [subtotal, discount])
  const change = React.useMemo(() => {
    const paid = parseFloat(paidAmount) || 0
    return Math.max(0, paid - total)
  }, [paidAmount, total])

  // Current store info
  const currentStore = stores.find((s) => s.id === activeStoreId)

  // Fetch products on mount
  React.useEffect(() => {
    if (!activeStoreId) return
    let cancelled = false
    setLoading(true)
    apiGet<{ products: Product[] }>(
      `/api/products?storeId=${activeStoreId}&limit=200`
    ).then((res) => {
      if (!cancelled && res.data) {
        setProducts(res.data.products || [])
      }
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [activeStoreId])

  // Fetch customers for search
  React.useEffect(() => {
    if (!activeStoreId || !customerSearch) return
    let cancelled = false
    apiGet<{ customers: Customer[] }>(
      `/api/customers?storeId=${activeStoreId}&search=${encodeURIComponent(customerSearch)}&limit=20`
    ).then((res) => {
      if (!cancelled && res.data) {
        setCustomers(res.data.customers || [])
      }
    })
    return () => { cancelled = true }
  }, [activeStoreId, customerSearch])

  // Filter products
  const filteredProducts = React.useMemo(() => {
    let filtered = products
    if (activeCategory !== 'all') {
      filtered = filtered.filter((p) => p.type === activeCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [products, activeCategory, searchQuery])

  // Handle add to cart
  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) return
    const existingItem = cart.find((item) => item.product.id === product.id)
    if (existingItem) {
      if (existingItem.quantity >= product.stock) return
      updateQuantity(product.id, existingItem.quantity + 1)
    } else {
      addToCart(product, 1)
    }
  }

  // Handle checkout
  const handleCheckout = async () => {
    if (cart.length === 0 || !activeStoreId) return

    if (paymentMethod === 'cash') {
      const paid = parseFloat(paidAmount) || 0
      if (paid < total) return
    }

    setCheckingOut(true)
    try {
      const payload = {
        storeId: activeStoreId,
        customerId: selectedCustomer?.id || null,
        cashierName: user?.name || 'Kasir',
        type: 'sale',
        discount,
        paid: paymentMethod === 'cash' ? parseFloat(paidAmount) || total : total,
        paymentMethod,
        items: cart.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          category: item.product.type,
          quantity: item.quantity,
          buyPrice: item.product.buyPrice,
          sellPrice: item.product.sellPrice,
          total: item.product.sellPrice * item.quantity,
        })),
      }

      const res = await apiPost<{
        transaction: unknown
        receipt: ReceiptData
      }>('/api/transactions', payload)

      if (res.data?.receipt) {
        setReceiptData(res.data.receipt)
        setShowReceipt(true)
        resetCart()
        setPaidAmount('')
        setCartOpen(false)

        // Refresh products to update stock
        apiGet<{ products: Product[] }>(
          `/api/products?storeId=${activeStoreId}&limit=200`
        ).then((r) => {
          if (r.data) setProducts(r.data.products || [])
        })
      }
    } catch (err) {
      console.error('Checkout error:', err)
    } finally {
      setCheckingOut(false)
    }
  }

  // Cart content (shared between desktop and mobile)
  const cartContent = (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Cart Header */}
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Keranjang</h3>
          {cart.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {cart.reduce((c, i) => c + i.quantity, 0)}
            </Badge>
          )}
        </div>
      </div>

      {/* Scrollable area: customer search + cart items + totals + payment */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Customer Search */}
        <div className="border-b px-4 py-3">
          <div className="relative">
            <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari pelanggan..."
              className="pl-8"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
          </div>
          {customerSearch && customers.length > 0 && (
            <div className="mt-2 max-h-32 overflow-y-auto rounded-md border bg-background">
              {customers.map((c) => (
                <button
                  key={c.id}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent',
                    selectedCustomer?.id === c.id && 'bg-accent'
                  )}
                  onClick={() => {
                    setSelectedCustomer(c)
                    setCustomerSearch('')
                  }}
                >
                  <span>{c.name}</span>
                  {c.phone && (
                    <span className="text-xs text-muted-foreground">{c.phone}</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {selectedCustomer && (
            <div className="mt-2 flex items-center justify-between rounded-md bg-primary/5 px-3 py-1.5">
              <span className="text-sm font-medium">{selectedCustomer.name}</span>
              <button
                onClick={() => {
                  setSelectedCustomer(null)
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Cart Items */}
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ShoppingBag className="mb-3 h-12 w-12 opacity-30" />
            <p className="text-sm">Keranjang masih kosong</p>
          </div>
        ) : (
          <div className="space-y-1 p-4">
            <AnimatePresence mode="popLayout">
              {cart.map((item) => (
                <motion.div
                  key={item.product.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-lg border bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">
                        {item.product.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatCurrency(item.product.sellPrice)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity - 1)
                        }
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        disabled={item.quantity >= item.product.stock}
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity + 1)
                        }
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="text-sm font-semibold">
                      {formatCurrency(item.product.sellPrice * item.quantity)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Totals & Payment Section (now scrollable) */}
        <div className="space-y-3 border-t bg-background px-4 pt-3 pb-4">
          {/* Discount */}
          <div className="flex items-center gap-2">
            <Label htmlFor="discount" className="text-sm shrink-0 w-16">
              Diskon
            </Label>
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground">
                Rp
              </span>
              <Input
                id="discount"
                type="number"
                placeholder="0"
                className="pl-9"
                value={discount || ''}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <Separator />

          {/* Subtotal */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>

          {/* Discount display */}
          {discount > 0 && (
            <div className="flex justify-between text-sm text-orange-600 dark:text-orange-400">
              <span>Diskon</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(total)}</span>
          </div>

          <Separator />

          {/* Payment Method */}
          <div className="space-y-2">
            <Label className="text-sm">Metode Pembayaran</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              className="flex gap-2"
            >
              {PAYMENT_METHODS.map((method) => (
                <label
                  key={method.value}
                  className={cn(
                    'flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                    paymentMethod === method.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-accent'
                  )}
                >
                  <RadioGroupItem value={method.value} className="sr-only" />
                  <method.icon className="h-4 w-4" />
                  {method.label}
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Cash payment fields */}
          {paymentMethod === 'cash' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <Label className="text-sm shrink-0 w-16">Bayar</Label>
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground">
                    Rp
                  </span>
                  <Input
                    type="number"
                    placeholder="0"
                    className="pl-9"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                  />
                </div>
              </div>
              {parseFloat(paidAmount) >= total && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Kembalian</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(change)}
                  </span>
                </div>
              )}
              {/* Quick amount buttons */}
              <div className="flex flex-wrap gap-1.5">
                {[total, Math.ceil(total / 1000) * 1000, Math.ceil(total / 5000) * 5000, Math.ceil(total / 10000) * 10000]
                  .filter((v, i, a) => a.indexOf(v) === i && v > 0)
                  .slice(0, 3)
                  .map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setPaidAmount(amount.toString())}
                    >
                      {formatCurrency(amount)}
                    </Button>
                  ))}
              </div>
            </motion.div>
          )}

          {/* Spacer for sticky button */}
          <div className="h-2" />
        </div>
      </div>

      {/* Sticky Checkout Button - always visible at bottom */}
      <div className="shrink-0 border-t bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          className="w-full"
          size="lg"
          disabled={
            cart.length === 0 ||
            (paymentMethod === 'cash' &&
              (parseFloat(paidAmount) || 0) < total) ||
            checkingOut
          }
          onClick={handleCheckout}
        >
          {checkingOut ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Memproses...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Bayar {formatCurrency(total)}
            </>
          )}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex h-full flex-col">
      {/* Mobile Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 lg:hidden">
        <h2 className="text-lg font-semibold">Kasir</h2>
        <Button
          variant="outline"
          size="sm"
          className="relative gap-2"
          onClick={() => setCartOpen(true)}
        >
          <ShoppingCart className="h-4 w-4" />
          {cart.length > 0 && (
            <Badge className="absolute -right-2 -top-2 h-5 w-5 rounded-full p-0 text-[10px]">
              {cart.reduce((c, i) => c + i.quantity, 0)}
            </Badge>
          )}
        </Button>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Products */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Search & Filters */}
          <div className="space-y-3 border-b p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari produk, SKU, atau merek..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Category Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveCategory(tab.key)}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                    activeCategory === tab.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-36 animate-pulse rounded-xl bg-muted"
                  />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Search className="mb-3 h-12 w-12 opacity-30" />
                <p className="text-sm">Produk tidak ditemukan</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 lg:grid-cols-4">
                {filteredProducts.map((product) => {
                  const inCart = cart.find(
                    (item) => item.product.id === product.id
                  )
                  const outOfStock = product.stock <= 0

                  return (
                    <motion.button
                      key={product.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={outOfStock}
                      className={cn(
                        'relative flex flex-col rounded-xl border p-3 text-left transition-all',
                        !outOfStock
                          ? 'bg-card hover:border-primary/50 hover:shadow-md cursor-pointer'
                          : 'cursor-not-allowed opacity-50 bg-muted/50',
                        inCart && 'border-primary ring-2 ring-primary/20'
                      )}
                      onClick={() => handleAddToCart(product)}
                    >
                      {/* In-cart badge */}
                      {inCart && (
                        <Badge className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full p-0 text-[10px]">
                          {inCart.quantity}
                        </Badge>
                      )}

                      {/* Product type icon area */}
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ShoppingBag className="h-5 w-5" />
                      </div>

                      {/* Product info */}
                      <h4 className="line-clamp-2 text-sm font-medium leading-tight">
                        {product.name}
                      </h4>
                      {product.brand && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {product.brand}
                        </p>
                      )}

                      <div className="mt-auto pt-2">
                        <p className="text-sm font-bold text-primary">
                          {formatCurrency(product.sellPrice)}
                        </p>
                        <p
                          className={cn(
                            'text-[11px]',
                            outOfStock
                              ? 'text-destructive font-medium'
                              : product.stock <= product.minStock
                                ? 'text-amber-600 dark:text-amber-400 font-medium'
                                : 'text-muted-foreground'
                          )}
                        >
                          {outOfStock
                            ? 'Habis'
                            : `Stok: ${product.stock}`}
                        </p>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Panel - Cart (Desktop) */}
        <div className="hidden w-[380px] shrink-0 border-l lg:block">
          {cartContent}
        </div>
      </div>

      {/* Mobile Cart Sheet */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="bottom" className="h-[90vh] gap-0 rounded-t-2xl p-0">
          <SheetTitle className="sr-only">Keranjang Belanja</SheetTitle>
          {cartContent}
        </SheetContent>
      </Sheet>

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
