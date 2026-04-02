import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ==================== TYPES ====================

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  avatar?: string
  role: string
  status: string
  subscriptionStatus: string
  trialStart?: string
  trialEnd?: string
  subscriptionStart?: string
  subscriptionEnd?: string
  planType?: string
  createdAt: string
}

export interface Store {
  id: string
  userId: string
  name: string
  address?: string
  phone?: string
  whatsapp?: string
  logo?: string
  isActive: boolean
}

export interface Category {
  id: string
  name: string
  type: string
}

export interface Product {
  id: string
  userId: string
  storeId: string
  categoryId?: string
  name: string
  sku?: string
  type: string
  description?: string
  brand?: string
  model?: string
  ram?: string
  storage?: string
  color?: string
  imei?: string
  condition?: string
  buyPrice: number
  sellPrice: number
  stock: number
  minStock: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  category?: Category
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface Transaction {
  id: string
  invoiceNo: string
  type: string
  subtotal: number
  discount: number
  total: number
  paid: number
  change: number
  paymentMethod: string
  status: string
  cashierName?: string
  customerName?: string
  items: TransactionItem[]
  createdAt: string
}

export interface TransactionItem {
  id: string
  productName: string
  category?: string
  quantity: number
  buyPrice: number
  sellPrice: number
  total: number
}

export interface Customer {
  id: string
  name: string
  phone?: string
  address?: string
  email?: string
  debt: number
  createdAt: string
}

export interface Cashflow {
  id: string
  type: string
  category?: string
  amount: number
  description?: string
  createdAt: string
}

export interface SalesByDay {
  date: string
  total: number
}

export interface TopProduct {
  productId: string
  productName: string
  quantity: number
  revenue: number
}

export interface DashboardStats {
  todaySales: number
  totalTransactions: number
  totalRevenue: number
  topProducts: TopProduct[]
  lowStockProducts: Product[]
  recentTransactions: Transaction[]
  salesByDay: SalesByDay[]
}

export type PageType =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'transactions'
  | 'customers'
  | 'finance'
  | 'reports'
  | 'settings'
  | 'subscription'
  | 'admin'
  | 'admin-users'
  | 'admin-logs'

// ==================== AUTH SLICE ====================

interface AuthSlice {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  logout: () => void
}

// ==================== APP SLICE ====================

interface AppSlice {
  currentPage: PageType
  activeStoreId: string | null
  sidebarOpen: boolean
  setActivePage: (page: PageType) => void
  setActiveStore: (id: string) => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

// ==================== POS SLICE ====================

interface PosSlice {
  cart: CartItem[]
  selectedCustomer: Customer | null
  discount: number
  paymentMethod: string
  addToCart: (product: Product, quantity?: number) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  setSelectedCustomer: (customer: Customer | null) => void
  setDiscount: (discount: number) => void
  setPaymentMethod: (method: string) => void
  getCartSubtotal: () => number
  getCartTotal: () => number
  getCartItemCount: () => number
}

// ==================== DATA SLICE ====================

interface DataSlice {
  stores: Store[]
  products: Product[]
  categories: Category[]
  customers: Customer[]
  transactions: Transaction[]
  cashflows: Cashflow[]
  dashboardStats: DashboardStats | null
  setStores: (stores: Store[]) => void
  setProducts: (products: Product[]) => void
  setCategories: (categories: Category[]) => void
  setCustomers: (customers: Customer[]) => void
  setTransactions: (transactions: Transaction[]) => void
  setCashflows: (cashflows: Cashflow[]) => void
  setDashboardStats: (stats: DashboardStats) => void
}

// ==================== COMBINED STORE ====================

type AppStore = AuthSlice & AppSlice & PosSlice & DataSlice

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ==================== AUTH STATE ====================
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
        }),
      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          cart: [],
          selectedCustomer: null,
          activeStoreId: null,
          stores: [],
          products: [],
          categories: [],
          customers: [],
          transactions: [],
          cashflows: [],
          dashboardStats: null,
        }),

      // ==================== APP STATE ====================
      currentPage: 'dashboard',
      activeStoreId: null,
      sidebarOpen: true,
      setActivePage: (page) => set({ currentPage: page }),
      setActiveStore: (id) => set({ activeStoreId: id }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      // ==================== POS STATE ====================
      cart: [],
      selectedCustomer: null,
      discount: 0,
      paymentMethod: 'cash',

      addToCart: (product, quantity = 1) =>
        set((state) => {
          const existingItem = state.cart.find(
            (item) => item.product.id === product.id
          )
          if (existingItem) {
            return {
              cart: state.cart.map((item) =>
                item.product.id === product.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            }
          }
          return { cart: [...state.cart, { product, quantity }] }
        }),

      removeFromCart: (productId) =>
        set((state) => ({
          cart: state.cart.filter((item) => item.product.id !== productId),
        })),

      updateQuantity: (productId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              cart: state.cart.filter((item) => item.product.id !== productId),
            }
          }
          return {
            cart: state.cart.map((item) =>
              item.product.id === productId ? { ...item, quantity } : item
            ),
          }
        }),

      clearCart: () =>
        set({ cart: [], selectedCustomer: null, discount: 0 }),

      setSelectedCustomer: (customer) =>
        set({ selectedCustomer: customer }),

      setDiscount: (discount) => set({ discount: Math.max(0, discount) }),

      setPaymentMethod: (method) => set({ paymentMethod: method }),

      getCartSubtotal: () => {
        const { cart } = get()
        return cart.reduce(
          (total, item) => total + item.product.sellPrice * item.quantity,
          0
        )
      },

      getCartTotal: () => {
        const { cart, discount } = get()
        const subtotal = cart.reduce(
          (total, item) => total + item.product.sellPrice * item.quantity,
          0
        )
        return Math.max(0, subtotal - discount)
      },

      getCartItemCount: () => {
        const { cart } = get()
        return cart.reduce((count, item) => count + item.quantity, 0)
      },

      // ==================== DATA STATE ====================
      stores: [],
      products: [],
      categories: [],
      customers: [],
      transactions: [],
      cashflows: [],
      dashboardStats: null,

      setStores: (stores) => set({ stores }),
      setProducts: (products) => set({ products }),
      setCategories: (categories) => set({ categories }),
      setCustomers: (customers) => set({ customers }),
      setTransactions: (transactions) => set({ transactions }),
      setCashflows: (cashflows) => set({ cashflows }),
      setDashboardStats: (stats) => set({ dashboardStats: stats }),
    }),
    {
      name: 'pos-auth-storage',
      // Only persist auth-related fields
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        activeStoreId: state.activeStoreId,
      }),
    }
  )
)

// ==================== SELECTOR HOOKS ====================

/** Get current authenticated user */
export const useUser = () => useStore((s) => s.user)

/** Get auth token */
export const useToken = () => useStore((s) => s.token)

/** Check if user is authenticated */
export const useIsAuthenticated = () => useStore((s) => s.isAuthenticated)

/** Get current page */
export const useCurrentPage = () => useStore((s) => s.currentPage)

/** Get active store ID */
export const useActiveStoreId = () => useStore((s) => s.activeStoreId)

/** Get sidebar open state */
export const useSidebarOpen = () => useStore((s) => s.sidebarOpen)

/** Get cart items */
export const useCart = () => useStore((s) => s.cart)

/** Get cart subtotal */
export const useCartSubtotal = () =>
  useStore((s) => {
    return s.cart.reduce(
      (total, item) => total + item.product.sellPrice * item.quantity,
      0
    )
  })

/** Get cart total (with discount) */
export const useCartTotal = () =>
  useStore((s) => {
    const subtotal = s.cart.reduce(
      (total, item) => total + item.product.sellPrice * item.quantity,
      0
    )
    return Math.max(0, subtotal - s.discount)
  })

/** Get cart item count */
export const useCartItemCount = () =>
  useStore((s) => s.cart.reduce((count, item) => count + item.quantity, 0))

/** Get selected customer for POS */
export const useSelectedCustomer = () =>
  useStore((s) => s.selectedCustomer)

/** Get POS discount */
export const usePosDiscount = () => useStore((s) => s.discount)

/** Get POS payment method */
export const usePosPaymentMethod = () => useStore((s) => s.paymentMethod)

/** Get stores list */
export const useStores = () => useStore((s) => s.stores)

/** Get products list */
export const useProducts = () => useStore((s) => s.products)

/** Get categories list */
export const useCategories = () => useStore((s) => s.categories)

/** Get customers list */
export const useCustomers = () => useStore((s) => s.customers)

/** Get transactions list */
export const useTransactions = () => useStore((s) => s.transactions)

/** Get cashflows list */
export const useCashflows = () => useStore((s) => s.cashflows)

/** Get dashboard stats */
export const useDashboardStats = () => useStore((s) => s.dashboardStats)
