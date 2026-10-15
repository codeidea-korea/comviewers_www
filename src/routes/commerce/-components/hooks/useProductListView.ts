import { useState } from 'react'

type ProductListView = 'cards' | 'list'
const storageKey = 'comviewers.product-list-view.v1'

function readView(): ProductListView {
  try {
    return window.sessionStorage.getItem(storageKey) === 'list' ? 'list' : 'cards'
  } catch {
    // Storage can be unavailable; the current mounted page still keeps its choice.
    return 'cards'
  }
}

export function useProductListView() {
  const [view, setView] = useState<ProductListView>(readView)
  const selectView = (next: ProductListView) => {
    setView(next)
    try {
      window.sessionStorage.setItem(storageKey, next)
    } catch {
      // Keep the in-memory selection when the browser disallows storage.
    }
  }
  return [view, selectView] as const
}
