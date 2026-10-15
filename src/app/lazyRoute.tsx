import { lazy, type ComponentType } from 'react'

let failedImports: readonly (() => void)[] = []

export function isRouteImportError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message}` : ''
  return /ChunkLoadError|dynamically imported module|loading chunk|module script|Importing a module script/i.test(message)
}

export function resetFailedRouteImports() {
  const resetters = failedImports
  failedImports = []
  resetters.forEach(reset => reset())
}

// Retry only loading the screen module; rendering and business requests are unchanged.
export function lazyRoute<Props extends object>(load: () => Promise<{ default: ComponentType<Props> }>): ComponentType<Props> {
  const createRoute = () => lazy(async () => {
    try {
      try {
        return await load()
      } catch (error) {
        if (!isRouteImportError(error)) throw error
        await new Promise<void>(resolve => setTimeout(resolve, 350))
        return await load()
      }
    } catch (error) {
      if (isRouteImportError(error)) {
        failedImports = [...failedImports, () => { Route = createRoute() }]
      }
      throw error
    }
  })
  let Route = createRoute()

  // Keep successful screens mounted; replace rejected lazy instances only on recovery.
  return function LazyRoute(props: Props) {
    return <Route {...props} />
  }
}
