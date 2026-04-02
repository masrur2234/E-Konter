'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  CreditCard, Check, Crown, AlertTriangle, Clock,
  Zap, Building2, Landmark, Upload,
  ShieldCheck, ArrowRight, Copy, CheckCheck
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { apiGet, apiPost } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { useUser } from '@/lib/store'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

// ==================== BANK INFO ====================
const BANK_INFO = {
  bank: 'Bank BRI',
  rekening: '7328 0102 0563 530',
  atasNama: 'MASRUR ROHIM',
}

interface SubscriptionInfo {
  status: string
  trialStart: string | null
  trialEnd: string | null
  subscriptionStart: string | null
  subscriptionEnd: string | null
  planType: string | null
  storeCount: number
  transactionCount: number
}

interface Plan {
  id: string
  name: string
  price: number
  duration: string
  features: string[]
}

interface SubscriptionData {
  subscription: SubscriptionInfo
  plans: Plan[]
}

export default function SubscriptionPage() {
  const user = useUser()
  const [data, setData] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(false)

  // Payment dialog
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [proofDialog, setProofDialog] = useState(false)
  const [proofDescription, setProofDescription] = useState('')
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Proof upload
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate type
    if (!file.type.startsWith('image/')) {
      toast.error('Hanya file gambar yang diperbolehkan (PNG, JPG)')
      return
    }
    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB')
      return
    }

    setProofFile(file)
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setProofPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeProof = () => {
    setProofFile(null)
    setProofPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUploadProof = async () => {
    if (!proofFile || !selectedPlan) return
    setUploadingProof(true)
    try {
      const base64 = proofPreview
      await apiPost('/api/subscription/proof', {
        planType: selectedPlan.id,
        description: proofDescription,
        fileName: proofFile.name,
        fileSize: proofFile.size,
        proofImage: base64,
      })
      toast.success('Bukti berhasil diupload! Langganan akan aktif setelah verifikasi (maks. 1x24 jam).')
      setProofDialog(false)
      setPaymentOpen(false)
      setProofFile(null)
      setProofPreview(null)
      setProofDescription('')
    } catch {
      toast.error('Gagal upload bukti. Silakan coba lagi.')
    } finally {
      setUploadingProof(false)
    }
  }

  const fetchSubscription = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<SubscriptionData>('/api/subscription')
      if (res.data) {
        setData(res.data)
      }
    } catch {
      toast.error('Gagal memuat data langganan')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  const openPayment = (plan: Plan) => {
    setSelectedPlan(plan)
    setPaymentOpen(true)
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text.replace(/\s/g, ''))
    setCopiedField(field)
    toast.success('Berhasil disalin!')
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleActivate = async () => {
    if (!selectedPlan) return
    setActivating(true)
    try {
      await apiPost('/api/subscription', { planType: selectedPlan.id })
      toast.success('Langganan berhasil diaktifkan!')
      setPaymentOpen(false)
      fetchSubscription()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengaktifkan langganan')
    } finally {
      setActivating(false)
    }
  }

  const getStatusBadge = () => {
    if (!data) return null
    const status = data.subscription.status

    if (status === 'trial') {
      return (
        <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 gap-1">
          <Clock className="size-3" />
          Masa Percobaan
        </Badge>
      )
    }
    if (status === 'active') {
      return (
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
          <ShieldCheck className="size-3" />
          Aktif
        </Badge>
      )
    }
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="size-3" />
        Expired
      </Badge>
    )
  }

  const getDaysRemaining = () => {
    if (!data) return 0
    const sub = data.subscription
    const endDate = sub.status === 'trial' ? sub.trialEnd : sub.subscriptionEnd
    if (!endDate) return 0
    const diff = new Date(endDate).getTime() - new Date().getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const getTrialProgress = () => {
    if (!data || data.subscription.status !== 'trial') return 0
    const sub = data.subscription
    if (!sub.trialStart || !sub.trialEnd) return 0
    const total = new Date(sub.trialEnd).getTime() - new Date(sub.trialStart).getTime()
    const elapsed = new Date().getTime() - new Date(sub.trialStart).getTime()
    return Math.min(100, Math.max(0, (elapsed / total) * 100))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    )
  }

  const daysRemaining = getDaysRemaining()
  const trialProgress = getTrialProgress()
  const isSuperAdmin = user?.role === 'super_admin'

  // Super Admin gets special view - no subscription needed
  if (isSuperAdmin) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Langganan</h1>
          <Badge variant="secondary" className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 gap-1">
            <ShieldCheck className="size-3" />
            Super Admin
          </Badge>
        </div>

        <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20">
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="size-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                <ShieldCheck className="size-8 text-white" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-violet-800 dark:text-violet-200">
                  Akses Unlimited
                </h2>
                <p className="text-sm text-violet-600 dark:text-violet-400">
                  Akun Super Admin memiliki akses penuh ke semua fitur tanpa batasan.
                </p>
              </div>
              <Separator className="max-w-xs mx-auto" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-lg">
                <div className="text-center">
                  <p className="text-lg font-bold text-violet-700 dark:text-violet-300">∞</p>
                  <p className="text-xs text-muted-foreground">Toko</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-violet-700 dark:text-violet-300">∞</p>
                  <p className="text-xs text-muted-foreground">Transaksi</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-violet-700 dark:text-violet-300">∞</p>
                  <p className="text-xs text-muted-foreground">Produk</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-violet-700 dark:text-violet-300">∞</p>
                  <p className="text-xs text-muted-foreground">User</p>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {['Kelola User', 'Monitor Platform', 'Laporan Global', 'Log Aktivitas', 'Subscription Management'].map((feat) => (
                  <Badge key={feat} variant="outline" className="border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400">
                    <Check className="size-3 mr-1" />
                    {feat}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Langganan</h1>
          {getStatusBadge()}
        </div>
        {data?.subscription.status === 'active' && (
          <p className="text-muted-foreground text-sm">
            Berlaku hingga {formatDate(data.subscription.subscriptionEnd!)}
          </p>
        )}
      </div>

      {/* Current Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {data?.subscription.status === 'trial' && (
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="size-5 text-amber-600 dark:text-amber-400" />
                    <p className="font-semibold text-amber-800 dark:text-amber-200">
                      Masa Percobaan
                    </p>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Sisa <span className="font-bold">{daysRemaining} hari</span> lagi
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Berakhir {formatDate(data.subscription.trialEnd!)}
                  </p>
                  <Progress
                    value={trialProgress}
                    className="mt-1 h-2 max-w-xs"
                  />
                </div>
                <Button
                  onClick={() => {
                    const plan = data.plans.find((p) => p.id === 'monthly')
                    if (plan) openPayment(plan)
                  }}
                  className="gap-2"
                >
                  <Crown className="size-4" />
                  Aktifkan Sekarang
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {data?.subscription.status === 'expired' && (
          <Card className="border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />
                    <p className="font-semibold text-red-800 dark:text-red-200">
                      Langganan Expired
                    </p>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Langganan Anda telah berakhir. Silakan perpanjang untuk melanjutkan penggunaan.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    const plan = data.plans.find((p) => p.id === 'monthly')
                    if (plan) openPayment(plan)
                  }}
                  className="gap-2"
                >
                  <Crown className="size-4" />
                  Perpanjang Langganan
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {data?.subscription.status === 'active' && (
          <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
                    <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                      Langganan Aktif
                    </p>
                    <Badge variant="secondary" className="bg-emerald-200 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                      {data.subscription.planType === 'monthly' ? 'Bulanan' : 'Tahunan'}
                    </Badge>
                  </div>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">
                    Berlaku hingga {formatDate(data.subscription.subscriptionEnd!)}
                  </p>
                </div>
                <div className="flex gap-4 text-sm text-emerald-700 dark:text-emerald-300">
                  <div className="text-center">
                    <p className="text-lg font-bold">{data.subscription.storeCount}</p>
                    <p className="text-xs">Toko</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{data.subscription.transactionCount}</p>
                    <p className="text-xs">Transaksi</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Plan Comparison */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Pilih Paket</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data?.plans.map((plan, idx) => {
            const isYearly = plan.id === 'yearly'
            const isActivePlan = data.subscription.planType === plan.id && data.subscription.status === 'active'
            const monthlyPrice = isYearly ? Math.round(plan.price / 12) : plan.price
            const savingPercent = isYearly
              ? Math.round(((29999 * 12 - plan.price) / (29999 * 12)) * 100)
              : 0

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
              >
                <Card
                  className={cn(
                    'relative overflow-hidden transition-all',
                    isYearly && 'ring-2 ring-amber-400 dark:ring-amber-500'
                  )}
                >
                  {isYearly && (
                    <div className="bg-amber-500 text-amber-950 absolute top-0 right-0 rounded-bl-lg px-3 py-1 text-xs font-bold">
                      Hemat {savingPercent}%
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {isYearly ? <Crown className="size-5 text-amber-500" /> : <Zap className="size-5" />}
                      {plan.name}
                    </CardTitle>
                    <CardDescription>{plan.duration}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">{formatCurrency(plan.price)}</span>
                        <span className="text-muted-foreground text-sm">/{isYearly ? 'tahun' : 'bulan'}</span>
                      </div>
                      {isYearly && (
                        <p className="text-muted-foreground text-sm">
                          ~{formatCurrency(monthlyPrice)}/bulan
                        </p>
                      )}
                    </div>

                    <Separator />

                    <ul className="space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm">
                          <Check className="size-4 text-emerald-500 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Button
                      className="w-full gap-2"
                      variant={isActivePlan ? 'outline' : 'default'}
                      disabled={isActivePlan || activating}
                      onClick={() => openPayment(plan)}
                    >
                      {isActivePlan ? (
                        <>
                          <Check className="size-4" />
                          Paket Aktif
                        </>
                      ) : (
                        <>
                          <ArrowRight className="size-4" />
                          Aktifkan Langganan
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pembayaran Transfer Bank</DialogTitle>
            <DialogDescription>
              Transfer ke rekening berikut untuk mengaktifkan paket {selectedPlan?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Amount */}
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-muted-foreground text-xs font-medium">Total Pembayaran</p>
              <p className="mt-1 text-2xl font-bold">
                {selectedPlan ? formatCurrency(selectedPlan.price) : ''}
              </p>
              <p className="text-muted-foreground text-xs">
                Paket {selectedPlan?.name} · {selectedPlan?.duration}
              </p>
            </div>

            {/* Bank Info */}
            <div className="rounded-lg border-2 border-emerald-200 dark:border-emerald-900/50 p-4 space-y-3 bg-emerald-50/50 dark:bg-emerald-950/10">
              <div className="flex items-center gap-2">
                <Building2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm font-semibold">Informasi Transfer</p>
              </div>

              <div className="space-y-3">
                {/* Bank Name */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Bank</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{BANK_INFO.bank}</span>
                  </div>
                </div>

                <Separator />

                {/* Rekening Number */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">No. Rekening</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold tracking-wider">{BANK_INFO.rekening}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      onClick={() => copyToClipboard(BANK_INFO.rekening, 'rekening')}
                    >
                      {copiedField === 'rekening' ? (
                        <CheckCheck className="size-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Atas Nama */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Atas Nama</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{BANK_INFO.atasNama}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      onClick={() => copyToClipboard(BANK_INFO.atasNama, 'nama')}
                    >
                      {copiedField === 'nama' ? (
                        <CheckCheck className="size-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Jumlah */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Jumlah Transfer</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedPlan ? formatCurrency(selectedPlan.price) : ''}
                  </span>
                </div>
              </div>

              {/* Warning */}
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  ⚠️ Transfer sesuai jumlah di atas. Setelah transfer, upload bukti pembayaran untuk verifikasi.
                </p>
              </div>
            </div>

            {/* Upload Proof Button */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setProofDialog(true)}
            >
              <Upload className="size-4" />
              Upload Bukti Transfer
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)} disabled={activating}>
              Batal
            </Button>
            <Button onClick={handleActivate} disabled={activating} className="gap-2">
              {activating ? (
                'Memproses...'
              ) : (
                <>
                  <Check className="size-4" />
                  Saya Sudah Transfer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proof Upload Dialog */}
      <Dialog open={proofDialog} onOpenChange={(open) => { if (!open) removeProof(); setProofDialog(open) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Bukti Transfer</DialogTitle>
            <DialogDescription>
              Upload screenshot bukti transfer Anda untuk verifikasi
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Bank reminder */}
            <div className="rounded-lg border-2 border-emerald-200 dark:border-emerald-900/50 p-3 bg-emerald-50/50 dark:bg-emerald-950/10 space-y-1">
              <p className="text-sm font-medium">Transfer ke:</p>
              <p className="text-sm">{BANK_INFO.bank} - {BANK_INFO.rekening}</p>
              <p className="text-sm font-bold">a.n. {BANK_INFO.atasNama}</p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                Total: {selectedPlan ? formatCurrency(selectedPlan.price) : ''}
              </p>
            </div>

            {/* File input (hidden) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Upload area */}
            {proofPreview ? (
              <div className="relative rounded-lg border p-2">
                <img
                  src={proofPreview}
                  alt="Bukti transfer"
                  className="w-full max-h-64 object-contain rounded-md"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-3 right-3 size-7 rounded-full p-0"
                  onClick={removeProof}
                >
                  ✕
                </Button>
                <div className="mt-2 flex items-center justify-between px-1">
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                    📎 {proofFile?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {proofFile ? `${(proofFile.size / 1024).toFixed(0)} KB` : ''}
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="flex items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="size-6" />
                  </div>
                  <p className="text-sm font-medium">Klik untuk upload bukti transfer</p>
                  <p className="text-xs">PNG, JPG hingga 5MB</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Catatan (opsional)</Label>
              <Textarea
                placeholder="Nama pengirim, nominal yang ditransfer, dll."
                value={proofDescription}
                onChange={(e) => setProofDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { removeProof(); setProofDialog(false) }}>
              Batal
            </Button>
            <Button
              onClick={handleUploadProof}
              disabled={!proofFile || uploadingProof}
              className="gap-2"
            >
              {uploadingProof ? (
                <>
                  <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Mengupload...
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  Upload Bukti
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
