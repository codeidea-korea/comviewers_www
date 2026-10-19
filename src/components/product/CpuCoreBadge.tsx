import { formatCpuCores } from '@/domain/products/cpuCores'
import { EllipsisText } from '../ui/TooltipControl'
import { RelativeLink } from '../navigation/RelativeLinkView'

export function CpuCoreBadge({ value, truncate = false, to }: { value: number | null | undefined; truncate?: boolean; to?: string }) {
  const text = formatCpuCores(value)
  return <span className="tag tag--orange cpu-core-badge notranslate" translate="no">{truncate ? <EllipsisText asChild={Boolean(to)}>{to ? <RelativeLink className="product-card__text-link" to={to}>{text}</RelativeLink> : text}</EllipsisText> : text}</span>
}
