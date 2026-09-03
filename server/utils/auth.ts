import { eq, and, gt } from 'drizzle-orm'
import { adminSessions, admins } from '../db/schema'
import type { H3Event } from 'h3'

// Generate a secure random session ID
export function generateSessionId(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// Create a new admin session
export async function createAdminSession(adminId: number): Promise<string> {
  const db = useDb()
  const sessionId = generateSessionId()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await db.insert(adminSessions).values({
    id: sessionId,
    adminId,
    expiresAt,
  })

  return sessionId
}

// Validate session and return admin
export async function validateSession(sessionId: string) {
  const db = useDb()
  
  const [session] = await db
    .select()
    .from(adminSessions)
    .where(
      and(
        eq(adminSessions.id, sessionId),
        gt(adminSessions.expiresAt, new Date())
      )
    )

  if (!session) return null

  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.id, session.adminId))

  return admin || null
}

// Delete session (logout)
export async function deleteSession(sessionId: string): Promise<void> {
  const db = useDb()
  await db.delete(adminSessions).where(eq(adminSessions.id, sessionId))
}

// Get session ID from cookie
export function getSessionFromEvent(event: H3Event): string | null {
  const cookie = getCookie(event, 'admin_session')
  return cookie || null
}

// Set session cookie
export function setSessionCookie(event: H3Event, sessionId: string): void {
  setCookie(event, 'admin_session', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })
}

// Clear session cookie
export function clearSessionCookie(event: H3Event): void {
  deleteCookie(event, 'admin_session')
}

// Require admin authentication
export async function requireAdmin(event: H3Event) {
  const sessionId = getSessionFromEvent(event)
  
  if (!sessionId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const admin = await validateSession(sessionId)
  
  if (!admin) {
    clearSessionCookie(event)
    throw createError({
      statusCode: 401,
      statusMessage: 'Session expired',
    })
  }

  return admin
}
