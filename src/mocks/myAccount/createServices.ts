import { createAccountDraftServices } from './createDraftServices'
import { managerInputSchema, saveManagerSnapshot, assignManagerSnapshot, deleteManagerSnapshot } from '@/domain/myAccount/managerServices'
import { z } from 'zod'
import { myAccountSchema, storageItemSchema, type MyAccountServices } from '@/domain/myAccount/services'
import { mockRcpcs, mockOrders, mockPoints, mockCoupons, mockInquiries, mockManagers, mockProfile } from '../mypage'
import purpleProduct from '@/assets/figma/store/product-04.png'
import greenProduct from '@/assets/figma/store/product-02.png'
import orangeProduct from '@/assets/figma/store/product-03.png'

type StorageFixture = Pick<z.input<typeof storageItemSchema>,
  'id' | 'image' | 'type' | 'available' | 'rentalFee' | 'setupFee' | 'quantity'> & { price: number }

export function createMyAccountServices(): MyAccountServices {
  const initial: z.input<typeof myAccountSchema> = {
    rcpcs: mockRcpcs.map((item, index) => ({ ...item, wanIp: `192.0.2.${index + 1}`, remotePassword: '미연결', favorite: true, groupId: index === 0 ? 'office-1' : 'unclassified' })),
    orders: mockOrders.map((item, index) => ({ ...item, productId: String(89023 + index), rcpcId: mockRcpcs[index].rcpcId, period: '2026.07.01 ~ 2026.07.31', spec: 'Microsoft Windows 10 Pro (64Bit) / AMD Ryzen 3 2200G / DDR3 128G / SSD 120GB', paymentMethod: '샘플 카드결제' })),
    points: myAccountSchema.shape.points.parse(mockPoints), coupons: mockCoupons, inquiries: mockInquiries, managers: mockManagers,
    couponOffers: Array.from({ length: 5 }, (_, index) => ({ id: `demo-offer-${index + 1}`, name: '원주점 5만 이상 20% 할인', rate: 20, validityText: '다운로드 후 15일 이내', scopeText: '원주서버실' })),
    profile: { ...mockProfile, id: 'demo-user', email: 'demo@example.invalid', phone: '010-0000-0000' },
    pointBalance: 21230,
    favoriteGroups: [{ id: 'office', label: '사무실', parentId: null }, { id: 'office-1', label: '발산', parentId: 'office' }, { id: 'unclassified', label: '미분류', parentId: null }],
    storage: ([
      { id: 'storage-rental-purple', image: purpleProduct, type: 'rental', available: true, rentalFee: 32000, setupFee: 5000, price: 0, quantity: 1 },
      { id: 'storage-part-purple', image: purpleProduct, type: 'part', available: true, rentalFee: 120000, setupFee: 0, price: 120000, quantity: 1 },
      { id: 'storage-rental-green', image: greenProduct, type: 'rental', available: true, rentalFee: 32000, setupFee: 5000, price: 0, quantity: 1 },
      { id: 'storage-rental-orange', image: orangeProduct, type: 'rental', available: false, rentalFee: 32000, setupFee: 5000, price: 0, quantity: 1 },
    ] satisfies StorageFixture[]).map((item, index) => ({ ...item, productId: String(89023 + index), label: item.type === 'part' ? '샘플 파트 상품' : `샘플 RCPC ${89023 + index}`, location: '샘플 서버실', spec: item.type === 'part' ? '샘플 파트 상품 사양' : 'Windows / AMD Ryzen / DDR3 128G / SSD 120GB', rowKind: item.type === 'part' ? 'partner' : !item.available ? 'waiting' : index === 2 ? 'normal' : 'connected', maximumQuantity: item.type === 'rental' ? 3 : null })),
  }
  let snapshot = myAccountSchema.parse(initial)
  return {
    ...createAccountDraftServices(() => snapshot),
    async isManagerLoginAvailable(loginId) {
      const value = managerInputSchema.shape.loginId.parse(loginId).toLowerCase()
      return !snapshot.managers.some((item) => item.loginId.toLowerCase() === value) && snapshot.profile.userId.toLowerCase() !== value
    },
    async saveManager(input) { snapshot = saveManagerSnapshot(snapshot, input) },
    async assignManager(input) { snapshot = assignManagerSnapshot(snapshot, input) },
    async deleteManager(id) { snapshot = deleteManagerSnapshot(snapshot, id) },
    async read() { return myAccountSchema.parse(snapshot) },
    async removeStorage(ids) {
      const selected = z.array(z.string().min(1)).parse(ids)
      snapshot = { ...snapshot, storage: snapshot.storage.filter((item) => !selected.includes(item.id)) }
    },
    async changeStorageQuantity(id, quantity) {
      const item = snapshot.storage.find((candidate) => candidate.id === id)
      if (!item) throw new Error('보관함 상품을 찾을 수 없습니다.')
      const next = storageItemSchema.parse({ ...item, quantity }).quantity
      snapshot = { ...snapshot, storage: snapshot.storage.map((candidate) => candidate.id === id ? { ...candidate, quantity: next } : candidate) }
    },
    async addFavoriteGroup(label, parentId) {
      const name = z.string().trim().min(1, '그룹명을 입력해 주세요.').max(30, '그룹명은 최대 30자까지 입력할 수 있습니다.').parse(label)
      const groups = snapshot.favoriteGroups.filter((group) => group.id !== 'unclassified')
      if (parentId && !groups.some((group) => group.id === parentId && group.parentId === null)) throw new Error('상위 그룹을 확인해 주세요.')
      if (groups.length >= 100 || groups.filter((group) => group.parentId === parentId).length >= (parentId ? 20 : 10)) throw new Error('즐겨찾기 그룹 생성 한도에 도달했습니다.')
      snapshot = { ...snapshot, favoriteGroups: [...snapshot.favoriteGroups, { id: `mock-group-${crypto.randomUUID()}`, label: name, parentId }] }
    },
    async moveFavorites(rcpcIds, groupId) {
      if (!snapshot.favoriteGroups.some((group) => group.id === groupId)) throw new Error('그룹을 찾을 수 없습니다.')
      snapshot = { ...snapshot, rcpcs: snapshot.rcpcs.map((item) => rcpcIds.includes(item.id) ? { ...item, groupId } : item) }
    },
  }
}
