/** Physical CPU cores only; absent or invalid collected values remain unknown. */
export function formatCpuCores(value: number | null | undefined): string {
  return value != null && Number.isSafeInteger(value) && value > 0 ? `${value} Core` : '-'
}
