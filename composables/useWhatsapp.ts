export function useWhatsapp() {
  const config = useRuntimeConfig()
  const { formatOrderTime } = useFormat()

  function whatsappUrl(message: string): string {
    const number = (config.public.whatsappNumber || '').replace(/[^\d]/g, '')
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
  }

  function orderWhatsappMessage(input: {
    package: string
    quantity: number
    productName: string
    orderDate: string | Date
  }): string {
    const qty = input.quantity > 1 ? `${input.quantity} × ` : ''
    const date = typeof input.orderDate === 'string' ? input.orderDate : input.orderDate.toISOString()
    return `I have ordered ${qty}${input.package} ${input.productName} at ${formatOrderTime(date)}.`
  }

  return {
    whatsappUrl,
    orderWhatsappMessage,
  }
}
