import { useState } from 'react'
import type { MyAccountReadServices } from '@/domain/myAccount/httpServices'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { AppShell } from '@/components/layout/AppShellView'
import { AccountQueryState } from '../AccountQueryState'
import { ReadPages, useAccountRead } from '../shared/AccountReadCommon'
import { StorageSelectionCheckout } from './StorageSelectionCheckout'
import { PartStorageOffers } from './PartStorageOffers'
import { MixedStorageCheckout } from './MixedStorageCheckout'
import { StorageExtensionOffers } from './StorageExtensionOffers'

export function StoragePageContent({ api, rcpcApi }: { api: MyAccountReadServices; rcpcApi?: MyRcpcReadServices }) {
  const [page, setPage] = useState(0)
  const result = useAccountRead(['storage', 'stored', page], (signal) => api.storage({ page, size: 20, status: 'stored' }, signal))
  return <AppShell className="storage-shell purchase-selection-page"><main className={`storage-catalog content-container${result.data && result.data.items.length===0?' storage-catalog--empty':''}`}><h1>보관함</h1><AccountQueryState pending={result.isPending} error={result.error} retry={result.refetch}/>{rcpcApi?<StorageExtensionOffers api={rcpcApi}/>:null}{result.data?<MixedStorageCheckout api={api}><StorageSelectionCheckout key={page} api={api} items={result.data.items}/><PartStorageOffers api={api}/><ReadPages page={result.data.page} totalPages={result.data.totalPages} onChange={setPage}/></MixedStorageCheckout>:null}</main></AppShell>
}
