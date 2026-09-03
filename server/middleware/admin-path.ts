export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  
  // Make admin path available to SSR
  event.context.adminPath = config.adminPath
})
