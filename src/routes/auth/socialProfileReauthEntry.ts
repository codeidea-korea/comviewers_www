const entryKey = 'comviewers-social-profile-reauth-entry'
const entryTtlMs = 60_000

export function markSocialProfileReauthEntry() {
  try { window.sessionStorage.setItem(entryKey, String(Date.now())) } catch { /* Storage may be unavailable. */ }
}

export function consumeSocialProfileReauthEntry() {
  try {
    const saved = window.sessionStorage.getItem(entryKey)
    window.sessionStorage.removeItem(entryKey)
    const elapsed = Date.now() - Number(saved)
    return saved !== null && elapsed >= 0 && elapsed <= entryTtlMs
  } catch { return false }
}
