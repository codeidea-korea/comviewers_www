import type { CManagersApi } from '@/api/cManagers'
import type { MyRcpcReadServices } from './rcpcInquiryReadServices'
import type { ManagerServices, ManagerWorkspace } from './managerServices'

const date = (value: string | null | undefined) => value?.slice(0, 10) ?? '-'
const statusLabel = (value: string) => ({ active: '이용중', terminated: '이용종료', refunded: '환불' }[value] ?? value)

async function readAllRcpcs(api: MyRcpcReadServices, signal?: AbortSignal) {
  const first = await api.list({ page: 0, size: 100 }, signal)
  let items = first.items
  for (let page = 1; page < first.totalPages; page += 1) {
    const next = await api.list({ page, size: 100 }, signal)
    if (next.page !== page || next.items.length === 0 || next.totalElements !== first.totalElements || next.totalPages !== first.totalPages) {
      throw new Error('RCPC 목록이 변경되었습니다. 다시 조회해 주세요.')
    }
    items = [...items, ...next.items]
  }
  if (first.page !== 0 || items.length !== first.totalElements || new Set(items.map(item => item.rentalId)).size !== items.length) {
    throw new Error('RCPC 목록이 변경되었습니다. 다시 조회해 주세요.')
  }
  return items
}

/** Only manager assignments and RCPCs belong to this workspace; account/commerce reads are independent. */
export function createManagerReader(api: CManagersApi, rcpcApi: MyRcpcReadServices) {
  return async (signal?: AbortSignal): Promise<ManagerWorkspace> => {
    const [rcpcs, managers, assignableRcpcs] = await Promise.all([
      readAllRcpcs(rcpcApi, signal), api.list(signal), api.rcpcs(signal),
    ])
    const details = await Promise.all(managers.map(manager => api.detail(manager.memberId, signal)))
    const byRental = new Map(assignableRcpcs.map(item => [item.rentalId, item]))
    return {
      rcpcs: rcpcs.map(item => {
        const assignable = byRental.get(item.rentalId)
        return {
          id: String(item.rentalId), rcpcId: assignable?.assetNo ?? item.productNo,
          assignable: byRental.has(item.rentalId), alias: item.preference.alias ?? assignable?.deviceAlias ?? item.productNo,
          company: item.serverRoomName ?? '-', center: item.serverRoomName ?? '-', status: statusLabel(item.rentalStatus),
          daysLeft: item.serviceEndExclusiveDate ? Math.ceil((Date.parse(`${item.serviceEndExclusiveDate}T00:00:00Z`) - Date.now()) / 86_400_000) : 0,
          startedAt: date(assignable?.serviceStartedAt),
          endsAt: date(assignable?.serviceEndsAt) === '-' ? item.serviceEndExclusiveDate ?? '-' : date(assignable?.serviceEndsAt),
          wanIp: '-', remote: '-', remotePassword: '-', disk: '-',
          traffic: item.trafficDownloadTotalBytes === null && item.trafficUploadTotalBytes === null ? '-'
            : `${((item.trafficDownloadTotalBytes ?? 0) + (item.trafficUploadTotalBytes ?? 0)).toLocaleString('ko-KR')} B`,
          state: statusLabel(item.rentalStatus), favorite: item.preference.favorite,
          groupId: item.preference.groupId ? String(item.preference.groupId) : 'unclassified',
        }
      }),
      managers: managers.map((item, index) => ({
        id: String(item.memberId), managerId: String(item.memberId), name: item.name ?? item.username, loginId: item.username,
        assignedRcpcIds: details[index].rcpcs.map(rcpc => String(rcpc.rentalId)), assignmentHistory: [],
        memo: item.managementMemo ?? '', status: item.status === 'active' ? '활성' : item.status,
        permissionGroupId: item.permissionGroupId, permissionGroupName: item.permissionGroupName,
      })),
    }
  }
}

export function createHttpManagerServices(api: CManagersApi, rcpcApi: MyRcpcReadServices): ManagerServices {
  return {
    read: createManagerReader(api, rcpcApi),
    isManagerLoginAvailable: async loginId => (await api.availability(loginId)).available,
    async saveManager({ id, draft }) {
      if (id) {
        await api.update(Number(id), { name: draft.name, password: draft.password || null, managementMemo: draft.memo, permissionGroupId: draft.permissionGroupId })
        return
      }
      if (!draft.password) throw new Error('비밀번호를 입력해 주세요.')
      await api.create({ name: draft.name, username: draft.loginId, password: draft.password, managementMemo: draft.memo, permissionGroupId: draft.permissionGroupId })
    },
    assignManager: async ({ managerId, rcpcIds }) => { await api.assignRcpcs(rcpcIds.map(Number), managerId ? Number(managerId) : null) },
    deleteManager: async id => { await api.deactivate(Number(id)) },
  }
}
