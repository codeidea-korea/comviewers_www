import { formatCpuCores } from '@/domain/products/cpuCores'
import { EllipsisText } from '../ui/TooltipControl'
import { RelativeLink } from '../navigation/RelativeLinkView'

/** Catalog-only presentation for home cards and product results. */
export function CpuCoreBadge({ value, truncate = false, truncateLines = 2, to }: { value: number | null | undefined; truncate?: boolean; truncateLines?: 1 | 2; to?: string }) {
  const text = formatCpuCores(value, 'Cores')
  return <span className="tag tag--orange cpu-core-badge notranslate" translate="no">{truncate ? <EllipsisText asChild={Boolean(to)} lines={truncateLines}>{to ? <RelativeLink className="product-card__text-link" to={to}>{text}</RelativeLink> : text}</EllipsisText> : text}</span>
}
