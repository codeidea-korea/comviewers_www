import postImage from '../assets/figma/community-company/post-07.jpeg'

export const mockCommunityPosts = [
  { id: 'post-COMM-1001', postId: 'COMM-1001', number: 210, title: '원격 접속이 자주 끊기는데 확인할 설정이 있을까요?', author: 'comview0721', date: '2026.07.22', views: 42, comments: 4, isMine: true, image: postImage, attachments: [{ name: 'P-1784685075226-Czc8YYD.png', size: '3mb' }], content: ['최근 RCPC 사용 중 원격 접속이 간헐적으로 끊기는 현상이 있습니다.', '인터넷 속도는 정상인데 별도로 확인해야 할 네트워크 또는 AnyDesk 설정이 있는지 궁금합니다.', '비슷한 경험이 있으신 분들의 해결 방법도 부탁드립니다.'] },
  { id: 'post-COMM-1002', postId: 'COMM-1002', number: 209, title: '게임용으로 어떤 RCPC를 선택하면 좋을까요?', author: 'comview0720', date: '2026.07.22', views: 59, comments: 2 },
  { id: 'post-COMM-1003', postId: 'COMM-1003', number: 208, title: '결제 후 바로 이용 가능한가요?', author: 'comview0719', date: '2026.07.22', views: 21, comments: 2 },
  { id: 'post-COMM-1004', postId: 'COMM-1004', number: 207, title: '영상 편집 작업할 때 끊김 없이 사용할 수 있는 사양 추천 부탁드립니다.', author: 'comview0718', date: '2026.07.22', views: 31, comments: 2 },
  { id: 'post-COMM-1005', postId: 'COMM-1005', number: 206, title: '사용 중인 RCPC의 OS를 변경할 수 있나요?', author: 'comview0717', date: '2026.07.22', views: 25, comments: 1 },
  { id: 'post-COMM-1006', postId: 'COMM-1006', number: 205, title: '원격 접속 시 키보드·마우스 입력 지연이 어느 정도 발생하는지 궁금합니다.', author: 'comview0716', date: '2026.07.22', views: 18, comments: 2 },
]

export const mockCommunityComments = [
  { id: 'comment-01', commentId: 'COMMENT-1001', author: 'window0721', date: '2026.07.14 15:12', edited: true, avatar: 'face', content: '저는 공유기 재부팅하고 유선 연결로 바꾸니까 끊김이 많이 줄었습니다. 와이파이로 접속 중이면 먼저 유선 환경에서 테스트해보시는 걸 추천드려요.' },
  { id: 'comment-02', commentId: 'COMMENT-1002', author: 'rcpc0721', date: '2026.07.14 15:12', avatar: 'orange', content: 'AnyDesk 설정에서 화질을 너무 높게 잡아두면 접속이 불안정할 때가 있더라고요. 품질 우선보다 속도 우선으로 바꿔보세요.' },
  { id: 'comment-03', commentId: 'COMMENT-1003', author: '탈퇴한 회원', date: '2026.07.14 15:12', edited: true, avatar: 'face', content: '저도 비슷했는데, 인터넷 속도 자체는 정상이어도 순간적으로 패킷 손실이 생기면 원격 접속이 끊기는 경우가 있었습니다. 공유기 펌웨어 업데이트, 5GHz 와이파이 사용 여부, 백그라운드 다운로드 프로그램 실행 여부를 같이 확인해보면 좋을 것 같아요. 특히 회사나 공용 네트워크에서는 방화벽이나 보안 프로그램이 원격 접속을 제한하는 경우도 있어서, 가능하면 다른 네트워크 환경에서도 한 번 테스트해보시는 걸 추천드립니다.' },
  { id: 'comment-04', commentId: 'COMMENT-1004', author: 'fast0721', date: '2026.07.14 15:12', avatar: 'pink', content: '저도 비슷했는데, 인터넷 속도 자체는 정상이어도 순간적으로 패킷 손실이 생기면 원격 접속이 끊기는 경우가 있었습니다. 공유기 펌웨어 업데이트, 5GHz 와이파이 사용 여부, 백그라운드 다운로드 프로그램 실행 여부를 같이 확인해보면 좋을 것 같아요. 특히 회사나 공용 네트워크에서는 방화벽이나 보안 프로그램이 원격 접속을 제한하는 경우도 있어서, 가능하면 다른 네트워크 환경에서도 한 번 테스트해보시는 걸 추천드립니다.' },
]

export const mockRentalReviews = [
  { id: 'review-REVIEW-1001', reviewId: 'REVIEW-1001', productId: '89023', productName: '게임용 RCPC', center: 'IRC코리아/메가서버실', rating: 4, author: 'comview0720', date: '2026.07.22', content: 'RCPC를 약 6개월간 사용하면서 느낀 점을 공유합니다. 초기 설정이 직관적이어서 별도 교육 없이도 빠르게 적응할 수 있었습니다. 원격 접속 속도가 안정적이고, 파일 전송 기능도 대용량 자료를 다룰 때 매우 유용했습니다. 특히 다중 모니터 환경에서도 화면 전환이 매끄러워 업무 효율이 크게 향상되었습니다. 보안 측면에서도 이중 인증과 접속 로그 관리 기능이 잘 갖춰져 있어 안심하고 사용할 수 있었습니다. 다만 간헐적으로 네트워크 환경에 따라 화면 지연이 발생하는 경우가 있었고, 모바일 앱의 UI가 데스크톱에 비해 다소 불편한 점은 개선되면 좋겠습니다. 고객 지원팀의 응대는 신속하고 친절하여 만족스러웠습니다. 전반적으로 업무용 원격 솔루션으로 충분히 추천할 만한 서비스입니다.' },
  { id: 'review-REVIEW-1002', reviewId: 'REVIEW-1002', productId: '89024', productName: '사무실용 RCPC', center: '서울 서버실', rating: 5, author: 'window0721', date: '2026.07.22', content: '업무용 프로그램을 여러 개 실행해도 안정적이고 외부에서도 같은 환경을 이용할 수 있어 편리했습니다.' },
  { id: 'review-REVIEW-1003', reviewId: 'REVIEW-1003', productId: '89025', productName: '디자인 작업용 RCPC', center: '부산 서버실', rating: 4, author: 'test0721', date: '2026.07.21', content: '그래픽 작업과 렌더링 속도가 기대 이상이었습니다. 다음에도 같은 사양을 이용하고 싶습니다.' },
]

export const mockSupportArticles = [
  { id: 'support-NOTICE-1001', articleId: 'NOTICE-1001', number: '공지', title: '컴퓨터원격렌탈 서비스 이용 안내', date: '2026.07.22', pinned: true, content: ['언제 어디서나 렌탈몰에서 고성능 PC를 바로 사용해 보세요.', '렌탈로 여러 대 PC접속도 가능하며 학교, 학원, 연구, 개발, 주식, 게임, 스트리밍 등 다양한 환경에서 이용할 수 있습니다.'] },
  { id: 'support-NOTICE-1002', articleId: 'NOTICE-1002', number: '공지', title: 'RCPC 서비스 이용 안내', date: '2026.07.22', pinned: true },
  { id: 'support-NOTICE-1003', articleId: 'NOTICE-1003', number: '공지', title: 'RCPC 렌탈 상품 결제 및 이용 절차 안내', date: '2026.07.22', pinned: true },
  { id: 'support-GUIDE-1001', articleId: 'GUIDE-1001', number: 207, title: 'AnyDesk 접속 관련 권장 설정 안내', date: '2026.07.22' },
  { id: 'support-GUIDE-1002', articleId: 'GUIDE-1002', number: 206, title: '렌탈 기간 연장 및 상품 변경 신청 방법 안내', date: '2026.07.22' },
  { id: 'support-GUIDE-1003', articleId: 'GUIDE-1003', number: 205, title: '고객센터 운영 시간 및 문의 접수 방법 변경 안내', date: '2026.07.22' },
]

export const mockColocationApplicant = {
  businessNumber: '821-88-01743', representative: '최주호', managerName: '김담당', position: '매니저', emailId: 'comview', emailDomain: 'gmail.com', phone: ['010', '1234', '5678'], serverRoomName: '서버실1', messenger: 'Nimbuzz 님버즈',
}
