import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from '../../src/app/session/SessionProvider'
import { ServiceProvider } from '../../src/app/ServiceProvider'
import { InquiryAction } from '../../src/routes/mypage/-components/inquiries/InquiryAction'
import { InquiryTargetAddition } from '../../src/routes/mypage/-components/InquiryTargetAddition'
import { InquiryCreateDialog } from '../../src/routes/mypage/-components/InquiryCreateDialog'
import { AttachmentList } from '../../src/components/ui/AttachmentListControl'
import { useAccountRead } from '../../src/routes/mypage/-components/shared/AccountReadCommon'
import '../../src/styles/mypage.css'

const params = new URLSearchParams(location.search)
const fixed = params.get('fixed') === '1'
const count = Number(params.get('count') || 3)
const items = Array.from({ length: count }, (_, index) => ({
  rentalId: 100 + index, pcAssetId: index + 1, productNo: `QA${index + 1}`,
  preference: { alias: '동일 별명' }, connectionStatus: 'ONLINE', rentalStatus: 'active',
  serverRoomId: index === 2 ? 72 : 71, serverRoomName: index === 2 ? 'B 서버실' : 'A 서버실',
  serverRoomBusinessKey: index === 2 && params.get('business') === 'different' ? 'qa-business-b' : index === 2 && params.get('business') === 'missing' ? null : 'qa-business', pcSpec: null,
}))
// A historical rental must produce no duplicate selectable PC.
const history = { ...items[0], rentalId: 1, productNo: 'OLD', preference: { alias: '과거 이력' } }
let currentItems = [...items, history]
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
window.qa = {
  submitted: [], added: [], reads: 0,
  remove: async id => {
    currentItems = currentItems.filter(item => item.pcAssetId !== id)
    await queryClient.invalidateQueries({ queryKey: ['my-rcpcs'] })
  },
}
const rcpcApi = { organizationId: 'qa', list: async () => ({ items: currentItems, totalPages: 1 }) }
const api = { organizationId: 'qa', create: async input => { window.qa.submitted.push(input); throw new Error('QA synthetic response: no persistent write') },
  addTargets: async (requestId, ids) => { window.qa.added.push({ requestId, ids }); throw new Error('QA synthetic add response: no persistent write') } }
const snapshot = { status: 'anonymous' }
const store = { subscribe: () => () => {}, getSnapshot: () => snapshot }
function RefreshProbe() {
  const [open, setOpen] = useState(true)
  return <><button onClick={() => setOpen(value => !value)}>마운트 전환</button>{open ? <ReadProbe /> : null}</>
}
function ReadProbe() {
  const result = useAccountRead(['coupons', 'qa'], async () => ({ revision: ++window.qa.reads }), { refreshOnReturn: true })
  return <output>{result.data?.revision}</output>
}
function App() {
  if (params.get('mode') === 'attachment') return <AttachmentList attachments={[{ name: 'QA 원본.png', type: 'image/png', size: '1KB', href: '/__qa_png__' }]} />
  if (params.get('mode') === 'refresh') return <RefreshProbe />
  if (params.get('mode') === 'action') return <InquiryAction fixedTarget initialIds={[1, 3]} initialTargets={items.filter(item => [1, 3].includes(item.pcAssetId))} />
  if (params.get('mode') === 'addition') return <InquiryTargetAddition api={api} requestId={1} existingIds={[1]} total={1} closed={false} pickerOpen showTrigger={false} />
  return <InquiryCreateDialog api={api} rcpcApi={rcpcApi} initialIds={fixed ? [1] : []} initialProductNo="" fixedTarget={fixed} onClose={() => {}} onCreated={async () => {}} />
}
createRoot(document.getElementById('root')).render(<MemoryRouter><QueryClientProvider client={queryClient}><SessionProvider store={store}><ServiceProvider services={{ myAccount: { rcpcApi, inquiryApi: api } }}><App /></ServiceProvider></SessionProvider></QueryClientProvider></MemoryRouter>)
