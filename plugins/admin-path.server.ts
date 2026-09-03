export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  
  // Store admin path in state for SSR
  useState('adminPath', () => config.adminPath)
})
