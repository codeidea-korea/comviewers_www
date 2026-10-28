import { useUiTranslation } from '@/i18n/uiTranslation'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/app/session/SessionProvider'
import { extensionSelectionSchema } from '@/api/extensionCheckout'
import { RcpcExtensionSurface, type RcpcDialogTarget } from '@/components/mypage/RcpcDialogsControl'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { Button } from '@/components/ui/ButtonControl'
import { extensionResultText } from './rcpcExtensionPresentation'

type ExtensionQuote = Awaited<ReturnType<MyRcpcReadServices['extensionCheckout']['quote']>>
const dateTime = (value: string | null) => value ? value.replace('T', ' ').split('.')[0] : '—'

export function RcpcExtensionCheckout({ api, rentalIds, displayTargets, triggerLabel, initialDays = 30 }: {
  api: MyRcpcReadServices; rentalIds: readonly number[]; displayTargets?: readonly RcpcDialogTarget[]; initialDays?: number; triggerLabel?: string
}) {
  const { uiText } = useUiTranslation()
  const session = useSession()
  const location = useLocation()
  const owner = session.status === 'authenticated' && session.customerSession?.memberRole === 'owner'
  const [open, setOpen] = useState(false)
  const [extensionMode, setExtensionMode] = useState<'period' | 'date'>('period')
  const [periodValue, setPeriodValue] = useState(() => [30, 60, 90].includes(initialDays) ? String(initialDays) : '30')
  const [dateValue, setDateValue] = useState('')
  const selection = extensionSelectionSchema.safeParse({ rentalIds: [...rentalIds].sort((a, b) => a - b), pointAmount: 0,
    ...(extensionMode === 'period' ? { addedDays: Number(periodValue) } : { targetEndDate: dateValue }) })
  const quoteScope = JSON.stringify([api.organizationId, rentalIds, extensionMode, periodValue, dateValue])
  const [lastQuote, setLastQuote] = useState<{ scope: string; value: ExtensionQuote } | null>(null)
  const selected = selection.success ? selection.data : null
  const quote = useQuery({
    queryKey: ['extension-checkout-quote', api.organizationId, quoteScope, JSON.stringify(selected)],
    enabled: open && selected !== null,
    queryFn: () => {
      if (!selected) throw new Error('연장 조건을 확인해 주세요.')
      return api.extensionCheckout.quote(selected)
    },
    placeholderData: (previous, previousQuery) => previousQuery?.queryKey[2] === quoteScope ? previous : undefined,
    retry: false,
  })
  useEffect(() => {
    if (quote.data && !quote.isPlaceholderData && !quote.isError) setLastQuote({ scope: quoteScope, value: quote.data })
  }, [quote.data, quote.isPlaceholderData, quote.isError, quoteScope])
  const current = quote.data ?? (lastQuote?.scope === quoteScope ? lastQuote.value : undefined)
  const quoteReady = quote.isSuccess && !quote.isFetching && !quote.isPlaceholderData
  if (!owner || !session.customerSession?.commerceAvailable || rentalIds.length === 0) return null
  return <section aria-label={uiText("RCPC 기간 연장")}>
    <Button size="small" onClick={() => setOpen(true)}>{triggerLabel !== undefined ? uiText(triggerLabel) : uiText('선택 {count}대 기간 연장', { count: rentalIds.length })}</Button>
    {open ? <RcpcExtensionSurface action={quoteReady && current?.eligible && selection.success
      ? <Link to="/checkout" state={{ kind: 'extension', returnTo: `${location.pathname}${location.search}${location.hash}`, selection: selection.data }}>{uiText("연장 결제하기")}</Link>
      : <button disabled type="button">{uiText("연장 결제하기")}</button>}
      busy={quote.isFetching} dateValue={dateValue}
      error={selection.success ? uiText(quote.error?.message) : undefined} extensionMode={extensionMode}
      itemCount={current?.items.length ?? rentalIds.length} onClose={() => setOpen(false)}
      onDateChange={setDateValue} onModeChange={mode => { if (mode === 'period' || mode === 'date') setExtensionMode(mode) }}
      onPeriodChange={value => { if (['30', '60', '90'].includes(value)) setPeriodValue(value) }} periodValue={periodValue}
      rcpc={displayTargets?.[0] ?? { rcpcId: rentalIds[0] }} targets={displayTargets ?? current?.items.map(item => ({ rcpcId: item.productNo ?? item.rentalId, location: item.serverRoomName ?? undefined, currentEnd: dateTime(item.previousEnd), specSummary: item.spec ?? undefined })) ?? rentalIds.map(rentalId => ({ rcpcId: rentalId }))}
      rows={current?.items.map(item => ({ key: item.rentalId, product: item.productNo ?? '-', location: item.serverRoomName, period: item.addedDays == null ? '-' : uiText('{count}일', { count: item.addedDays }),
        currentEnd: dateTime(item.previousEnd), nextEnd: dateTime(item.targetEnd), monthlyFee: item.monthlyFee == null ? '-' : uiText('{amount}원', { amount: item.monthlyFee.toLocaleString('ko-KR') }),
        payment: extensionResultText(item), warning: !item.eligible }))}
      totalAmount={current ? current.eligible ? uiText('{amount}원', { amount: current.totalAmount.toLocaleString('ko-KR') }) : uiText('결제 불가') : uiText('견적 미조회')} /> : null}
  </section>
}
