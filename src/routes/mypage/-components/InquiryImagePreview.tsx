import { useEffect, useRef, useState } from 'react'
import { ApiClientError } from '@/api/httpClient'
import type { InquiryReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { useUiTranslation } from '@/i18n/uiTranslation'
import './inquiry-image-preview.css'

interface PreviewProps {
  api: InquiryReadServices
  requestId: number
  attachmentId: number
  mimeType: string
  fileName: string
  onAccessError: (error: Error) => void
}

type PreviewState = Pick<PreviewProps, 'api' | 'requestId' | 'attachmentId' | 'mimeType'> & {
  url?: string
  failed?: boolean
}

export function InquiryImagePreview({ api, requestId, attachmentId, mimeType, fileName, onAccessError }: PreviewProps) {
  const { uiText } = useUiTranslation()
  const container = useRef<HTMLSpanElement>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const imageType = mimeType.split(';')[0]?.trim().toLowerCase() ?? ''
  const isImage = ['image/png', 'image/jpeg', 'image/webp'].includes(imageType)
  const current = preview?.api === api && preview.requestId === requestId
    && preview.attachmentId === attachmentId && preview.mimeType === mimeType ? preview : null

  useEffect(() => {
    if (!isImage || !container.current) return
    const controller = new AbortController()
    const identity = { api, requestId, attachmentId, mimeType }
    let objectUrl = ''
    let started = false
    const load = () => {
      if (started || controller.signal.aborted) return
      started = true
      void api.downloadAttachment(requestId, attachmentId, controller.signal).then(blob => {
        if (controller.signal.aborted) return
        if (blob.type.split(';')[0]?.trim().toLowerCase() !== imageType) throw new Error('Unexpected image type')
        objectUrl = URL.createObjectURL(blob)
        setPreview({ ...identity, url: objectUrl })
      }).catch(error => {
        if (controller.signal.aborted) return
        setPreview({ ...identity, failed: true })
        if (error instanceof ApiClientError && [401, 403].includes(error.status ?? 0)) onAccessError(error)
      })
    }
    // Observe the clipped chat viewport so old messages do not download at once.
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer?.disconnect(); load() }
    })
    if (observer) observer.observe(container.current)
    else load()
    return () => {
      observer?.disconnect()
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [api, requestId, attachmentId, mimeType, imageType, isImage, onAccessError])

  if (!isImage) return null
  return <span className="inquiry-chat__image-preview" ref={container}>
    {current?.url && !current.failed
      ? <img src={current.url} alt={fileName} onError={() => setPreview({ api, requestId, attachmentId, mimeType, failed: true })} />
      : <span role="status">{uiText(current?.failed ? '이미지를 불러오지 못했습니다.' : '불러오는 중…')}</span>}
  </span>
}
