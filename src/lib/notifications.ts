import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ==================== TYPES ====================

export interface Notification {
  id: string
  type: 'low_stock' | 'debt_reminder' | 'subscription_expiring' | 'transaction' | 'system'
  title: string
  message: string
  read: boolean
  createdAt: string
  link?: string // page to navigate to
}

interface NotificationStore {
  notifications: Notification[]
  unreadCount: number
  addNotification: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotifications: () => void
  setNotifications: (notifications: Notification[]) => void
}

// ==================== STORE ====================

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (n) => {
        const notification: Notification = {
          ...n,
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          read: false,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }))
      },

      markAsRead: (id) => {
        set((state) => {
          const wasUnread = state.notifications.find((n) => n.id === id)?.read === false
          return {
            notifications: state.notifications.map((n) =>
              n.id === id ? { ...n, read: true } : n
            ),
            unreadCount: wasUnread ? state.unreadCount - 1 : state.unreadCount,
          }
        })
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }))
      },

      clearNotifications: () => {
        set({ notifications: [], unreadCount: 0 })
      },

      setNotifications: (notifications) => {
        set({
          notifications,
          unreadCount: notifications.filter((n) => !n.read).length,
        })
      },
    }),
    {
      name: 'pos-notifications',
      partialize: (state) => ({
        notifications: state.notifications,
      }),
    }
  )
)
