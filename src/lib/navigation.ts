const EXTERNAL_URL_PATTERN = /^[a-z][a-z\d+.-]*:|^\/\//i

function normalizePathname(pathname: string) {
  if (!pathname || pathname === '/') return '/'
  const normalized = pathname.replace(/\/+$/, '')
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

function splitRoute(to: string) {
  const queryIndex = to.indexOf('?')
  const hashIndex = to.indexOf('#')
  const suffixIndex = [queryIndex, hashIndex].filter((index) => index >= 0).sort((a, b) => a - b)[0]

  if (suffixIndex == null) return { pathname: to, suffix: '' }
  return {
    pathname: to.slice(0, suffixIndex),
    suffix: to.slice(suffixIndex),
  }
}

function joinBasename(basename: string, pathname: string) {
  const normalizedBase = normalizePathname(basename)
  const normalizedPath = normalizePathname(pathname)
  if (normalizedBase === '/') return normalizedPath
  if (normalizedPath === '/') return normalizedBase
  return `${normalizedBase}${normalizedPath}`
}

function relativePathname(fromPathname: string, toPathname: string) {
  const fromSegments = normalizePathname(fromPathname).split('/').filter(Boolean)
  const toSegments = normalizePathname(toPathname).split('/').filter(Boolean)
  const fromDirectorySegments = fromSegments.length > 0 ? fromSegments.slice(0, -1) : []

  let commonLength = 0
  while (
    commonLength < fromDirectorySegments.length &&
    commonLength < toSegments.length &&
    fromDirectorySegments[commonLength] === toSegments[commonLength]
  ) {
    commonLength += 1
  }

  const upSegments = Array.from({ length: fromDirectorySegments.length - commonLength }, () => '..')
  const downSegments = toSegments.slice(commonLength)
  return [...upSegments, ...downSegments].join('/') || '.'
}

export function getRuntimeBasename() {
  const configuredBase = import.meta.env.BASE_URL
  if (configuredBase && configuredBase !== '/' && configuredBase !== './') {
    return normalizePathname(new URL(configuredBase, window.location.origin).pathname)
  }

  const moduleScript = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/"]')
  if (moduleScript?.src) {
    const scriptPath = new URL(moduleScript.src).pathname
    const assetsIndex = scriptPath.lastIndexOf('/assets/')
    if (assetsIndex > 0) return normalizePathname(scriptPath.slice(0, assetsIndex))
  }

  return '/'
}

export function toRelativeHref(to: string, currentPathname = window.location.pathname, basename = getRuntimeBasename()) {
  if (typeof to !== 'string' || !to || EXTERNAL_URL_PATTERN.test(to) || to.startsWith('#') || to.startsWith('?')) {
    return to
  }

  const { pathname, suffix } = splitRoute(to)
  if (!pathname.startsWith('/')) return to

  return `${relativePathname(currentPathname, joinBasename(basename, pathname))}${suffix}`
}
