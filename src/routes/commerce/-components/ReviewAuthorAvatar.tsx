import { useEffect, useState } from 'react'
import { useServices } from '@/app/ServiceProvider'

export function ReviewAuthorAvatar({ path, fallback }: { path: string | null; fallback: string }) {
  const { reviews } = useServices()
  const [source, setSource] = useState('')
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setSource(''); setFailed(false)
    if (!path || !reviews.downloadAvatar) return
    const controller = new AbortController()
    let objectUrl = ''
    void reviews.downloadAvatar(path, controller.signal).then(blob => {
      if (controller.signal.aborted) return
      objectUrl = URL.createObjectURL(blob)
      setSource(objectUrl)
    }).catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [path, reviews])
  return <img alt="작성자 프로필" src={source || fallback} title={failed ? '프로필 이미지를 불러오지 못했습니다.' : undefined} />
}
