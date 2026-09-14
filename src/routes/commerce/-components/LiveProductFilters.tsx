import { useCallback, useRef, useState, type ReactNode, type Ref } from 'react'
import type { useProductList } from './hooks/useProductList'
import { Checkbox } from '@/components/ui/CheckboxControl'
import { LoadingState } from '@/components/ui/LoadingStateControl'
import { DropdownSelect, GroupedMultiSelect, useDismissibleSelect } from '@/components/ui/SelectControl'
import filterChevronBackwardIcon from '@/assets/figma/filter-chevron-backward.svg'
import filterChevronUpIcon from '@/assets/figma/filter-chevron-up.svg'
import filterTuneIcon from '@/assets/figma/filter-tune.svg'
import productListCloseIcon from '@/assets/figma/product-list-close.svg'
import restartAltIcon from '@/assets/figma/restart-alt.svg'
import selectorChevronDownIcon from '@/assets/figma/selector-chevron-down.svg'
import './live-product-filters.css'

type Filters = Pick<ReturnType<typeof useProductList>, 'filterMetadata' | 'filterMetadataPending' | 'filterMetadataError' | 'refetchFilterMetadata' | 'catalogSelections' | 'setCatalogSelections' | 'resetFilters'>
function MetadataNotice({ controls }: { controls: Filters }) {
  return controls.filterMetadataPending ? <LoadingState className="route-loading--compact" label="검색 조건을 불러오고 있습니다." /> : controls.filterMetadataError ? <p role="alert">검색 조건을 불러오지 못했습니다. <button className="live-product-filter__inline-action" type="button" onClick={() => void controls.refetchFilterMetadata()}>다시 시도</button></p> : null
}

export function LiveProductFilterControls({ controls, mobileFilterTrigger }: { controls: Filters; mobileFilterTrigger?: ReactNode }) {
  const { filterMetadata: metadata, catalogSelections: selected, setCatalogSelections: update } = controls
  const [open, setOpen] = useState<'rooms' | 'network' | 'ip' | 'game' | null>(null)
  const [roomNotice, setRoomNotice] = useState('')
  const container = useRef<HTMLDivElement>(null)
  const dismiss = useCallback(() => setOpen(null), [])
  useDismissibleSelect({ containerRef: container, isOpen: Boolean(open), onDismiss: dismiss })
  const roomGroups = Array.from(new Set(metadata?.rooms.map(room => room.groupName || '서버실') ?? [])).map(label => ({ label,
    options: metadata!.rooms.filter(room => (room.groupName || '서버실') === label).map(room => ({ value: String(room.id), label: room.name })),
  }))
  const selectedRoomLabels = selected.rooms.map(id => metadata?.rooms.find(room => String(room.id) === id)?.name ?? `서버실 ${id}`)
  const selectedOptions = selected.filterOptionIds ?? []
  const groupsByCategory = (categoryCode: string) => metadata?.groups.filter(group => group.categoryCode === categoryCode) ?? []
  const categoryOptionIds = (categoryCode: string) => groupsByCategory(categoryCode).flatMap(group => group.options.map(option => option.id))
  const selectedCategoryOptions = (categoryCode: string) => groupsByCategory(categoryCode).flatMap(group => group.options).filter(option => selectedOptions.includes(option.id))
  const categoryGroups = (categoryCode: string) => groupsByCategory(categoryCode).map(group => ({
    label: group.name,
    options: group.options.map(option => ({ value: String(option.id), label: option.label })),
  }))
  const replaceCategorySelection = (categoryCode: string, values: Set<string>) => {
    const categoryIds = new Set(categoryOptionIds(categoryCode))
    update({ filterOptionIds: [...selectedOptions.filter(id => !categoryIds.has(id)), ...[...values].map(Number)] })
  }
  const primarySelectors = [
    { id: 'rooms' as const, label: '서버실', selectedValues: new Set(selected.rooms), groups: roomGroups,
      value: selectedRoomLabels.length ? `${selectedRoomLabels[0]}${selectedRoomLabels.length > 1 ? ` 외 ${selectedRoomLabels.length - 1}개` : ''}` : '전체' },
    ...(['network', 'ip', 'game'] as const).map(categoryCode => {
      const options = selectedCategoryOptions(categoryCode)
      return { id: categoryCode, label: categoryCode === 'network' ? '인터넷' : categoryCode === 'ip' ? 'IP' : '게임',
        selectedValues: new Set(options.map(option => String(option.id))), groups: categoryGroups(categoryCode),
        value: options.length ? `${options[0].label}${options.length > 1 ? ` 외 ${options.length - 1}개` : ''}` : '전체' }
    }),
  ]
  const tags = metadata?.groups.flatMap(group => {
    const options = group.options.filter(option => selectedOptions.includes(option.id))
    if (!options.length || options.length === group.options.length) return []
    return [{ id: String(group.id), label: `${group.categoryName ?? '분류 미지정'} / ${group.name} ${options.slice(0, 2).map(option => option.label).join(', ')}${options.length > 2 ? ` +${options.length - 2}개` : ''}`,
      remove: () => update({ filterOptionIds: selectedOptions.filter(id => !group.options.some(option => option.id === id)) }) }]
  }) ?? []
  const hasSelectedFilters = selectedRoomLabels.length > 0 || tags.length > 0
    || selected.minPrice !== undefined || selected.maxPrice !== undefined
    || Boolean(selected.keyboardConnectionStatus) || Boolean(selected.mouseConnectionStatus)
  return <>
    <MetadataNotice controls={controls} />
    <div className="product-mobile-controls">
    {mobileFilterTrigger}
    <div className="product-selectors live-product-selectors" ref={container}>
      {primarySelectors.map(selector => <DropdownSelect className="product-selector-field" controls={`live-${selector.id}`} expanded={open === selector.id} hasPopup={false} key={selector.id} label={selector.label} onToggle={() => setOpen(current => current === selector.id ? null : selector.id)}
        triggerIcon={<img alt="" src={selectorChevronDownIcon} />} value={selector.value}
        panel={open === selector.id ? <>
          {selector.id === 'rooms' ? <button aria-label="서버실 선택 닫기" className="product-mobile-selector-backdrop" onClick={dismiss} type="button" /> : null}
          <div className={selector.id === 'rooms' ? 'product-mobile-server-sheet' : undefined}>
            {selector.id === 'rooms' ? <span aria-hidden="true" className="product-mobile-bottom-sheet__handle" /> : null}
            <GroupedMultiSelect ariaLabel={`${selector.label} 선택`} chevronIcon={filterChevronUpIcon} className="server-room-select-panel" groups={selector.groups} id={`live-${selector.id}`} onChange={values => {
          if (values.size > 50) { setRoomNotice('검색 조건은 최대 50개까지 선택할 수 있습니다.'); return }
          setRoomNotice('')
          if (selector.id === 'rooms') update({ rooms: [...values] })
          else replaceCategorySelection(selector.id, values)
        }} selectedValues={selector.selectedValues} />
          </div>
        </> : null} />)}
    </div>
    </div>
    {roomNotice ? <p role="alert">{roomNotice}</p> : null}
    <div className={`selected-filters${hasSelectedFilters ? '' : ' is-empty'}`}><div className="selected-filters__title"><img alt="" src={filterTuneIcon} /><span>필터</span></div><div className="selected-filters__body"><div className="selected-filters__tags">
      {selectedRoomLabels.length ? <button aria-label={`서버실 ${selectedRoomLabels[0]}${selectedRoomLabels.length > 1 ? ` 외 ${selectedRoomLabels.length - 1}개` : ''} 필터 해제`} className="selected-filters__tag" type="button" onClick={() => update({ rooms: [] })}>서버실 {selectedRoomLabels[0]}{selectedRoomLabels.length > 1 ? ` 외 ${selectedRoomLabels.length - 1}개` : ''}<img alt="" src={productListCloseIcon} /></button> : null}
      {tags.map(tag => <button aria-label={`${tag.label} 필터 해제`} key={tag.id} className="selected-filters__tag" type="button" onClick={tag.remove}>{tag.label}<img alt="" src={productListCloseIcon} /></button>)}
      {selected.minPrice !== undefined || selected.maxPrice !== undefined ? <button aria-label="월 렌탈료 필터 해제" className="selected-filters__tag" type="button" onClick={() => update({ minPrice: undefined, maxPrice: undefined })}>월 렌탈료 {selected.minPrice?.toLocaleString('ko-KR') ?? '0'} ~ {selected.maxPrice?.toLocaleString('ko-KR') ?? '제한 없음'}원<img alt="" src={productListCloseIcon} /></button> : null}
      {selected.keyboardConnectionStatus ? <button aria-label="키보드 조건 필터 해제" className="selected-filters__tag" type="button" onClick={() => update({ keyboardConnectionStatus: undefined })}>키보드 조건<img alt="" src={productListCloseIcon} /></button> : null}
      {selected.mouseConnectionStatus ? <button aria-label="마우스 조건 필터 해제" className="selected-filters__tag" type="button" onClick={() => update({ mouseConnectionStatus: undefined })}>마우스 조건<img alt="" src={productListCloseIcon} /></button> : null}
    </div><button className="selected-filters__reset" type="button" onClick={controls.resetFilters}>초기화 <img alt="" src={restartAltIcon} /></button></div></div>
  </>
}

export function LiveProductFilter({ controls, filterRef, drawer, onClose }: { controls: Filters; filterRef: Ref<HTMLElement>; drawer?: boolean; onClose: () => void }) {
  const { filterMetadata: metadata, catalogSelections: selected, setCatalogSelections: update } = controls
  const priceBasis = selected.priceBasis ?? 'monthly'
  const priceLabel = priceBasis === 'unit' ? '상품 금액' : '월 렌탈료'
  const priceBuckets = metadata?.priceBuckets.filter(bucket => bucket.priceBasis === priceBasis) ?? []
  const [notice, setNotice] = useState('')
  const ids = selected.filterOptionIds ?? []
  const toggleOption = (id: number) => {
    const next = ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]
    if (next.length > 50) { setNotice('상세 조건은 최대 50개까지 선택할 수 있습니다.'); return }
    setNotice(''); update({ filterOptionIds: next })
  }
  const renderCategory = (categoryCode: string, title: string) => {
    const groups = metadata?.groups.filter(group => group.categoryCode === categoryCode) ?? []
    if (!groups.length) return null
    return <details className="product-filter__section" key={categoryCode} open>
      <summary>{title}</summary>
      {groups.map(group => <details key={group.id} open><summary>{group.name} ({group.options.filter(option => ids.includes(option.id)).length})</summary>
        {group.options.map(option => <label key={option.id}><Checkbox checked={ids.includes(option.id)} onChange={() => toggleOption(option.id)} />{option.label}<span>{metadata?.optionCounts.find(count => count.optionId === option.id)?.productCount ?? 0}</span></label>)}
      </details>)}
    </details>
  }
  const pricePresets = priceBasis === 'monthly' ? [
    { label: '전체', minPrice: undefined, maxPrice: undefined },
    { label: '일반 사양', minPrice: 30000, maxPrice: 79999 },
    { label: '고사양', minPrice: 80000, maxPrice: 159999 },
    { label: '전문가용', minPrice: 160000, maxPrice: 500000 },
  ] : [{ label: '전체', minPrice: undefined, maxPrice: undefined }]
  return <aside aria-label="상세 상품 필터" aria-modal={drawer || undefined} className={`product-filter live-product-filter${drawer ? ' product-filter--drawer' : ''}`} ref={filterRef} role={drawer ? 'dialog' : undefined} tabIndex={drawer ? -1 : undefined}>
    <p className="product-filter__caption">상세 필터</p><MetadataNotice controls={controls} />
    {renderCategory('recommended_use', '추천 용도')}
    <section className="product-filter__section"><h2>{priceLabel}</h2>
      {priceBuckets.length ? <div className="live-price-distribution" aria-label={`${priceLabel}별 상품 수`}>
        {priceBuckets.map(bucket => <button key={bucket.minPrice} type="button"
          aria-label={`${bucket.minPrice.toLocaleString('ko-KR')}~${bucket.maxPrice.toLocaleString('ko-KR')}원 ${bucket.productCount}개 상품`}
          title={`${bucket.minPrice.toLocaleString('ko-KR')}~${bucket.maxPrice.toLocaleString('ko-KR')}원 · ${bucket.productCount}개`}
          aria-pressed={selected.minPrice === bucket.minPrice && selected.maxPrice === bucket.maxPrice}
          onClick={() => update({ priceBasis, minPrice: bucket.minPrice, maxPrice: bucket.maxPrice })}>
          <span className="live-price-distribution__count">{bucket.productCount}</span>
          <span className="live-price-distribution__bar" style={{ height: `${bucket.productCount === 0 ? 0 : Math.max(4, bucket.productCount / Math.max(1, ...priceBuckets.map(item => item.productCount)) * 80)}px` }}/>
          <span className="live-price-distribution__label">{bucket.minPrice >= 10000 ? `${(bucket.minPrice / 10000).toFixed(1)}만` : bucket.minPrice.toLocaleString('ko-KR')}</span>
        </button>)}
      </div> : null}
      <div className="live-price-presets" aria-label={`${priceLabel} 구간 선택`}>
        {pricePresets.map(preset => <button aria-pressed={selected.minPrice === preset.minPrice && selected.maxPrice === preset.maxPrice} key={preset.label} onClick={() => update({ priceBasis, minPrice: preset.minPrice, maxPrice: preset.maxPrice })} type="button">{preset.label}</button>)}
      </div>
    </section>
    {renderCategory('os', 'OS')}
    {renderCategory('cpu', 'CPU')}
    {renderCategory('ram', 'RAM')}
    {renderCategory('disk', 'DISK')}
    {renderCategory('gpu', 'GPU')}
    {notice ? <p role="alert">{notice}</p> : null}
    <button className="product-filter__close" onClick={onClose} type="button"><img alt="" src={filterChevronBackwardIcon} /><span className="sr-only">필터 닫기</span></button>
  </aside>
}
