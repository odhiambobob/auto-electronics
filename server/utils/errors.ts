import type { EventHandler, EventHandlerRequest } from 'h3'

export function defineSafeEventHandler<T extends EventHandlerRequest, D>(
  handler: EventHandler<T, D>,
) {
  return defineEventHandler<T, D>(async (event) => {
    try {
      return await handler(event)
    } catch (error: unknown) {
      const err = error as {
        statusCode?: number
        code?: string
        cause?: { code?: string }
        message?: string
      }

      if (err?.statusCode) {
        throw error
      }

      const code = err?.code || err?.cause?.code
      console.error(`[API ${event.path}]`, err?.message || error)

      if (code === '23505') {
        throw createError({
          statusCode: 409,
          statusMessage: 'This record already exists',
        })
      }

      if (
        code === 'CONNECT_TIMEOUT' ||
        code === 'ECONNREFUSED' ||
        code === 'ENOTFOUND' ||
        code === 'ETIMEDOUT' ||
        err?.message?.includes('DATABASE_URL')
      ) {
        throw createError({
          statusCode: 503,
          statusMessage: 'Database is temporarily unavailable. Please try again.',
        })
      }

      throw createError({
        statusCode: 500,
        statusMessage: 'A server error occurred. Please try again.',
      })
    }
  })
}
