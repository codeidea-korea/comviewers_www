import type { PageLocale } from './translation-core'

interface DatePickerCopy {
  placeholder: string
  year: string
  month: string
  previousMonth: string
  nextMonth: string
  clear: string
  today: string
}

// Scoped labels: calendar Clear must not replace the global Delete translation.
export const datePickerCopy = {
  ko: { placeholder: '연도-월-일', year: '연도', month: '월', previousMonth: '이전 달', nextMonth: '다음 달', clear: '삭제', today: '오늘' },
  en: { placeholder: 'Year-Month-Day', year: 'Year', month: 'Month', previousMonth: 'Previous month', nextMonth: 'Next month', clear: 'Clear', today: 'Today' },
  vi: { placeholder: 'Năm-Tháng-Ngày', year: 'Năm', month: 'Tháng', previousMonth: 'Tháng trước', nextMonth: 'Tháng sau', clear: 'Xóa', today: 'Hôm nay' },
  ja: { placeholder: '年-月-日', year: '年', month: '月', previousMonth: '前の月', nextMonth: '次の月', clear: 'クリア', today: '今日' },
  'zh-CN': { placeholder: '年-月-日', year: '年', month: '月', previousMonth: '上个月', nextMonth: '下个月', clear: '清除', today: '今天' },
  'zh-TW': { placeholder: '年-月-日', year: '年', month: '月', previousMonth: '上個月', nextMonth: '下個月', clear: '清除', today: '今天' },
} as const satisfies Readonly<Record<PageLocale, Readonly<DatePickerCopy>>>
