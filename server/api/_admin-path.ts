// Internal endpoint to get admin path for SSR routing
// This is only accessible server-side
export default defineSafeEventHandler(() => {
  const config = useRuntimeConfig()
  return { path: config.adminPath }
})
