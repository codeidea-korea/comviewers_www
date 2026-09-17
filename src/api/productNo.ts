import { z } from 'zod'

// JSON responses carry numeric product numbers; UI and URL boundaries use decimal text.
export const productNoResponseSchema = z.number().int().positive().safe().transform(String)
export const productNoPathSchema = z.string().regex(/^[1-9]\d*$/, '품번은 숫자만 입력해 주세요.')
  .refine((value) => /^[1-9]\d*$/.test(value) && BigInt(value) <= BigInt(Number.MAX_SAFE_INTEGER), '품번을 확인해 주세요.')
export const productNoSearchSchema = z.string().trim().regex(/^\d*$/, '품번은 숫자만 입력해 주세요.').max(16)
