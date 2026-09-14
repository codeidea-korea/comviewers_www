import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import type { MyRcpcItem } from '@/api/myRcpc'
import type { createCustomerRcpcMutations } from '@/api/customerRcpcMutations'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { Modal } from '@/components/ui/ModalControl'
import { LoadingState } from '@/components/ui/LoadingStateControl'
import { RcpcAliasButton, RcpcSpecButton } from './RcpcItemTools'
import { RcpcReboot, RcpcWanIp } from './RcpcDeviceActions'
import { RcpcExtensionCheckout } from './RcpcExtensionCheckout'
import { RcpcRemoteAccess } from './RcpcRemoteAccess'
import { endedRental } from './rcpcPresentation'

export function RcpcFavoriteActions({ api, item, mutations }: { api: MyRcpcReadServices; item: MyRcpcItem; mutations?: ReturnType<typeof createCustomerRcpcMutations> }) {
  const [remoteOpen, setRemoteOpen] = useState(false)
  const detail = useQuery({ queryKey: ['my-rcpcs', api.organizationId, 'detail', String(item.rentalId)], queryFn: ({ signal }) => api.detail(item.rentalId, signal), enabled: remoteOpen })
  return <><RcpcAliasButton api={api} item={item} mutations={mutations}/><RcpcSpecButton api={api} item={item}/><RcpcReboot api={api} item={item}/><RcpcWanIp api={api} item={item}/>
    <button type="button" disabled={endedRental(item.rentalStatus)} onClick={() => setRemoteOpen(true)}>원격 접속 정보</button>
    <Modal isOpen={remoteOpen} title="원격 접속 정보" onClose={() => setRemoteOpen(false)}>{detail.isPending ? <LoadingState className="route-loading--compact" label="접속 정보를 확인 중입니다." /> : null}{detail.error ? <p role="alert">{detail.error.message}<button type="button" onClick={() => void detail.refetch()}>다시 시도</button></p> : null}{remoteOpen && detail.data ? <RcpcRemoteAccess api={api} item={detail.data}/> : null}</Modal>
    <Link to={`/mypage/inquiries?pcAssetIds=${item.pcAssetId}`}>문의</Link>{!endedRental(item.rentalStatus) ? <RcpcExtensionCheckout api={api} rentalIds={[item.rentalId]}/> : null}
  </>
}
