import { translateUiText as uiText, useUiTranslation } from '@/i18n/uiTranslation'
import { useState } from 'react'
import type { MyAccountReadServices } from '@/domain/myAccount/httpServices'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { AccountQueryState } from '../AccountQueryState'
import { ReadPages, useAccountRead } from '../shared/AccountReadCommon'
import { StorageSelectionCheckout } from './StorageSelectionCheckout'
import { PartStorageOffers } from './PartStorageOffers'
import { MixedStorageCheckout } from './MixedStorageCheckout'
import { StorageExtensionItems } from './StorageExtensionItems'
import { MyPageLayout } from '../../MypageComponentsView'

export function StoragePageContent({ api, rcpcApi }: { api: MyAccountReadServices; rcpcApi?: MyRcpcReadServices }) {
  useUiTranslation()
  const [page, setPage] = useState(0)
  const result = useAccountRead(['storage', 'stored', page], (signal) => api.storage({ page, size: 20, status: 'stored' }, signal), { refreshOnReturn: true })
  return <MyPageLayout backTo="/mypage" title={uiText("보관함")}><div className="storage-catalog purchase-selection-page">
    <AccountQueryState pending={false} error={result.error} retry={result.refetch}/>
    <MixedStorageCheckout hasExtensionSource={Boolean(rcpcApi)} rentalsState={result.isPending ? 'pending' : result.isError ? 'error' : 'ready'}>
      {rcpcApi && <StorageExtensionItems api={rcpcApi}/>}
      {result.data && <StorageSelectionCheckout key={page} items={result.data.items}/>}
      <PartStorageOffers api={api}/>
      {result.data && <ReadPages page={result.data.page} totalPages={result.data.totalPages} onChange={setPage}/>}
    </MixedStorageCheckout>
  </div></MyPageLayout>
}
