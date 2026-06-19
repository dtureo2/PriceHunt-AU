'use client'

import type { ProductResult } from '@/lib/types'

interface Props {
  result: ProductResult
  onScreenshot: (storeName: string, storeUrl: string, productName: string) => void
}

export default function ProductCard({ result, onScreenshot }: Props) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '18px',
      padding: '20px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)',
      border: '1px solid rgba(0,0,0,0.05)',
      display: 'flex', flexDirection: 'column', gap: '14px',
      animation: 'fadeUp 0.28s ease both',
      animationDelay: result.animDelay,
    }}>

      {/* TOP ROW */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        {/* Product image */}
        <div style={{
          width: '72px', height: '72px',
          borderRadius: '12px', flexShrink: 0,
          backgroundColor: result.imgBg,
          backgroundImage: `url("${result.imgSrc}")`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }} />

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: '2px' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', lineHeight: 1.35 }}>
            {result.name}
          </div>
          <div style={{
            color: '#94a3b8', fontSize: '12px', fontWeight: 500,
            marginTop: '3px', display: 'flex', gap: '6px', alignItems: 'center',
          }}>
            <span>{result.brand}</span>
            <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#cbd5e1', flexShrink: 0, display: 'inline-block' }} />
            <span>{result.category}</span>
            <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#cbd5e1', flexShrink: 0, display: 'inline-block' }} />
            <span>{result.size}</span>
          </div>
          {result.hasBestUnitPrice && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: '6px', padding: '3px 8px', marginTop: '6px',
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                {result.bestUnitPriceStr} best unit price
              </span>
            </div>
          )}
        </div>

        {/* Best price */}
        <div style={{ textAlign: 'right', flexShrink: 0, paddingTop: '2px' }}>
          <div style={{
            fontSize: '26px', fontWeight: 800,
            letterSpacing: '-1.2px', lineHeight: 1,
            color: result.bestColor,
          }}>
            {result.bestPrice}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontWeight: 500, whiteSpace: 'nowrap' }}>
            best · {result.bestStore}
          </div>
        </div>
      </div>

      {/* DIVIDER */}
      <div style={{ height: '1px', background: '#f1f5f9' }} />

      {/* PRICE ROWS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {result.storeRows.map(row => (
          <div key={row.storeId} style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            {/* Store name */}
            <div style={{
              width: '78px', fontSize: '12px', fontWeight: 600, color: '#64748b',
              flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {row.storeName}
            </div>

            {/* Price bar */}
            <div style={{
              flex: 1, height: '6px', background: '#f1f5f9',
              borderRadius: '100px', overflow: 'hidden', minWidth: '30px',
            }}>
              <div style={{
                height: '100%', width: row.barWidth,
                background: row.barColor, borderRadius: '100px',
              }} />
            </div>

            {/* Price + unit price */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
              width: '72px', flexShrink: 0,
            }}>
              <div style={{
                fontSize: '13px', fontWeight: row.fw,
                color: row.priceColor, letterSpacing: '-0.3px', lineHeight: 1.2,
              }}>
                {row.price}
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500, lineHeight: 1.2 }}>
                {row.unitPriceStr}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
              {/* Best badge */}
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%',
                background: row.barColor,
                opacity: row.badgeOpacity,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="8" height="7" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {/* External link */}
              <a
                href={row.shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`View at ${row.storeName}`}
                style={{
                  width: '20px', height: '20px', borderRadius: '6px',
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0.7, color: '#64748b', textDecoration: 'none',
                }}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>

              {/* Screenshot */}
              <button
                onClick={() => onScreenshot(row.storeName, row.shopUrl, result.name)}
                title={`Screenshot ${row.storeName}`}
                style={{
                  width: '20px', height: '20px', borderRadius: '6px',
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0.7, color: '#64748b', cursor: 'pointer',
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* SAVINGS BADGE */}
      {result.hasSavings && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: '9px', padding: '7px 12px',
          fontSize: '12px', color: '#15803d', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {result.savings}
        </div>
      )}

      {/* LIVE DATA BADGE */}
      {result.isLive && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0 2px' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Live price data</span>
        </div>
      )}
    </div>
  )
}
