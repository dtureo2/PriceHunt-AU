'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import Header from '@/components/Header'
import ProductCard from '@/components/ProductCard'
import ScreenshotModal from '@/components/ScreenshotModal'
import { PRODUCTS, STORES } from '@/lib/products'
import { calcUnitPrice, fmtUnitPrice, fuzzyMatch, storeSearchUrl, makePlaceholder } from '@/lib/utils'
import type { StoreId, SortBy, LiveData, ScreenshotModalState, ProductResult } from '@/lib/types'

const LIVE_STATUS_MAP = {
  idle:    { text: '', bg: 'transparent', border: 'transparent', color: '#64748b', dot: '#94a3b8' },
  loading: { text: 'Fetching live prices from Woolworths & Coles…', bg: '#f8fafc', border: '#e2e8f0', color: '#64748b', dot: '#94a3b8' },
  success: { text: 'Live prices loaded — Woolworths & Coles updated', bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', dot: '#22c55e' },
  failed:  { text: 'Live prices unavailable — showing reference prices', bg: '#fffbeb', border: '#fde68a', color: '#92400e', dot: '#f59e0b' },
}

const CATEGORY_PILLS = [
  { label: 'Formula',     query: 'formula' },
  { label: 'Nappies',     query: 'nappies' },
  { label: 'Baby Food',   query: 'baby food' },
  { label: 'Wipes',       query: 'wipes' },
  { label: 'Bath & Skin', query: 'bath' },
  { label: 'Health',      query: 'health' },
  { label: 'Chocolates',  query: 'chocolate' },
]

const CATEGORY_CARDS = [
  { icon: '🍼', iconBg: '#f0fdf4', title: 'Infant Formula',  desc: "Aptamil, Karicare, S-26, NAN, Bellamy's",       query: 'formula' },
  { icon: '👶', iconBg: '#eff6ff', title: 'Nappies',          desc: 'Huggies, Pampers, Mamia – compare per nappy',   query: 'nappies' },
  { icon: '🥣', iconBg: '#fefce8', title: 'Baby Food',        desc: 'Pouches, rice cereal, rusks & snacks',           query: 'baby food' },
  { icon: '✨', iconBg: '#f0f9ff', title: 'Wipes',             desc: 'Huggies, WaterWipes, Curash – per 100',         query: 'wipes' },
  { icon: '🛁', iconBg: '#fff7ed', title: 'Bath & Skin',       desc: 'Wash, lotion, nappy rash creams',               query: 'bath' },
  { icon: '💊', iconBg: '#fef2f2', title: 'Health',            desc: 'Nurofen, Panadol, vitamins & probiotics',       query: 'health' },
  { icon: '🍫', iconBg: '#4c1d95', title: 'Chocolates',        desc: 'Cadbury, Lindt, Ferrero, Kit Kat & more',       query: 'chocolate' },
]

const HOW_IT_WORKS = [
  { num: '1', title: 'Search or browse',  desc: 'Type a product or tap a category to see all available options.' },
  { num: '2', title: 'Toggle stores',     desc: 'Include or exclude any of the 5 stores from comparison.' },
  { num: '3', title: 'Compare & refresh', desc: 'Unit prices shown per 100g / per nappy. Hit Refresh for live pricing.' },
]

export default function Home() {
  const [inputValue, setInputValue]       = useState('')
  const [searchQuery, setSearchQuery]     = useState('')
  const [hasSearched, setHasSearched]     = useState(false)
  const [selectedStores, setSelectedStores] = useState<StoreId[]>([
    'woolworths', 'coles', 'aldi', 'amazon', 'chemist_warehouse',
  ])
  const [sortBy, setSortBy]               = useState<SortBy>('best_price')
  const [isRefreshing, setIsRefreshing]   = useState(false)
  const [liveData, setLiveData]           = useState<LiveData | null>(null)
  const [liveStatus, setLiveStatus]       = useState<'idle' | 'loading' | 'success' | 'failed'>('idle')
  const [screenshotModal, setScreenshotModal] = useState<ScreenshotModalState | null>(null)
  const [screenshotLoading, setScreenshotLoading] = useState(false)

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const doSearch = useCallback(() => {
    const v = inputValue.trim()
    if (v) { setSearchQuery(v); setHasSearched(true) }
  }, [inputValue])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doSearch()
  }, [doSearch])

  const handleCategoryClick = useCallback((query: string) => {
    setInputValue(query)
    setSearchQuery(query)
    setHasSearched(true)
  }, [])

  const toggleStore = useCallback((sid: StoreId) => {
    setSelectedStores(cur =>
      cur.includes(sid)
        ? cur.length > 1 ? cur.filter(s => s !== sid) : cur
        : [...cur, sid]
    )
  }, [])

  const handleRefresh = useCallback(async () => {
    if (!searchQuery) return
    setIsRefreshing(true)
    setLiveStatus('loading')
    try {
      const resp = await fetch(`/api/prices?q=${encodeURIComponent(searchQuery)}&stores=woolworths,coles`)
      if (resp.ok) {
        const data: LiveData = await resp.json()
        const gotData = (data.woolworths?.length ?? 0) + (data.coles?.length ?? 0) > 0
        setLiveData(data)
        setLiveStatus(gotData ? 'success' : 'failed')
      } else {
        setLiveStatus('failed')
      }
    } catch {
      setLiveStatus('failed')
    } finally {
      setIsRefreshing(false)
    }
  }, [searchQuery])

  const openScreenshot = useCallback((storeName: string, storeUrl: string, productName: string) => {
    const bgImg = `url("https://image.thum.io/get/width/1200/crop/900/noanimate/${storeUrl}")`
    setScreenshotModal({ storeName, storeUrl, productName, bgImg })
    setScreenshotLoading(true)
    setTimeout(() => setScreenshotLoading(false), 3200)
  }, [])

  const closeScreenshot = useCallback(() => {
    setScreenshotModal(null)
    setScreenshotLoading(false)
  }, [])

  // Live search — fires 250ms after the user stops typing; clears when input is emptied
  useEffect(() => {
    const v = inputValue.trim()
    if (!v) {
      setSearchQuery('')
      setHasSearched(false)
      return
    }
    const t = setTimeout(() => {
      setSearchQuery(v)
      setHasSearched(true)
    }, 250)
    return () => clearTimeout(t)
  }, [inputValue])

  // ─── Derived results ───────────────────────────────────────────────────────

  const results = useMemo<ProductResult[]>(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase().trim()

    const matched = PRODUCTS.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.tags.some(t => t.includes(q) || q.split(' ').every(w => t.includes(w)))
    )

    const items = matched.map((product, i): ProductResult | null => {
      let minP = Infinity, maxP = 0

      selectedStores.forEach(sid => {
        let price = product.prices[sid]
        const liveArr = liveData?.[sid as keyof LiveData]
        if (liveArr) {
          const match = liveArr.find(lp => fuzzyMatch(lp.name, product.name))
          if (match?.price != null) price = match.price
        }
        if (price != null) {
          if (price < minP) minP = price
          if (price > maxP) maxP = price
        }
      })

      if (minP === Infinity) return null

      let anyLive = false
      const storeRows = selectedStores.flatMap(sid => {
        let price = product.prices[sid]
        let liveImg = ''
        let isLiveRow = false

        const liveArr = liveData?.[sid as keyof LiveData]
        if (liveArr) {
          const match = liveArr.find(lp => fuzzyMatch(lp.name, product.name))
          if (match) {
            if (match.price != null) { price = match.price; isLiveRow = true; anyLive = true }
            if (match.image) liveImg = match.image
          }
        }

        if (price == null) return []

        const store = STORES.find(s => s.id === sid)!
        const isBest = Math.abs(price - minP) < 0.001
        const upNum = calcUnitPrice(price, product.unitSize, product.unitStep)

        return [{
          storeId: sid,
          storeName: store.name,
          price: '$' + price.toFixed(2),
          priceNum: price,
          unitPriceStr: fmtUnitPrice(upNum, product.unitLabel),
          unitPriceNum: upNum,
          barColor: store.color,
          barWidth: Math.round((price / maxP) * 100) + '%',
          fw: isBest ? 700 : 500,
          priceColor: isBest ? store.color : '#475569',
          badgeOpacity: isBest ? 1 : 0,
          isBest,
          isLive: isLiveRow,
          shopUrl: storeSearchUrl(sid, product.name),
          liveImg,
        }]
      }).sort((a, b) => a.priceNum - b.priceNum)

      if (storeRows.length === 0) return null

      const saving = storeRows.length > 1 ? maxP - minP : 0
      const hasSavings = saving > 0.005
      const bestRow = storeRows[0]
      const liveImgSrc = storeRows.find(r => r.liveImg)?.liveImg ?? ''
      const imgSrc = liveImgSrc || makePlaceholder(product.abbr, product.imgBg, product.imgFg)

      return {
        id: product.id,
        name: product.name,
        brand: product.brand,
        category: product.category,
        size: product.size,
        imgSrc,
        imgBg: product.imgBg,
        storeRows,
        bestPrice: bestRow.price,
        bestStore: bestRow.storeName,
        bestColor: bestRow.barColor,
        bestUnitPriceNum: bestRow.unitPriceNum,
        bestUnitPriceStr: bestRow.unitPriceStr,
        hasBestUnitPrice: !!bestRow.unitPriceStr,
        hasSavings,
        savings: hasSavings ? `Save $${saving.toFixed(2)} vs ${storeRows[storeRows.length - 1].storeName}` : '',
        isLive: anyLive,
        animDelay: (i * 0.045) + 's',
      }
    }).filter((r): r is ProductResult => r !== null)

    if (sortBy === 'best_price') {
      items.sort((a, b) => (a.storeRows[0]?.priceNum ?? 999) - (b.storeRows[0]?.priceNum ?? 999))
    } else if (sortBy === 'unit_price') {
      items.sort((a, b) => (a.bestUnitPriceNum ?? 999) - (b.bestUnitPriceNum ?? 999))
    } else if (sortBy === 'savings') {
      items.sort((a, b) => {
        const sa = a.storeRows.length > 1 ? a.storeRows[a.storeRows.length - 1].priceNum - a.storeRows[0].priceNum : 0
        const sb = b.storeRows.length > 1 ? b.storeRows[b.storeRows.length - 1].priceNum - b.storeRows[0].priceNum : 0
        return sb - sa
      })
    } else {
      items.sort((a, b) => a.name.localeCompare(b.name))
    }

    return items
  }, [searchQuery, selectedStores, sortBy, liveData])

  const hasResults = results.length > 0
  const noResults = hasSearched && searchQuery.trim() !== '' && !hasResults
  const lsm = LIVE_STATUS_MAP[liveStatus]

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: '#f2f1ed', minHeight: '100vh' }}>
      <Header />

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <div style={{ background: '#0f172a', padding: '52px 24px 76px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>

          <h1 style={{
            color: 'white', fontSize: '46px', fontWeight: 800,
            lineHeight: 1.06, letterSpacing: '-2.2px',
            marginBottom: '14px',
          }}>
            Best baby product prices<br />
            across <span style={{ color: '#22c55e' }}>every store</span>
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '16px', lineHeight: 1.6, marginBottom: '36px' }}>
            Compare formula, nappies, wipes &amp; more at Woolworths, Coles, Aldi, Amazon AU &amp; Chemist Warehouse — with unit price comparisons.
          </p>

          {/* Search bar */}
          <div style={{
            background: 'white', borderRadius: '14px',
            padding: '7px 7px 7px 20px',
            display: 'flex', alignItems: 'center', gap: '12px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)', marginBottom: '24px',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search formula, nappies, wipes, baby food..."
              style={{
                flex: 1, border: 'none', fontSize: '16px',
                color: '#0f172a', background: 'transparent',
                minWidth: 0, fontWeight: 500, fontFamily: 'inherit',
              }}
            />
            <button
              onClick={doSearch}
              style={{
                background: '#16a34a', color: 'white', fontWeight: 700,
                fontSize: '15px', padding: '13px 26px', borderRadius: '10px',
                whiteSpace: 'nowrap', flexShrink: 0, border: 'none',
                cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.2px',
              }}
            >
              Search
            </button>
          </div>

          {/* Store toggles */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              color: 'rgba(255,255,255,0.28)', fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '12px',
            }}>
              Compare at
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {STORES.map(s => {
                const active = selectedStores.includes(s.id)
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleStore(s.id)}
                    style={{
                      padding: '7px 15px', borderRadius: '100px',
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'inherit',
                      background: active ? s.color : 'rgba(255,255,255,0.08)',
                      color: active ? '#fff' : 'rgba(255,255,255,0.45)',
                      border: `2px solid ${active ? s.color : 'rgba(255,255,255,0.14)'}`,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {s.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Category quick pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.3px' }}>
              Browse:
            </span>
            {CATEGORY_PILLS.map(c => (
              <button
                key={c.query}
                onClick={() => handleCategoryClick(c.query)}
                style={{
                  padding: '5px 13px', background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: '100px', color: 'rgba(255,255,255,0.55)',
                  fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* ── MAIN ─────────────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: '1060px', margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Results */}
        {hasResults && (
          <>
            {/* Results header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: '12px', marginBottom: '16px',
            }}>
              <p style={{ fontSize: '15px', color: '#475569', fontWeight: 500 }}>
                <strong style={{ color: '#0f172a', fontWeight: 800 }}>
                  {results.length} {results.length === 1 ? 'product' : 'products'}
                </strong>{' '}
                for &ldquo;<span style={{ color: '#0f172a' }}>{searchQuery}</span>&rdquo;
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={handleRefresh}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '7px 14px', borderRadius: '8px',
                    border: '1px solid #e2e8f0', background: 'white',
                    color: '#475569', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <svg
                    width="13" height="13" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }}
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  {isRefreshing ? 'Fetching…' : 'Refresh prices'}
                </button>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortBy)}
                  style={{
                    border: '1px solid #e2e8f0', borderRadius: '8px',
                    padding: '7px 12px', fontSize: '13px', color: '#334155',
                    background: 'white', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <option value="best_price">Lowest Price</option>
                  <option value="unit_price">Best Unit Price</option>
                  <option value="savings">Most Savings</option>
                  <option value="name">Name A–Z</option>
                </select>
              </div>
            </div>

            {/* Live status bar */}
            {liveStatus !== 'idle' && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: lsm.bg,
                border: `1px solid ${lsm.border}`,
                borderRadius: '9px', padding: '9px 14px',
                marginBottom: '18px', fontSize: '13px', fontWeight: 600,
                color: lsm.color,
              }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: lsm.dot }} />
                {lsm.text}
              </div>
            )}

            {/* Product cards grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))',
              gap: '14px',
            }}>
              {results.map(result => (
                <ProductCard key={result.id} result={result} onScreenshot={openScreenshot} />
              ))}
            </div>

            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', marginTop: '28px' }}>
              Prices are indicative. Not all products are stocked at every store. Click ↗ to verify current pricing.
            </p>
          </>
        )}

        {/* No results */}
        {noResults && (
          <div style={{
            background: 'white', borderRadius: '20px', padding: '72px 32px',
            textAlign: 'center',
            boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
            border: '1px solid rgba(0,0,0,0.04)',
          }}>
            <div style={{
              width: '60px', height: '60px', background: '#f8fafc', borderRadius: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              No results for &ldquo;{searchQuery}&rdquo;
            </h3>
            <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '340px', margin: '0 auto' }}>
              Try formula, nappies, huggies, pampers, wipes, or baby food.
            </p>
          </div>
        )}

        {/* Initial state */}
        {!hasSearched && (
          <>
            <div style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '4px', letterSpacing: '-0.5px' }}>
                Baby &amp; Infant Products
              </h2>
              <p style={{ color: '#64748b', fontSize: '14px' }}>
                Select a category or search above to compare prices
              </p>
            </div>

            {/* Category grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '12px', marginBottom: '36px',
            }}>
              {CATEGORY_CARDS.map(cat => (
                <button
                  key={cat.query}
                  onClick={() => handleCategoryClick(cat.query)}
                  style={{
                    background: 'white', borderRadius: '16px', padding: '20px',
                    border: '1px solid rgba(0,0,0,0.05)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', flexDirection: 'column', gap: '10px',
                  }}
                >
                  <div style={{
                    width: '44px', height: '44px', background: cat.iconBg,
                    borderRadius: '11px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '22px',
                  }}>
                    {cat.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', marginBottom: '3px' }}>
                      {cat.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                      {cat.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* How it works */}
            <div style={{
              background: 'white', borderRadius: '18px', padding: '28px',
              border: '1px solid rgba(0,0,0,0.04)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}>
              <div style={{
                fontSize: '11px', fontWeight: 700, color: '#94a3b8',
                letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '24px',
              }}>
                How it works
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                {HOW_IT_WORKS.map(step => (
                  <div key={step.num} style={{ display: 'flex', gap: '13px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '28px', height: '28px', background: '#0f172a',
                      borderRadius: '8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, fontSize: '13px', fontWeight: 800, color: 'white',
                    }}>
                      {step.num}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', marginBottom: '3px' }}>
                        {step.title}
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                        {step.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </main>

      {/* Screenshot modal */}
      {screenshotModal && (
        <ScreenshotModal
          modal={screenshotModal}
          loading={screenshotLoading}
          onClose={closeScreenshot}
        />
      )}
    </div>
  )
}
