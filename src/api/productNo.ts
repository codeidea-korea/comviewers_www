import { z } from 'zod'

// Public codes are strings; legacy numeric codes remain readable during rollout.
export const productNoCodeSchema = z.string().trim().toUpperCase().refine(value =>
  /^[0-9A-HJKMNP-TV-Z]{10}$/.test(value)
  || (/^[1-9]\d{0,15}$/.test(value) && BigInt(value) <= BigInt(Number.MAX_SAFE_INTEGER)),
'품번을 확인해 주세요.')
const legacyProductNo = z.number().int().positive().safe().transform(String)
export const productNoResponseSchema = z.union([productNoCodeSchema, legacyProductNo])
export const productNoPathSchema = productNoCodeSchema
export const productNoSearchSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9]*$/, '품번은 영문과 숫자로 입력해 주세요.').max(16)
