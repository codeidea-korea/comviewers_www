import { useLocalizedServiceName } from '@/components/common/LocalizedServiceName'

/** Keep native select values stable while translating only the display name. */
export function LocalizedServerRoomOption({ value, name, fallback = '-', kind = 'serverRoom' }: {
  value: string | number
  name: string | null | undefined
  fallback?: string
  kind?: 'serverRoom' | 'serverRoomRegion'
}) {
  const label = useLocalizedServiceName(kind, name, fallback)
  return <option value={value}>{label}</option>
}
