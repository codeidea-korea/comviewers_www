import windowsBackground from '../assets/figma/cart-product-waiting.png'

export const mockRcpcs = [
  { id: 'rcpc-89023', rcpcId: '89023', alias: '게임용', company: 'IRC코리아', center: '메가서버실', status: '연장대기', daysLeft: 21, startedAt: '2026.07.01', endsAt: '2026.07.31', wanIp: '221.144.195.6', remote: 'AnyDesk', remotePassword: '12345678', disk: '250GB', traffic: '128GB / 1TB', state: '실행 중' },
  { id: 'rcpc-84568', rcpcId: '84568', alias: '사무실용', company: '컴퓨컴퓨1', center: '서울 서버실', status: '이용중', daysLeft: 17, startedAt: '2026.07.01', endsAt: '2026.07.31', wanIp: '211.110.48.31', remote: 'TeamViewer', remotePassword: '12345678', disk: '500GB', traffic: '84GB / 1TB', state: '종료' },
  { id: 'rcpc-90112', rcpcId: '90112', alias: '디자인 작업용', company: '컴퓨컴퓨컴퓨컴퓨컴1', center: '부산 서버실', status: '확인 필요', daysLeft: 9, startedAt: '2026.06.20', endsAt: '2026.07.20', wanIp: '211.110.48.42', remote: 'AnyDesk', remotePassword: '12345678', disk: '1TB', traffic: '320GB / 1TB', state: '이용종료' },
]

export const mockOrders = [
  { id: 'order-20260707123456789', orderId: '20260707123456789', orderedAt: '2026.07.07 17:21:23', status: '결제완료', item: '게임용 RCPC 외 1건', amount: 370000, image: windowsBackground },
  { id: 'order-20260701123456712', orderId: '20260701123456712', orderedAt: '2026.07.01 11:05:14', status: '이용중', item: '사무실용 RCPC', amount: 32000, image: windowsBackground },
  { id: 'order-20260618123456102', orderId: '20260618123456102', orderedAt: '2026.06.18 09:32:10', status: '구매확정', item: 'Microsoft Office 2024', amount: 120000, image: windowsBackground },
]

export const mockStorageItems = [
  { id: 'storage-01', productId: 89023, name: 'Windows 11 Pro 라이선스', storedAt: '2026.07.07', status: '사용 가능', image: windowsBackground },
  { id: 'storage-02', productId: 89024, name: 'Microsoft Office 2024', storedAt: '2026.07.01', status: '사용 완료', image: windowsBackground },
]

export const mockPoints = [
  { id: 'point-01', date: '2026.07.01', detail: '출석 포인트', type: '적립', amount: '+10P' },
  { id: 'point-02', date: '2026.06.28', detail: '상품 구매 사용', type: '사용', amount: '-2,500P' },
  { id: 'point-03', date: '2026.06.20', detail: 'RCPC 구매 적립', type: '적립', amount: '+1,240P' },
]

export const mockCoupons = [
  { id: 'coupon-01', name: '원주점 5만원 이상 20% 할인', value: '20% 할인', condition: '50,000원 이상 구매 시', expiresAt: '2026.08.31', usedAt: '', orderId: '' },
  { id: 'coupon-02', name: 'RCPC 신규회원 쿠폰', value: '5,000원', condition: 'RCPC 상품 구매 시', expiresAt: '2026.07.31', usedAt: '2026.07.08', orderId: '202607010123486' },
]

export const mockInquiries = [
  { id: 'inquiry-INQ-1001', inquiryId: 'INQ-1001', type: '기타 문의', title: '게임용_89023 서버실 답변', content: '교체 비용 확인 후 안내드리겠습니다.', status: '접수', createdAt: '2026.07.01 17:12:30', rcpcIds: ['89023'], answer: '본사 담당자 답변입니다.' },
  { id: 'inquiry-INQ-1002', inquiryId: 'INQ-1002', type: 'AS·점검 요청', title: '사무실용_84568 점검 요청', content: '원격 접속 상태를 확인해 주세요.', status: '처리 중', createdAt: '2026.06.29 13:41:22', rcpcIds: ['84568'], answer: '서버실 담당자가 확인 중입니다.' },
  { id: 'inquiry-INQ-1003', inquiryId: 'INQ-1003', type: '변경·교체·추가 요청', title: '메모리 증설 문의', content: '메모리 증설 가능 여부를 확인해 주세요.', status: '처리 완료', createdAt: '2026.06.18 10:20:10', rcpcIds: ['89023', '84568'], answer: '요청하신 증설 작업이 완료되었습니다.' },
]

export const mockManagers = [
  { id: 'manager-manager-01', managerId: 'manager-01', name: '김담당', loginId: 'manager01', assignedRcpcIds: ['89023', '84568'], memo: '야간 운영 담당자', status: '사용중' },
  { id: 'manager-manager-02', managerId: 'manager-02', name: '이담당', loginId: 'manger02', assignedRcpcIds: ['84568'], memo: '사무실용 RCPC 담당', status: '사용중' },
]

export const mockProfile = {
  id: 'publishing-user',
  userId: 'publishing_user',
  name: '김컴뷰',
  nickname: '컴퓨컴퓨1',
  email: 'publishing@codeidea.io',
  phone: '010-1234-5678',
  messenger: 'comviewers_user',
  marketingAgreedAt: '2026.07.18',
}
