export function osFilterLabel(osFilterValue: string | null | undefined): 'Windows 10' | 'Windows 11' | null {
  if (!osFilterValue) return null
  const value = osFilterValue.toLowerCase().replace(/[\s_-]/g, '')
  if (value.includes('windows10') || value.includes('win10') || value.includes('윈도우10')) return 'Windows 10'
  if (value.includes('windows11') || value.includes('win11') || value.includes('윈도우11')) return 'Windows 11'
  return null
}
