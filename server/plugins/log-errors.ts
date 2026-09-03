export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, { event }) => {
    console.error(`[${event?.path || 'nitro'}]`, error)
  })
})
