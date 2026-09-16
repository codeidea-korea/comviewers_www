import { useEffect, useState } from 'react'
import { useServices } from '@/app/ServiceProvider'
import defaultProfile from '@/assets/figma/user-profile.svg'

export function ProfileAvatar({ attachmentId }: { attachmentId?: string | null }) {
  const mutations = useServices().myAccount.profileMutations
  const [source, setSource] = useState('')
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!attachmentId || !mutations) return
    const controller = new AbortController()
    let objectUrl = ''
    void mutations.downloadImage(controller.signal).then(blob => {
      if (controller.signal.aborted) return
      objectUrl = URL.createObjectURL(blob)
      setSource(objectUrl)
    }).catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [attachmentId, mutations])
  return <img alt="프로필" src={source || defaultProfile} title={failed ? '프로필 이미지를 불러오지 못했습니다.' : undefined}/>
}
