export function profileCancelPath(state: unknown): string {
  const returnTo = state && typeof state === 'object' && 'returnTo' in state ? state.returnTo : undefined
  if (typeof returnTo !== 'string' || !returnTo.startsWith('/mypage') || /[\\\u0000-\u0020]/.test(returnTo)) return '/mypage'
  const target = new URL(returnTo, 'https://comviewers.invalid')
  if (target.pathname !== '/mypage' && !target.pathname.startsWith('/mypage/')) return '/mypage'
  if (target.pathname === '/mypage/profile' || target.pathname.startsWith('/mypage/profile/')) return '/mypage'
  return `${target.pathname}${target.search}${target.hash}`
}
