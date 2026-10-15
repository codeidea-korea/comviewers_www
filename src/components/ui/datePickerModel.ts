const dayMilliseconds = 86_400_000

/** Calendar arithmetic uses UTC noon; API values remain date-only strings. */
export function dateValue(date: Date): string {
  return date.toISOString().replace(/T.*$/, '')
}

export function parseDate(value: string): Date | null {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) || value.startsWith('0000')) return null
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && dateValue(date) === value ? date : null
}

export function localToday(): Date {
  const now = new Date()
  const value = `${String(now.getFullYear()).padStart(4, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return new Date(`${value}T12:00:00Z`)
}

export function supportedDate(date: Date): boolean {
  return date.getUTCFullYear() >= 1 && date.getUTCFullYear() <= 9999
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime() + days * dayMilliseconds)
  return supportedDate(next) ? next : date
}

export function addMonths(date: Date, months: number): Date {
  const index = date.getUTCFullYear() * 12 + date.getUTCMonth() + months
  const year = Math.floor(index / 12)
  if (year < 1 || year > 9999) return date
  const month = index % 12
  const first = new Date(`${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-01T12:00:00Z`)
  // The 32nd always falls in the next month, including December 9999.
  const followingMonth = new Date(first.getTime() + 31 * dayMilliseconds)
  const daysInMonth = 32 - followingMonth.getUTCDate()
  return addDays(first, Math.min(date.getUTCDate(), daysInMonth) - 1)
}

export function calendarDays(date: Date): readonly Date[] {
  const first = new Date(date.getTime() - (date.getUTCDate() - 1) * dayMilliseconds)
  const start = first.getTime() - first.getUTCDay() * dayMilliseconds
  return Array.from({ length: 42 }, (_, index) => new Date(start + index * dayMilliseconds))
}
