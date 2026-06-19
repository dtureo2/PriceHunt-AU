export function calcUnitPrice(
  price: number,
  unitSize: number,
  unitStep: number,
): number | null {
  if (!price || !unitSize || !unitStep) return null
  return price / (unitSize / unitStep)
}

export function fmtUnitPrice(val: number | null, label: string): string {
  if (val == null) return ''
  return '$' + val.toFixed(val < 1 ? 3 : 2) + label
}

export function fuzzyMatch(liveName: string, mockName: string): boolean {
  const a = liveName.toLowerCase()
  const b = mockName.toLowerCase()
  if (a.includes(b) || b.includes(a)) return true
  const aWords = a.split(/\s+/).filter(w => w.length > 3)
  const matches = aWords.filter(w => b.includes(w)).length
  return matches >= 2
}

export function storeSearchUrl(storeId: string, productName: string): string {
  const q = encodeURIComponent(productName)
  const urls: Record<string, string> = {
    woolworths: `https://www.woolworths.com.au/shop/search/products?searchTerm=${q}`,
    coles: `https://www.coles.com.au/search?q=${q}`,
    aldi: 'https://www.aldi.com.au/en/groceries/',
    amazon: `https://www.amazon.com.au/s?k=${q}`,
    chemist_warehouse: `https://www.chemistwarehouse.com.au/search?q=${q}`,
  }
  return urls[storeId] ?? '#'
}

export function makePlaceholder(abbr: string, bg: string, fg: string): string {
  const fs = abbr.length > 2 ? 17 : 22
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" fill="${bg}"/><text x="40" y="42" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="${fs}" fill="${fg}">${abbr}</text></svg>`
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}
