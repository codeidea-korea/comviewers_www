const memoryKeys = new Map<string, string>()

export function confirmAttemptKey(providerOrderId: string): string {
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(providerOrderId)) return crypto.randomUUID()
  // Store only the opaque attempt identifier and a random idempotency key, never return credentials.
  const storageKey = `comviewers:toss-confirm:${providerOrderId}`
  const fallback = memoryKeys.get(storageKey) ?? crypto.randomUUID()
  try {
    const stored = sessionStorage.getItem(storageKey)
    const key = stored && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(stored) ? stored : fallback
    sessionStorage.setItem(storageKey, key)
    memoryKeys.set(storageKey, key)
    return key
  } catch {
    // Storage-disabled sessions still reuse the key for retries within this page lifetime.
    memoryKeys.set(storageKey, fallback)
    return fallback
  }
}
