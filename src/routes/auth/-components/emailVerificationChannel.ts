import { z } from 'zod'

const channelName = 'comviewers.email-verification'
const resultSchema = z.object({ requestId: z.string().min(1), verificationProof: z.string().min(1).max(200), expiresAt: z.string() })
const receivedSchema = z.object({ type: z.literal('received'), requestId: z.string().min(1) })
const signupCompletedSchema = z.object({ type: z.literal('signup-completed'), requestId: z.string().min(1), signupBonusPoints: z.number().int().nonnegative().optional() })
export type EmailVerificationResult = z.infer<typeof resultSchema>

export function listenForEmailVerification(requestId: string, receive: (result: EmailVerificationResult) => void) {
  if (!requestId || typeof BroadcastChannel === 'undefined') return () => {}
  const channel = new BroadcastChannel(channelName)
  channel.onmessage = (event: MessageEvent<unknown>) => {
    const parsed = resultSchema.safeParse(event.data)
    if (parsed.success && parsed.data.requestId === requestId) {
      channel.postMessage({ type: 'received', requestId })
      receive(parsed.data)
    }
  }
  return () => channel.close()
}

export function deliverEmailVerification(result: EmailVerificationResult): Promise<boolean> {
  if (typeof BroadcastChannel === 'undefined') return Promise.resolve(false)
  const channel = new BroadcastChannel(channelName)
  return new Promise(resolve => {
    const finish = (received: boolean) => { clearTimeout(timeout); channel.close(); resolve(received) }
    const timeout = setTimeout(() => finish(false), 1500)
    channel.onmessage = (event: MessageEvent<unknown>) => {
      const parsed = receivedSchema.safeParse(event.data)
      if (parsed.success && parsed.data.requestId === result.requestId) finish(true)
    }
    channel.postMessage(result)
  })
}

export function listenForSignupCompletion(requestId: string, receive: (signupBonusPoints?: number) => void) {
  if (!requestId || typeof BroadcastChannel === 'undefined') return () => {}
  const channel = new BroadcastChannel(channelName)
  channel.onmessage = (event: MessageEvent<unknown>) => {
    const parsed = signupCompletedSchema.safeParse(event.data)
    if (parsed.success && parsed.data.requestId === requestId) receive(parsed.data.signupBonusPoints)
  }
  return () => channel.close()
}

export function deliverSignupCompletion(requestId: string, signupBonusPoints?: number) {
  if (typeof BroadcastChannel === 'undefined') return
  const channel = new BroadcastChannel(channelName)
  channel.postMessage({ type: 'signup-completed', requestId, signupBonusPoints })
  channel.close()
}

export function verificationTokenFromLink(input: string) {
  const value = input.trim()
  if (/^[A-Za-z0-9_-]{43}$/.test(value)) return value
  try {
    const url = new URL(value)
    const token = url.searchParams.get('token') ?? ''
    if (['https:', 'http:'].includes(url.protocol) && /^[A-Za-z0-9_-]{43}$/.test(token)) return token
  } catch { /* Invalid links are reported by the caller; no URL is fetched. */ }
  throw new Error('이미 사용되었거나 유효하지 않은 링크입니다.')
}
