export const emailDomainOptions = ['naver.com', 'gmail.com', 'daum.net', 'kakao.com']

export const phonePrefixOptions = ['010', '011', '016', '017', '018', '019']

export const messengerOptions = [
  'WhatsApp', 'Facebook', 'WeChat', 'LINE', 'Zalo', 'Skype', 'Viber', 'Tango',
  'Nimbuzz 님버즈', '카카오톡', 'kik', '텔레그램', 'Hike',
]

const messengerOptionLabels: Readonly<Record<string, string>> = {
  WhatsApp: 'WhatsApp 왈츠앱', Facebook: 'Facebook 페이스북', WeChat: 'WeChat 微信/위챗',
  LINE: 'LINE 라인', Zalo: 'Zalo 잘로', Skype: 'Skype 스카이프', Viber: 'Viber 바이버',
  Tango: 'Tango 탱고', 'Nimbuzz 님버즈': 'Nimbuzz 님버즈', '카카오톡': 'KakaoTalk 카카오톡',
  kik: 'kik 킥', '텔레그램': 'Telegram 텔레그램', Hike: 'Hike 하이크',
}

export const messengerOptionLabel = (value: string) => messengerOptionLabels[value] ?? value

export const inquiryTypeOptions = ['기타 문의', 'AS·점검 요청', '변경·교체·추가 요청', '해지신청']
export const inquiryStatusOptions = ['접수', '처리 중', '처리완료']
export const sortOptions = [
  { label: '최신순', value: 'latest' },
  { label: '오래된순', value: 'oldest' },
  { label: '조회순', value: 'views' },
]
