import type { CSSProperties } from 'react'
import type { Product } from '../domain/products/types'
import { useState } from 'react'
import { useParams } from 'react-router'
import { Footer } from '../components/layout/FooterControl'
import { Header } from '../components/layout/HeaderControl'
import { ProductCard } from '../components/product/ProductCardView'
import { Button } from '../components/ui/ButtonControl'
import { ModalList } from '../components/ui/ModalListControl'
import { Pagination } from '../components/ui/PaginationControl'
import { TextField } from '../components/ui/TextFieldControl'
import { ProductFilter } from './commerce/ProductListView'
import iconArrowUp from '../assets/figma/icon-arrow-up.png'
import iconBubble from '../assets/figma/icon-bubble.png'
import iconCheck from '../assets/figma/icon-check.png'
import iconChevronDown from '../assets/figma/icon-chevron-down.png'
import iconCloseFullscreen from '../assets/figma/icon-close-fullscreen.svg'
import iconEye from '../assets/figma/icon-eye.png'
import iconEyeClosed from '../assets/figma/icon-eye-closed.png'
import iconInstantMix from '../assets/figma/icon-instant-mix.png'
import iconKeep from '../assets/figma/icon-keep.png'
import iconMoreVert from '../assets/figma/icon-more-vert.png'
import iconRestartAlt from '../assets/figma/icon-restart-alt.png'
import iconSearch from '../assets/figma/icon-search.png'
import iconSyncAlt from '../assets/figma/icon-sync-alt.svg'
import iconUser from '../assets/figma/icon-user.png'
import iconWindow from '../assets/figma/icon-window.png'
import iconX from '../assets/figma/icon-x.png'
import iconZoomIn from '../assets/figma/icon-zoom-in.png'
import discoverTuneIcon from '../assets/figma/filter-tune.svg'
import keyboardIcon from '../assets/figma/keyboard.svg'
import keyboardActiveIcon from '../assets/figma/keyboard-active.svg'
import linkOffIcon from '../assets/figma/link-off.svg'
import mouseIcon from '../assets/figma/mouse.svg'
import mouseActiveIcon from '../assets/figma/mouse-active.svg'
import mypageSearchIcon from '../assets/figma/mypage-search.svg'
import shoppingBagIcon from '../assets/figma/shopping-bag.svg'
import flagKorea from '../assets/figma/flag-korea.png'
import iconAdd from '../assets/figma/icon-add.svg'
import iconAttachment from '../assets/figma/icon-attachment.svg'
import iconAttachmentPaperclip from '../assets/figma/icon-attachment-paperclip.svg'
import iconContentCopy from '../assets/figma/icon-content-copy.svg'
import iconDateRange from '../assets/figma/icon-date-range.svg'
import iconDelete from '../assets/figma/icon-delete.svg'
import iconDownload from '../assets/figma/icon-download.svg'
import iconDragIndicator from '../assets/figma/icon-drag-indicator.svg'
import iconFlag from '../assets/figma/icon-flag-2.svg'
import iconLink from '../assets/figma/icon-link.svg'
import iconRemove from '../assets/figma/icon-remove.svg'
import iconTableRows from '../assets/figma/icon-table-rows.svg'
import iconToll from '../assets/figma/icon-toll.svg'
import iconConnectWeb from '../assets/figma/icon-connect-web.svg'
import iconConnectAnydesk from '../assets/figma/icon-connect-anydesk.svg'
import iconConnectTeamviewer from '../assets/figma/icon-connect-teamviewer.svg'
import iconServerOn from '../assets/figma/icon-server-on.svg'
import iconServerOff from '../assets/figma/icon-server-off.svg'
import iconServerDisabled from '../assets/figma/icon-server-disabled.svg'
import iconServerWaiting from '../assets/figma/icon-server-waiting.svg'
import iconUnfoldLess from '../assets/figma/icon-unfold-less.svg'
import chevronLeft from '../assets/figma/chevron-left.svg'
import chevronRight from '../assets/figma/chevron-right.svg'
import reviewStarEmpty from '../assets/figma/review-star-empty.svg'
import reviewStarFilled from '../assets/figma/review-star-filled.svg'
import authCheckboxCheck from '../assets/figma/auth-checkbox-check.svg'
import productListClose from '../assets/figma/product-list-close.svg'
import commentFace from '../assets/figma/comment-face-fill.svg'
import commentMore from '../assets/figma/comment-more-fill.svg'
import cartProductConnected from '../assets/figma/cart-product-connected.png'
import cartProductNormal from '../assets/figma/cart-product-normal.png'
import cartProductPartner from '../assets/figma/cart-product-partner.png'
import paymentJcb from '../assets/figma/payment-jcb.svg'
import paymentKpay from '../assets/figma/payment-kpay.png'
import paymentMastercard from '../assets/figma/payment-mastercard.svg'
import paymentNpay from '../assets/figma/payment-npay.svg'
import paymentVisa from '../assets/figma/payment-visa.svg'
import paymentWechat from '../assets/figma/payment-wechat.svg'
import selectRadioOff from '../assets/figma/select-radio-off.svg'
import selectRadioOn from '../assets/figma/select-radio-on.svg'
import scrapEdit from '../assets/figma/scrap-edit.svg'
import scrapChevronRight from '../assets/figma/scrap-chevron-right.svg'
import scrapEye from '../assets/figma/scrap-eye.svg'
import scrapEyeDisabled from '../assets/figma/scrap-eye-disabled.svg'
import scrapCopy from '../assets/figma/scrap-copy.svg'
import scrapCopyDisabled from '../assets/figma/scrap-copy-disabled.svg'
import communityChevronDown from '../assets/figma/community-chevron-down.svg'
import windowBg1 from '../assets/figma/window-bg-rendered-1.png'
import windowBg2 from '../assets/figma/window-bg-rendered-2.png'
import windowBg3 from '../assets/figma/window-bg-rendered-3.png'
import windowBg4 from '../assets/figma/window-bg-rendered-4.png'
import windowBg5 from '../assets/figma/window-bg-rendered-5.png'
import windowBg6 from '../assets/figma/window-bg-rendered-6.png'
import windowBg7 from '../assets/figma/window-bg-rendered-7.png'
import windowBg8 from '../assets/figma/window-bg-rendered-8.png'
import colorSystemReferenceExport from '../assets/figma/color-system-reference-export.png'

const product: Product = {
  id: 'qa-product-89023', image: cartProductConnected, serverRoom: 'IRC코리아/메가서버실', serverRoomProvider: 'IRC코리아', available: true, serverState: 'online', mouseIncluded: true, keyboardIncluded: true, peripherals: ['mouse', 'keyboard'],
  productId: '89023', title: null, description: null, billingUnit: 'thirty_day', pricingType: 'rental', saleAvailability: null, pointRate: 1,
  unitPrice: null, minPurchaseQuantity: null, maxPurchaseQuantity: null, minRentalUnits: 1, maxRentalUnits: 3, refundPolicy: null,
  os: 'Microsoft Windows 10 Pro (64Bit)',
  cpu: 'AMD Ryzen 3 2200G with Radeon Vega Graphics 4 Cores',
  ram: 'DDR3/6G',
  disk: 'SSD/120G',
  gpu: 'GeForce GTX 1650 (4GB)',
  country: 'Korea',
  ip: '061.07*.0**.***',
  setupFee: 5000,
  monthlyPrice: 833000,
}

const modalProduct = {
  ...product,
  ram: 'DDR3 128G',
  disk: 'SSD 120GB',
  gpu: 'NVIDIA GeForce GT 720 (2GB)ŽIntel(R) HD Graphics 4600 (1GB) (2 GB)',
}

const solidGroups: [string, string[], string, string[]?][] = [
  ['Brand/Primary', ['#fff', '#ffe9e9', '#fff', '#fff', '#c30027', '#fff', '#fff', '#fff', '#fff', '#fff'], 'primary'],
  ['Gray', ['#fafafa', '#f5f5f5', '#eee', '#e0e0e0', '#bdbdbd', '#9e9e9e', '#757575', '#616161', '#424242', '#212121'], 'gray', ['gray-50', 'gray-1', 'gray-2', 'gray-3', 'gray-4', 'gray-5', 'gray-6', 'gray-7', 'gray-8', 'gray-9']],
  ['Dark Blue', ['#e8f1fc', '#c7ddfb', '#9bc2f8', '#6ca6f4', '#408bf1', '#1671ee', '#1360ca', '#1050a9', '#0d4088'], 'Dark Blue'],
]

const alphaSourceXs = [238, 419, 599, 780, 961, 1142, 1322, 1503, 1684]
const alphaSourceScaleX = 220 / 171
const alphaSourceScaleY = 120 / 94

function getAlphaSwatchStyle(index: number, sourceY: number): CSSProperties {
  return {
    backgroundImage: `url(${colorSystemReferenceExport})`,
    backgroundPosition: `${-(alphaSourceXs[index] * alphaSourceScaleX)}px ${-(sourceY * alphaSourceScaleY)}px`,
    backgroundSize: `${2281 * alphaSourceScaleX}px ${4096 * alphaSourceScaleY}px`,
  }
}

function SwatchRow({ alpha = false, colors, label, labels, prefix, sourceY = 0 }: { alpha?: boolean; colors: readonly (string | number)[]; label: string; labels?: readonly string[]; prefix: string; sourceY?: number }) {
  return <section className={`vqa-swatch-group${alpha ? ' vqa-swatch-group--alpha' : ''}`}><h3>{label}</h3><div>{colors.map((color, index) => <figure key={`${prefix}-${index}`}><span style={alpha ? getAlphaSwatchStyle(index, sourceY) : { backgroundColor: typeof color === 'string' ? color : undefined }} /><figcaption>{labels?.[index] ?? `${prefix}-${index + 1}`}</figcaption></figure>)}</div></section>
}

function ColorSystemPreview() {
  const alphas = Array.from({ length: 9 }, (_, index) => 0.9 - (index * 0.1))
  const alphaLabels = alphas.map((alpha) => `${Math.round(alpha * 100)}%`)
  return <main className="vqa-color-system"><h1><span aria-hidden="true" className="vqa-color-system__palette" style={{ backgroundImage: `url(${colorSystemReferenceExport})` }} /><span>Colors</span></h1><section className="vqa-color-swatches"><h2>Color Swatches</h2><div>{[['black', '#121212'], ['white', '#fff'], ['error', '#d7373f'], ['green', '#12b839']].map(([name, color]) => <figure key={name}><span style={{ backgroundColor: typeof color === 'string' ? color : undefined }} /><figcaption>{name}</figcaption></figure>)}</div></section><section className="vqa-solids"><h2 className="vqa-section-title">Solids</h2><div>{solidGroups.map(([label, colors, prefix, labels]) => <SwatchRow colors={colors} key={label} label={label} labels={labels} prefix={prefix} />)}</div></section><section className="vqa-alpha"><h2 className="vqa-section-title">Alpha</h2><div><SwatchRow alpha colors={alphas} label="White" labels={alphaLabels.map((value) => `white/${value}`)} prefix="white" sourceY={2233} /><SwatchRow alpha colors={alphas} label="Black" labels={alphaLabels.map((value) => `black/${value}`)} prefix="black" sourceY={2548} /></div></section></main>
}

function ButtonsPreview() {
  return <div className="vqa-component-canvas vqa-buttons"><Button icon="chevron-right" size="large" variant="outline">outline</Button><Button icon="chevron-right" size="large" variant="secondary">secondary</Button><Button icon="chevron-right" size="large">primary</Button><Button disabled icon="chevron-right" size="large">disabled</Button></div>
}

function InputsPreview() {
  return <div className="vqa-component-canvas vqa-inputs"><TextField helperText="info" placeholder="placeholder" trailingIcon="eye" /><TextField defaultValue="placeholder" helperText="info" trailingIcon="eye" /><TextField disabled helperText="info" placeholder="placeholder" trailingIcon="eye" /></div>
}

function PaginationPreview() {
  const [currentPage, setCurrentPage] = useState(1)
  return <div className="vqa-pagination"><Pagination currentPage={currentPage} onPageChange={setCurrentPage} totalPages={68} /></div>
}

function LargeProductCardPreview() {
  const [addedProductId, setAddedProductId] = useState<string | null>(null)
  return <><ProductCard onAddToCart={(selectedProduct) => setAddedProductId(selectedProduct.productId)} product={{ ...product, mouseIncluded: false }} size="large" /><p aria-live="polite" className="sr-only">{addedProductId ? `상품 ${addedProductId} 장바구니 추가됨` : ''}</p></>
}

function IconsPreview({ standalone = false }: { standalone?: boolean }) {
  const icons: [string, number, number][] = [
    [chevronRight,35,37],[chevronLeft,71,37],[iconZoomIn,107,37],[iconKeep,143,37],[iconEye,179,37],[iconEyeClosed,215,37],[iconUser,251,37],[iconCheck,287,37],[iconChevronDown,323,37],[iconContentCopy,359,37],[iconX,395,37],[iconSearch,431,37],[iconBubble,467,37],[iconAttachment,503,37],[iconDownload,539,37],[iconMoreVert,575,37],[iconFlag,611,37],[iconToll,647,37],
    [iconDateRange,35,83],[iconArrowUp,71,83],[iconInstantMix,107,83],[iconRestartAlt,143,83],[iconWindow,179,83],[iconTableRows,215,83],[iconAttachmentPaperclip,251,83],[iconDelete,287,83],[shoppingBagIcon,323,83],[iconDragIndicator,359,83],[discoverTuneIcon,395,83],[iconRemove,431,83],[iconAdd,467,83],[iconLink,503,83],[linkOffIcon,539,83],[mouseIcon,575,80],[keyboardIcon,612,80],[iconCloseFullscreen,647,78],
    [iconSyncAlt,35,125]
  ]
  return <div className={`vqa-icons${standalone ? ' vqa-icons--standalone' : ''}`}><div className="vqa-icons__board"><div className="vqa-icons__glyphs">{icons.map(([source,left,top], index) => <span className="vqa-icons__glyph" key={`${source}-${index}`} style={{ left, top }}><img alt="" src={source} /></span>)}</div><div className="vqa-icons__variants"><span className="vqa-icons__connect"><img alt="" src={iconConnectWeb} /><img alt="" src={iconConnectAnydesk} /><img alt="" src={iconConnectTeamviewer} /></span><span className="vqa-icons__links"><i className="is-on"><img alt="" src={iconServerOn} /></i><i className="is-off"><img alt="" src={iconServerOff} /></i><i className="is-disabled"><img alt="" src={iconServerDisabled} /></i><i className="is-waiting"><img alt="" src={iconServerWaiting} /></i></span><span className="vqa-icons__stars"><i><img alt="" src={reviewStarFilled} /></i><i><img alt="" src={reviewStarEmpty} /></i></span><span className="vqa-icons__server"><img alt="" src={iconUnfoldLess} /></span><span className="vqa-icons__flag"><img alt="대한민국" src={flagKorea} /></span><span className="vqa-icons__mouse"><i><img alt="" src={mouseIcon} /></i><i><img alt="" src={mouseActiveIcon} /></i></span><span className="vqa-icons__keyboard"><i><img alt="" src={keyboardIcon} /></i><i><img alt="" src={keyboardActiveIcon} /></i></span></div></div></div>
}

function ModalListPreview() {
  const [checked, setChecked] = useState(true)
  return <div className="vqa-component-canvas vqa-modal-list"><ModalList checked={checked} onCheckedChange={setChecked} product={modalProduct} /><ModalList product={modalProduct} status="처리중" type="inquiry-product" /><ModalList product={modalProduct} type="summary" /><ModalList product={modalProduct} type="extension" /></div>
}

function LibraryAtomsPreview() {
  const checkboxStates = ['off', 'on', 'mixed', 'disabled']
  return <>
    <div className="vqa-library-button-m"><button className="is-on" type="button">Text</button><button className="is-off" type="button">Text</button><button className="is-disabled" disabled type="button">Text</button><span className="vqa-library-button-m__stroke"><span className="vqa-library-tooltip">◉ Text</span><button type="button">Text</button></span></div>
    <div className="vqa-library-button-s"><button className="is-on" type="button">Text</button><button className="is-off" type="button">Text</button><button className="is-disabled" disabled type="button">Text</button></div>
    <div className="vqa-library-checkbox-s">{checkboxStates.map((state) => <span className={`is-${state}`} key={state} />)}</div>
    <div className="vqa-library-checkbox-m">{checkboxStates.map((state) => <span className={`is-${state}`} key={state} />)}</div>
    <div className="vqa-library-radio"><span /><span className="is-on" /></div>
    <div className="vqa-library-switch-m"><span className="is-on" /><span /></div>
    <div className="vqa-library-switch-s"><span className="is-on" /><span /></div>
    <div className="vqa-library-count"><button aria-label="수량 줄이기" type="button">−</button><strong>1</strong><button aria-label="수량 늘리기" type="button">＋</button></div>
    <div className="vqa-library-tags"><span className="tag--blue">Tag</span><span className="tag--gray">Tag</span><span className="tag--red">Tag</span><span className="tag--white">Tag</span></div>
  </>
}

function ReviewStars() {
  return <span aria-label="별점 5점 만점에 4점" className="vqa-review-stars">{[0, 1, 2, 3, 4].map((index) => <img alt="" key={index} src={index < 4 ? reviewStarFilled : reviewStarEmpty} />)}</span>
}

function LibraryWidePatternsPreview() {
  return <>
    <div className="vqa-library-compact-list"><div><span>default</span><span className="vqa-library-document-count">2</span><time>2026.07.22</time></div><div><span>RCPC를 약 6개월간 사용하면서 느낀 점을 공유합니다. 초기 설정이 직관적...</span><ReviewStars /></div></div>
    <div className="vqa-library-shop-list"><div className="vqa-library-shop-row"><span className="muted">210</span><span className="own">내 글</span><strong>default</strong><img alt="첨부파일" className="vqa-library-attachment" src={iconAttachment} /><span className="muted">comview0720 | 조회 21 | <img alt="댓글" className="vqa-library-bubble" src={iconBubble} /> 2</span><time>2026.07.22</time></div><div className="vqa-library-shop-review"><div><span className="muted">210</span><span className="own">내 후기</span><ReviewStars /><span className="muted author">comview0720 | 조회 21 | 2026.07.22</span></div><p><strong>품번 89023</strong><small>IRC코리아/메가서버실</small></p><p>RCPC를 약 6개월간 사용하면서 느낀 점을 공유합니다. 초기 설정이 직관적이어서 별도 교육 없이도 빠르게 적응할 수 있었습니다. 원격 접속 속도가 안정적이고, 파일 전송 기능도 대용량 자료를 다룰 때 매우 유용했습니다. 특히 다중 모니터 환경에서도 화면 전환이 매끄러워 업무 효율이 크게 향상되었습니다.</p></div></div>
    <div className="vqa-library-comments"><article><header><span className="vqa-library-avatar"><img alt="" src={commentFace} /></span><strong>user0721</strong><time>2026.07.14 15:12</time><small>수정됨</small><img alt="더보기" className="vqa-library-more" src={commentMore} /></header><p>저도 비슷했는데, 인터넷 속도 자체는 정상이어도 순간적으로 패킷 손실이 생기면 원격 접속이 끊기는 경우가 있었습니다. 공유기 펌웨어 업데이트, 5GHz 와이파이 사용 여부, 백그라운드 다운로드 프로그램 실행 여부를 같이 확인해보면 좋을 것 같아요. 특히 회사나 공용 네트워크에서는 방화벽이나 보안 프로그램이 원격 접속을 제한하는 경우도 있어서, 가능하면 다른 네트워크 환경에서도 한 번 테스트해보시는 걸 추천드립니다.</p></article><article className="is-product"><header><span className="vqa-library-avatar"><img alt="" src={commentFace} /></span><span><strong>user0721</strong><span className="vqa-library-product-meta"><ReviewStars /><time>2026.07.14 15:12</time><small>수정됨</small></span></span><img alt="더보기" className="vqa-library-more" src={commentMore} /></header><p>저도 비슷했는데, 인터넷 속도 자체는 정상이어도 순간적으로 패킷 손실이 생기면 원격 접속이 끊기는 경우가 있었습니다. 공유기 펌웨어 업데이트, 5GHz 와이파이 사용 여부, 백그라운드 다운로드 프로그램 실행 여부를 같이 확인해보면 좋을 것 같아요. 특히 회사나 공용 네트워크에서는 방화벽이나 보안 프로그램이 원격 접속을 제한하는 경우도 있어서, 가능하면 다른 네트워크 환경에서도 한 번 테스트해보시는 걸 추천드립니다.</p></article></div>
    <div className="vqa-library-notices"><div><span className="vqa-library-notice-pin"><img alt="고정" src={iconKeep} /></span><strong>컴퓨터원격렌탈 서비스 이용 안내</strong><img alt="첨부파일" className="vqa-library-attachment" src={iconAttachment} /><time>2026.07.22</time></div><div><span>207</span><strong>컴퓨터원격렌탈 서비스 이용 안내</strong><img alt="첨부파일" className="vqa-library-attachment" src={iconAttachment} /><time>2026.07.22</time></div></div>
    <div className="vqa-library-product-row"><span>99999</span><span>Microsoft Windows 10 Pro (64Bit)</span><span>AMD Ryzen 3 2200G with Radeon Vega Graphics 4</span><span className="tag--blue">DDR3/6G</span><span className="tag--gray">SSD/120G</span><span className="tag--red">GeForce GTX 1650 (4GB)</span><span className="vqa-product-row-devices"><img alt="" src={mouseIcon} /><img alt="" src={keyboardIcon} /></span><span className="vqa-product-row-country"><span><img alt="" src={flagKorea} />Korea</span><small>061.07*.0**.***</small></span><span className="vqa-product-row-server"><img alt="" src={iconServerOn} /></span><span>3,000원</span><strong>833,000원</strong><button aria-label="장바구니 담기" type="button"><img alt="" src={shoppingBagIcon} /></button></div>
  </>
}

function ScrapTitleAction({ nickname }: { nickname: boolean }) {
  return <span className="vqa-scrap-title-action">{nickname ? <>별명설정<img alt="" src={scrapChevronRight} /></> : <img alt="별명 편집" src={scrapEdit} />}</span>
}

function MobileScrapCard({ disabled = false, nickname = false }: { disabled?: boolean; nickname?: boolean }) {
  const eyeIcon = disabled ? scrapEyeDisabled : scrapEye
  const copyIcon = disabled ? scrapCopyDisabled : scrapCopy
  return <article className={`vqa-library-mobile-scrap-card${disabled ? ' is-disabled' : ''}`}>
    <header>
      <span className="vqa-mobile-title"><span className="vqa-mobile-checkbox" /><img alt="" className="vqa-mobile-icon" src={reviewStarFilled} /><strong>{nickname ? '89023' : '게임용'}</strong><ScrapTitleAction nickname={nickname} /></span>
      <a href="#mobile-spec">{nickname ? '사양보기' : '89023 사양보기'}</a>
    </header>
    <dl>
      <div><dt>서버실</dt><dd>IRC코리아 메가서버실</dd></div>
      <div><dt>서버 상태</dt><dd className={disabled ? 'ended' : 'waiting'}><img alt="" className="vqa-mobile-icon vqa-mobile-icon--status" src={disabled ? iconServerDisabled : iconServerOff} />{disabled ? '종료' : '연장대기'}</dd></div>
      <div><dt>이용 기간</dt><dd><strong>21일 남음</strong><small>2026-07-31 17:25:23 까지</small></dd></div>
      <div><dt>접속 정보</dt><dd className="vqa-mobile-connect"><span><b><img alt="" className="vqa-mobile-icon vqa-mobile-icon--connect" src={iconConnectWeb} /><span>WAN IP</span></b><small>221.144.195.6 KR</small></span><span><b><img alt="" className="vqa-mobile-icon vqa-mobile-icon--connect" src={iconConnectTeamviewer} /><span>TeamViewer</span></b><small>ID 1814706368 <img alt="" className="vqa-mobile-icon vqa-scrap-copy" src={copyIcon} /></small></span><span className="vqa-mobile-password"><small>PW ******</small><img alt="" className="vqa-mobile-icon" src={eyeIcon} /><img alt="" className="vqa-mobile-icon vqa-scrap-copy" src={copyIcon} /></span></dd></div>
      <div><dt>트래픽사용량</dt><dd>250GB</dd></div>
    </dl>
    <footer><button disabled={disabled} type="button">재부팅</button><button type="button">문의</button><button className="extend" disabled={disabled} type="button">기간연장</button></footer>
  </article>
}

function DesktopScrapRow({ disabled = false, nickname = false }: { disabled?: boolean; nickname?: boolean }) {
  const eyeIcon = disabled ? scrapEyeDisabled : scrapEye
  const copyIcon = disabled ? scrapCopyDisabled : scrapCopy
  return <article className={`vqa-desktop-scrap-row${disabled ? ' is-disabled' : ''}`}>
    <span className="vqa-desktop-checkbox" />
    <span className="vqa-desktop-scrap-title"><b><img alt="" src={reviewStarFilled} />{nickname ? '89023' : '게임용'}<ScrapTitleAction nickname={nickname} /></b><small className="vqa-desktop-scrap-spec">{nickname ? null : '89023 '}<u>사양보기</u></small></span>
    <span className="vqa-desktop-scrap-room">IRC코리아<br />메가서버실</span>
    <span className="vqa-desktop-scrap-status"><img alt="" src={disabled ? iconServerDisabled : iconServerOff} />{disabled ? '종료' : '연장대기'}</span>
    <time>{disabled ? '이용종료' : '21일 남음'}<small>2026-07-31<br />17:25:23 까지</small></time>
    <span className="vqa-desktop-scrap-connect"><span><b><img alt="" src={iconConnectWeb} />WAN IP</b><small>221.144.195.6 KR</small></span><span><b><img alt="" src={disabled ? iconConnectTeamviewer : iconConnectAnydesk} />{disabled ? 'TeamViewer' : 'AnyDesk'}</b><small>ID 1814706368 <img alt="" className="vqa-scrap-copy" src={copyIcon} /></small></span><span className="vqa-desktop-scrap-password">PW ****** <img alt="" src={eyeIcon} /><img alt="" className="vqa-scrap-copy" src={copyIcon} /></span></span>
    <span className="vqa-desktop-scrap-traffic">250GB</span>
    <span className="vqa-desktop-scrap-actions"><span><button disabled={disabled} type="button">재부팅</button><button className={disabled ? 'active' : ''} type="button">문의</button></span><button className="extend" disabled={disabled} type="button">기간연장</button></span>
  </article>
}

function CombarHeaderPreview({ admin = false }: { admin?: boolean }) {
  return <div className="vqa-combar-header">
    <span className="vqa-combar-brand"><strong>Com<span>Bar</span></strong>{admin && <b>관리자</b>}<small>v2.4.0</small></span>
    <nav className="vqa-combar-menu">
      <span><img alt="" src={iconTableRows} /><em>문의내역</em></span>
      <span><img alt="" src={iconBubble} /><em>채팅문의</em></span>
      <span><img alt="" src={iconCloseFullscreen} /><em>최소화</em></span>
    </nav>
    <span className="vqa-combar-close"><img alt="" src={iconX} /></span>
  </div>
}

function ProductListCount({ unit }: { unit: string }) {
  return <span className="vqa-product-list-count"><span className="vqa-product-list-count__control"><button aria-label="수량 줄이기" type="button"><img alt="" src={iconRemove} /></button><strong>1</strong><button aria-label="수량 늘리기" type="button"><img alt="" src={iconAdd} /></button></span><span>{unit}</span></span>
}

function ProductListPattern({ variant }: { variant: 'cart' | 'order' | 'part-cart' | 'part-order' }) {
  const isCart = variant === 'cart'
  const isOrder = variant === 'order'
  const isPartCart = variant === 'part-cart'
  const isPartOrder = variant === 'part-order'
  const isPart = isPartCart || isPartOrder
  const hasCartControl = isCart || isPartCart
  const image = isCart ? cartProductNormal : isPart ? cartProductPartner : cartProductConnected
  return <article className={`is-${variant}`}>
    <header>
      <span className="vqa-product-list-title">{hasCartControl ? <span className="vqa-product-list-checkbox"><img alt="" src={authCheckboxCheck} /></span> : null}<strong>{isPart ? '파트상품이름' : '품번 89023'}</strong>{isPart ? null : <span>IRC코리아/메가서버실</span>}</span>
      {hasCartControl ? <button aria-label="상품 삭제" className="vqa-product-list-close" type="button"><img alt="" src={productListClose} /></button> : null}
    </header>
    <div className="vqa-product-list-main">
      <img alt="Windows 11" className="vqa-product-list-image" src={image} />
      <section>
        {!isPartCart ? <div className="vqa-product-list-available"><img alt="" src={iconServerOn} /><strong>구매 즉시 접속 가능합니다.</strong></div> : null}
        <p>Microsoft Windows 10 Pro (64Bit) / AMD Ryzen 3 2200G with Radeon Vega Graphics 4 Cores / DDR3 128G / SSD 120GB / NVIDIA GeForce GT 720 (2GB)ŽIntel(R) HD Graphics 4600 (1GB) (2 GB)</p>
        {isCart ? <dl><div><dt>세팅비</dt><dd>5,000원</dd></div><div><dt>월 렌탈료</dt><dd>32,000원</dd></div></dl> : null}
        {hasCartControl ? <div className="vqa-product-list-purchase"><ProductListCount unit={isPartCart ? '개' : '개월'} /><span className="vqa-product-list-price">{isCart ? <small>포인트 적립 <em>370점</em></small> : null}<strong>{isPartCart ? '120,000원' : '37,000원'}</strong></span></div> : null}
      </section>
    </div>
    {isOrder ? <footer className="vqa-product-list-summary"><span><small>세팅비</small> 5,000원 <i /><small>월 렌탈료</small> 32,000원 <i /><small>이용기간</small> 1일</span><strong><span><img alt="" src={iconToll} />370점 적립</span> 37,000원</strong></footer> : null}
    {isPartOrder ? <footer className="vqa-product-list-summary"><span><small>상품금액</small> 120,000원 <i /><small>수량</small> 1원</span><strong>37,000원</strong></footer> : null}
  </article>
}

function LibraryCommercePatternsPreview() {
  return <>
    <div className="vqa-library-cart-patterns"><ProductListPattern variant="cart" /><ProductListPattern variant="order" /><ProductListPattern variant="part-cart" /><ProductListPattern variant="part-order" /></div>
    <div className="vqa-library-scrap-list"><DesktopScrapRow /><DesktopScrapRow disabled /></div>
    <div className="vqa-library-scrap-nickname"><DesktopScrapRow nickname /></div>
    <div className="vqa-library-mobile-scrap-list"><MobileScrapCard /><MobileScrapCard disabled /><MobileScrapCard nickname /></div>
    <div className="vqa-library-server-state-samples"><span className="is-connected"><img alt="" src={iconServerOn} />이용중</span><span className="is-waiting"><img alt="" src={iconServerWaiting} />이용대기</span><span className="is-disconnected"><img alt="" src={iconServerOff} />연장대기</span><span className="is-disabled"><img alt="" src={iconServerDisabled} />서버종료</span></div>
    <div className="vqa-library-order-state-samples"><span>결제완료</span><span>입금대기</span><span className="is-refund">환불접수</span><span>취소완료</span><span>환불완료</span></div>
    <div className="vqa-library-order-item"><header><span className="vqa-order-item-heading"><span className="vqa-order-item-checkbox" /><strong>결제완료</strong><span>20260701123456789</span></span><a href="#order-detail">주문상세</a></header><div><img alt="Windows 11" src={cartProductConnected} /><section><h3><span>품번 <b>89023</b></span><small>IRC코리아/메가서버실</small><em><img alt="" src={iconServerOn} />이용중</em></h3><p className="vqa-order-item-spec">Microsoft Windows 10 Pro (64Bit) / AMD Ryzen 3 2200G with Radeon Vega Graphics 4 Cores / DDR3 128G / SSD 120GB / NVIDIA GeForce GT 720 (2GB)ŽIntel(R) HD Graphics 4600 (1GB) (2 GB)</p><p className="vqa-order-item-period"><img alt="" src={iconDateRange} />2026.07.01~2026.07.31</p><p className="vqa-order-item-totals"><span>최종 결제금액 <strong>70,000원</strong></span><i /><span>할인금액 <strong>2,000원</strong></span><i /><span>포인트 적립 <strong>0점</strong></span></p></section></div><strong className="confirmed">구매확정 (자동 구매확정일: 2026.07.21)</strong><footer><button>기간 연장</button><button>후기 작성</button><button>해지신청</button><button>문의</button></footer></div>
    <div className="vqa-library-combar-modal-list"><CombarModalMessage /><CombarModalMessage expanded /></div>
    <div className="vqa-library-window-backgrounds">{[windowBg1, windowBg2, windowBg3, windowBg4, windowBg5, windowBg6, windowBg7, windowBg8].map((background) => <span key={background}><img alt="Windows 11" src={background} /></span>)}</div>
  </>
}

function LibraryFormPatternsPreview() {
  return <>
    <div className="vqa-library-select-fields"><div className="is-default">select <b><img alt="" className="vqa-select-field-icon" src={iconChevronDown} /></b></div><div className="is-discount">select <em>- 3,000원</em><b><img alt="" className="vqa-select-field-icon" src={iconChevronDown} /></b></div><div className="is-disabled">select <b><img alt="" className="vqa-select-field-icon" src={iconChevronDown} /></b></div></div>
    <div className="vqa-library-small-tabs"><span className="is-on">Text 20</span><span>Text 20</span></div>
    <div className="vqa-library-file-items"><div>P-1784685075226-Czc8YYD.png <span>3mb</span><b><img alt="" className="vqa-file-item-icon" src={iconX} /></b></div><div>P-1784685075226-Czc8YYD.png <span>3mb</span><b><img alt="" className="vqa-file-item-icon" src={iconDownload} /></b></div></div>
    <div className="vqa-library-select-panels"><div><span className="vqa-select-panel-checkbox" />menu <b><img alt="" className="vqa-select-panel-icon" src={iconArrowUp} /></b></div><div><span className="vqa-select-panel-checkbox" />menu <b><img alt="" className="vqa-select-panel-icon" src={iconChevronDown} /></b></div></div>
    <div className="vqa-library-input-boxes"><div className="is-off"><span>Text</span><b>btn</b></div><div className="is-on"><span>Text</span><b>btn</b></div><div className="is-filled"><span>Text</span><b>btn</b></div></div>
    <div className="vqa-library-wide-tabs"><div>Text <em>1</em></div><div className="is-on">Text <em>1</em></div></div>
  </>
}

const combarAnswer = '교체 비용 확인 후 안내드리겠습니다.'.repeat(5)

function CombarModalMessage({ expanded = false }: { expanded?: boolean }) {
  return <article className={expanded ? 'is-spread' : 'is-fold'}>
    <header><span>[{expanded ? '기타 문의' : 'AS·점검 요청'}] <strong>게임용_89023</strong></span><time>10분 전</time></header>
    <div className="vqa-combar-message">
      <div className="vqa-combar-message__copy"><p>서버실 답변</p><p className="vqa-combar-message__answer">안녕하세요.<br />{combarAnswer}</p></div>
      <button type="button">{expanded ? '접기' : '전체보기'}<img alt="" className={expanded ? 'is-up' : ''} src={communityChevronDown} /></button>
    </div>
  </article>
}

function SelectRadio({ selected = false }: { selected?: boolean }) {
  return <img alt="" className="vqa-select-radio" src={selected ? selectRadioOn : selectRadioOff} />
}

function PaymentLogos({ extended = false }: { extended?: boolean }) {
  return <><span className="vqa-payment-logos"><img alt="Mastercard" src={paymentMastercard} /><img alt="VISA" src={paymentVisa} /><img alt="WeChat Pay" src={paymentWechat} /><img alt="JCB" src={paymentJcb} /></span>{extended ? <span className="vqa-payment-logos-extra"><img alt="N Pay" src={paymentNpay} /><img alt="Kakao Pay" src={paymentKpay} /></span> : null}</>
}

function LibrarySelectionPatternsPreview() {
  return <>
    <div className="vqa-library-select-large"><div><SelectRadio /><span><strong>Text</strong><small>Sub Text</small></span></div><div className="is-on"><SelectRadio selected /><span><strong>Text</strong><small>Sub Text</small></span></div></div>
    <div className="vqa-library-select-medium"><div><SelectRadio /><strong>Text</strong><PaymentLogos /></div><div className="is-on"><SelectRadio selected /><strong>Text</strong><PaymentLogos /></div><div className="vqa-library-select-medium__extra"><SelectRadio /><strong>Text</strong><PaymentLogos extended /></div></div>
    <div className="vqa-library-select-small"><span>Text</span><span className="is-on">Text</span></div>
    <div className="vqa-library-menu"><span>menu</span><span>menu</span></div>
    <div className="vqa-library-snackbar">후기가 삭제되었습니다.</div>
    <div className="vqa-library-table-cells"><div>Text <img alt="" className="vqa-table-align-icon" src={iconUnfoldLess} /></div><div>Text <img alt="" className="vqa-table-align-icon" src={iconUnfoldLess} /></div></div>
    <div className="vqa-library-filter-menu"><div><span className="vqa-filter-menu-checkbox" /><strong>menu <em>1</em></strong><img alt="" src={iconArrowUp} /></div><div><span className="vqa-filter-menu-checkbox" /><strong>menu <em>1</em></strong><img alt="" src={iconChevronDown} /></div></div>
    <div className="vqa-library-scrap-menu"><div><span><em>L</em> 발산</span><b>1</b></div><div className="is-focus"><span><em>L</em> 발산</span><b>1</b></div><div><span><em>L</em> 발산</span><b><img alt="" className="vqa-scrap-menu-icon" src={iconDelete} /><img alt="" className="vqa-scrap-menu-icon" src={iconDragIndicator} /></b></div></div>
    <aside className="vqa-library-mypage-menu"><strong>MYPAGE</strong><label>품번 검색 <img alt="" src={mypageSearchIcon} /></label><section><h2>RCPC 관리</h2><span>이용 RCPC</span><span>즐겨찾기 그룹</span></section><section><h2>주문내역</h2></section><section><h2>보관함</h2></section><section><h2>혜택 관리</h2><span>포인트</span><span>쿠폰</span></section><section><h2>문의 관리</h2></section><section><h2>RCPC 담당자 관리</h2></section><section><h2>내 정보 수정</h2></section></aside>
  </>
}

function ComponentsCanvasPreview() {
  return <main className="vqa-library-canvas"><div className="vqa-library-icons"><IconsPreview /></div><div className="vqa-library-buttons"><ButtonsPreview /></div><LibraryAtomsPreview /><LibraryWidePatternsPreview /><LibraryCommercePatternsPreview /><LibraryFormPatternsPreview /><LibrarySelectionPatternsPreview /><p className="vqa-library-point-label">포인트 적립</p><div className="vqa-library-header"><Header state="main" /><Header state="sub" /></div><div className="vqa-library-combar-headers"><CombarHeaderPreview /><CombarHeaderPreview admin /></div><div className="vqa-library-footer"><Footer /></div><div className="vqa-library-filter"><div className="vqa-library-filter__open"><ProductFilter onClose={() => {}} variant="component-library" /></div><button aria-label="상세 필터 열기" className="product-filter-trigger vqa-library-filter__closed" type="button"><span aria-hidden="true">›</span></button></div><div className="vqa-library-inputs"><InputsPreview /></div><div className="vqa-library-pagination"><Pagination currentPage={1} totalPages={68} /></div><div className="vqa-library-medium"><ProductCard product={product} /></div><div className="vqa-library-large"><ProductCard product={product} size="large" /></div><div className="vqa-library-modal"><ModalListPreview /></div></main>
}

export function VisualQaTargetPage() {
  const { targetId } = useParams()
  if (targetId === 'foundation.color-system') return <ColorSystemPreview />
  if (targetId === 'foundation.components') return <ComponentsCanvasPreview />
  if (targetId === 'component.header') return <div className="vqa-component-canvas vqa-header"><Header state="main" /><Header state="sub" /></div>
  if (targetId === 'component.footer') return <Footer />
  if (targetId === 'component.product-card-medium') return <div className="vqa-medium-card"><ProductCard product={product} /></div>
  if (targetId === 'component.product-card-large') return <LargeProductCardPreview />
  if (targetId === 'component.buttons') return <ButtonsPreview />
  if (targetId === 'component.icons') return <IconsPreview standalone />
  if (targetId === 'component.inputs') return <InputsPreview />
  if (targetId === 'component.pagination') return <PaginationPreview />
  if (targetId === 'component.modal-list') return <ModalListPreview />
  return <p>Unknown visual QA target: {targetId}</p>
}
