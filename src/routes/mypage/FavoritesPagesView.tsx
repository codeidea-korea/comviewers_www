import { useServices } from '@/app/ServiceProvider'
import { useAuthentication } from '@/app/session/AuthProvider'
import { HttpRcpcList } from './-components/HttpRcpcPages'
import { HttpFavoritesPage } from './-components/HttpFavoritesPage'
import type { InquiryTarget } from '@/components/mypage/inquiryFlowTypes'
import type { AccountRcpc } from '@/domain/myAccount/services'
import { useRef,useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { AppShell } from '../../components/layout/AppShellView'
import { InquiryFlowDialog,useInquiryFlow } from '../../components/mypage/InquiryFlowDialogControl'
import { RcpcSurfaceSwitch } from '../../components/mypage/RcpcDialogsControl'
import { Modal } from '../../components/ui/ModalControl'
import { PopupLayer } from '../../components/ui/PopupLayerControl'
import { usePublishingPopupPreview } from '../../lib/usePublishingPopupPreview'
import { AccountQueryState } from './-components/AccountQueryState'
import { FavoritesGroups } from './-components/FavoritesGroups'
import { FavoritesTable } from './-components/FavoritesTable'
import { useAccountFavorites } from './-components/hooks/useMyAccount'
import { FavoritesSettingsDialog,NewFavoritesGroupDialog } from './-components/modals/FavoritesGroupDialogs'
import { FavoritesVisualComposite } from './-components/modals/FavoritesVisualComposite'
import { isManagerPreview, MyPageLayout, MyPageMobileHeader } from './MypageComponentsView'

export function FavoritesPage({ settings = false }: { settings?: boolean }) {
  const { myAccount } = useServices()
  const { accessMode } = useAuthentication()
  if (myAccount.rcpcApi && myAccount.rcpcMutations) return <HttpFavoritesPage api={myAccount.rcpcApi} mutations={myAccount.rcpcMutations} settings={settings}/>
  if (myAccount.rcpcApi) return <HttpRcpcList api={myAccount.rcpcApi} favorite />
  return accessMode === 'preview' ? <LocalFavoritesPage settings={settings} /> : <MyPageLayout title="즐겨찾기"><p role="alert">즐겨찾기 정보를 불러오지 못했습니다.</p></MyPageLayout>
}

function LocalFavoritesPage({ settings = false }: { settings?: boolean }) {
  const account = useAccountFavorites()
  const groups = account.data?.favoriteGroups ?? []
  const navigate = useNavigate()
  const [targets, setTargets] = useState<InquiryTarget[]>([])
  const [activeTarget, setActiveTarget] = useState<AccountRcpc | null>(null)
  const [notice, setNotice] = useState('')
  const inquiry = useInquiryFlow()
  const [params] = useSearchParams()
  const [selected, setSelected] = useState('all')
  const [activePopup, setActivePopup] = useState<string | null>(null)
  const [activeRcpcPopup, setActiveRcpcPopup] = useState<string | null>(null)
  const [selectionRequiredOpen, setSelectionRequiredOpen] = useState(false)
  const [mobileGroupPickerOpen, setMobileGroupPickerOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const popupReturnFocusRef = useRef<HTMLButtonElement | null>(null)
  const canManage = !isManagerPreview(`?${params.toString()}`)
  const visualComposite = import.meta.env.VITE_ENABLE_PUBLISHING_PREVIEWS === 'true' && params.get('publishingState') === 'visual-composite'
  const closePopup = () => setActivePopup(null)
  usePublishingPopupPreview(canManage ? { '즐겨찾기 그룹 설정': () => setActivePopup('settings'), '새 즐겨찾기 그룹': () => setActivePopup('new') } : {})
  const addGroup = (name: string, parentId: string | null) => {
    if (canManage && !account.addGroup.isPending) account.addGroup.mutate({ label: name, parentId }, { onSuccess: closePopup })
  }
  const favoriteRcpcs = (account.data?.rcpcs ?? []).filter((item) => item.favorite)
  const displayGroups = groups.map(group => ({ ...group, count: favoriteRcpcs.filter(item => item.groupId === group.id || groups.some(child => child.parentId === group.id && child.id === item.groupId)).length }))
  const visibleItems = favoriteRcpcs.filter((item) => selected === 'all' || item.groupId === selected || groups.some((group) => group.id === item.groupId && group.parentId === selected))
  return (
    <>
      <AppShell className="favorites-shell mypage-shell">
        <MyPageMobileHeader
          menuOpen={mobileMenuOpen}
          onBack={() => navigate(-1)}
          onMenuToggle={() => setMobileMenuOpen((current) => !current)}
          onSearchOpen={() => navigate('/mypage')}
          showMenu={!settings}
          showSearch={!settings}
          title={settings ? '그룹 설정' : 'MYPAGE'}
        />
        <main className="favorites-page content-container">
          <AccountQueryState pending={account.isPending} error={account.error} retry={account.refetch}/>{notice ? <p role="status">{notice}</p> : null}{canManage && (account.addGroup.error || account.move.error) ? <p role="alert">{account.addGroup.error?.message ?? account.move.error?.message}</p> : null}<h1>{settings ? '즐겨찾기 그룹' : '즐겨찾기'}</h1>
          {settings
            ? <MobileFavoritesSettings groups={displayGroups} onEdit={() => { setTargets([]); setActivePopup('settings') }} onNew={() => setActivePopup('new')} />
            : <div className="favorites-mobile-group-control"><strong>즐겨찾기 그룹</strong><span><button aria-label="즐겨찾기 그룹 선택" onClick={() => setMobileGroupPickerOpen(true)} type="button">{displayGroups.find((group) => group.id === selected)?.label ?? '미분류'}⌄</button><button aria-label="그룹 설정" onClick={() => navigate('/mypage/favorites/settings')} type="button">⚙</button></span></div>}
          <div className="favorites-layout">
            <FavoritesGroups canManage={canManage} groups={displayGroups} onEditGroups={() => { setTargets([]); setActivePopup('settings') }} onNewGroup={() => setActivePopup('new')} selected={selected} setSelected={setSelected} />
            <FavoritesTable canManage={canManage} items={visibleItems}
              onChangeGroup={(items) => { setTargets(items); setActivePopup('settings') }}
              onExtend={() => setNotice('현재 이용할 수 없습니다.')}
              onInquiry={inquiry.open}
              onOpenRcpcPopup={(type, item, trigger) => { popupReturnFocusRef.current = trigger; setActiveTarget(item); setActiveRcpcPopup(type) }}
              onSelectionRequired={(trigger) => { popupReturnFocusRef.current = trigger; setSelectionRequiredOpen(true) }}
              selectedGroup={selected}
            />
          </div>
        </main>
      </AppShell>
      {!settings && visualComposite && canManage ? <FavoritesVisualComposite /> : null}
      <MobileFavoriteGroupPicker groups={displayGroups} isOpen={mobileGroupPickerOpen} onClose={() => setMobileGroupPickerOpen(false)} onSelect={setSelected} selected={selected} />
      {canManage && activePopup === 'settings' ? <FavoritesSettingsDialog
        groups={displayGroups}
        isOpen
        onClose={closePopup}
        onNewGroup={() => setActivePopup('new')}
        onSave={(groupId) => { if (!targets.length) { setNotice('이동할 RCPC를 먼저 선택해 주세요.'); closePopup(); return }; if (canManage && !account.move.isPending) account.move.mutate({ groupId, ids: targets.flatMap((item) => item.selectionId ? [item.selectionId] : []) }, { onSuccess: closePopup }) }}
      /> : null}
      {canManage && (activePopup === 'new' || activePopup === 'new-filled') ? <NewFavoritesGroupDialog
        key={activePopup}
        groups={groups}
        initialName={activePopup === 'new-filled' ? '사무실' : ''}
        isOpen
        onAdd={addGroup}
        onClose={closePopup}
      /> : null}
      {activeRcpcPopup ? <RcpcSurfaceSwitch activePopup={activeRcpcPopup} onClose={() => setActiveRcpcPopup(null)} rcpc={activeTarget} returnFocusRef={popupReturnFocusRef} /> : null}
      <InquiryFlowDialog {...inquiry.dialogProps} />
      <Modal className="favorites-selection-required" closeLabel="확인" closeVariant="primary" isOpen={selectionRequiredOpen} onClose={() => setSelectionRequiredOpen(false)} returnFocusRef={popupReturnFocusRef} title="RCPC 선택 안내"><p>먼저 RCPC를 선택해 주세요.</p></Modal>
    </>
  )
}

type DisplayFavoriteGroup = {
  id: string
  label: string
  parentId: string | null
  count?: number
}

function MobileFavoriteGroupPicker({ groups, isOpen, onClose, onSelect, selected }: { groups: readonly DisplayFavoriteGroup[]; isOpen: boolean; onClose: () => void; onSelect: (id: string) => void; selected: string }) {
  const roots = groups.filter((group) => group.parentId === null)
  const childrenOf = (parentId: string) => groups.filter((group) => group.parentId === parentId)
  const selectedRoot = roots.find((group) => group.id === selected || childrenOf(group.id).some((child) => child.id === selected))
  const [expanded, setExpanded] = useState(selectedRoot?.id ?? roots[0]?.id ?? '')

  return (
    <PopupLayer className="favorites-mobile-picker-layer" dialogClassName="favorites-mobile-picker" isOpen={isOpen} onClose={onClose} showTitle={false} title="즐겨찾기 그룹 선택">
      <span aria-hidden="true" className="favorites-mobile-picker__handle" />
      <div className="favorites-mobile-picker__list">
        {roots.map((group) => {
          const children = childrenOf(group.id)
          const isExpanded = expanded === group.id
          const isSelected = selected === group.id
          return (
            <section key={group.id}>
              <button
                aria-expanded={children.length ? isExpanded : undefined}
                aria-label={children.length ? undefined : `${group.label} 그룹 선택`}
                onClick={() => {
                  if (children.length) setExpanded((current) => current === group.id ? '' : group.id)
                  else { onSelect(group.id); onClose() }
                }}
                type="button"
              >
                <span className={isSelected ? 'is-selected' : ''}>{isSelected ? '✓ ' : ''}{group.label}({group.count ?? 0})</span><b aria-hidden="true">{children.length ? (isExpanded ? '⌃' : '⌄') : ''}</b>
              </button>
              {isExpanded && children.length ? <div>{children.map((child) => <button aria-label={`${child.label} 그룹 선택`} className={selected === child.id ? 'is-selected' : undefined} key={child.id} onClick={() => { onSelect(child.id); onClose() }} type="button">{selected === child.id ? '✓ ' : ''}{child.label}</button>)}</div> : null}
            </section>
          )
        })}
      </div>
    </PopupLayer>
  )
}

function MobileFavoritesSettings({ groups, onEdit, onNew }: { groups: readonly DisplayFavoriteGroup[]; onEdit: () => void; onNew: () => void }) {
  const roots = groups.filter((group) => group.parentId === null)
  return (
    <section className="favorites-mobile-settings">
      <div className="favorites-mobile-settings__actions"><button onClick={onEdit} type="button">편집</button><button onClick={onNew} type="button">추가</button></div>
      <div className="favorites-mobile-settings__tree">
        {roots.map((group) => {
          const children = groups.filter((child) => child.parentId === group.id)
          return <section key={group.id}><strong>{group.label} <b>{group.count ?? 0}</b></strong>{children.map((child) => <span key={child.id}>└ {child.label}<b>{child.count ?? 0}</b></span>)}</section>
        })}
      </div>
      <p>즐겨찾기 그룹을 추가·수정·삭제할 수 있습니다. 삭제된 그룹의 RCPC는 미분류로 이동하며, 그룹은 복구할 수 없습니다.</p>
    </section>
  )
}



