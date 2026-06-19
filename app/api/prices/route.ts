import { NextRequest, NextResponse } from 'next/server'

async function fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PriceHunt/1.0)',
        Accept: 'application/json',
      },
      next: { revalidate: 3600 },
    })
    clearTimeout(t)
    return r
  } catch (e) {
    clearTimeout(t)
    throw e
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const stores = (searchParams.get('stores') || 'woolworths,coles').split(',')

  if (!q.trim()) {
    return NextResponse.json({})
  }

  const results: Record<string, unknown[]> = {}

  await Promise.allSettled([
    stores.includes('woolworths')
      ? (async () => {
          const url = `https://www.woolworths.com.au/apis/ui/Search/products?searchTerm=${encodeURIComponent(q)}&pageNumber=1&pageSize=24&sortType=TraderRelevance`
          const r = await fetchWithTimeout(url)
          if (r.ok) {
            const data = await r.json()
            results.woolworths = (data.Products || [])
              .filter((p: Record<string, unknown>) => p.Price != null)
              .map((p: Record<string, unknown>) => ({
                name: p.Name,
                price: p.Price,
                cupPrice: p.CupPrice,
                cupMeasure: p.CupMeasure,
                image: p.MediumImageFile
                  ? `https://www.woolworths.com.au${p.MediumImageFile}`
                  : `https://cdn0.woolworths.media/content/wowproductimages/large/${String(p.Stockcode).padStart(7, '0')}.jpg`,
              }))
          }
        })()
      : Promise.resolve(),

    stores.includes('coles')
      ? (async () => {
          const url = `https://www.coles.com.au/api/2.0/products/?q=${encodeURIComponent(q)}&page=1&pageSize=24`
          const r = await fetchWithTimeout(url)
          if (r.ok) {
            const data = await r.json()
            const prods: Record<string, unknown>[] = data.results || data.Products || []
            results.coles = prods
              .filter((p) => {
                const pricing = p.pricing as Record<string, unknown> | undefined
                return pricing?.now != null || p.Price != null
              })
              .map((p) => {
                const pricing = p.pricing as Record<string, unknown> | undefined
                const imageUris = p.imageUris as Array<{ uri: string }> | undefined
                return {
                  name: p.name || p.Name,
                  price: pricing ? pricing.now : p.Price,
                  image: imageUris?.[0]?.uri || '',
                }
              })
          }
        })()
      : Promise.resolve(),
  ])

  return NextResponse.json(results)
}
