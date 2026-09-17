import type { MyAccountReadServices } from './httpServices'
import type { MyRcpcReadServices, InquiryReadServices } from './rcpcInquiryReadServices'
import type { CManagersApi } from '@/api/cManagers'
import type { createCustomerRcpcMutations } from '@/api/customerRcpcMutations'
import { myAccountSchema, type MyAccountSnapshot } from './services'

const date = (value: string | null | undefined) => value?.slice(0, 10) ?? '-'
const rcpcStatus = (value: string) => ({ active: '이용중', expiring: '연장대기', termination_pending: '종료대기', terminated: '이용종료' }[value] ?? value)
const money = (type: string, value: number) => type === 'rate' ? `${value}%` : `${value.toLocaleString('ko-KR')}원`

interface LiveSnapshotDependencies {
  readApi: MyAccountReadServices
  rcpcApi: MyRcpcReadServices
  inquiryApi: InquiryReadServices
  managerApi?: CManagersApi
  rcpcMutations: ReturnType<typeof createCustomerRcpcMutations>
}

export function createLiveMyAccountReader({ readApi, rcpcApi, inquiryApi, managerApi, rcpcMutations }: LiveSnapshotDependencies) {
  return async (): Promise<MyAccountSnapshot> => {
    const [profile, benefits, rcpcs, orders, points, coupons, inquiries, storage, groups, managers, managerRcpcs] = await Promise.all([
      readApi.profile(), readApi.benefits(), rcpcApi.list({ page: 0, size: 100 }), readApi.orders({ page: 0, size: 100 }),
      readApi.points({ page: 0, size: 100 }), readApi.coupons({ page: 0, size: 100 }), inquiryApi.list({ page: 0, size: 100 }),
      readApi.storage({ page: 0, size: 100, status: 'stored' }), rcpcMutations.groups(), managerApi?.list() ?? Promise.resolve([]),
      managerApi?.rcpcs() ?? Promise.resolve([]),
    ])
    const managerDetails = managerApi ? await Promise.all(managers.map((manager) => managerApi.detail(manager.memberId))) : []
    const managerRcpcByRentalId = new Map(managerRcpcs.map(item => [item.rentalId, item]))
    const flattenGroups = (items: typeof groups): MyAccountSnapshot['favoriteGroups'] => items.flatMap(item => [
      { id: String(item.id), label: item.name, parentId: item.parentGroupId === null ? null : String(item.parentGroupId) }, ...flattenGroups(item.children),
    ])
    return myAccountSchema.parse({
      profile: { id: profile.username, userId: profile.username, name: profile.name ?? profile.username, nickname: profile.nickname ?? '',
        email: profile.email ?? '', phone: profile.phone ?? '', messenger: [profile.messengerType, profile.messengerId].filter(Boolean).join(' ') || '',
        marketingAgreedAt: profile.marketingEmailAgreed ? date(profile.marketingEmailConsentChangedAt) : '' },
      pointBalance: Math.max(0, benefits.pointBalance),
      rcpcs: rcpcs.items.map(item => { const managerRcpc = managerRcpcByRentalId.get(item.rentalId); return ({ id: String(item.rentalId), rcpcId: managerRcpc?.assetNo ?? item.productNo,
        assignable: managerApi ? managerRcpcByRentalId.has(item.rentalId) : true,
        alias: item.preference.alias ?? managerRcpc?.deviceAlias ?? item.productNo,
        company: item.serverRoomName ?? '-', center: item.serverRoomName ?? '-', status: rcpcStatus(item.rentalStatus), daysLeft: item.serviceEndExclusiveDate ? Math.ceil((Date.parse(`${item.serviceEndExclusiveDate}T00:00:00Z`) - Date.now()) / 86_400_000) : 0,
        startedAt: date(managerRcpc?.serviceStartedAt), endsAt: date(managerRcpc?.serviceEndsAt) === '-' ? item.serviceEndExclusiveDate ?? '-' : date(managerRcpc?.serviceEndsAt), wanIp: '-', remote: '-', remotePassword: '-', disk: '-',
        traffic: item.trafficDownloadTotalBytes === null && item.trafficUploadTotalBytes === null ? '-' : `${((item.trafficDownloadTotalBytes ?? 0) + (item.trafficUploadTotalBytes ?? 0)).toLocaleString('ko-KR')} B`,
        state: rcpcStatus(item.rentalStatus), favorite: item.preference.favorite, groupId: item.preference.groupId ? String(item.preference.groupId) : 'unclassified' }) }),
      orders: orders.items.map(order => { const item = order.items[0]; return { id: order.orderId, orderId: order.orderNo,
        orderedAt: order.orderedAt, status: order.paymentStatus === 'paid' ? '결제완료' : order.orderStatus,
        item: item?.title ?? `${order.items.length}개 상품`, amount: order.finalAmount, image: '', productId: item?.productNo ?? '-',
        rcpcId: item?.pcAssetId ?? '', period: [date(item?.serviceStartedAt), date(item?.serviceEndsAt)].join(' ~ '),
        spec: item?.title ?? '-', paymentMethod: order.paymentStatus } }),
      points: points.items.map(item => ({ id: item.id, date: date(item.occurredAt), detail: item.reason ?? item.sourceType,
        type: item.amount >= 0 ? '적립' : '사용', amount: Math.abs(item.amount).toLocaleString('ko-KR') })),
      coupons: coupons.items.map(item => ({ id: item.userCouponId, name: item.name, value: money(item.discountType, item.discountValue),
        condition: `${item.minOrderAmount.toLocaleString('ko-KR')}원 이상`, expiresAt: date(item.expiresAt ?? item.endsAt),
        usedAt: item.status === 'used' ? '사용완료' : '', orderId: '' })), couponOffers: [],
      inquiries: inquiries.items.map(item => ({ id: String(item.operationRequestId), inquiryId: item.requestNo, type: item.requestType,
        title: item.title, content: '', status: item.customerVisibleStatus, createdAt: date(item.createdAt), rcpcIds: [], answer: '' })),
      managers: managers.map((item, index) => ({ id: String(item.memberId), managerId: String(item.memberId), name: item.name ?? item.username,
        loginId: item.username, assignedRcpcIds: managerDetails[index]?.rcpcs.map((rcpc) => String(rcpc.rentalId)) ?? [], assignmentHistory: [],
        memo: item.managementMemo ?? '', status: item.status === 'active' ? '활성' : item.status })),
      storage: storage.items.map(item => ({ id: item.id, type: item.pricingType === 'rental' ? 'rental' : 'part', rowKind: 'normal',
        label: item.productTitle ?? item.productNo ?? '보관 상품', productId: item.productId ?? item.id, source: 'api',
        billingUnit: ['thirty_day', 'day', 'hour', 'unit'].includes(item.billingUnit ?? '') ? item.billingUnit : 'unit', durationUnits: item.minUnits,
        instantAvailable: null, priceChanged: false, checkoutEligible: true, quantityEditable: false, issues: [], quotedAmount: item.unitPrice,
        location: '-', image: null, spec: item.managementNo, available: item.status === 'stored', setupFee: item.setupFee,
        rentalFee: item.unitPrice, quantity: 1, minimumQuantity: 1, maximumQuantity: item.maxUnits })),
      favoriteGroups: [{ id: 'unclassified', label: '미분류', parentId: null }, ...flattenGroups(groups)],
    })
  }
}
