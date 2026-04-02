'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Store, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiPost } from '@/lib/api'
import { useStore, type User, type Store as StoreType } from '@/lib/store'

export function AuthPage() {
  const [loginLoading, setLoginLoading] = useState(false)
  const [registerLoading, setRegisterLoading] = useState(false)

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register form state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regStoreName, setRegStoreName] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!loginEmail.trim() || !loginPassword.trim()) {
      toast.error('Harap isi email dan password')
      return
    }

    setLoginLoading(true)
    try {
      const res = await apiPost<{
        user: User
        token: string
        stores: StoreType[]
      }>('/api/auth/login', {
        email: loginEmail.trim(),
        password: loginPassword,
      })

      if (res.error) {
        toast.error(res.error)
        return
      }

      if (res.data) {
        const { user, token, stores } = res.data
        const store = useStore.getState()

        // Login to store
        store.login(user, token)
        store.setStores(stores)

        // Set active store
        if (stores.length > 0) {
          // Check if previously selected store is still valid
          const prevStoreId = store.activeStoreId
          const validStore = stores.find((s) => s.id === prevStoreId)
          if (validStore) {
            store.setActiveStore(validStore.id)
          } else {
            store.setActiveStore(stores[0].id)
          }
        }

        store.setActivePage('dashboard')
        toast.success(`Selamat datang, ${user.name}!`)
      }
    } catch {
      toast.error('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim() || !regStoreName.trim()) {
      toast.error('Harap isi semua field yang wajib')
      return
    }

    if (regPassword.length < 6) {
      toast.error('Password minimal 6 karakter')
      return
    }

    setRegisterLoading(true)
    try {
      const res = await apiPost<{
        user: User
        token: string
        store: { id: string; name: string }
      }>('/api/auth/register', {
        email: regEmail.trim(),
        password: regPassword,
        name: regName.trim(),
        phone: regPhone.trim() || undefined,
        storeName: regStoreName.trim(),
      })

      if (res.error) {
        toast.error(res.error)
        return
      }

      if (res.data) {
        const { user, token, store: newStore } = res.data
        const store = useStore.getState()

        store.login(user, token)
        store.setStores([
          {
            id: newStore.id,
            userId: user.id,
            name: newStore.name,
            isActive: true,
          },
        ])
        store.setActiveStore(newStore.id)
        store.setActivePage('dashboard')

        toast.success('Pendaftaran berhasil! Selamat datang!')
      }
    } catch {
      toast.error('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setRegisterLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-background to-teal-50 dark:from-emerald-950/30 dark:via-background dark:to-teal-950/30" />

      {/* Decorative blobs */}
      <div className="absolute top-0 -left-40 w-80 h-80 bg-emerald-400/20 dark:bg-emerald-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-teal-400/20 dark:bg-teal-600/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-300/10 dark:bg-emerald-700/5 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-400 dark:to-teal-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">KasirPOS</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sistem Kasir untuk Counter Pulsa & Toko
          </p>
        </motion.div>

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-0 shadow-xl backdrop-blur-sm bg-card/80 dark:bg-card/60">
            <Tabs defaultValue="login" className="w-full">
              <CardHeader className="pb-2">
                <TabsList className="w-full grid grid-cols-2 h-11">
                  <TabsTrigger value="login" className="text-sm">
                    Masuk
                  </TabsTrigger>
                  <TabsTrigger value="register" className="text-sm">
                    Daftar
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              {/* Login Form */}
              <TabsContent value="login">
                <CardContent className="pt-2">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="nama@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        disabled={loginLoading}
                        autoComplete="email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Masukkan password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        disabled={loginLoading}
                        autoComplete="current-password"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 dark:from-emerald-500 dark:to-teal-500 dark:hover:from-emerald-600 dark:hover:to-teal-600 text-white shadow-lg"
                      disabled={loginLoading}
                      size="lg"
                    >
                      {loginLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                      ) : (
                        'Masuk'
                      )}
                    </Button>
                  </form>

                  <div className="mt-6 text-center">
                    <p className="text-xs text-muted-foreground">
                      <Zap className="inline w-3 h-3 mr-1 text-amber-500" />
                      Coba gratis 5 hari tanpa kartu kredit
                    </p>
                  </div>
                </CardContent>
              </TabsContent>

              {/* Register Form */}
              <TabsContent value="register">
                <CardContent className="pt-2">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-name">
                        Nama Lengkap <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="reg-name"
                        type="text"
                        placeholder="Nama lengkap"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        disabled={registerLoading}
                        autoComplete="name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-email">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="nama@email.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        disabled={registerLoading}
                        autoComplete="email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-phone">No. Telepon</Label>
                      <Input
                        id="reg-phone"
                        type="tel"
                        placeholder="08xxxxxxxxxx"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        disabled={registerLoading}
                        autoComplete="tel"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-store">
                        Nama Toko <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="reg-store"
                        type="text"
                        placeholder="Contoh: Counter Pulsa Jaya"
                        value={regStoreName}
                        onChange={(e) => setRegStoreName(e.target.value)}
                        disabled={registerLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-password">
                        Password <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="Minimal 6 karakter"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        disabled={registerLoading}
                        autoComplete="new-password"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 dark:from-emerald-500 dark:to-teal-500 dark:hover:from-emerald-600 dark:hover:to-teal-600 text-white shadow-lg"
                      disabled={registerLoading}
                      size="lg"
                    >
                      {registerLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                      ) : (
                        'Daftar Sekarang'
                      )}
                    </Button>
                  </form>

                  <div className="mt-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      <Zap className="inline w-3 h-3 mr-1 text-amber-500" />
                      Dapatkan 5 hari trial gratis setelah mendaftar
                    </p>
                  </div>
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center text-xs text-muted-foreground mt-6"
        >
          &copy; {new Date().getFullYear()} KasirPOS &mdash; Sistem Kasir Modern
        </motion.p>
      </div>
    </div>
  )
}
