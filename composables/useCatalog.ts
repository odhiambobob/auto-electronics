import type { PackSize, Product } from '~/types/store'

export function useCatalog() {
  function packPrice(product: Product, pack: PackSize | string | number): number {
    const size = Number(pack)
    if (size === 1) return product.pack1Price
    if (size === 2) return product.pack2Price
    return product.pack3Price
  }

  function packLabel(pack: PackSize | string | number): string {
    return `${Number(pack)} pack`
  }

  function savingsPercent(product: Product, pack: PackSize | string | number): number | null {
    const size = Number(pack)
    if (size === 1) return null
    const full = product.unitPrice * size
    const price = packPrice(product, pack)
    if (full <= 0 || price >= full) return null
    return Math.round(((full - price) / full) * 100)
  }

  function productPath(product: Product): string {
    return `/product/${product.productId}`
  }

  function getCategories(products: Product[]): string[] {
    return [...new Set(products.map((product) => product.category))].sort()
  }

  function priceBounds(products: Product[]): { min: number; max: number } {
    const prices = products.map((product) => product.pack1Price)
    return { min: Math.min(...prices), max: Math.max(...prices) }
  }

  return {
    packPrice,
    packLabel,
    savingsPercent,
    productPath,
    getCategories,
    priceBounds,
  }
}
