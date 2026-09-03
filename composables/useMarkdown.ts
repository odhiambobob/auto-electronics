import { Marked } from 'marked'
import type { DescriptionBlock } from '~/types/store'

const markedSafe = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    html() {
      return ''
    },
  },
})

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
}

export function useMarkdown() {
  function stripMarkdown(markdown: string): string {
    return (markdown || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]*`/g, ' ')
      .replace(/^#+\s+/gm, '')
      .replace(/!\[[^\]]*]\([^)]+\)/g, '')
      .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
      .replace(/[*_~>#-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  function renderMarkdown(markdown: string): string {
    try {
      const html = markedSafe.parse(markdown || '', { async: false })
      return sanitizeHtml(typeof html === 'string' ? html : '')
    } catch (error) {
      console.error('Markdown render failed:', error)
      return ''
    }
  }

  function splitBlocks(markdown: string): string[] {
    const source = (markdown || '').trim()
    if (!source) return []

    const byHeading = source
      .split(/(?=^## )/m)
      .map((block) => block.trim())
      .filter(Boolean)

    if (byHeading.length >= 2) return byHeading

    const parts: string[] = []
    let buffer: string[] = []

    for (const line of source.split('\n')) {
      if (line.trim() === '' && buffer.length) {
        parts.push(buffer.join('\n'))
        buffer = []
      } else {
        buffer.push(line)
      }
    }

    if (buffer.length) parts.push(buffer.join('\n'))
    return parts.map((part) => part.trim()).filter(Boolean)
  }

  function seedRandom(seed: string): () => number {
    let h = 2166136261
    for (let i = 0; i < seed.length; i += 1) {
      h ^= seed.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    return () => {
      h += 0x6d2b79f5
      let t = Math.imul(h ^ (h >>> 15), 1 | h)
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  function shuffle<T>(items: T[], seed: string): T[] {
    const copy = [...items]
    const rand = seedRandom(seed)
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1))
      const current = copy[i]
      const swap = copy[j]
      if (current === undefined || swap === undefined) continue
      copy[i] = swap
      copy[j] = current
    }
    return copy
  }

  function interleaveDescription(
    markdown: string,
    images: string[],
    seed: string,
    productName: string,
  ): DescriptionBlock[] {
    try {
      const blocks = splitBlocks(markdown)
      const safeImages = Array.isArray(images) ? images.filter(Boolean) : []
      const rand = seedRandom(`${seed}-gaps`)
      const pool = shuffle(safeImages, seed || 'product')
      const result: DescriptionBlock[] = []

      blocks.forEach((block, index) => {
        result.push({ type: 'md', html: renderMarkdown(block) })
        const remainingSlots = blocks.length - 1 - index
        const shouldInsert =
          pool.length > 0 &&
          index < blocks.length - 1 &&
          (pool.length >= remainingSlots || rand() > 0.4)

        if (shouldInsert) {
          const src = pool.shift()
          if (src) {
            const imageBlock: DescriptionBlock = {
              type: 'img',
              src,
              alt: `${productName} detail`,
            }
            result.push(imageBlock)
          }
        }
      })

      return result
    } catch (error) {
      console.error('Description render failed:', error)
      return []
    }
  }

  return {
    stripMarkdown,
    renderMarkdown,
    interleaveDescription,
  }
}
