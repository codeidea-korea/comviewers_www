import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

/** One timer per rendered RCPC table, shared by its period labels and action controls. */
export function useRcpcDateBoundary(organizationId: string) {
  const [, setRevision] = useState(0)
  const client = useQueryClient()
  useEffect(() => {
    let timer: number
    const refresh = () => {
      setRevision(previous => previous + 1)
      void client.invalidateQueries({ queryKey: ['my-rcpcs', organizationId] })
      void client.invalidateQueries({ queryKey: ['my-account', 'read', 'home-favorites'] })
      void client.invalidateQueries({ queryKey: ['my-account', 'read', 'home-rcpc-summary'] })
    }
    const schedule = () => {
      const untilMidnight = 86_400_000 - (Date.now() + 9 * 60 * 60 * 1000) % 86_400_000
      timer = window.setTimeout(() => { refresh(); schedule() }, untilMidnight + 50)
    }
    const resume = () => { window.clearTimeout(timer); refresh(); schedule() }
    schedule()
    window.addEventListener('focus', resume)
    return () => { window.clearTimeout(timer); window.removeEventListener('focus', resume) }
  }, [client, organizationId])
}
