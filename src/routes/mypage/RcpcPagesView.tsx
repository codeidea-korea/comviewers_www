import { isActiveManager } from '@/domain/myAccount/managerServices'
import { useServices } from '@/app/ServiceProvider'
import { useAuthentication } from '@/app/session/AuthProvider'
import { HttpRcpcDetail, HttpRcpcList } from './-components/HttpRcpcPages'
import type { AccountRcpc } from '@/domain/myAccount/services'
import { useRef,useState } from 'react'
import { useSearchParams } from 'react-router'
import { InquiryFlowDialog,useInquiryFlow } from '../../components/mypage/InquiryFlowDialogControl'
import { RcpcRebootSurface,RcpcSurfaceSwitch } from '../../components/mypage/RcpcDialogsControl'
import { Pagination } from '../../components/ui/PaginationControl'
import { NativeSelect } from '../../components/ui/SelectControl'
import { resolvePublishingPopupKey,usePublishingPopupPreview } from '../../lib/usePublishingPopupPreview'
import { periodFilterOptions,serverRoomFilterOptions } from '../../mocks/selectOptions'
import { AccountQueryState } from './-components/AccountQueryState'
import type { AccountSort } from './-components/accountSorting'
import { nextSortConfig,sortRows } from './-components/accountSorting'
import { useMyAccount } from './-components/hooks/useMyAccount'
import { RcpcListTable } from './-components/RcpcListTable'
import { isManagerPreview,MyPageLayout,MyPageTabs,MyPageToolbar } from './MypageComponentsView'
import { MypageHomePage } from './MypageHomePageView'

const getInquiryRcpc = (rcpc: AccountRcpc) => ({
  selectionId: rcpc.id,
  rcpcId: rcpc.rcpcId,
  alias: rcpc.alias,
  location: `${rcpc.company}/${rcpc.center}`,
})

const rcpcTabs = [
  { id: 'all', label: '전체', href: '/mypage/rcpc' },
  { id: 'using', label: '이용 중', href: '/mypage/rcpc?status=using' },
  { id: 'waiting', label: '연장대기', href: '/mypage/rcpc?status=waiting' },
  { id: 'ended', label: '이용 종료', href: '/mypage/rcpc?status=ended' },
]

const matchesTab = (item: AccountRcpc, active: string) => active === 'all'
  || (active === 'using' && item.status === '이용중')
  || (active === 'waiting' && item.status === '연장대기')
  || (active === 'ended' && item.state === '이용종료')

export function RcpcListPage() {
  const { myAccount } = useServices()
  const { accessMode } = useAuthentication()
  if (myAccount.rcpcApi) return <HttpRcpcList api={myAccount.rcpcApi} mutations={myAccount.rcpcMutations} />
  return accessMode === 'preview' ? <LocalRcpcListPage /> : <MyPageLayout title="이용 RCPC"><p role="alert">이용 RCPC를 불러오지 못했습니다.</p></MyPageLayout>
}

function LocalRcpcListPage() {
  const account = useMyAccount()
  const mockRcpcs = account.data?.rcpcs ?? []
  const mockManagers = (account.data?.managers ?? []).filter(isActiveManager)
  const inquiry = useInquiryFlow()
  const [params] = useSearchParams()
  const requestedState = (params.get('status') ?? params.get('publishingState'))
  const active = ['using', 'waiting', 'ended'].includes(requestedState ?? '') ? (requestedState ?? 'all') : 'all'
  const manager = isManagerPreview(`?${params.toString()}`)
  const [message, setMessage] = useState('')
  const [rebootTarget, setRebootTarget] = useState<AccountRcpc | null>(null)
  const [activeRcpcPopup, setActiveRcpcPopup] = useState<{ type: string; rcpc: AccountRcpc } | null>(null)
  const [alias, setAlias] = useState('')
  const popupReturnFocusRef = useRef<HTMLButtonElement | null>(null)
  const [periodFilter, setPeriodFilter] = useState('')
  const [serverFilter, setServerFilter] = useState('')
  const [sortConfig, setSortConfig] = useState<AccountSort | null>(null)
  const copyConnectionValue = () => { setMessage('현재 이용할 수 없습니다.') }
  const requestedPopup = resolvePublishingPopupKey(params.get('publishingPopup'), [
    'rcpc-spec-alias',
    'rcpc-spec',
    'rcpc-alias',
    'rcpc-extension',
  ])
  const visualComposite = import.meta.env.VITE_ENABLE_PUBLISHING_PREVIEWS === 'true' && params.get('publishingState') === 'visual-composite' && requestedPopup === 'rcpc-spec-alias'
  const qaDetailBackground = import.meta.env.VITE_ENABLE_PUBLISHING_PREVIEWS === 'true' && ['rcpc-spec-alias', 'rcpc-spec', 'rcpc-alias', 'rcpc-extension'].includes(requestedPopup ?? '')
  const previewActions = {
    'RCPC 를 재부팅하시겠습니까?': () => { if (!mockRcpcs[0]) return false; inquiry.close(); setActiveRcpcPopup(null); setRebootTarget(mockRcpcs[0]) },
    '사양보기': () => { if (!mockRcpcs[0]) return false; inquiry.close(); setRebootTarget(null); setActiveRcpcPopup({ type: 'spec', rcpc: mockRcpcs[0] }) },
    'RCPC 별명 설정': () => { if (!mockRcpcs[0]) return false; inquiry.close(); setRebootTarget(null); setActiveRcpcPopup({ type: 'alias', rcpc: mockRcpcs[0] }) },
    '기간 연장': () => { if (!mockRcpcs[0]) return false; inquiry.close(); setRebootTarget(null); setActiveRcpcPopup({ type: 'extension', rcpc: mockRcpcs[0] }) },
    '문의 유형 선택': () => { if (!mockRcpcs[0]) return false; setActiveRcpcPopup(null); setRebootTarget(null); inquiry.open([getInquiryRcpc(mockRcpcs[0])]) },
    '문의 작성': () => { if (!mockRcpcs[0]) return false; setActiveRcpcPopup(null); setRebootTarget(null); inquiry.open([getInquiryRcpc(mockRcpcs[0])], null, 'write') },
    'RCPC 선택 안내': () => { setActiveRcpcPopup(null); setRebootTarget(null); inquiry.open([]) },
  }
  usePublishingPopupPreview(previewActions)
  const visibleRcpcs = manager ? mockRcpcs.filter((item) => (mockManagers[0]?.assignedRcpcIds ?? []).includes(item.rcpcId)) : mockRcpcs
  const filtered = visibleRcpcs.filter((item) => matchesTab(item, active)).filter((item) => !params.get('search') || `${item.rcpcId} ${item.alias}`.toLowerCase().includes((params.get('search') ?? '').toLowerCase()))
    .filter((item) => !serverFilter || item.center === serverFilter)
    .filter((item) => !periodFilter
      || (periodFilter === 'ended' ? item.state === '이용종료' : item.daysLeft <= Number(periodFilter)))
  const displayRcpcs = filtered.map((item) => ({ ...item, ended: item.state === '이용종료', visualState: item.state === '이용종료' ? '종료' : item.status === '연장대기' ? '연장대기' : item.state }))
  const sortedRcpcs = sortRows(displayRcpcs, sortConfig, (item, key) => {
    if (key === 'rcpc') return item.alias
    if (key === 'location') return `${item.company} ${item.center}`
    if (key === 'state') return item.visualState
    if (key === 'period') return item.ended ? 0 : item.daysLeft ?? 21
    return item.traffic
  })
  const sort = (key: string) => setSortConfig((current) => nextSortConfig(current, key))
  const openRcpcPopup = (type: string, rcpc: AccountRcpc, trigger: HTMLButtonElement) => {
    popupReturnFocusRef.current = trigger
    setActiveRcpcPopup({ type, rcpc })
  }

  if (qaDetailBackground) {
    return <><MypageHomePage rcpcDetailPreview /><RcpcSurfaceSwitch activePopup={activeRcpcPopup?.type} onClose={() => setActiveRcpcPopup(null)} rcpc={activeRcpcPopup?.rcpc} returnFocusRef={popupReturnFocusRef} />{visualComposite && mockRcpcs[0] ? <RcpcDetailVisualComposite alias={alias} onAliasChange={setAlias} rcpc={mockRcpcs[0]} /> : null}</>
  }

  return (
    <>
    <MyPageLayout title="이용 RCPC">
      <div className="rcpc-list-page"><AccountQueryState pending={account.isPending} error={account.error} retry={account.refetch}/>
        <MyPageTabs active={active} items={rcpcTabs.map((tab) => ({ ...tab, label: `${tab.label} ${visibleRcpcs.filter((item) => matchesTab(item, tab.id)).length}` }))} />
        <MyPageToolbar count={filtered.length} label="총" suffix="개 상품">
          <NativeSelect aria-label="기간" onChange={(event) => setPeriodFilter(event.target.value)} value={periodFilter}><option value="">기간선택</option>{periodFilterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</NativeSelect>
          <NativeSelect aria-label="서버실" onChange={(event) => setServerFilter(event.target.value)} value={serverFilter}><option value="">서버실 선택</option>{serverRoomFilterOptions.map((option) => <option key={option}>{option}</option>)}</NativeSelect>
        </MyPageToolbar>
        <RcpcListTable canExtend={!manager} items={sortedRcpcs} sort={sort} sortConfig={sortConfig} onOpenRcpcPopup={openRcpcPopup} onCopy={copyConnectionValue} onReboot={(item, trigger) => { popupReturnFocusRef.current = trigger; setRebootTarget(item) }} onInquiry={(item, trigger) => inquiry.open([getInquiryRcpc(item)], trigger)} />
        <Pagination totalPages={1} />
      </div>
      {message ? <p aria-live="polite" className="mypage-notice">{message}</p> : null}
      <RcpcRebootSurface isOpen={Boolean(rebootTarget)} onClose={() => setRebootTarget(null)} onConfirm={() => { setMessage('현재 이용할 수 없습니다.'); setRebootTarget(null) }} rcpc={rebootTarget} returnFocusRef={popupReturnFocusRef} />
      <RcpcSurfaceSwitch activePopup={activeRcpcPopup?.type} onClose={() => setActiveRcpcPopup(null)} rcpc={activeRcpcPopup?.rcpc} returnFocusRef={popupReturnFocusRef} />
      <InquiryFlowDialog {...inquiry.dialogProps} />
    </MyPageLayout>
    {visualComposite && mockRcpcs[0] ? <RcpcDetailVisualComposite alias={alias} onAliasChange={setAlias} rcpc={mockRcpcs[0]} /> : null}
    </>
  )
}

function RcpcDetailVisualComposite({ alias, onAliasChange, rcpc }: { alias: string; onAliasChange: (value: string) => void; rcpc: AccountRcpc }) {
  return <div aria-hidden="true" className="rcpc-popup-layer rcpc-popup-layer--detail is-composite" inert><section className="rcpc-spec-dialog"><h2>PC 사양 보기</h2><dl><div><dt>서버실</dt><dd>IRC코리아/메가서버실</dd></div><div><dt>품번</dt><dd>{rcpc.rcpcId}</dd></div><div><dt>OS</dt><dd>Microsoft Windows 10 Pro (64Bit)</dd></div><div><dt>CPU</dt><dd>AMD Ryzen 3 2200G with Radeon Vega Graphics 4 Cores</dd></div><div><dt>RAM</dt><dd><mark>DDR3/6G</mark></dd></div><div><dt>DISK</dt><dd><mark>SSD/120G</mark></dd></div><div><dt>GPU</dt><dd><mark>GeForce GTX 1650 (4GB)</mark></dd></div></dl><button type="button">닫기</button></section><section className="rcpc-alias-dialog"><h2>RCPC 별명 설정</h2><strong>품번 {rcpc.rcpcId}</strong><input aria-label="RCPC 별명" maxLength={20} onChange={event=>onAliasChange(event.target.value)} placeholder="RCPC 별명을 입력해 주세요." value={alias} /><small>* 입력하지 않고 저장하면 별명이 미설정됩니다.</small><footer><button type="button">취소</button><button type="button">저장</button></footer></section></div>
}

export function RcpcDetailPage() {
  const { myAccount } = useServices()
  const { accessMode } = useAuthentication()
  if (myAccount.rcpcApi) return <HttpRcpcDetail api={myAccount.rcpcApi} mutations={myAccount.rcpcMutations} />
  return accessMode === 'preview' ? <MypageHomePage rcpcDetailPreview /> : <MyPageLayout title="RCPC 상세"><p role="alert">RCPC 정보를 불러오지 못했습니다.</p></MyPageLayout>
}
