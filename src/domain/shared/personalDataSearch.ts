export type PersonalDataKind = 'name' | 'email' | 'phone'

/** Keep display values intact; this is only the exact-search comparison form. */
export function canonicalPersonalData(value: string, kind: PersonalDataKind): string {
  const trimmed = value.replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, '')
  if (kind === 'email') return trimmed.toLowerCase()
  if (kind === 'phone') return trimmed.replace(/[\t\n\v\f\r -]/g, '')
  return trimmed.normalize('NFC')
}

export function matchesPersonalData(value: unknown, keyword: string, kind: PersonalDataKind): boolean {
  const needle = canonicalPersonalData(keyword, kind)
  return !keyword.trim() || Boolean(needle && typeof value === 'string'
    && canonicalPersonalData(value, kind) === needle)
}
