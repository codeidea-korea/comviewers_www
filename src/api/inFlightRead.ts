/** Share only pending reads within one authorized service; never cache disclosed values. */
export function createInFlightRead<T>() {
  const pending = new Map<string, { controller: AbortController; promise: Promise<T>; consumers: Set<symbol> }>()
  return (key: string, load: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T> => {
    signal?.throwIfAborted()
    let entry = pending.get(key)
    if (!entry) {
      const controller = new AbortController()
      const consumers = new Set<symbol>()
      const promise = Promise.resolve().then(() => {
        controller.signal.throwIfAborted()
        return load(controller.signal)
      }).finally(() => {
        if (pending.get(key)?.controller === controller) pending.delete(key)
      })
      entry = { controller, promise, consumers }
      pending.set(key, entry)
    }
    const current = entry
    const consumer = Symbol()
    current.consumers.add(consumer)
    return new Promise<T>((resolve, reject) => {
      const release = () => {
        signal?.removeEventListener('abort', abort)
        current.consumers.delete(consumer)
        // StrictMode cleanup/setup can subscribe again before this microtask.
        queueMicrotask(() => {
          if (current.consumers.size === 0 && pending.get(key) === current) {
            pending.delete(key)
            current.controller.abort()
          }
        })
      }
      const abort = () => { release(); reject(signal?.reason ?? new DOMException('Aborted', 'AbortError')) }
      signal?.addEventListener('abort', abort, { once: true })
      current.promise.then(value => { release(); resolve(value) }, error => { release(); reject(error) })
    })
  }
}
