/**
 * update-prices.mjs
 *
 * Fetches live prices from Woolworths and Coles for every product in
 * lib/products.ts and patches the file in-place.
 *
 * Only Woolworths and Coles are updated (they have public JSON APIs).
 * ALDI, Amazon AU, and Chemist Warehouse prices must be maintained manually.
 *
 * Exit codes:
 *   0 — ran successfully, no price changes
 *   1 — ran successfully, one or more prices were updated
 *   2 — fatal error
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PRODUCTS_FILE = path.join(__dirname, '../lib/products.ts')
const LOG_FILE      = path.join(__dirname, 'update-log.txt')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`
  console.log(line)
  return line + '\n'
}

/** Fetch with timeout and a browser-like User-Agent so APIs don't reject us. */
async function fetchJSON(url, timeoutMs = 10_000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36',
        Accept: 'application/json',
        'Accept-Language': 'en-AU,en;q=0.9',
      },
    })
    clearTimeout(t)
    if (!r.ok) return null
    return await r.json()
  } catch {
    clearTimeout(t)
    return null
  }
}

/**
 * Fuzzy match: returns a score 0–1 between a store product name and our name.
 * Uses token overlap — considers it a match when the two most important tokens
 * (brand name tokens, size tokens) appear in both strings.
 */
function matchScore(storeName, ourName) {
  const norm = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2)
  const a = norm(storeName)
  const b = norm(ourName)
  if (!a.length || !b.length) return 0
  const hits = a.filter(w => b.includes(w)).length
  return hits / Math.max(a.length, b.length)
}

const MATCH_THRESHOLD = 0.35   // need ≥35% token overlap to accept the price
const CHANGE_THRESHOLD = 0.02  // ignore price changes smaller than 2 cents

// ─── Woolworths ───────────────────────────────────────────────────────────────

async function fetchWoolworths(query) {
  const url = `https://www.woolworths.com.au/apis/ui/Search/products?searchTerm=${encodeURIComponent(query)}&pageNumber=1&pageSize=10&sortType=TraderRelevance`
  const data = await fetchJSON(url)
  if (!data) return []
  return (data.Products || [])
    .filter(p => p.Price != null && p.Name)
    .map(p => ({ name: String(p.Name), price: Number(p.Price) }))
}

// ─── Coles ────────────────────────────────────────────────────────────────────

async function fetchColes(query) {
  const url = `https://www.coles.com.au/api/2.0/products/?q=${encodeURIComponent(query)}&page=1&pageSize=10`
  const data = await fetchJSON(url)
  if (!data) return []
  const prods = data.results || data.Products || []
  return prods
    .filter(p => {
      const price = p.pricing?.now ?? p.Price
      return price != null && (p.name || p.Name)
    })
    .map(p => ({
      name: String(p.name || p.Name),
      price: Number(p.pricing?.now ?? p.Price),
    }))
}

/**
 * Given a list of {name, price} results from a store, pick the best match
 * against `ourName`. Returns the matched price or null if confidence is low.
 */
function bestMatch(results, ourName) {
  let best = null, bestScore = 0
  for (const r of results) {
    const score = matchScore(r.name, ourName)
    if (score > bestScore) { bestScore = score; best = r }
  }
  if (bestScore < MATCH_THRESHOLD || !best) return null
  return { price: best.price, score: bestScore, name: best.name }
}

// ─── products.ts patch ────────────────────────────────────────────────────────

/**
 * Replace a specific store's price inside the prices block for product `id`.
 *
 * Works by finding:
 *   id: {id},               ← anchor
 *   ...                     ← any fields
 *   prices: { ... {store}: <current> ... }
 *
 * and replacing <current> with the new value.
 */
function patchPrice(content, productId, store, newPrice) {
  // Regex: match the prices block for this product id
  // We use a lazy match from `id: N,` up to the closing `}` of prices
  const escaped = store.replace('_', '_')  // chemist_warehouse has underscore
  const re = new RegExp(
    `(id:\\s*${productId},[\\s\\S]*?prices:\\s*\\{[^}]*?${escaped}:\\s*)(\\d+\\.\\d+|null)`,
    'g'
  )
  const newVal = newPrice == null ? 'null' : newPrice.toFixed(2)
  return content.replace(re, `$1${newVal}`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

let logBuffer = ''
const l = msg => { logBuffer += log(msg) }

l('=== PriceHunt AU — Weekly Price Update ===')

let content = await fs.readFile(PRODUCTS_FILE, 'utf-8')

// Extract all product id + name + current prices from the TS source.
// Pattern: id: N, name: 'Foo', ...
// Match both single-quoted and double-quoted names (some have apostrophes)
const productBlocks = [...content.matchAll(
  /id:\s*(\d+),\s*name:\s*(?:'([^']*)'|"([^"]*)")[\s\S]*?prices:\s*\{([^}]+)\}/g
)]

l(`Found ${productBlocks.length} products in products.ts`)

let changeCount = 0
const errors = []

// Rate-limit: small delay between requests to avoid hammering APIs
const delay = ms => new Promise(r => setTimeout(r, ms))

for (const block of productBlocks) {
  const [, idStr, nameSQ, nameDQ, pricesStr] = block
  const name = nameSQ ?? nameDQ   // single-quoted name or double-quoted name

  const id = Number(idStr)

  // Parse current prices for this product
  const wwMatch  = pricesStr.match(/woolworths:\s*(\d+\.\d+|null)/)
  const colMatch = pricesStr.match(/coles:\s*(\d+\.\d+|null)/)

  const currentWW  = wwMatch?.[1]  === 'null' ? null : Number(wwMatch?.[1])
  const currentCol = colMatch?.[1] === 'null' ? null : Number(colMatch?.[1])

  // Skip products that have null prices for both — they're not stocked there
  const needsWW  = currentWW  !== null
  const needsCol = currentCol !== null

  if (!needsWW && !needsCol) continue

  l(`Checking: [${id}] ${name}`)

  await delay(400) // be polite to APIs

  // ── Woolworths ──
  if (needsWW) {
    try {
      const results = await fetchWoolworths(name)
      const match = bestMatch(results, name)
      if (match) {
        const diff = Math.abs(match.price - (currentWW ?? 0))
        if (diff > CHANGE_THRESHOLD) {
          l(`  WW  ${currentWW?.toFixed(2)} → ${match.price.toFixed(2)}  (matched: "${match.name}", score: ${match.score.toFixed(2)})`)
          content = patchPrice(content, id, 'woolworths', match.price)
          changeCount++
        } else {
          l(`  WW  $${currentWW?.toFixed(2)} — no change`)
        }
      } else {
        l(`  WW  — no confident match (results: ${results.length})`)
      }
    } catch (e) {
      const msg = `  WW  ERROR: ${e.message}`
      l(msg)
      errors.push(`[${id}] ${name} WW: ${e.message}`)
    }
  }

  await delay(400)

  // ── Coles ──
  if (needsCol) {
    try {
      const results = await fetchColes(name)
      const match = bestMatch(results, name)
      if (match) {
        const diff = Math.abs(match.price - (currentCol ?? 0))
        if (diff > CHANGE_THRESHOLD) {
          l(`  COL ${currentCol?.toFixed(2)} → ${match.price.toFixed(2)}  (matched: "${match.name}", score: ${match.score.toFixed(2)})`)
          content = patchPrice(content, id, 'coles', match.price)
          changeCount++
        } else {
          l(`  COL $${currentCol?.toFixed(2)} — no change`)
        }
      } else {
        l(`  COL — no confident match (results: ${results.length})`)
      }
    } catch (e) {
      const msg = `  COL ERROR: ${e.message}`
      l(msg)
      errors.push(`[${id}] ${name} COL: ${e.message}`)
    }
  }
}

l(`\nDone. ${changeCount} price(s) updated, ${errors.length} error(s).`)

// Append to log file
await fs.appendFile(LOG_FILE, logBuffer).catch(() => {})

if (changeCount > 0) {
  // Write updated products.ts
  await fs.writeFile(PRODUCTS_FILE, content, 'utf-8')
  l(`products.ts written with ${changeCount} change(s)`)
  process.exit(1)   // signals caller that a rebuild is needed
} else {
  process.exit(0)   // no rebuild needed
}
