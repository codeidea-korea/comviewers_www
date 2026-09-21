import { useCallback, useRef, useState, type ReactNode } from 'react'
import { LoadingState } from '@/components/ui/LoadingStateControl'
import { DropdownSelect, GroupedMultiSelect, useDismissibleSelect } from '@/components/ui/SelectControl'
import filterChevronUpIcon from '@/assets/figma/filter-chevron-up.svg'
import filterTuneIcon from '@/assets/figma/filter-tune.svg'
import productListCloseIcon from '@/assets/figma/product-list-close.svg'
import restartAltIcon from '@/assets/figma/restart-alt.svg'
import selectorChevronDownIcon from '@/assets/figma/selector-chevron-down.svg'
import type { ProductCatalogControls } from './ProductFiltersView'
import './product-catalog-filter-controls.css'
import { TranslatedText, useTranslation, type TranslationKey } from '@/i18n/translation'

function MetadataNotice({ controls }: { controls: ProductCatalogControls }) {
  const { t } = useTranslation()
  return controls.filterMetadataPending ? <LoadingState className="route-loading--compact" label={t('filter.loading')} /> : controls.filterMetadataError ? <p role="alert"><TranslatedText id="filter.loadFailed" /> <button className="product-catalog-filter__inline-action" type="button" onClick={() => void controls.refetchFilterMetadata()}><TranslatedText id="common.retry" /></button></p> : null
}

export function ProductCatalogFilterControls({ controls, mobileFilterTrigger }: { controls: ProductCatalogControls; mobileFilterTrigger?: ReactNode }) {
  const { t } = useTranslation()
  const selectedLabel = (labels: readonly string[]) => labels.length > 1
    ? t('filter.moreSelected', { label: labels[0], count: labels.length - 1 }) : labels[0] ?? t('common.all')
  const selectorKeys: Readonly<Record<string, TranslationKey>> = { rooms: 'filter.serverRoom', network: 'filter.network', recommended_use: 'filter.purpose' }
  const { filterMetadata: metadata, catalogSelections: selected, setCatalogSelections: update } = controls
  const [open, setOpen] = useState<'rooms' | 'network' | 'ip' | 'recommended_use' | null>(null)
  const [roomNotice, setRoomNotice] = useState('')
  const container = useRef<HTMLDivElement>(null)
  const dismiss = useCallback(() => setOpen(null), [])
  useDismissibleSelect({ containerRef: container, isOpen: Boolean(open), onDismiss: dismiss })
  const roomGroups = Array.from(new Set(metadata?.rooms.map(room => room.groupName || '서버실') ?? [])).map(label => ({ label,
    options: metadata!.rooms.filter(room => (room.groupName || '서버실') === label).map(room => ({ value: String(room.id), label: room.name })),
  }))
  const selectedRoomLabels = selected.rooms.map(id => metadata?.rooms.find(room => String(room.id) === id)?.name ?? `서버실 ${id}`)
  const priceLabel = t(selected.priceBasis === 'unit' ? 'money.productAmount' : 'money.monthlyRental')
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
      value: selectedLabel(selectedRoomLabels) },
    ...(['network', 'ip', 'recommended_use'] as const).map(categoryCode => {
      const options = selectedCategoryOptions(categoryCode)
      return { id: categoryCode, label: categoryCode === 'network' ? '회선' : categoryCode === 'ip' ? 'IP' : '추천 용도',
        selectedValues: new Set(options.map(option => String(option.id))), groups: categoryGroups(categoryCode),
        value: selectedLabel(options.map(option => option.label)) }
    }),
  ].filter(selector => selector.selectedValues.size > 0 || selector.groups.some(group => group.options.length > 0))
  const tags = metadata?.groups.flatMap(group => {
    const options = group.options.filter(option => selectedOptions.includes(option.id))
    if (!options.length) return []
    return [{ id: String(group.id), label: `${group.categoryName ?? '분류 미지정'} / ${group.name} ${options.slice(0, 2).map(option => option.label).join(', ')}${options.length > 2 ? ` +${options.length - 2}개` : ''}`,
      remove: () => update({ filterOptionIds: selectedOptions.filter(id => !group.options.some(option => option.id === id)) }) }]
  }) ?? []
  const hasSelectedFilters = selectedRoomLabels.length > 0 || selectedOptions.length > 0
    || selected.minPrice !== undefined || selected.maxPrice !== undefined
    || Boolean(selected.keyboardConnectionStatus) || Boolean(selected.mouseConnectionStatus)
  return <>
    <MetadataNotice controls={controls} />
    <div className="product-mobile-controls">
    {mobileFilterTrigger}
    <div className="product-selectors product-catalog-selectors" ref={container}>
      {primarySelectors.map(selector => <DropdownSelect className="product-selector-field" controls={`catalog-${selector.id}`} expanded={open === selector.id} hasPopup={false} key={selector.id} label={selectorKeys[selector.id] ? <TranslatedText id={selectorKeys[selector.id]} /> : selector.label} onToggle={() => setOpen(current => current === selector.id ? null : selector.id)}
        triggerIcon={<img alt="" src={selectorChevronDownIcon} />} value={<span className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined}>{selector.value}</span>}
        panel={open === selector.id ? <>
          {selector.id === 'rooms' ? <button aria-label="서버실 선택 닫기" className="product-mobile-selector-backdrop" onClick={dismiss} type="button" /> : null}
          <div className={selector.id === 'rooms' ? 'product-mobile-server-sheet' : undefined}>
            {selector.id === 'rooms' ? <span aria-hidden="true" className="product-mobile-bottom-sheet__handle" /> : null}
          <GroupedMultiSelect ariaLabel={`${selector.label} 선택`} chevronIcon={filterChevronUpIcon} className="server-room-select-panel" groups={selector.groups} id={`catalog-${selector.id}`} onChange={values => {
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
    <div className={`selected-filters${hasSelectedFilters ? '' : ' is-empty'}`}><div className="selected-filters__title"><img alt="" src={filterTuneIcon} /><span><TranslatedText id="filter.title" /></span></div><div className="selected-filters__body"><div className="selected-filters__tags">
      {selectedRoomLabels.length ? <button aria-label={`${t('filter.serverRoom')} ${selectedLabel(selectedRoomLabels)} 필터 해제`} className="selected-filters__tag" type="button" onClick={() => update({ rooms: [] })}><span className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined}>{t('filter.serverRoom')} {selectedLabel(selectedRoomLabels)}</span><img alt="" src={productListCloseIcon} /></button> : null}
      {tags.map(tag => <button aria-label={`${tag.label} 필터 해제`} key={tag.id} className="selected-filters__tag" type="button" onClick={tag.remove}>{tag.label}<img alt="" src={productListCloseIcon} /></button>)}
      {selected.minPrice !== undefined || selected.maxPrice !== undefined ? <button aria-label={`${priceLabel} 필터 해제`} className="selected-filters__tag" type="button" onClick={() => update({ minPrice: undefined, maxPrice: undefined })}><TranslatedText id={selected.priceBasis === 'unit' ? 'money.productAmount' : 'money.monthlyRental'} /> <TranslatedText id="money.krwAmount" values={{ amount: selected.minPrice?.toLocaleString('ko-KR') ?? '0' }} /> ~ {selected.maxPrice === undefined ? '제한 없음' : <TranslatedText id="money.krwAmount" values={{ amount: selected.maxPrice.toLocaleString('ko-KR') }} />}<img alt="" src={productListCloseIcon} /></button> : null}
      {selected.keyboardConnectionStatus ? <button aria-label="키보드 조건 필터 해제" className="selected-filters__tag" type="button" onClick={() => update({ keyboardConnectionStatus: undefined })}>키보드 조건<img alt="" src={productListCloseIcon} /></button> : null}
      {selected.mouseConnectionStatus ? <button aria-label="마우스 조건 필터 해제" className="selected-filters__tag" type="button" onClick={() => update({ mouseConnectionStatus: undefined })}>마우스 조건<img alt="" src={productListCloseIcon} /></button> : null}
    </div><button className="selected-filters__reset" type="button" onClick={controls.resetFilters}><TranslatedText id="common.reset" /> <img alt="" src={restartAltIcon} /></button></div></div>
  </>
}
