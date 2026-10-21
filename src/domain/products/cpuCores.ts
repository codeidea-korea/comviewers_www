/** Physical CPU cores only; absent or invalid collected values remain unknown. */
export function formatCpuCores(value: number | null | undefined, unit: 'Core' | 'Cores' = 'Core'): string {
  return value != null && Number.isSafeInteger(value) && value > 0 ? `${value} ${unit}` : '-'
}

/** Include physical core information in text summaries only when it is known. */
export function formatCpuCoreLine(value: number | null | undefined): string | null {
  const cores = formatCpuCores(value)
  return cores === '-' ? null : `Core: ${cores}`
}
