import { z } from 'zod'

export const loginIdSchema = z.string().regex(/^[A-Za-z0-9_]{3,20}$/, '3~20자의 영문, 숫자, 밑줄(_)만 사용할 수 있습니다.')
export const passwordSchema = z.string()
  .regex(/^[A-Za-z0-9!@#$%]*$/, '비밀번호에 사용할 수 없는 문자가 포함되어 있습니다. 영문, 숫자, 특수문자(!, @, #, $, %)만 사용해 주세요.')
  .regex(/^(?=.*[A-Za-z])(?=.*[0-9])(?=.*[!@#$%])[A-Za-z0-9!@#$%]{8,16}$/, '비밀번호는 8~16자로 영문, 숫자, 특수문자(!, @, #, $, %)를 각각 1개 이상 포함해 주세요.')
export const nameSchema = z.string().trim().regex(/^[가-힣A-Za-z'-]{1,18}$/, '이름은 1~18자의 한글, 영문, 하이픈, 아포스트로피만 사용할 수 있습니다.')
export const nicknameSchema = z.string().trim().regex(/^[가-힣A-Za-z0-9]{1,18}$/, '닉네임은 1~18자의 한글, 영문, 숫자만 사용할 수 있습니다.')
export const emailSchema = z.email('이메일 주소를 확인해 주세요.').max(100, '이메일은 100자 이하로 입력해 주세요.')

export const profileInputSchema = z.object({
  loginId: loginIdSchema,
  password: passwordSchema, passwordConfirm: z.string().min(1, '비밀번호 확인을 입력해 주세요.'),
  name: nameSchema,
  nickname: nicknameSchema,
  email: emailSchema,
  phone1: z.string().regex(/^\d{2,4}$/, '휴대폰 번호는 숫자만 입력해 주세요.'),
  phone2: z.string().regex(/^\d{0,4}$/, '휴대폰 번호는 각 칸에 숫자 4자리 이하로 입력해 주세요.'),
  phone3: z.string().regex(/^\d{0,4}$/, '휴대폰 번호는 각 칸에 숫자 4자리 이하로 입력해 주세요.'),
  messenger: z.string().max(50),
  messengerId: z.string().max(100),
}).refine((value) => value.password === value.passwordConfirm, { message: '비밀번호가 일치하지 않습니다.', path: ['passwordConfirm'] })
  .refine((value) => Boolean(value.phone2) === Boolean(value.phone3), { message: '휴대폰 번호를 모두 입력해 주세요.', path: ['phone2'] })
  .refine((value) => Boolean(value.messenger.trim()) === Boolean(value.messengerId.trim()), { message: '메신저 종류와 아이디를 함께 입력해 주세요.', path: ['messenger'] })

