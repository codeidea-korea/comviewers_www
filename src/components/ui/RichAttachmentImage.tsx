import { useEffect, useState } from 'react'
import type { EditorImageLoader } from './richTextEditorImages'

function safeHref(href?: string): string {
  if (!href || href.includes('\\') || /[\u0000-\u0020]/.test(href) || href.startsWith('//')) return ''
  return href.startsWith('/') || /^https?:\/\//i.test(href) ? href : ''
}

export function RichAttachmentImage({ attachmentId, name = '본문 이미지', loadImage, href }: {
  attachmentId: number; name?: string; loadImage?: EditorImageLoader; href?: string
}) {
  const [attempt, setAttempt] = useState(0)
  const [preview, setPreview] = useState<{ id: number; url: string; failed: boolean } | null>(null)
  useEffect(() => {
    if (!loadImage) return
    let active = true
    let url = ''
    void loadImage(attachmentId).then(blob => {
      if (!active) return
      if (!/^image\/(png|jpeg|gif|webp)$/i.test(blob.type)) throw new Error('Invalid image type')
      url = URL.createObjectURL(blob)
      setPreview({ id: attachmentId, url, failed: false })
    }).catch(() => { if (active) setPreview({ id: attachmentId, url: '', failed: true }) })
    return () => { active = false; if (url) URL.revokeObjectURL(url) }
  }, [attachmentId, loadImage, attempt])
  const src = loadImage ? (preview?.id === attachmentId ? preview.url : '') : safeHref(href)
  if (!src) return <span>{name}{loadImage && preview?.id === attachmentId && preview.failed ? <> — 이미지를 불러오지 못했습니다. <button type="button" onClick={() => setAttempt(value => value + 1)}>다시 불러오기</button></> : null}</span>
  return <img alt={name} loading="lazy" src={src} style={{ maxWidth: '100%', height: 'auto' }} />
}
