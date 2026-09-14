import type { CSSProperties, Ref } from 'react'
import type { DetailSelections, ProductPage } from '../../../domain/products/types'
type FilterId = keyof DetailSelections
type FilterMenuDefinition = { id: FilterId; label: string; count?: number } & ({ type: 'range'; options: string[] } | { type?: undefined; options: [string, number][] })
type SelectionProps = { selectedValues: string[]; onSelectionChange: (values: string[]) => void }
import { useId, useState } from 'react'
import { Checkbox } from '../../../components/ui/CheckboxControl'
import filterChevronUpIcon from '../../../assets/figma/filter-chevron-up.svg'
import filterChevronBackwardIcon from '../../../assets/figma/filter-chevron-backward.svg'
const componentFilterSections: { title: string; menus: FilterMenuDefinition[] }[] = [
  {
    title: '이용 조건',
    menus: [{ id: 'monthly-fee', label: '월 렌탈료', count: 1, type: 'range', options: ['전체', '일반 사양', '고사양', '전문가용'] }],
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

const PRICE_RANGE_INITIAL_PERCENT = 60
const PRICE_RANGE_PRESETS = [
  { label: '전체', percent: 60 },
  { label: '일반 사양', percent: 34.2857142857 },
  { label: '고사양', percent: 65 },
  { label: '전문가용', percent: 100 },
]

function priceFromRangePercent(percent: number) {
  const numericPercent = Number(percent)
  const amount = numericPercent <= PRICE_RANGE_INITIAL_PERCENT
    ? 30000 + (70000 * numericPercent / PRICE_RANGE_INITIAL_PERCENT)
    : 100000 + (400000 * (numericPercent - PRICE_RANGE_INITIAL_PERCENT) / (100 - PRICE_RANGE_INITIAL_PERCENT))

  return Math.round(amount / 10000) * 10000
}

function MonthlyPriceRange({ selectedValues, onSelectionChange }: SelectionProps) {
  const inputId = useId()
  const selectedAmount = Number(selectedValues[0])
  const percent = selectedAmount > 0
    ? Math.max(0, Math.min(100, selectedAmount <= 100000 ? (selectedAmount - 30000) / 70000 * 60 : 60 + (selectedAmount - 100000) / 400000 * 40))
    : PRICE_RANGE_INITIAL_PERCENT
  const amount = priceFromRangePercent(percent)
  const formattedAmount = amount.toLocaleString('ko-KR')
  const activePreset = selectedValues.length === 0 ? '전체' : PRICE_RANGE_PRESETS.find((preset) => preset.label !== '전체' && priceFromRangePercent(preset.percent) === selectedAmount)?.label ?? '전체'

  return (
    <>
      <div className="product-filter-price"><span>30,000원</span><span>500,000원</span></div>
      <div className="product-filter-range" style={{ '--range-percent': `${percent}%` } as CSSProperties}>
        <input
          aria-label="월 렌탈료 범위"
          aria-valuetext={`${formattedAmount}원`}
          id={inputId}
          max="100"
          min="0"
          onChange={(event) => {
            const nextPercent = Number(event.target.value)
            onSelectionChange([String(priceFromRangePercent(nextPercent))])
          }}
          type="range"
          value={percent}
        />
        <span aria-hidden="true" className="product-filter-range__track"><i className="is-min" /><i className="is-active" /><i className="is-selected" /><i className="is-inactive" /></span>
        <output htmlFor={inputId}>{formattedAmount}</output>
      </div>
      <div aria-label="월 렌탈료 사양 선택" className="product-filter-pills" role="group">
        {PRICE_RANGE_PRESETS.map((preset) => (
          <button
            aria-pressed={activePreset === preset.label}
            className={activePreset === preset.label ? 'is-active' : ''}
            key={preset.label}
            onClick={() => {
              onSelectionChange(preset.label === '전체' ? [] : [String(priceFromRangePercent(preset.percent))])
            }}
            type="button"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </>
  )
}

function FilterMenu({ menu, isOpen, onToggle, selectedValues, onSelectionChange, facetCounts }: SelectionProps & { menu: FilterMenuDefinition; isOpen: boolean; onToggle: () => void; facetCounts?: Record<string, number> | null }) {
  const isRange = menu.type === 'range'
  const menuId = `filter-${menu.id}`
  const optionLabels = menu.type === 'range' ? [] : menu.options.map(([label]) => label)
  const selected = selectedValues.length > 0
  const toggleValue = (label: string, checked: boolean) => onSelectionChange(checked
    ? [...selectedValues, label].filter((value, index, values) => values.indexOf(value) === index)
    : selectedValues.filter((value) => value !== label))

  return (
    <div className="product-filter-menu">
      <div className="product-filter-menu__heading">
        <label aria-label={`${menu.label} 필터 선택`} className="product-filter-menu__checkbox">
          <Checkbox checked={selected} onChange={(event) => onSelectionChange(event.target.checked ? (isRange ? ['100000'] : optionLabels) : [])} />
        </label>
        <button aria-controls={menuId} aria-expanded={isOpen} className="product-filter-menu__toggle" onClick={onToggle} type="button">
          <span>{menu.label}</span>
          {menu.count ? <em>{menu.count}</em> : null}
          <img alt="" src={filterChevronUpIcon} />
        </button>
      </div>
      {isOpen ? (
        <div className="product-filter-menu__content" id={menuId}>
          {menu.type === 'range' ? (
            <MonthlyPriceRange onSelectionChange={onSelectionChange} selectedValues={selectedValues} />
          ) : (
            <div className="product-filter-options">
              {menu.options.map(([label, count]) => <label key={label}><Checkbox checked={selectedValues.includes(label)} onChange={(event) => toggleValue(label, event.target.checked)} /><span>{label}</span><small>{facetCounts === null ? '—' : facetCounts ? (facetCounts[label] ?? 0) : count}</small></label>)}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

interface ProductFilterProps {
  detailSelections?: DetailSelections
  drawer?: boolean
  facets?: ProductPage['facets']
  filterRef?: Ref<HTMLElement>
  onClose?: () => void
  onDetailSelectionChange?: (id: FilterId, values: string[]) => void
  resetVersion?: number
  variant?: 'product' | 'component-library'
}

export function ProductFilter({ detailSelections = {}, drawer = false, facets, filterRef, onClose, onDetailSelectionChange = () => {}, variant = 'product' }: ProductFilterProps) {
  const sections = variant === 'component-library' ? componentFilterSections : productFilterSections
  const [expandedMenus, setExpandedMenus] = useState(() => new Set(['monthly-fee', 'os', 'cpu-type', 'cpu-clock', 'cpu-core', 'ram-spec', 'ram-size', 'disk-type', 'disk-size', 'gpu-type', 'gpu-memory', 'peripheral', 'game']))
  const toggleMenu = (id: FilterId) => setExpandedMenus((current) => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  return (
    <aside aria-label="상세 상품 필터" aria-modal={drawer || undefined} className={`product-filter${drawer ? ' product-filter--drawer' : ''}`} ref={filterRef} role={drawer ? 'dialog' : undefined} tabIndex={drawer ? -1 : undefined}>
      <p className="product-filter__caption">상세 필터</p>
      {sections.map((section) => (
        <section className="product-filter__section" key={section.title}>
          <h2>{section.title}</h2>
          {section.menus.map((menu) => <FilterMenu facetCounts={facets === null ? null : facets ? (facets[menu.id] ?? {}) : undefined} isOpen={expandedMenus.has(menu.id)} key={menu.id} menu={menu} onSelectionChange={(values) => onDetailSelectionChange(menu.id, values)} onToggle={() => toggleMenu(menu.id)} selectedValues={detailSelections[menu.id] ?? []} />)}
        </section>
      ))}
      <button className="product-filter__close" onClick={onClose} type="button"><img alt="" src={filterChevronBackwardIcon} /><span className="sr-only">필터 닫기</span></button>
    </aside>
  )
}
