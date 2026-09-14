import { z } from 'zod'

const key = 'comviewers.signup.agreements'
const agreement = z.object({ termsPolicyVersionId: z.number().int().positive(), agreed: z.boolean() })

export function saveSignupAgreements(agreements: readonly z.infer<typeof agreement>[]) {
  sessionStorage.setItem(key, JSON.stringify(agreement.array().parse(agreements)))
}

export function loadSignupAgreements() {
  const value = sessionStorage.getItem(key)
  if (!value) return []
  try { return agreement.array().parse(JSON.parse(value)) } catch { return [] }
}

export function clearSignupAgreements() {
  sessionStorage.removeItem(key)
}
