import type { AriaRole } from 'react'

interface ConnectionProps {
  className: string; copyIcon: string; eyeIcon: string; eyeOffIcon: string; remoteIcon: string; webIcon: string
  mobileLabel?: string; role?: AriaRole; passwordDataAttribute?: string; wanIp?: string
  remote: string; password: string; passwordVisible: boolean
  onCopy: (label: string, value: string) => unknown; onTogglePassword: () => void
}

// Credential delivery must be authorized by the future API, never inferred from fixture data.
export function RcpcConnectionInfo({ className, copyIcon, eyeIcon, mobileLabel, remote, remoteIcon, role, webIcon }: ConnectionProps) {
  const prefix = className.startsWith('mypage-home') ? 'mypage-home-rcpc' : 'rcpc-list'
  return <div className={`${className} rcpc-connection-info`} data-mobile-label={mobileLabel} role={role}>
    <p><b><img alt="" data-icon="web" src={webIcon}/>WAN IP</b><small>-</small></p>
    <p><b><img alt="" data-icon={remote.toLowerCase().startsWith('team') ? 'teamviewer' : 'anydesk'} src={remoteIcon}/>{remote}</b><small><span>ID - <button aria-label="ID 복사" className={`${prefix}__copy-button`} disabled type="button"><img alt="" className={`${prefix}__copy`} src={copyIcon}/></button></span>{prefix === 'rcpc-list' ? <br/> : null}<span><span>PW -</span><span className={`${prefix}__password-actions`}><button aria-label="비밀번호 조회" className={`${prefix}__password-toggle`} disabled type="button"><img alt="" src={eyeIcon}/></button><button aria-label="비밀번호 복사" className={`${prefix}__copy-button`} disabled type="button"><img alt="" className={`${prefix}__copy`} src={copyIcon}/></button></span></span></small></p>
  </div>
}
