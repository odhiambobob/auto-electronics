export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('vue:error', (error) => {
    console.error('[Vue]', error)
  })

  nuxtApp.hook('app:error', (error) => {
    console.error('[App]', error)
  })
})
