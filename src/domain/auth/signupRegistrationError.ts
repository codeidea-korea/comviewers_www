export function signupRegistrationErrorMessage(code: string | undefined): string | undefined {
  return code === 'U002' ? '이미 존재하는 이메일입니다.' : undefined
}
