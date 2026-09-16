export function signupRegistrationErrorMessage(code: string | undefined): string | undefined {
  return code === 'U002' ? '이미 존재하는 이메일입니다.' : undefined
}

const signupCompletionErrorMessages: Readonly<Record<string, string>> = {
  A006: '비밀번호가 보안 정책에 맞지 않습니다. 아이디·이메일 앞부분 또는 자주 사용하는 비밀번호를 제외해 다시 입력해 주세요.',
  A007: '요청이 너무 많습니다. 잠시 후 회원가입을 다시 신청해 주세요.',
  A008: '현재 인증 요청을 처리할 수 없습니다. 잠시 후 회원가입을 다시 신청해 주세요.',
  A009: '이메일 인증 정보가 만료되었거나 현재 신청과 일치하지 않습니다. 회원가입을 다시 신청해 주세요.',
  A011: '회원가입 약관이 변경되었거나 확인되지 않았습니다. 약관 동의부터 다시 진행해 주세요.',
  C001: '입력한 회원정보를 확인한 뒤 회원가입을 다시 신청해 주세요.',
  C003: '서버 오류로 회원가입을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  U003: '입력한 회원정보를 확인한 뒤 회원가입을 다시 신청해 주세요.',
  U005: '이미 사용 중인 닉네임입니다. 다른 닉네임으로 다시 신청해 주세요.',
}

export function signupCompletionErrorMessage(code: string | undefined): string | undefined {
  if (code === 'U002') return signupRegistrationErrorMessage(code)
  return code ? signupCompletionErrorMessages[code] : undefined
}
