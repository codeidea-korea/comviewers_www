import { z } from 'zod'

export const LOGIN_USERNAME_MAX_LENGTH = 50

export function restoreRememberedLoginId(value: string | null): string {
  return value?.slice(0, LOGIN_USERNAME_MAX_LENGTH) ?? ''
}

export const loginCredentialsSchema = z.object({
  // Existing accounts are authenticated by the server. Signup-only format rules
  // must not reject a legacy credential before it reaches that boundary.
  username: z.string().trim().min(1).max(LOGIN_USERNAME_MAX_LENGTH),
  password: z.string().min(1).max(100).refine((value) => value.trim().length > 0),
  autoLogin: z.boolean(),
})

export type LoginCredentials = z.infer<typeof loginCredentialsSchema>
