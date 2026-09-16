import type { AccountProfileRead } from '@/api/myAccountSchemas'

export interface ProfileEditorValues {
  name: string
  nickname: string
  emailLocal: string
  emailDomain: string
  phonePrefix: string
  phoneMiddle: string
  phoneLast: string
  messengerType: string
  messengerId: string
  marketingEmailAgreed: boolean
  newPassword: string
  newPasswordConfirm: string
}

function profilePasswordError(password: string, currentPassword: string) {
  if (!/^[A-Za-z0-9!@#$%]{8,16}$/.test(password)) return '비밀번호는 8~16자의 영문, 숫자 및 허용된 특수문자를 사용해 주세요.'
  return password === currentPassword ? '현재 비밀번호와 다른 비밀번호를 입력해 주세요.' : ''
}

export function getProfileFieldErrors(values: ProfileEditorValues, currentPassword: string) {
  const { name, nickname, emailLocal, emailDomain, phoneMiddle, phoneLast, messengerType, messengerId, newPassword, newPasswordConfirm } = values
  const wantsPasswordChange = Boolean(newPassword || newPasswordConfirm)
  return {
    password: wantsPasswordChange ? profilePasswordError(newPassword, currentPassword) : '',
    passwordConfirm: wantsPasswordChange && newPassword !== newPasswordConfirm ? '비밀번호가 일치하지 않습니다.' : '',
    name: !/^[가-힣A-Za-z'-]{1,18}$/.test(name) ? '이름은 1~18자의 한글, 영문, 하이픈, 아포스트로피만 사용할 수 있습니다.' : '',
    nickname: !/^[가-힣A-Za-z0-9]{1,18}$/.test(nickname) ? '닉네임은 1~18자의 한글, 영문, 숫자만 사용할 수 있습니다.' : '',
    email: !emailLocal || !emailDomain || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(`${emailLocal}@${emailDomain}`) ? '이메일 주소를 확인해 주세요.' : '',
    phone: phoneMiddle || phoneLast ? !/^\d{1,4}$/.test(phoneMiddle) || !/^\d{1,4}$/.test(phoneLast) ? '휴대폰 번호를 모두 입력해 주세요.' : '' : '',
    messenger: Boolean(messengerType.trim()) !== Boolean(messengerId.trim()) ? '메신저 종류와 아이디를 함께 입력해 주세요.' : '',
  }
}

export function getChangedProfileFields(profile: AccountProfileRead, values: ProfileEditorValues) {
  const { name, nickname, phonePrefix, phoneMiddle, phoneLast, messengerType, messengerId, marketingEmailAgreed } = values
  const phone = phoneMiddle || phoneLast ? `${phonePrefix}-${phoneMiddle}-${phoneLast}` : ''
  return {
    ...(name !== (profile.name ?? '') ? { name } : {}),
    ...(nickname !== (profile.nickname ?? '') ? { nickname } : {}),
    ...(phone !== (profile.phone ?? '') ? { phone } : {}),
    ...(messengerType !== (profile.messengerType ?? '') || messengerId !== (profile.messengerId ?? '') ? { messengerType, messengerId } : {}),
    ...(marketingEmailAgreed !== profile.marketingEmailAgreed ? { marketingEmailAgreed } : {}),
  }
}
