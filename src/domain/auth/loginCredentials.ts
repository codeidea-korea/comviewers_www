import { z } from 'zod'

export const LOGIN_ID_HELPER_TEXT = '3~20자의 영문, 숫자, 밑줄(_)만 사용할 수 있습니다.'
export const LOGIN_PASSWORD_HELPER_TEXT = '8~16자의 영문, 숫자, 특수문자(!, @, #, $, %)만 사용할 수 있습니다.'

export const LOGIN_ID_PATTERN = '[A-Za-z0-9_]{3,20}'
export const LOGIN_PASSWORD_PATTERN = '[A-Za-z0-9!@#$%]{8,16}'

export const loginCredentialsSchema = z.object({
  username: z.string().regex(/^[A-Za-z0-9_]{3,20}$/),
  password: z.string().regex(/^[A-Za-z0-9!@#$%]{8,16}$/),
  autoLogin: z.boolean(),
})

export type LoginCredentials = z.infer<typeof loginCredentialsSchema>
