export interface PublicAttachmentMetadata {
  id: number
  fileName: string
  mimeType?: string
  contentType?: string
  fileSize?: number
  fileSizeBytes?: number | null
  downloadUrl?: string | null
}

const knownFormats: Readonly<Record<string, string>> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
  'text/plain': 'TXT',
}

function attachmentSize(value: number | null | undefined) {
  if (value === undefined || value === null) return ''
  return value >= 1024 * 1024
    ? `${Math.ceil(value / 1024 / 1024)}MB`
    : `${Math.ceil(value / 1024)}KB`
}

export function publicApiResourceUrl(value: string | null | undefined, baseUrl: string) {
  if (!value?.startsWith('/api/') || /[\\?#\s\u0000-\u001f\u007f]/.test(value)) return undefined
  const normalizedBase = baseUrl.replace(/\/$/, '')
  if (!normalizedBase) return value
  if (normalizedBase.startsWith('/')) return `${normalizedBase}${value}`
  try {
    const base = new URL(`${normalizedBase}/`)
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) return undefined
    return new URL(value, base).toString()
  } catch {
    return undefined
  }
}

export function toPublicAttachment(file: PublicAttachmentMetadata, baseUrl: string) {
  return {
    id: String(file.id),
    name: file.fileName,
    size: attachmentSize(file.fileSize ?? file.fileSizeBytes),
    type: file.mimeType ?? file.contentType ?? '',
    href: publicApiResourceUrl(file.downloadUrl, baseUrl),
  }
}

export function attachmentFormat(file: { name: string; type: string }) {
  if (knownFormats[file.type]) return knownFormats[file.type]
  const extension = file.name.split('.').pop()?.trim()
  return extension && extension !== file.name ? extension.toUpperCase() : '파일'
}
