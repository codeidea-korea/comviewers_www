import { isActiveManager } from '@/domain/myAccount/managerServices'
import { useServices } from '@/app/ServiceProvider'
import { useAuthentication } from '@/app/session/AuthProvider'
import { HttpDashboardPage } from './-components/http/HttpDashboardPage'
import { useRef,useState } from 'react'
import { useParams,useSearchParams } from 'react-router'
import windowIcon from '../../assets/figma/icon-window.png'
import profileImage from '../../assets/figma/store/profile-sample.png'
import userProfileIcon from '../../assets/figma/user-profile.svg'
import { InquiryFlowDialog,useInquiryFlow } from '../../components/mypage/InquiryFlowDialogControl'
import { OrderPurchaseConfirmDialog } from '../../components/mypage/OrderDialogsControl'
import { RcpcRebootSurface,RcpcSurfaceSwitch } from '../../components/mypage/RcpcDialogsControl'
import { RelativeLink as Link } from '../../components/navigation/RelativeLinkView'
import { usePublishingPopupPreview } from '../../lib/usePublishingPopupPreview'
import { AccountQueryState } from './-components/AccountQueryState'
import { type OpenRcpc,type RcpcView,getInquiryRcpc } from './-components/homeRcpc'
import { HomeRcpcTable } from './-components/HomeRcpcTable'
import { HomeActivityList,HomeSectionHeading,HomeUseStatusCard } from './-components/HomeSummarySections'
import { useMyAccount } from './-components/hooks/useMyAccount'
import { isManagerPreview,MyPageLayout,withManagerPreview } from './MypageComponentsView'

export function MypageHomePage({ rcpcDetailPreview = false }: { rcpcDetailPreview?: boolean }) {
  const { myAccount } = useServices()
  const { accessMode } = useAuthentication()
  if (!rcpcDetailPreview && myAccount.readApi && myAccount.rcpcApi && myAccount.inquiryApi)
    return <HttpDashboardPage read={myAccount.readApi} rcpcs={myAccount.rcpcApi} inquiries={myAccount.inquiryApi}/>
  if (accessMode !== 'preview') return <MyPageLayout><p role="alert">마이페이지 정보를 불러오지 못했습니다.</p></MyPageLayout>
  return <PreviewMypageHomePage rcpcDetailPreview={rcpcDetailPreview}/>
}
function PreviewMypageHomePage({ rcpcDetailPreview }: { rcpcDetailPreview: boolean }) {
  const account = useMyAccount()
  const { rcpcId, id } = useParams()
  const dashboardRcpcs = account.data?.rcpcs ?? []
  const [notice, setNotice] = useState('')
  const inquiry = useInquiryFlow()
  const [params] = useSearchParams()
  const manager = isManagerPreview(`?${params.toString()}`)
  const assignedIds = account.data?.managers.find(isActiveManager)?.assignedRcpcIds ?? []
  const rcpcs = manager ? dashboardRcpcs.filter((item) => assignedIds.includes(item.rcpcId)) : dashboardRcpcs
  const previewRcpcs = rcpcDetailPreview
    ? rcpcs.filter((item) => item.rcpcId === (rcpcId ?? id))
    : rcpcs
  const [activeRcpcPopup, setActiveRcpcPopup] = useState<{ type: string; rcpc: RcpcView } | null>(null)
  const [rebootTarget, setRebootTarget] = useState<RcpcView | null>(null)
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const popupReturnFocusRef = useRef<HTMLButtonElement | null>(null)
  const openRcpcPopup: OpenRcpc = (type, rcpc, trigger) => { popupReturnFocusRef.current = trigger; setActiveRcpcPopup({ type, rcpc }) }
  const openReboot = (rcpc: RcpcView, trigger: HTMLButtonElement) => { popupReturnFocusRef.current = trigger; setRebootTarget(rcpc) }
  const previewRcpc = previewRcpcs[0]
  const closeOtherPopups = () => { setActiveRcpcPopup(null); setRebootTarget(null); setPurchaseOpen(false) }
  const previewInquiry = (step: string) => {
    if (!previewRcpc) return false
    closeOtherPopups()
    inquiry.open([getInquiryRcpc(previewRcpc, manager)], null, step)
  }
  usePublishingPopupPreview({
    ...(!rcpcDetailPreview ? {
      '사양보기': () => { inquiry.close(); closeOtherPopups(); return previewRcpc ? setActiveRcpcPopup({ type: 'spec', rcpc: previewRcpc }) : false },
      'RCPC 별명 설정': () => { inquiry.close(); closeOtherPopups(); return previewRcpc ? setActiveRcpcPopup({ type: 'alias', rcpc: previewRcpc }) : false },
      '기간 연장': () => { inquiry.close(); closeOtherPopups(); return previewRcpc ? setActiveRcpcPopup({ type: 'extension', rcpc: previewRcpc }) : false },
      'RCPC 를 재부팅하시겠습니까?': () => { inquiry.close(); closeOtherPopups(); return previewRcpc ? setRebootTarget(previewRcpc) : false },
      '구매확정': () => { inquiry.close(); closeOtherPopups(); setPurchaseOpen(true) },
    } : {}),
    '문의 유형 선택': () => previewInquiry('select-type'),
    '문의 작성': () => previewInquiry('write'),
    'RCPC 선택 안내': () => { closeOtherPopups(); inquiry.open([]) },
  })
  return (
    <><MyPageLayout manager={manager}><AccountQueryState pending={account.isPending} error={account.error} retry={account.refetch}/>{notice ? <p role="status">{notice}</p> : null}{rcpcDetailPreview && account.data && !previewRcpcs.length ? <p>해당 RCPC를 찾을 수 없습니다.</p> : null}
      <div className={`mypage-home${manager ? ' is-manager' : ''}`}>
        <section className="mypage-home-summary"><div className="mypage-home-user">{rcpcDetailPreview ? <span className="mypage-home-user__device"><img alt="" src={windowIcon} /></span> : <img alt="" src={manager ? userProfileIcon : profileImage} />}<div><strong>{manager ? account.data?.managers.find(isActiveManager)?.name : account.data?.profile.name} <span>✓ {manager ? '담당자' : '대표관리자'}</span></strong><p>{manager ? '관리 RCPC와 이용현황을 확인해 보세요.' : '보유 RCPC와 이용현황을 확인해 보세요.'}</p></div></div>{!manager ? <><Link to="/mypage/points"><span>보유 포인트</span><strong>{account.data?.pointBalance.toLocaleString() ?? 0}<small>점</small></strong></Link><Link to="/mypage/coupons"><span>보유 쿠폰</span><strong>{account.data?.coupons.filter((item) => !item.usedAt).length ?? 0}<small>장</small></strong></Link></> : null}</section>
        <section className="mypage-home-section mypage-home-section--rcpc"><HomeSectionHeading href={withManagerPreview('/mypage/rcpc', manager)} title="즐겨찾기 내역" /><HomeRcpcTable items={previewRcpcs} manager={manager} onInquiry={inquiry.open} onOpenRcpcPopup={openRcpcPopup} onOpenReboot={openReboot} selectable={rcpcDetailPreview} /></section>
        <div className={`mypage-home-columns${manager ? ' is-manager' : ''}`}><div><section><HomeSectionHeading href={manager ? undefined : '/mypage/orders'} title="이용현황" /><HomeUseStatusCard onOpenPurchase={(event) => { popupReturnFocusRef.current = event.currentTarget; setNotice('현재 이용할 수 없습니다.') }} /></section>{!manager ? <section className="mypage-home-storage"><HomeSectionHeading href="/mypage/storage" title="보관함" /><div className="mypage-home-storage__card"><span>결제 대기</span><strong>{account.data?.storage.length ?? 0}<small>대</small></strong></div></section> : null}</div><div><section><HomeSectionHeading href={withManagerPreview('/mypage/inquiries', manager)} title="문의/AS 내역" /><HomeActivityList /></section>{!manager ? <section className="mypage-home-posts"><HomeSectionHeading href="/community/posts" title="내 게시글" /><HomeActivityList community /></section> : null}</div></div>
      </div>
    </MyPageLayout><RcpcSurfaceSwitch activePopup={activeRcpcPopup?.type} onClose={() => setActiveRcpcPopup(null)} rcpc={activeRcpcPopup?.rcpc} returnFocusRef={popupReturnFocusRef} /><RcpcRebootSurface isOpen={Boolean(rebootTarget)} onClose={() => setRebootTarget(null)} onConfirm={() => { setNotice('현재 이용할 수 없습니다.'); setRebootTarget(null) }} rcpc={rebootTarget} returnFocusRef={popupReturnFocusRef} /><OrderPurchaseConfirmDialog isOpen={purchaseOpen} onClose={() => setPurchaseOpen(false)} returnFocusRef={popupReturnFocusRef} /><InquiryFlowDialog {...inquiry.dialogProps} /></>
  )
}
