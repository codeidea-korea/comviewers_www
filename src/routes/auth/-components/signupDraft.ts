import { z } from 'zod'

const key = 'comviewers.signup.agreements'
const marketingEmailKey = 'comviewers.signup.marketing-email-consent'
const agreement = z.object({ termsPolicyVersionId: z.number().int().positive(), agreed: z.boolean() })

export function saveSignupAgreements(agreements: readonly z.infer<typeof agreement>[], marketingEmailAgreed = false) {
  sessionStorage.setItem(key, JSON.stringify(agreement.array().parse(agreements)))
  sessionStorage.setItem(marketingEmailKey, JSON.stringify(z.boolean().parse(marketingEmailAgreed)))
}

export function loadSignupAgreements() {
  const value = sessionStorage.getItem(key)
  if (!value) return []
  try { return agreement.array().parse(JSON.parse(value)) } catch { return [] }
}

export function loadSignupMarketingEmailConsent() {
  const value = sessionStorage.getItem(marketingEmailKey)
  if (!value) return false
  try { return z.boolean().parse(JSON.parse(value)) } catch { return false }
}

export function clearSignupAgreements() {
  sessionStorage.removeItem(key)
  sessionStorage.removeItem(marketingEmailKey)
}
