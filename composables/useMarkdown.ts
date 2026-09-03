import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'
import type { DescriptionBlock } from '~/types/store'

export function useMarkdown() {
  marked.setOptions({ gfm: true, breaks: false })

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
      const html = marked.parse(markdown || '', { async: false }) as string
      return DOMPurify.sanitize(html)
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
          result.push({
            type: 'img',
            src,
            alt: `${productName} detail`,
          })
        }
      }
    })

    return result
  }

  return {
    stripMarkdown,
    renderMarkdown,
    interleaveDescription,
  }
}
