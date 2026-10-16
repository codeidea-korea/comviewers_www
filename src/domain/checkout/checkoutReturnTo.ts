/** Checkout may only return to a known customer purchase/list route. */
export function checkoutReturnTo(value: unknown, fallback = '/cart'): string {
  if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('/') || value.startsWith('//')
    || /[\\\u0000-\u001f\u007f]/u.test(value)) return fallback
  try {
    const url = new URL(value, 'https://checkout.invalid')
    if (url.origin !== 'https://checkout.invalid'
      || !/^\/(?:cart|products(?:\/[A-Za-z0-9_-]+)?|(?:manager\/[A-Za-z0-9_-]+\/)?mypage\/(?:storage|rcpc(?:\/[A-Za-z0-9_-]+)?|favorites(?:\/settings)?))\/?$/u.test(url.pathname)) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch { return fallback }
}
