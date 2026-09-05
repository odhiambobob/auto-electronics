export function useFormat() {
  function formatMoney(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(amount)
    } catch {
      return `${currency} ${amount.toLocaleString()}`
    }
  }

  function formatCount(value: number): string {
    return new Intl.NumberFormat(undefined).format(value)
  }

  function formatOrderTime(iso: string | Date): string {
    const date = typeof iso === 'string' ? new Date(iso) : iso
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date)
  }

  function formatDate(iso: string | Date): string {
    const date = typeof iso === 'string' ? new Date(iso) : iso
    return new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date)
  }

  function formatRelativeTime(iso: string | Date): string {
    const date = typeof iso === 'string' ? new Date(iso) : iso
    const delta = Date.now() - date.getTime()
    if (Number.isNaN(delta)) return '—'
    const minutes = Math.round(delta / 60000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.round(hours / 24)
    if (days < 14) return `${days}d ago`
    return formatDate(date)
  }

  function isoDateOnly(offsetDays: number): string {
    const date = new Date()
    date.setDate(date.getDate() + offsetDays)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  function tomorrowIso(): string {
    return isoDateOnly(1)
  }

  function defaultDeliveryIso(): string {
    return isoDateOnly(3)
  }

  function generateOrderId(): string {
    const stamp = Date.now().toString(36).toUpperCase()
    const salt = Math.random().toString(36).slice(2, 6).toUpperCase()
    return `AE-${stamp}-${salt}`
  }

  return {
    formatMoney,
    formatCount,
    formatOrderTime,
    formatDate,
    formatRelativeTime,
    isoDateOnly,
    tomorrowIso,
    defaultDeliveryIso,
    generateOrderId,
  }
}
