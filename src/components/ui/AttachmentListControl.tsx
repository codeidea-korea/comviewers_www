import { attachmentFormat } from '../../domain/storefront/publicAttachment'

export interface AttachmentItem {
  id?: string
  name: string
  size: string
  type: string
  href?: string
}

export interface AttachmentListProps {
  attachments: readonly AttachmentItem[]
  className?: string
  downloadIcon?: string
  iconAlt?: string
}

export function AttachmentList({ attachments, className = '', downloadIcon, iconAlt = '' }: AttachmentListProps) {
  if (!attachments.length) return null
  return <section className={`attachment-list${className ? ` ${className}` : ''}`}>
    <h2>첨부파일 <b>{attachments.length}개</b></h2>
    {attachments.map((attachment) => attachment.href
      ? <a href={attachment.href} key={attachment.href} rel="noreferrer" target="_blank"><span>{attachment.name} <small>{attachmentFormat(attachment)}{attachment.size ? ` · ${attachment.size}` : ''}</small></span><img alt={iconAlt} aria-hidden={iconAlt ? undefined : 'true'} className="attachment-list__download" src={downloadIcon} /></a>
      : <button key={attachment.name} type="button"><span>{attachment.name} <small>{attachmentFormat(attachment)}{attachment.size ? ` · ${attachment.size}` : ''}</small></span><img alt={iconAlt} aria-hidden={iconAlt ? undefined : 'true'} className="attachment-list__download" src={downloadIcon} /></button>)}
  </section>
}
