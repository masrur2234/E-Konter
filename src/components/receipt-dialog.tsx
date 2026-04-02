'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatDateTime } from '@/lib/utils/format'
import { Printer } from 'lucide-react'

export interface ReceiptData {
  store: {
    name: string
    address?: string | null
    phone?: string | null
    whatsapp?: string | null
  }
  cashier: string
  invoiceNo: string
  items: Array<{
    name: string
    category?: string | null
    qty: number
    price: number
    total: number
  }>
  subtotal: number
  discount: number
  total: number
  paid: number
  change: number
  paymentMethod: string
  customer?: { id: string; name: string; phone?: string | null } | null
  createdAt: string
}

interface ReceiptDialogProps {
  open: boolean
  onClose: () => void
  transaction: ReceiptData | null
  store?: ReceiptData['store'] | null
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'Tunai',
  transfer: 'Transfer Bank',
  qris: 'QRIS',
}

function ReceiptContent({ data }: { data: ReceiptData }) {
  return (
    <div
      id="receipt-print-area"
      className="mx-auto w-full max-w-[320px] bg-white p-6 font-mono text-xs text-gray-900 dark:text-gray-900"
      style={{ lineHeight: '1.6' }}
    >
      {/* Store Header */}
      <div className="mb-3 text-center">
        <h2 className="text-base font-bold leading-tight">{data.store.name}</h2>
        {data.store.address && (
          <p className="mt-0.5">{data.store.address}</p>
        )}
        {data.store.phone && <p>{data.store.phone}</p>}
        {data.store.whatsapp && (
          <p>WA: {data.store.whatsapp}</p>
        )}
      </div>

      {/* Separator */}
      <div className="my-2 border-t border-dashed border-gray-400" />

      {/* Transaction Info */}
      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span>Tanggal</span>
          <span>{formatDateTime(data.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>No. Invoice</span>
          <span>{data.invoiceNo}</span>
        </div>
        <div className="flex justify-between">
          <span>Kasir</span>
          <span>{data.cashier}</span>
        </div>
        {data.customer && (
          <div className="flex justify-between">
            <span>Pelanggan</span>
            <span>{data.customer.name}</span>
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="my-2 border-t border-dashed border-gray-400" />

      {/* Items */}
      <div>
        {data.items.map((item, index) => (
          <div key={index} className="mb-1.5">
            <div className="font-medium">{item.name}</div>
            <div className="flex justify-between pl-2">
              <span>
                {item.qty} x {formatCurrency(item.price)}
              </span>
              <span className="font-medium">{formatCurrency(item.total)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Separator */}
      <div className="my-2 border-t border-dashed border-gray-400" />

      {/* Totals */}
      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(data.subtotal)}</span>
        </div>
        {data.discount > 0 && (
          <div className="flex justify-between">
            <span>Diskon</span>
            <span>-{formatCurrency(data.discount)}</span>
          </div>
        )}
      </div>

      <div className="my-2 border-t border-gray-900 dark:border-gray-900" />

      <div className="flex justify-between text-sm font-bold">
        <span>TOTAL</span>
        <span>{formatCurrency(data.total)}</span>
      </div>

      <div className="mt-2 border-t border-dashed border-gray-400" />

      {/* Payment */}
      <div className="mt-2 space-y-0.5">
        <div className="flex justify-between">
          <span>Metode Bayar</span>
          <span>{paymentMethodLabels[data.paymentMethod] || data.paymentMethod}</span>
        </div>
        <div className="flex justify-between">
          <span>Dibayar</span>
          <span>{formatCurrency(data.paid)}</span>
        </div>
        {data.paymentMethod === 'cash' && data.change > 0 && (
          <div className="flex justify-between">
            <span>Kembalian</span>
            <span>{formatCurrency(data.change)}</span>
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="my-3 border-t border-dashed border-gray-400" />

      {/* Footer */}
      <div className="text-center">
        <p className="font-semibold">Terima Kasih</p>
        <p className="mt-0.5 text-[10px] text-gray-500">
          Simpan struk ini sebagai bukti pembayaran
        </p>
      </div>
    </div>
  )
}

export function ReceiptDialog({ open, onClose, transaction }: ReceiptDialogProps) {
  const handlePrint = React.useCallback(() => {
    window.print()
  }, [])

  const data = transaction

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Struk Pembayaran</DialogTitle>
        </DialogHeader>

        {data ? (
          <>
            {/* Action buttons - hidden during print */}
            <div className="flex items-center justify-between border-b px-4 py-3 print:hidden">
              <h3 className="text-sm font-semibold text-foreground">Struk Pembayaran</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                Cetak Struk
              </Button>
            </div>

            <ReceiptContent data={data} />
          </>
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">Data struk tidak tersedia</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ReceiptDialog
