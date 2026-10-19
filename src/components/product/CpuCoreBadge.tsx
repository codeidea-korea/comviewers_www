import { formatCpuCores } from '@/domain/products/cpuCores'

export function CpuCoreBadge({ value }: { value: number | null | undefined }) {
  return <span className="tag tag--orange cpu-core-badge notranslate" translate="no">{formatCpuCores(value)}</span>
}
