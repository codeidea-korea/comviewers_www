import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/app/session/SessionProvider'
import { extensionSelectionSchema } from '@/api/extensionCheckout'
import { RcpcExtensionSurface, type RcpcDialogTarget } from '@/components/mypage/RcpcDialogsControl'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { extensionResultText } from './rcpcExtensionPresentation'
import { Button } from '@/components/ui/ButtonControl'

type ExtensionQuote = Awaited<ReturnType<MyRcpcReadServices['extensionCheckout']['quote']>>
const dateTime = (value: string | null) => value ? value.replace('T', ' ').split('.')[0] : '—'

export function RcpcExtensionCheckout({ api, rentalIds, displayTargets, initialDays = 30, triggerLabel }: {
  api: MyRcpcReadServices; rentalIds: readonly number[]; displayTargets?: readonly RcpcDialogTarget[]; initialDays?: number; triggerLabel?: string
}) {
  const session = useSession()
  const owner = session.status === 'authenticated' && session.customerSession?.memberRole === 'owner'
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'days' | 'date'>('days')
  const [days, setDays] = useState(String(initialDays))
  const [date, setDate] = useState('')
  const quoteScope = JSON.stringify([api.organizationId, rentalIds])
  const [lastQuote, setLastQuote] = useState<{ scope: string; value: ExtensionQuote } | null>(null)
  const selection = extensionSelectionSchema.safeParse({ rentalIds: [...rentalIds].sort((a, b) => a - b), pointAmount: 0,
    ...(mode === 'days' ? { addedDays: Number(days) } : { targetEndDate: date }) })
  const selected = selection.success ? selection.data : null
  const quote = useQuery({
    queryKey: ['extension-checkout-quote', api.organizationId, quoteScope, JSON.stringify(selected)],
    enabled: open && selected !== null,
    queryFn: () => {
      if (!selected) throw new Error('1개월, 2개월, 3개월 또는 통일할 만료일을 선택해 주세요.')
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
  return <section aria-label="RCPC 기간 연장">
    <Button size="small" onClick={() => setOpen(true)}>{triggerLabel ?? `선택 ${rentalIds.length}대 기간 연장`}</Button>
    {open ? <RcpcExtensionSurface action={quoteReady && current?.eligible && selection.success
      ? <Link to="/checkout" state={{ kind: 'extension', selection: selection.data }}>연장 결제하기</Link>
      : <button disabled type="button">연장 결제하기</button>}
      busy={quote.isFetching} dateValue={date} error={quote.error?.message} extensionMode={mode === 'days' ? 'period' : 'date'}
      itemCount={current?.items.length ?? rentalIds.length} onClose={() => setOpen(false)} onDateChange={setDate}
      onModeChange={value => setMode(value === 'date' ? 'date' : 'days')} onPeriodChange={setDays} periodValue={days}
      rcpc={displayTargets?.[0] ?? { rcpcId: rentalIds[0] }} targets={displayTargets ?? rentalIds.map(rentalId => ({ rcpcId: rentalId }))}
      rows={current?.items.map(item => ({ key: item.rentalId, product: item.productNo ?? '-', period: item.addedDays == null ? '-' : `${item.addedDays}일`,
        currentEnd: dateTime(item.previousEnd), nextEnd: dateTime(item.targetEnd), monthlyFee: item.monthlyFee == null ? '-' : `${item.monthlyFee.toLocaleString('ko-KR')}원`,
        payment: extensionResultText(item), warning: !item.eligible }))}
      totalAmount={current ? current.eligible ? `${current.totalAmount.toLocaleString('ko-KR')}원` : '결제 불가' : '견적 미조회'} /> : null}
  </section>
}
