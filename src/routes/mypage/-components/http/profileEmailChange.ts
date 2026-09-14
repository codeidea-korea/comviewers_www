export interface ProfileEmailChange {
  nextEmail: string
  wantsEmailChange: boolean
}

export function profileEmailChange(
  currentEmail: string | null,
  emailLocal: string,
  emailDomain: string,
): ProfileEmailChange {
  const nextEmail = emailLocal || emailDomain ? `${emailLocal}@${emailDomain}` : ''
  return {
    nextEmail,
    wantsEmailChange: nextEmail !== (currentEmail ?? ''),
  }
}
