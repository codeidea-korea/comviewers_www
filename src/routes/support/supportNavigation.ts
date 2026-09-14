export function supportReturnTo(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/support'
  try {
    const resolved = new URL(value, 'https://comviewers.local')
    if (resolved.origin !== 'https://comviewers.local' || resolved.pathname !== '/support' || resolved.hash) return '/support'
    return `${resolved.pathname}${resolved.search}`
  } catch {
    return '/support'
  }
}
