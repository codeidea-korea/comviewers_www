// Existing organizations can also carry the migration-era ORG_LEGACY_... code.
const managerPagePattern = /^\/manager\/(ORG_[A-Za-z0-9_]{1,46})\/mypage(?:\/|$)/i

export function managerOrganizationCode(pathname: string): string | null {
  return managerPagePattern.exec(pathname)?.[1] ?? null
}

export function managerScopedPath(to: string, currentPathname: string): string {
  const code = managerOrganizationCode(currentPathname)
  return code && /^\/mypage(?:\/|$|[?#])/.test(to) ? `/manager/${code}${to}` : to
}
