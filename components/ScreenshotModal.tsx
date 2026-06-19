'use client'

import type { ScreenshotModalState } from '@/lib/types'

interface Props {
  modal: ScreenshotModalState
  loading: boolean
  onClose: () => void
}

export default function ScreenshotModal({ modal, loading, onClose }: Props) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.68)',
        zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '20px',
          maxWidth: '880px', width: '100%',
          maxHeight: '88vh',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', gap: '16px',
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 700, fontSize: '15px', color: '#0f172a',
              display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
            }}>
              {modal.storeName}
              <span style={{
                fontSize: '11px', fontWeight: 600, color: '#0369a1',
                background: '#eff6ff', border: '1px solid #bfdbfe',
                padding: '2px 8px', borderRadius: '100px', letterSpacing: '0.2px',
              }}>Live screenshot via thum.io</span>
            </div>
            <div style={{
              fontSize: '13px', color: '#64748b', marginTop: '3px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {modal.productName}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <a
              href={modal.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '8px 16px',
                background: '#0f172a', color: 'white',
                borderRadius: '9px', fontSize: '13px', fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Open in tab
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
            <button
              onClick={onClose}
              style={{
                width: '36px', height: '36px', borderRadius: '9px',
                background: '#f1f5f9', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#475569', flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{
            flex: 1, minHeight: '420px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '16px', background: '#f8fafc',
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: '#e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg
                width="22" height="22" viewBox="0 0 24 24"
                fill="none" stroke="#94a3b8" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ animation: 'spin 1s linear infinite' }}
              >
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#475569', marginBottom: '4px' }}>
                Generating screenshot…
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Rendering {modal.storeName} product page
              </div>
            </div>
          </div>
        )}

        {/* Screenshot */}
        {!loading && (
          <>
            <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>
              <div style={{
                width: '100%', minHeight: '520px',
                backgroundImage: modal.bgImg,
                backgroundSize: 'cover',
                backgroundPosition: 'top center',
                backgroundRepeat: 'no-repeat',
              }} />
            </div>
            <div style={{
              padding: '10px 22px',
              background: '#f8fafc',
              borderTop: '1px solid #f1f5f9',
              fontSize: '11px', color: '#94a3b8',
              flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Screenshot via thum.io · May not reflect current pricing · Click &ldquo;Open in tab&rdquo; to verify live prices
            </div>
          </>
        )}
      </div>
    </div>
  )
}
