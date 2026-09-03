export function generateOrderId(): string {
  const stamp = Date.now().toString(36).toUpperCase()
  const salt = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `AE-${stamp}-${salt}`
}

export function isoDateOnly(offsetDays: number): string {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
