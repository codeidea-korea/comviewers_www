export type SortValue = string | number | null | undefined
export interface RowSort { key: string; direction: 'asc' | 'desc' }

/** Compare source numbers numerically; display formatting never participates in ordering. */
export function sortRows<T>(rows: readonly T[], config: RowSort | null, value: (row: T, key: string) => SortValue): T[] {
  if (!config) return [...rows]
  const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' })
  return [...rows].sort((a, b) => {
    const left = value(a, config.key)
    const right = value(b, config.key)
    const compared = typeof left === 'number' && typeof right === 'number'
      ? left - right : collator.compare(String(left ?? ''), String(right ?? ''))
    return compared * (config.direction === 'asc' ? 1 : -1)
  })
}
