/**
 * Format a number as Indonesian Rupiah currency.
 * Example: 1500000 → "Rp 1.500.000"
 */
export function formatCurrency(amount: number): string {
  if (amount === 0) return 'Rp 0'

  const isNegative = amount < 0
  const absoluteAmount = Math.abs(amount)

  const formatted = absoluteAmount
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  return `${isNegative ? '-' : ''}Rp ${formatted}`
}

/**
 * Format a date string into a human-readable date.
 * Example: "2025-01-12T10:30:00Z" → "12 Jan 2025"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ]

  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()

  return `${day} ${month} ${year}`
}

/**
 * Format a date string into a human-readable date and time.
 * Example: "2025-01-12T10:30:00Z" → "12 Jan 2025, 10:30"
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'

  const formattedDate = formatDate(dateString)

  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')

  return `${formattedDate}, ${hours}:${minutes}`
}

/**
 * Format a time string (HH:MM) from a date.
 * Example: "2025-01-12T10:30:00Z" → "10:30"
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'

  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')

  return `${hours}:${minutes}`
}

/**
 * Generate a unique invoice number.
 * Format: INV-YYYYMMDD-XXXX (4-digit sequential)
 */
export function generateInvoiceNo(): string {
  const now = new Date()

  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')

  const datePart = `${year}${month}${day}`

  // Generate a random 4-digit number
  const sequential = Math.floor(1000 + Math.random() * 9000)

  return `INV-${datePart}-${sequential}`
}

/**
 * Format a number with thousand separators.
 * Example: 1500000 → "1.500.000"
 */
export function formatNumber(num: number): string {
  if (num === 0) return '0'

  const isNegative = num < 0
  const absoluteNum = Math.abs(num)

  const formatted = absoluteNum
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  return `${isNegative ? '-' : ''}${formatted}`
}

/**
 * Format a percentage value.
 * Example: 0.15 → "15%"
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`
}

/**
 * Truncate a string to a maximum length, adding ellipsis if needed.
 * Example: "Hello World" (5) → "Hello..."
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}

/**
 * Format a relative time string (e.g., "5 menit yang lalu").
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()

  if (isNaN(date.getTime())) return '-'

  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)

  if (diffSeconds < 60) return 'Baru saja'
  if (diffMinutes < 60) return `${diffMinutes} menit yang lalu`
  if (diffHours < 24) return `${diffHours} jam yang lalu`
  if (diffDays < 7) return `${diffDays} hari yang lalu`
  if (diffWeeks < 4) return `${diffWeeks} minggu yang lalu`
  if (diffMonths < 12) return `${diffMonths} bulan yang lalu`
  return formatDate(dateString)
}
