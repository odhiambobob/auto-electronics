import { put } from '@vercel/blob'

export default defineSafeEventHandler(async (event) => {
  // Require admin authentication
  await requireAdmin(event)
  
  const config = useRuntimeConfig()
  
  if (!config.blobToken) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Blob storage not configured',
    })
  }

  const formData = await readMultipartFormData(event)
  
  if (!formData || formData.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No file provided',
    })
  }

  const file = formData[0]
  
  if (!file.data || !file.filename) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid file',
    })
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (file.type && !allowedTypes.includes(file.type)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid file type. Only images are allowed.',
    })
  }

  // Generate unique filename
  const ext = file.filename.split('.').pop() || 'jpg'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  try {
    // First try with public access (requires a public store)
    const blob = await put(filename, file.data, {
      access: 'public',
      token: config.blobToken,
    })

    return {
      url: blob.url,
      filename: blob.pathname,
    }
  } catch (error: any) {
    // If store is private, provide helpful error message
    if (error?.message?.includes('private store') || error?.message?.includes('public access')) {
      console.error('Upload error: Store is private. Product images require a public store.')
      throw createError({
        statusCode: 400,
        statusMessage: 'Your Vercel Blob store is set to private. Product images need public access. Please create a new store with public access in your Vercel dashboard, or change your existing store settings.',
      })
    }
    
    console.error('Upload error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to upload file',
    })
  }
})
