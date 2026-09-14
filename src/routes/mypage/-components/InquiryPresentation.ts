export const inquiryTypes = { as_request: 'AS·점검 요청', setup_change: '변경·교체·추가 요청', refund_cancel: '해지신청', inquiry: '기타 문의' } as const
export const inquiryTypeLabel = (value: string) => inquiryTypes[value as keyof typeof inquiryTypes] ?? value
export const inquiryTypeDescriptions: Record<keyof typeof inquiryTypes, string> = {
  as_request: 'RCPC의 접속 장애나 동작 이상에 대한 점검을 요청합니다.',
  setup_change: '이용 중인 RCPC의 환경 변경, 부품 교체 또는 추가를 문의합니다.',
  refund_cancel: '이용 종료와 환불을 문의합니다. 실제 환불 신청은 환불 신청 화면에서 별도로 진행합니다.',
  inquiry: '그 외 이용 관련 문의를 접수합니다.',
}
