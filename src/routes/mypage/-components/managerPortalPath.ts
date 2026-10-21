import { isManagerOrganizationCode } from '@/domain/auth/managerOrganizationCode'

const managerPagePattern = /^\/manager\/([^/]+)\/mypage(?:\/|$)/i

export function managerOrganizationCode(pathname: string): string | null {
  const code = managerPagePattern.exec(pathname)?.[1]
  return code && isManagerOrganizationCode(code) ? code : null
}

export function managerScopedPath(to: string, currentPathname: string): string {
  const code = managerOrganizationCode(currentPathname)
  return code && /^\/mypage(?:\/|$|[?#])/.test(to) ? `/manager/${code}${to}` : to
}
