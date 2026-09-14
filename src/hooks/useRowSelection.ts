import { useMemo, useState } from 'react'

/** Selection is stored once; counts and the select-all flag are derived. */
export function useRowSelection<TId extends string | number>(ids: readonly TId[], initiallySelected = false) {
  const [selection, setSelection] = useState<readonly TId[]>(() => initiallySelected ? [...ids] : [])
  const selected = useMemo(() => selection.filter((id) => ids.includes(id)), [ids, selection])
  const allSelected = ids.length > 0 && selected.length === ids.length

  function toggle(id: TId) {
    if (!ids.includes(id)) return
    setSelection((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
  }

  return {
    selected,
    allSelected,
    toggle,
    toggleAll: () => setSelection(allSelected ? [] : [...ids]),
    clear: () => setSelection([]),
    remove: (id: TId) => setSelection((current) => current.filter((value) => value !== id)),
  }
}
