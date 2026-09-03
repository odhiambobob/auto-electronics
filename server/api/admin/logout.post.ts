export default defineSafeEventHandler(async (event) => {
  const sessionId = getSessionFromEvent(event)
  
  if (sessionId) {
    await deleteSession(sessionId)
    clearSessionCookie(event)
  }

  return { success: true }
})
