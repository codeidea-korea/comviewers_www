import type { CManagersApi } from '@/api/cManagers'
import type { MyRcpcReadServices } from './rcpcInquiryReadServices'
import type { ManagerServices, ManagerWorkspace } from './managerServices'

const date = (value: string | null | undefined) => value?.slice(0, 10) ?? '-'

async function readCatalog(api: CManagersApi, query: import('./managerServices').ManagerCatalogQuery, signal?: AbortSignal): Promise<ManagerWorkspace> {
  const result = await api.catalog(query, signal)
  return {
    totalElements: result.totalElements,
    unassignedCount: result.counts.find(count => count.memberId === null)?.count ?? 0,
    rcpcs: result.items.map(item => ({
      id: String(item.rentalId), rcpcId: item.productNo, alias: item.alias, assignable: item.assignable,
      company: '-', center: '-', status: '이용중',
      daysLeft: item.serviceEndExclusiveDate ? Math.ceil((Date.parse(`${item.serviceEndExclusiveDate}T00:00:00Z`) - Date.now()) / 86_400_000) : 0,
      startedAt: date(item.serviceStartedAt), endsAt: date(item.serviceEndsAt) === '-' ? item.serviceEndExclusiveDate ?? '-' : date(item.serviceEndsAt),
      wanIp: '-', remote: '-', remotePassword: '-', disk: '-', traffic: '-', state: '이용중', favorite: false, groupId: 'unclassified',
    })),
    managers: result.managers.map(item => ({
      id: String(item.memberId), managerId: String(item.memberId), name: item.name ?? item.username, loginId: item.username,
      assignedRcpcIds: result.assignments.filter(assignment => assignment.memberId === item.memberId).map(assignment => String(assignment.rentalId)),
      assignedRcpcCount: result.counts.find(count => count.memberId === item.memberId)?.count ?? 0,
      assignmentHistory: [], memo: item.managementMemo ?? '', status: item.status === 'active' ? '활성' : item.status,
      permissionGroupId: item.permissionGroupId, permissionGroupName: item.permissionGroupName,
    })),
  }
}

export function createManagerReader(api: CManagersApi, _rcpcApi: MyRcpcReadServices) {
  return (signal?: AbortSignal) => readCatalog(api, { page: 0, size: 10 }, signal)
}

export function createHttpManagerServices(api: CManagersApi, rcpcApi: MyRcpcReadServices): ManagerServices {
  return {
    read: createManagerReader(api, rcpcApi),
    readPage: (query, signal) => readCatalog(api, query, signal),
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
