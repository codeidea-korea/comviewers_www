import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useServices } from '../ServiceProvider'
import { useSession } from './SessionProvider'

export function useSessionProfileImage() {
  const session = useSession()
  const { readApi, profileMutations } = useServices().myAccount
  const enabled = session.status === 'authenticated'
    && session.customerSession?.memberRole === 'owner'
    && Boolean(readApi && profileMutations)
  const profile = useQuery({
    queryKey: ['my-account', 'read', 'profile'],
    queryFn: ({ signal }) => readApi!.profile(signal),
    enabled,
    staleTime: 30_000,
    retry: false,
  })
  const attachmentId = enabled ? profile.data?.profileImageAttachmentId : null
  const image = useQuery({
    queryKey: ['my-account', 'profile-image', attachmentId],
    queryFn: ({ signal }) => profileMutations!.downloadImage(signal),
    enabled: enabled && Boolean(attachmentId),
    staleTime: Infinity,
    retry: false,
  })
  const [preview, setPreview] = useState<{ blob: Blob; url: string } | null>(null)
  useEffect(() => {
    if (!attachmentId || !image.data) return
    const url = URL.createObjectURL(image.data)
    setPreview({ blob: image.data, url })
    return () => URL.revokeObjectURL(url)
  }, [attachmentId, image.data])

  return attachmentId && preview?.blob === image.data ? preview?.url ?? '' : ''
}
