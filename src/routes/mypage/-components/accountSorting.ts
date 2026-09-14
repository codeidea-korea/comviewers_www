export { SortButton } from '@/components/ui/SortButtonControl'
export interface AccountSort { key: string; direction: 'asc' | 'desc' }
export function nextSortConfig(current: AccountSort | null, key: string): AccountSort {
  return { key, direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc' }
}
export function sortRows<T>(rows: readonly T[], config: AccountSort | null, value: (row: T, key: string) => unknown): T[] {
  if (!config) return [...rows]
  const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' })
  return [...rows].sort((a, b) => collator.compare(String(value(a, config.key) ?? ''), String(value(b, config.key) ?? '')) * (config.direction === 'asc' ? 1 : -1))
}
