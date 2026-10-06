// Clear connection intent saved by earlier versions; new account linking is unsupported.
export function clearSocialLink(): void {
  try { sessionStorage.removeItem('comviewers.auth.pending-social-link') }
  catch { /* Storage may be unavailable in a restricted browser. */ }
}
