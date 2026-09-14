import { useCallback, useRef, useState, type ReactNode } from 'react'
import type { DetailSelections } from '../../../domain/products/types'
import type { useProductList } from './hooks/useProductList'
import { DropdownOptionList, DropdownSelect, GroupedMultiSelect, useDismissibleSelect } from '../../../components/ui/SelectControl'
import filterTuneIcon from '../../../assets/figma/filter-tune.svg'
import filterChevronUpIcon from '../../../assets/figma/filter-chevron-up.svg'
import productListCloseIcon from '../../../assets/figma/product-list-close.svg'
import restartAltIcon from '../../../assets/figma/restart-alt.svg'
import selectorChevronDownIcon from '../../../assets/figma/selector-chevron-down.svg'
type SelectorId = 'server-room' | 'line' | 'ip' | 'purpose'
type FilterControlsProps = Pick<ReturnType<typeof useProductList>, 'selectedRooms' | 'setSelectedRooms' | 'detailSelections' | 'setDetailSelections' | 'selectorSelections' | 'setSelectorSelections' | 'resetFilters' | 'capabilities'> & { mobileFilterTrigger?: ReactNode }
const selectorTagPrefix: Record<string, string> = {
  'server-room': '서버실',
  line: '인터넷',
  ip: 'IP',
  purpose: '게임',
}

const detailedFilterTagPrefix: Record<string, string> = {
  'monthly-fee': '월 렌탈료',
  os: 'OS',
  'cpu-type': 'CPU 종류',
  'cpu-clock': 'CPU CLOCK',
  'cpu-core': 'CPU CORE',
  'ram-spec': 'RAM 규격',
  'ram-size': 'RAM 용량',
  'disk-type': 'DISK 유형',
  'disk-size': 'DISK 용량',
  'gpu-type': 'GPU 유형',
  'gpu-memory': 'GPU 용량',
  peripheral: '주변 기기',
  game: '게임',
}

const serverRoomGroups = [
  { label: 'IRC코리아', options: ['메가서버실', '서영서버실', '강림1서버실', '강림3서버실', '무실서버실', '삼화서버실', '백제서버실', '유승서버실', '오썸서버실'], selectedOptions: [0] },
  { label: '컴픽', options: ['한빛', '한빛2'], selectedOptions: [0] },
  { label: '델리즈', options: ['칠곡서버실'], selectedOptions: [0] },
  { label: '서광모드', options: ['B소프트서버실'], selectedOptions: [0] },
]

const serverRoomSelectGroups = serverRoomGroups.map((group) => ({
  label: group.label,
  options: group.options.map((option) => ({ label: option, value: `${group.label}/${option}` })),
}))

const primarySelectorOptions = {
  line: ['전체', 'KT일반/공용회선', 'KT일반/단독회선', 'KT전용/공용회선', 'KT전용/단독회선', 'SK일반/공용회선', 'SK일반/단독회선', 'SK전용/공용회선', 'SK전용/단독회선', 'LG일반'],
  ip: ['전체', '1컴 1공인 IP/공인 IP', '공유기 IP/사설 IP', 'VPN/오픈VPN', 'VPN/와이어가드'],
  purpose: ['전체', '엔씨소프트', '넥슨', '넷마블', '카카오게임즈'],
}

export function ProductListFilterControls({ selectedRooms, setSelectedRooms, detailSelections, setDetailSelections, selectorSelections, setSelectorSelections, resetFilters, capabilities, mobileFilterTrigger }: FilterControlsProps) {
  const [openSelector, setOpenSelector] = useState<SelectorId | null>(null)
  const selectorsRef = useRef<HTMLDivElement>(null)
  const activeFilterTags = [
    ...Object.entries(selectorSelections).filter(([, value]) => value !== '전체').map(([id, value]) => ({ id, source: id, label: `${selectorTagPrefix[id]} ${value}` })),
    ...(selectedRooms.size ? [{ id: 'server-room', source: 'server-room', label: `서버실 ${[...selectedRooms].join(', ')}` }] : []),
    ...Object.entries(detailSelections).filter(([, values]) => values?.length).map(([id, values]) => ({ id: `detail-${id}`, source: `detail-${id}`, label: `${detailedFilterTagPrefix[id]} ${id === 'monthly-fee' ? `${Number(values?.[0]).toLocaleString('ko-KR')}원 이하` : values?.join(', ')}` })),
  ]

  const dismissSelector = useCallback(({ restoreFocus = true } = {}) => {
    const trigger = selectorsRef.current?.querySelector<HTMLButtonElement>('button[aria-expanded="true"]')
    setOpenSelector(null)
    if (restoreFocus) requestAnimationFrame(() => trigger?.focus())
  }, [])
  useDismissibleSelect({ containerRef: selectorsRef, isOpen: Boolean(openSelector), onDismiss: dismissSelector })

  const serverRoomValue = selectedRooms.size === 0
    ? '전체'
    : selectedRooms.size === 1
      ? [...selectedRooms][0]
      : `${[...selectedRooms][0]} 외 ${selectedRooms.size - 1}개`
  const selectors: { id: SelectorId; label: string; value: string }[] = [
    { id: 'server-room', label: '서버실', value: serverRoomValue },
    { id: 'line', label: '인터넷', value: selectorSelections.line },
    { id: 'ip', label: 'IP', value: selectorSelections.ip },
    { id: 'purpose', label: '게임', value: selectorSelections.purpose },
  ]
  const removeFilterTag = (tag: { source: string }) => {
    if (tag.source === 'server-room') {
      setSelectedRooms(new Set())
    } else if (tag.source?.startsWith('detail-')) {
      const detailId = tag.source.slice('detail-'.length) as keyof DetailSelections
      setDetailSelections((current) => ({ ...current, [detailId]: [] }))
    } else if (tag.source) {
      setSelectorSelections((current) => ({ ...current, [tag.source]: '전체' }))
    }
  }
  const resetFilterTags = () => {
    resetFilters()
  }
  const setSelectorValue = (id: Exclude<SelectorId, 'server-room'>, option: string) => {
    setSelectorSelections((current) => ({ ...current, [id]: option }))
    setOpenSelector(null)
  }
  const setServerRooms = (nextRooms: Set<string>) => {
    setSelectedRooms(nextRooms)
  }
  return (<>
          <div className="product-mobile-controls">
          {mobileFilterTrigger}
          <div className="product-selectors" ref={selectorsRef}>
            {selectors.map(({ id, label, value }) => (
              <fieldset key={id} disabled={id === 'server-room' ? capabilities?.rooms === false : capabilities?.primarySelectors === false} style={{ display: 'contents' }}>
              <DropdownSelect
                className="product-selector-field"
                controls={id === 'server-room' ? 'server-room-select-panel' : `${id}-selector-options`}
                expanded={openSelector === id}
                hasPopup={id === 'server-room' ? false : 'listbox'}
                key={id}
                label={label}
                onToggle={() => setOpenSelector((current) => current === id ? null : id)}
                panel={id === 'server-room' && openSelector === id ? (
                  <GroupedMultiSelect
                    ariaLabel="서버실 선택"
                    chevronIcon={filterChevronUpIcon}
                    className="server-room-select-panel"
                    groups={serverRoomSelectGroups}
                    id="server-room-select-panel"
                    onChange={setServerRooms}
                    selectedValues={selectedRooms}
                    thumbTravel={215}
                  />
                ) : id !== 'server-room' && openSelector === id ? (
                  <DropdownOptionList
                    className="product-selector-options"
                    id={`${id}-selector-options`}
                    label={label}
                    onClose={dismissSelector}
                    onSelect={(option) => setSelectorValue(id, option)}
                    options={primarySelectorOptions[id]}
                    selected={selectorSelections[id]}
                  />
                ) : null}
                triggerIcon={<img alt="" src={selectorChevronDownIcon} />}
                value={value}
              />
              </fieldset>
            ))}
          </div>
          </div>
          <div className={`selected-filters${activeFilterTags.length === 0 ? ' is-empty' : ''}`}>
            <div className="selected-filters__title"><img alt="" src={filterTuneIcon} /><span>필터</span></div>
            <div className="selected-filters__body">
              <div className="selected-filters__tags">
                {activeFilterTags.map((tag) => <button aria-label={`${tag.label} 필터 해제`} className="selected-filters__tag" key={tag.id} onClick={() => removeFilterTag(tag)} type="button">{tag.label}<img alt="" src={productListCloseIcon} /></button>)}
              </div>
              <button className="selected-filters__reset" onClick={resetFilterTags} type="button">초기화 <img alt="" src={restartAltIcon} /></button>
            </div>
          </div>
  </>)
}
