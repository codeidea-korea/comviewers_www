import { z } from 'zod'

export type AccountDateRange = [string, string]
export function currentKstDate(): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}
export function quickAccountDates(): Record<string, AccountDateRange> {
  const today = currentKstDate()
  const beforeDays = (days: number) => {
    const date = new Date(`${today}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() - days)
    return date.toISOString().slice(0, 10)
  }
  const beforeMonths = (months: number) => {
    const date = new Date(`${today}T00:00:00Z`)
    const day = date.getUTCDate()
    date.setUTCDate(1)
    date.setUTCMonth(date.getUTCMonth() - months)
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
    date.setUTCDate(Math.min(day, lastDay))
    return date.toISOString().slice(0, 10)
  }
  return { '오늘': [today, today], '1주일': [beforeDays(6), today], '1개월': [beforeMonths(1), today], '3개월': [beforeMonths(3), today], '6개월': [beforeMonths(6), today] }
}
export function dateRangeError(start: string, end: string): string {
  if ((start && !z.iso.date().safeParse(start).success) || (end && !z.iso.date().safeParse(end).success)) return '유효한 날짜를 입력해 주세요.'
  if (start && end && start > end) return '시작일은 종료일보다 늦을 수 없습니다.'
  return ''
}
