type RouteLocation = Readonly<{
  pathname: string
  search: string
  hash: string
}>

export function loginPathWithReturnTo(location: RouteLocation): string {
  const returnTo = `${location.pathname}${location.search}${location.hash}`
  return `/login?returnTo=${encodeURIComponent(returnTo)}`
}

export function isMyPageOnlyPathAllowed(pathname: string): boolean {
  return /^\/mypage(?:$|\/(?:rcpc|favorites|inquiries)(?:\/|$))/.test(pathname)
}
