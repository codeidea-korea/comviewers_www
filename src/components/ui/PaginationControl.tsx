import chevronLeft from '../../assets/figma/pagination-chevron-left.svg'
import chevronRight from '../../assets/figma/pagination-chevron-right.svg'
import ellipsis from '../../assets/figma/pagination-ellipsis.svg'
import { useTranslation } from '../../i18n/translation'

export interface PaginationProps {
  currentPage?: number
  onPageChange?: (page: number) => void
  totalPages?: number
}


function createPageItems(currentPage: number, totalPages: number): (number | string)[] {
  const safeTotal = Math.max(1, Number(totalPages) || 1)
  const safeCurrent = Math.min(safeTotal, Math.max(1, Number(currentPage) || 1))
  if (safeTotal <= 7) return Array.from({ length: safeTotal }, (_, index) => index + 1)

  const candidates = [1, 2, 3, safeCurrent - 1, safeCurrent, safeCurrent + 1, safeTotal - 1, safeTotal]
  const pages = [...new Set(candidates.filter((page) => page >= 1 && page <= safeTotal))].sort((a, b) => a - b)

  return pages.flatMap<number | string>((page, index) => {
    const previousPage = pages[index - 1]
    return previousPage && page - previousPage > 1 ? [`ellipsis-${previousPage}`, page] : [page]
  })
}

export function Pagination({ currentPage = 1, onPageChange, totalPages = 68 }: PaginationProps) {
  const { t } = useTranslation()
  const numericTotal = Number(totalPages)
  if (!Number.isFinite(numericTotal) || numericTotal <= 0) return null

  const safeTotal = Math.max(1, Math.floor(numericTotal))
  const safeCurrent = Math.min(safeTotal, Math.max(1, Number(currentPage) || 1))
  const pages = createPageItems(safeCurrent, safeTotal)

  return (
    <nav aria-label="페이지 이동" className={['pagination', import.meta.env.DEV ? 'notranslate' : ''].filter(Boolean).join(' ')} translate={import.meta.env.DEV ? 'no' : undefined}>
      <button aria-label={t('common.previousPage')} className="pagination__arrow" disabled={safeCurrent === 1} onClick={() => onPageChange?.(safeCurrent - 1)} type="button">
        <img alt="" src={chevronLeft} />
      </button>
      {pages.map((page) => typeof page === 'string' ? (
        <span aria-hidden="true" className="pagination__ellipsis" key={page}><img alt="" src={ellipsis} /></span>
      ) : (
        <button
          aria-current={page === safeCurrent ? 'page' : undefined}
          aria-label={t('common.pageNumber', { page })}
          className="pagination__page"
          key={page}
          onClick={() => onPageChange?.(page)}
          type="button"
        >
          <span className="pagination__page-label">{page}</span>
        </button>
      ))}
      <button aria-label={t('common.nextPage')} className="pagination__arrow" disabled={safeCurrent === safeTotal} onClick={() => onPageChange?.(safeCurrent + 1)} type="button">
        <img alt="" src={chevronRight} />
      </button>
    </nav>
  )
}

