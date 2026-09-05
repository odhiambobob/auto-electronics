import { z } from 'zod'
import { applyRatesToEmptyOrders, parseDeliveryRates, saveDeliveryRates } from '../../utils/costs'

const rateSchema = z.object({
  amount: z.number().int().min(0),
  currency: z.string().min(3).max(10),
})

const bodySchema = z.object({
  rates: z.record(rateSchema),
  applyToEmpty: z.boolean().optional(),
})

export default defineSafeEventHandler(async (event) => {
  await requireAdmin(event)

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid delivery rates',
      data: parsed.error.flatten(),
    })
  }

  const rates = parseDeliveryRates(parsed.data.rates)
  await saveDeliveryRates(rates)

  const applied = parsed.data.applyToEmpty
    ? await applyRatesToEmptyOrders(rates)
    : 0

  return { rates, applied }
})
