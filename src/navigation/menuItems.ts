export interface MenuItem { id: string; label: string; href: string; disabled?: boolean }
export interface MyPageMenuGroup { id: string; label: string; href?: string; opensPasswordGate?: boolean; disabled?: boolean; items: MenuItem[] }
export const menuItems: readonly MenuItem[] = [
  { id: 'rcpc-products', label: 'RCPC상품', href: '/products' },
  { id: 'rcpc-room', label: 'RCPC방', href: '/products?category=rcpc_room' },
  { id: 'zen-server', label: '젠서버', href: '/products?category=zen_server' },
  { id: 'parts', label: '파트상품', href: '/products?category=parts' },
  { id: 'community', label: '커뮤니티', href: '/community/posts' },
]

export const utilityMenuItems: readonly MenuItem[] = [
  { id: 'cart', label: '장바구니', href: '/cart' },
  { id: 'login', label: '로그인', href: '/login' },
  { id: 'signup', label: '회원가입', href: '/signup/terms' },
]

export const footerMenuItems: readonly MenuItem[] = [
  { id: 'company', label: '회사소개', href: '/company' },
  { id: 'colocation', label: '입점신청', href: '/colocation/apply' },
  { id: 'support', label: '고객센터', href: '/support' },
]

export const communityMenuItems: readonly MenuItem[] = [
  { id: 'community-posts', label: '커뮤니티', href: '/community/posts' },
  { id: 'rental-reviews', label: '렌탈 후기', href: '/community/reviews' },
  { id: 'support', label: '고객센터', href: '/support' },
]

export const mypageMenu: readonly MyPageMenuGroup[] = [
  { id: 'rcpc', label: 'RCPC 관리', items: [{ id: 'rcpc-list', label: '이용 RCPC', href: '/mypage/rcpc' }, { id: 'favorites', label: '즐겨찾기 그룹', href: '/mypage/favorites' }] },
  { id: 'orders', label: '주문내역', href: '/mypage/orders', items: [] },
  { id: 'storage', label: '보관함', href: '/mypage/storage', items: [] },
  { id: 'benefits', label: '혜택 관리', items: [{ id: 'points', label: '포인트', href: '/mypage/points' }, { id: 'coupons', label: '쿠폰', href: '/mypage/coupons' }] },
  { id: 'support', label: '문의 관리', href: '/mypage/inquiries', items: [] },
  { id: 'managers', label: 'RCPC 담당자 관리', href: '/mypage/managers', items: [] },
  { id: 'profile', label: '내 정보 수정', href: '/mypage/profile', opensPasswordGate: true, items: [] },
]

export const mypageManagerMenu = mypageMenu.map((group) => ({
  ...group,
  disabled: ['storage', 'benefits', 'managers', 'profile'].includes(group.id),
  items: group.items.map((item) => ({ ...item, disabled: group.id === 'benefits' })),
}))
