import type { CSSProperties, ReactNode, Ref } from 'react'
import type { DetailSelections, ProductListQuery, ProductPage } from '../../../domain/products/types'
import type { CatalogFilterMetadata } from '@/api/catalog'
import type { useProductList } from './hooks/useProductList'
type FilterId = keyof DetailSelections
type FilterMenuDefinition = { id: FilterId; label: string } & ({ type: 'range'; options: string[] } | { type?: undefined; options: [string, number][] })
type SelectionProps = { selectedValues: string[]; onSelectionChange: (values: string[]) => void }
type PriceRangeProps = SelectionProps & { priceBasis?: 'monthly' | 'unit'; unitBounds?: { min: number; max: number } }
import { useEffect, useId, useState } from 'react'
import { Checkbox } from '../../../components/ui/CheckboxControl'
import { LoadingState } from '../../../components/ui/LoadingStateControl'
import filterChevronUpIcon from '../../../assets/figma/filter-chevron-up.svg'
import filterChevronBackwardIcon from '../../../assets/figma/filter-chevron-backward.svg'
const componentFilterSections: { title: string; menus: FilterMenuDefinition[] }[] = [
  {
    title: '이용 조건',
    menus: [{ id: 'monthly-fee', label: '월 렌탈료', type: 'range', options: ['전체', '일반 사양', '고사양', '전문가용'] }],
  },
  {
    title: 'OS',
    menus: [{ id: 'os', label: 'Windows', options: [['10', 1069], ['11', 1045]] }],
  },
  {
    title: 'CPU',
    menus: [
      { id: 'cpu-type', label: '종류', options: [['Intel Core', 1069], ['Intel Xeon', 1045], ['AMD Ryzen', 1045]] },
      { id: 'cpu-clock', label: 'CLOCK', options: [['2.0G', 567], ['2.5G', 274], ['3.0G', 1310], ['3.5G', 1310], ['4.0G 이상', 483], ['5.0G 이상', 24]] },
      { id: 'cpu-core', label: 'CORE', options: [['4C', 567], ['6C', 274], ['8C', 1310], ['10C', 1310], ['12C', 483], ['14C', 24], ['16C 이상', 24]] },
    ],
  },
  {
    title: 'RAM',
    menus: [
      { id: 'ram-spec', label: '규격', options: [['DDR3', 1069], ['DDR4', 1045], ['DDR5', 1045]] },
      { id: 'ram-size', label: '용량', options: [['8G', 1069], ['16G', 1045], ['24G', 544], ['32G', 544], ['64G', 544], ['128G', 544], ['256G', 544]] },
    ],
  },
  {
    title: 'DISK',
    menus: [
      { id: 'disk-type', label: '유형', options: [['SSD', 1069], ['HDD', 1045]] },
      { id: 'disk-size', label: '용량', options: [['120G', 1069], ['240G', 1045], ['500G', 544], ['1T', 544], ['2T', 544]] },
    ],
  },
  {
    title: 'GPU',
    menus: [
      { id: 'gpu-type', label: '유형', options: [['기본(내장)', 1069], ['GTX', 1045], ['RTX', 1045]] },
      { id: 'gpu-memory', label: '용량', options: [['GT 3G 이하', 1069], ['GT 4G', 1045], ['GT 6G', 544], ['GT 8G', 544], ['GT 10G', 544], ['GT 12G', 544], ['GT 14G', 544]] },
    ],
  },
  {
    title: '이용 환경',
    menus: [
      { id: 'peripheral', label: '주변 기기', options: [['키보드', 1069], ['마우스', 1045]] },
      { id: 'game', label: '게임', options: [['엔씨소프트', 1069], ['넥슨', 1045], ['넷마블', 544], ['카카오게임즈', 544]] },
    ],
  },
]

const productFilterSections = componentFilterSections

export type ProductCatalogControls = Pick<ReturnType<typeof useProductList>, 'filterMetadata' | 'filterMetadataPending' | 'filterMetadataError' | 'refetchFilterMetadata' | 'catalogSelections' | 'setCatalogSelections' | 'resetFilters'>
type CatalogFilterGroup = CatalogFilterMetadata['groups'][number]

const PRICE_RANGE_INITIAL_PERCENT = 60
const PRICE_RANGE_PRESETS = [
  { label: '전체' },
  { label: '일반 사양', min: 30000, max: 70000 },
  { label: '고사양', min: 80000, max: 150000 },
  { label: '전문가용', min: 160000, max: 500000 },
]

function priceFromRangePercent(percent: number) {
  const numericPercent = Number(percent)
  const amount = numericPercent <= PRICE_RANGE_INITIAL_PERCENT
    ? 30000 + (70000 * numericPercent / PRICE_RANGE_INITIAL_PERCENT)
    : 100000 + (400000 * (numericPercent - PRICE_RANGE_INITIAL_PERCENT) / (100 - PRICE_RANGE_INITIAL_PERCENT))

  return Math.round(amount / 10000) * 10000
}

function priceSelectionValue(value?: string) {
  if (!value) return undefined
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

function ProductPriceRange({ selectedValues, onSelectionChange, priceBasis = 'monthly', unitBounds }: PriceRangeProps) {
  const minInputId = useId()
  const maxInputId = useId()
  const selectedMinAmount = selectedValues.length > 1 ? priceSelectionValue(selectedValues[0]) : undefined
  const selectedMaxAmount = selectedValues.length > 1 ? priceSelectionValue(selectedValues[1]) : priceSelectionValue(selectedValues[0])
  const unitMin = unitBounds?.min ?? 0
  const unitMax = Math.max(unitMin + 1, unitBounds?.max ?? 500000)
  const unitStep = unitMax - unitMin < 1000 ? 1 : 1000
  const percentFromAmount = (amount: number) => priceBasis === 'unit'
    ? Math.max(0, Math.min(100, (amount - unitMin) / (unitMax - unitMin) * 100))
    : Math.max(0, Math.min(100, amount <= 100000 ? (amount - 30000) / 70000 * 60 : 60 + (amount - 100000) / 400000 * 40))
  const selectedMinPercent = selectedMinAmount === undefined ? 0 : percentFromAmount(selectedMinAmount)
  const selectedMaxPercent = selectedMaxAmount === undefined ? 100 : percentFromAmount(selectedMaxAmount)
  const [draftRange, setDraftRange] = useState<{ min: number; max: number } | null>(null)
  useEffect(() => { setDraftRange(null) }, [selectedMaxAmount, selectedMinAmount, priceBasis])
  const minPercent = draftRange?.min ?? selectedMinPercent
  const maxPercent = draftRange?.max ?? selectedMaxPercent
  const amountFromPercent = (value: number) => priceBasis === 'unit'
    ? Math.min(unitMax, Math.max(unitMin, Math.round((unitMin + (unitMax - unitMin) * value / 100) / unitStep) * unitStep))
    : priceFromRangePercent(value)
  const minAmount = amountFromPercent(minPercent)
  const maxAmount = amountFromPercent(maxPercent)
  const activePreset = selectedValues.length === 0 ? '전체' : PRICE_RANGE_PRESETS.find((preset) => preset.label !== '전체' && preset.min === selectedMinAmount && preset.max === selectedMaxAmount)?.label
  const commitRange = (handle: 'min' | 'max', percent: number) => {
    if (draftRange === null) return
    const nextMinPercent = handle === 'min' ? percent : draftRange.min
    const nextMaxPercent = handle === 'max' ? percent : draftRange.max
    setDraftRange(null)
    if (nextMinPercent === 0 && nextMaxPercent === 100) {
      onSelectionChange([])
      return
    }
    const nextMin = amountFromPercent(nextMinPercent)
    const nextMax = amountFromPercent(nextMaxPercent)
    onSelectionChange([String(Math.min(nextMin, nextMax)), String(Math.max(nextMin, nextMax))])
  }

  return (
    <>
      <div className="product-filter-price"><span>{priceBasis === 'unit' ? unitMin.toLocaleString('ko-KR') : '30,000'}원</span><span>{priceBasis === 'unit' ? unitMax.toLocaleString('ko-KR') : '500,000'}원</span></div>
      <div className="product-filter-range" style={{ '--range-min-percent': `${minPercent}%`, '--range-max-percent': `${maxPercent}%`, '--range-label-percent': `${(minPercent + maxPercent) / 2}%` } as CSSProperties}>
        <input
          aria-label={priceBasis === 'unit' ? '상품 최소 금액' : '월 최소 렌탈료'}
          aria-valuetext={`${minAmount.toLocaleString('ko-KR')}원`}
          className="product-filter-range__min-input"
          id={minInputId}
          max="100"
          min="0"
          onChange={(event) => { const next = Number(event.target.value); setDraftRange({ min: next, max: Math.max(next, maxPercent) }) }}
          onPointerUp={(event) => commitRange('min', Number(event.currentTarget.value))}
          onKeyUp={(event) => commitRange('min', Number(event.currentTarget.value))}
          onBlur={(event) => commitRange('min', Number(event.currentTarget.value))}
          type="range"
          value={minPercent}
        />
        <input
          aria-label={priceBasis === 'unit' ? '상품 최대 금액' : '월 최대 렌탈료'}
          aria-valuetext={`${maxAmount.toLocaleString('ko-KR')}원`}
          className="product-filter-range__max-input"
          id={maxInputId}
          max="100"
          min="0"
          onChange={(event) => { const next = Number(event.target.value); setDraftRange({ min: Math.min(next, minPercent), max: next }) }}
          onPointerUp={(event) => commitRange('max', Number(event.currentTarget.value))}
          onKeyUp={(event) => commitRange('max', Number(event.currentTarget.value))}
          onBlur={(event) => commitRange('max', Number(event.currentTarget.value))}
          type="range"
          value={maxPercent}
        />
        <span aria-hidden="true" className="product-filter-range__track"><i className="is-before" /><i className="is-min" /><i className="is-active" /><i className="is-selected" /><i className="is-inactive" /></span>
        <output htmlFor={maxInputId}>{minAmount.toLocaleString('ko-KR')}원 ~ {maxAmount.toLocaleString('ko-KR')}원</output>
      </div>
      {priceBasis === 'monthly' ? <div aria-label="월 렌탈료 사양 선택" className="product-filter-pills" role="group">
        {PRICE_RANGE_PRESETS.map((preset) => (
          <button
            aria-pressed={activePreset === preset.label}
            className={activePreset === preset.label ? 'is-active' : ''}
            key={preset.label}
            onClick={() => {
              setDraftRange(null)
              onSelectionChange(preset.min === undefined || preset.max === undefined ? [] : [String(preset.min), String(preset.max)])
            }}
            type="button"
          >
            {preset.label}
          </button>
        ))}
      </div> : null}
    </>
  )
}

interface ProductFilterMenuFrameProps {
  children: ReactNode
  count?: number
  id: string
  isOpen: boolean
  label: string
  onSelectAll: (checked: boolean) => void
  onToggle: () => void
  selected: boolean
}

export function ProductFilterMenuFrame({ children, count, id, isOpen, label, onSelectAll, onToggle, selected }: ProductFilterMenuFrameProps) {
  const menuId = `filter-${id}`
  return (
    <div className="product-filter-menu">
      <div className="product-filter-menu__heading">
        <label aria-label={`${label} 필터 선택`} className="product-filter-menu__checkbox">
          <Checkbox checked={selected} onChange={(event) => onSelectAll(event.target.checked)} />
        </label>
        <button aria-controls={menuId} aria-expanded={isOpen} className="product-filter-menu__toggle" onClick={onToggle} type="button">
          <span>{label}</span>
          {count ? <em>{count}</em> : null}
          <img alt="" src={filterChevronUpIcon} />
        </button>
      </div>
      {isOpen ? <div className="product-filter-menu__content" id={menuId}>{children}</div> : null}
    </div>
  )
}

function FilterMenu({ menu, isOpen, onToggle, selectedValues, onSelectionChange, facetCounts }: SelectionProps & { menu: FilterMenuDefinition; isOpen: boolean; onToggle: () => void; facetCounts?: Record<string, number> | null }) {
  const isRange = menu.type === 'range'
  const optionLabels = menu.type === 'range' ? [] : menu.options.map(([label]) => label)
  const selected = selectedValues.length > 0
  const selectedCount = isRange ? Number(selected) : selectedValues.length
  const toggleValue = (label: string, checked: boolean) => onSelectionChange(checked
    ? [...selectedValues, label].filter((value, index, values) => values.indexOf(value) === index)
    : selectedValues.filter((value) => value !== label))

  return (
    <ProductFilterMenuFrame count={selectedCount} id={menu.id} isOpen={isOpen} label={menu.label} onSelectAll={(checked) => onSelectionChange(checked && !isRange ? optionLabels : [])} onToggle={onToggle} selected={selected}>
      {menu.type === 'range' ? (
        <ProductPriceRange onSelectionChange={onSelectionChange} selectedValues={selectedValues} />
      ) : (
        <div className="product-filter-options">
          {menu.options.map(([label, count]) => <label key={label}><Checkbox checked={selectedValues.includes(label)} onChange={(event) => toggleValue(label, event.target.checked)} /><span>{label}</span><small>{facetCounts === null ? '—' : facetCounts ? (facetCounts[label] ?? 0) : count}</small></label>)}
        </div>
      )}
    </ProductFilterMenuFrame>
  )
}

function CatalogFilterSections({ controls }: { controls: ProductCatalogControls }) {
  const { filterMetadata: metadata, catalogSelections: selected, setCatalogSelections: update } = controls
  const priceBasis = selected.priceBasis ?? 'monthly'
  const priceLabel = priceBasis === 'unit' ? '상품 금액' : '월 렌탈료'
  const unitBuckets = metadata?.priceBuckets.filter(bucket => bucket.priceBasis === 'unit') ?? []
  const unitBounds = unitBuckets.length ? {
    min: Math.min(...unitBuckets.map(bucket => bucket.minPrice)),
    max: Math.max(...unitBuckets.map(bucket => bucket.maxPrice)),
  } : undefined
  const [notice, setNotice] = useState('')
  const [collapsedMenus, setCollapsedMenus] = useState<Set<string>>(() => new Set())
  const ids = selected.filterOptionIds ?? []
  const counts = new Map(metadata?.optionCounts.map(count => [count.optionId, count.productCount]) ?? [])
  const isMenuOpen = (id: string) => !collapsedMenus.has(id)
  const toggleMenu = (id: string) => setCollapsedMenus((current) => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  const applyOptionIds = (next: number[]) => {
    if (next.length > 50) { setNotice('상세 조건은 최대 50개까지 선택할 수 있습니다.'); return }
    setNotice('')
    update({ filterOptionIds: next })
  }
  const toggleOption = (id: number) => {
    applyOptionIds(ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id])
  }
  const renderGroup = (group: CatalogFilterGroup) => {
    const menuId = `catalog-${group.code}-${group.id}`
    const groupOptionIds = group.options.map(option => option.id)
    const selectedInGroup = groupOptionIds.filter(id => ids.includes(id))
    return <ProductFilterMenuFrame count={selectedInGroup.length} id={menuId} isOpen={isMenuOpen(menuId)} key={group.id} label={group.name}
      onSelectAll={(checked) => applyOptionIds(checked
        ? [...ids.filter(id => !groupOptionIds.includes(id)), ...groupOptionIds]
        : ids.filter(id => !groupOptionIds.includes(id)))}
      onToggle={() => toggleMenu(menuId)} selected={selectedInGroup.length > 0}>
      <div className="product-filter-options">
        {group.options.map(option => <label key={option.id}><Checkbox checked={ids.includes(option.id)} onChange={() => toggleOption(option.id)} /><span>{option.label}</span><small>{counts.get(option.id) ?? 0}</small></label>)}
      </div>
    </ProductFilterMenuFrame>
  }
  const renderCategory = (categoryCode: string, title: string) => {
    const groups = metadata?.groups.filter(group => group.categoryCode === categoryCode) ?? []
    return groups.length ? <section className="product-filter__section" key={categoryCode}><h2>{title}</h2>{groups.map(renderGroup)}</section> : null
  }
  const priceMenuId = 'catalog-monthly-fee'
  const deviceMenuId = 'catalog-peripheral'
  const gameGroups = metadata?.groups.filter(group => group.categoryCode === 'game') ?? []
  const deviceSelected = selected.keyboardConnectionStatus === 'connected' || selected.mouseConnectionStatus === 'connected'

  return <>
    {controls.filterMetadataPending ? <LoadingState className="route-loading--compact" label="검색 조건을 불러오고 있습니다." /> : null}
    {controls.filterMetadataError ? <p role="alert">검색 조건을 불러오지 못했습니다. <button className="product-filter__inline-action" type="button" onClick={() => void controls.refetchFilterMetadata()}>다시 시도</button></p> : null}
    <section className="product-filter__section"><h2>이용 조건</h2>
      <ProductFilterMenuFrame count={Number(selected.minPrice !== undefined || selected.maxPrice !== undefined)} id={priceMenuId} isOpen={isMenuOpen(priceMenuId)} label={priceLabel}
        onSelectAll={() => update({ priceBasis, minPrice: undefined, maxPrice: undefined })}
        onToggle={() => toggleMenu(priceMenuId)} selected={selected.minPrice !== undefined || selected.maxPrice !== undefined}>
        <ProductPriceRange priceBasis={priceBasis} unitBounds={unitBounds} selectedValues={selected.minPrice === undefined && selected.maxPrice === undefined ? [] : [selected.minPrice === undefined ? '' : String(selected.minPrice), selected.maxPrice === undefined ? '' : String(selected.maxPrice)]}
          onSelectionChange={(values) => update({ priceBasis, minPrice: values.length > 1 ? priceSelectionValue(values[0]) : undefined, maxPrice: values.length > 1 ? priceSelectionValue(values[1]) : priceSelectionValue(values[0]) })} />
      </ProductFilterMenuFrame>
    </section>
    {renderCategory('os', 'OS')}
    {renderCategory('cpu', 'CPU')}
    {renderCategory('ram', 'RAM')}
    {renderCategory('disk', 'DISK')}
    {renderCategory('gpu', 'GPU')}
    {selected.categoryCode !== 'parts' || gameGroups.length > 0 ? <section className="product-filter__section"><h2>이용 환경</h2>
      {selected.categoryCode !== 'parts' ? <ProductFilterMenuFrame count={Number(selected.keyboardConnectionStatus === 'connected') + Number(selected.mouseConnectionStatus === 'connected')} id={deviceMenuId} isOpen={isMenuOpen(deviceMenuId)} label="주변 기기"
        onSelectAll={(checked) => update({ keyboardConnectionStatus: checked ? 'connected' : undefined, mouseConnectionStatus: checked ? 'connected' : undefined })}
        onToggle={() => toggleMenu(deviceMenuId)} selected={deviceSelected}>
        <div className="product-filter-options">
          <label><Checkbox checked={selected.keyboardConnectionStatus === 'connected'} onChange={(event) => update({ keyboardConnectionStatus: event.target.checked ? 'connected' : undefined })} /><span>키보드</span></label>
          <label><Checkbox checked={selected.mouseConnectionStatus === 'connected'} onChange={(event) => update({ mouseConnectionStatus: event.target.checked ? 'connected' : undefined })} /><span>마우스</span></label>
        </div>
      </ProductFilterMenuFrame> : null}
      {gameGroups.map(renderGroup)}
    </section> : null}
    {notice ? <p role="alert">{notice}</p> : null}
  </>
}

interface ProductFilterProps {
  controls?: ProductCatalogControls
  detailSelections?: DetailSelections
  drawer?: boolean
  facets?: ProductPage['facets']
  filterRef?: Ref<HTMLElement>
  mobile?: boolean
  onClose?: () => void
  onDetailSelectionChange?: (id: FilterId, values: string[]) => void
  resetVersion?: number
  variant?: 'product' | 'component-library'
}

export function ProductFilter({ controls, detailSelections = {}, drawer = false, facets, filterRef, mobile = false, onClose, onDetailSelectionChange = () => {}, variant = 'product' }: ProductFilterProps) {
  const sections = variant === 'component-library' ? componentFilterSections : productFilterSections
  const [draftCatalogSelections, setDraftCatalogSelections] = useState<ProductListQuery | null>(() => mobile && drawer && controls ? controls.catalogSelections : null)
  useEffect(() => {
    if (!mobile || !drawer) {
      setDraftCatalogSelections(null)
    } else if (controls && !draftCatalogSelections) {
      setDraftCatalogSelections(controls.catalogSelections)
    }
  }, [controls, draftCatalogSelections, drawer, mobile])
  const activeControls = controls && mobile && drawer && draftCatalogSelections ? {
    ...controls,
    catalogSelections: draftCatalogSelections,
    setCatalogSelections: (changes: Partial<ProductListQuery>) => setDraftCatalogSelections(current => current ? { ...current, ...changes } : controls.catalogSelections),
  } : controls
  const applyMobileFilters = () => {
    if (controls && draftCatalogSelections) controls.setCatalogSelections(draftCatalogSelections)
    onClose?.()
  }
  const [expandedMenus, setExpandedMenus] = useState(() => new Set(['monthly-fee', 'os', 'cpu-type', 'cpu-clock', 'cpu-core', 'ram-spec', 'ram-size', 'disk-type', 'disk-size', 'gpu-type', 'gpu-memory', 'peripheral', 'game']))
  const toggleMenu = (id: FilterId) => setExpandedMenus((current) => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  const filterContent = <>
      <p className="product-filter__caption">상세 필터</p>
      {activeControls ? <CatalogFilterSections controls={activeControls} /> : sections.map((section) => (
        <section className="product-filter__section" key={section.title}>
          <h2>{section.title}</h2>
          {section.menus.map((menu) => <FilterMenu facetCounts={facets === null ? null : facets ? (facets[menu.id] ?? {}) : undefined} isOpen={expandedMenus.has(menu.id)} key={menu.id} menu={menu} onSelectionChange={(values) => onDetailSelectionChange(menu.id, values)} onToggle={() => toggleMenu(menu.id)} selectedValues={detailSelections[menu.id] ?? []} />)}
        </section>
      ))}
    </>
  return (
    <aside aria-label="상세 상품 필터" aria-modal={drawer || undefined} className={`product-filter${drawer ? ' product-filter--drawer' : ''}`} ref={filterRef} role={drawer ? 'dialog' : undefined} tabIndex={drawer ? -1 : undefined}>
      {mobile ? <header className="product-filter-mobile-header"><button aria-label="상세 필터 닫기" onClick={onClose} type="button"><img alt="" src={filterChevronBackwardIcon} /></button><strong>상세 필터</strong></header> : null}
      {drawer && mobile ? <div aria-label="상세 필터 항목" className="product-filter__mobile-scroll" role="region" tabIndex={0}>{filterContent}</div>
        : !drawer && variant === 'product' ? <div aria-label="상세 필터 항목" className="product-filter__scroll" role="region" tabIndex={0}>{filterContent}</div> : filterContent}
      {drawer && mobile && controls ? <footer className="product-filter__mobile-actions">
        <button className="product-filter__mobile-dismiss" onClick={onClose} type="button">닫기</button>
        <button className="product-filter__mobile-apply" onClick={applyMobileFilters} type="button">적용하기</button>
      </footer> : null}
      <button className="product-filter__close" onClick={onClose} type="button"><img alt="" src={filterChevronBackwardIcon} /><span className="sr-only">필터 닫기</span></button>
    </aside>
  )
}
