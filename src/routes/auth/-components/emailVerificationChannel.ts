import { z } from 'zod'

const channelName = 'comviewers.email-verification'
const resultSchema = z.object({ requestId: z.string().min(1), verificationProof: z.string().min(1).max(200), expiresAt: z.string() })
export type EmailVerificationResult = z.infer<typeof resultSchema>

export function listenForEmailVerification(requestId: string, receive: (result: EmailVerificationResult) => void) {
  if (!requestId || typeof BroadcastChannel === 'undefined') return () => {}
  const channel = new BroadcastChannel(channelName)
  channel.onmessage = (event: MessageEvent<unknown>) => {
    const parsed = resultSchema.safeParse(event.data)
    if (parsed.success && parsed.data.requestId === requestId) receive(parsed.data)
  }
  return () => channel.close()
}

export function deliverEmailVerification(result: EmailVerificationResult) {
  if (typeof BroadcastChannel === 'undefined') return false
  const channel = new BroadcastChannel(channelName)
  channel.postMessage(result)
  channel.close()
  return true
}

export function verificationTokenFromLink(input: string) {
  const value = input.trim()
  if (/^[A-Za-z0-9_-]{43}$/.test(value)) return value
  try {
    const url = new URL(value)
    const token = url.searchParams.get('token') ?? ''
    if (['https:', 'http:'].includes(url.protocol) && /^[A-Za-z0-9_-]{43}$/.test(token)) return token
  } catch { /* Invalid links are reported by the caller; no URL is fetched. */ }
  throw new Error('메일에 있는 인증 링크를 확인해 주세요.')
}
