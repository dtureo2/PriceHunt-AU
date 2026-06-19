export type StoreId =
  | 'woolworths'
  | 'coles'
  | 'aldi'
  | 'amazon'
  | 'chemist_warehouse'

export type SortBy = 'best_price' | 'unit_price' | 'savings' | 'name'

export interface LiveProduct {
  name: string
  price: number
  image?: string
  cupPrice?: number
  cupMeasure?: string
}

export interface LiveData {
  woolworths?: LiveProduct[]
  coles?: LiveProduct[]
}

export interface ScreenshotModalState {
  storeName: string
  storeUrl: string
  productName: string
  bgImg: string
}

export interface Product {
  id: number
  name: string
  brand: string
  category: string
  size: string
  abbr: string
  imgBg: string
  imgFg: string
  unitSize: number
  unitStep: number
  unitLabel: string
  tags: string[]
  prices: Record<StoreId, number | null>
}

export interface Store {
  id: StoreId
  name: string
  color: string
}

export interface StoreRow {
  storeId: StoreId
  storeName: string
  price: string
  priceNum: number
  unitPriceStr: string
  unitPriceNum: number | null
  barColor: string
  barWidth: string
  fw: number
  priceColor: string
  badgeOpacity: number
  isBest: boolean
  isLive: boolean
  shopUrl: string
  liveImg: string
}

export interface ProductResult {
  id: number
  name: string
  brand: string
  category: string
  size: string
  imgSrc: string
  imgBg: string
  storeRows: StoreRow[]
  bestPrice: string
  bestStore: string
  bestColor: string
  bestUnitPriceNum: number | null
  bestUnitPriceStr: string
  hasBestUnitPrice: boolean
  hasSavings: boolean
  savings: string
  isLive: boolean
  animDelay: string
}
