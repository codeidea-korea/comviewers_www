interface ValidationText {
  source: string
  values?: Readonly<Record<string, string | number>>
}

// Verified against Hibernate Validator 8.0.3.Final ValidationMessages(.properties / _ko.properties).
const fixedMessages: ReadonlyMap<string, string> = new Map([
  ['must not be blank', '공백일 수 없습니다'],
  ['must not be empty', '비어 있을 수 없습니다'],
  ['must not be null', '널이어서는 안됩니다'],
  ['must be null', '널이어야 합니다'],
  ['must be a well-formed email address', '올바른 형식의 이메일 주소여야 합니다'],
  ['must be true', 'true여야 합니다'],
  ['must be false', 'false여야 합니다'],
  ['must be greater than 0', '0보다 커야 합니다'],
  ['must be greater than or equal to 0', '0 이상이어야 합니다'],
  ['must be less than 0', '0 미만이어야 합니다'],
  ['must be less than or equal to 0', '0 이하여야 합니다'],
  ['must be a future date', '미래 날짜여야 합니다'],
  ['must be a date in the present or in the future', '현재 또는 미래의 날짜여야 합니다'],
  ['must be a past date', '과거 날짜여야 합니다'],
  ['must be a date in the past or in the present', '과거 또는 현재의 날짜여야 합니다'],
])
const fixedKoreanMessages: ReadonlySet<string> = new Set(fixedMessages.values())

type NumericRule = readonly [pattern: RegExp, source: string, names: readonly string[]]
const numericValue = '([+-]?\\d{1,40}(?:\\.\\d{1,40})?(?:[eE][+-]?\\d{1,4})?)'
const numericRules: readonly NumericRule[] = [
  [/^size must be between (\d{1,10}) and (\d{1,10})$/, '크기가 {min}에서 {max} 사이여야 합니다', ['min', 'max']],
  [/^크기가 (\d{1,10})에서 (\d{1,10}) 사이여야 합니다$/, '크기가 {min}에서 {max} 사이여야 합니다', ['min', 'max']],
  [new RegExp(`^must be greater than or equal to ${numericValue}$`), '값은 {value} 이상이어야 합니다', ['value']],
  [new RegExp(`^must be less than or equal to ${numericValue}$`), '값은 {value} 이하여야 합니다', ['value']],
  [new RegExp(`^must be greater than ${numericValue}$`), '값은 {value}보다 커야 합니다', ['value']],
  [new RegExp(`^must be less than ${numericValue}$`), '값은 {value}보다 작아야 합니다', ['value']],
  [new RegExp(`^${numericValue} 이상이어야 합니다$`), '값은 {value} 이상이어야 합니다', ['value']],
  [new RegExp(`^${numericValue} 이하여야 합니다$`), '값은 {value} 이하여야 합니다', ['value']],
  [new RegExp(`^다음 값 이상이어야 합니다 ${numericValue}$`), '값은 {value} 이상이어야 합니다', ['value']],
  [new RegExp(`^다음 값 이하여야 합니다 ${numericValue}$`), '값은 {value} 이하여야 합니다', ['value']],
  [new RegExp(`^다음 값 이상이어야 합니다${numericValue}$`), '값은 {value}보다 커야 합니다', ['value']],
  [new RegExp(`^다음 값 이하여야 합니다${numericValue}$`), '값은 {value}보다 작아야 합니다', ['value']],
  [/^numeric value out of bounds \(<(\d{1,10}) digits>\.<(\d{1,10}) digits> expected\)$/, '숫자는 정수부 {integer}자리, 소수부 {fraction}자리 이하여야 합니다', ['integer', 'fraction']],
  [/^숫자 값이 한계를 초과합니다\(<(\d{1,10}) 자리>\.<(\d{1,10}) 자리> 예상\)$/, '숫자는 정수부 {integer}자리, 소수부 {fraction}자리 이하여야 합니다', ['integer', 'fraction']],
]

// Only patterns declared in customer request DTOs are recognized. User content is never a template.
const customerPatterns: ReadonlySet<string> = new Set([
  '(?:|[0-9+() -]{8,30})', '[0-9 -]{8,40}', '[0-9]{2,3}', '[a-f0-9]{64}', '[A-Za-z0-9_-]{6,64}',
  '^(?:|[0-9]{2,4}-[0-9]{1,4}-[0-9]{1,4})$', '^[0-9-]{0,30}$', '^[0-9a-fA-F-]{36}$', '^[1-9][0-9]{0,18}$',
  "^[가-힣A-Za-z'-]{1,18}$", '^[가-힣A-Za-z0-9]{1,10}$', '^[가-힣A-Za-z0-9]{1,18}$', '^[가-힣A-Za-z0-9]+$',
  '^[a-z][a-z0-9_.:-]*$', '^[A-Za-z0-9_]{5,16}$', '^[A-Za-z0-9_]+$',
  'card|payco|naver_pay|kakao_pay|virtual_account', 'not_requested|income_deduction|business_expense',
  'payment_reversal|bank_transfer', 'point|original', 'remote_id|password',
])

/** Resolve only complete, known validator messages; preserve unknown and customer-supplied text. */
export function resolveValidationErrorText(source: string): ValidationText | undefined {
  const fixed = fixedMessages.get(source)
  if (fixed) return { source: fixed }
  if (fixedKoreanMessages.has(source)) return { source }
  for (const [pattern, canonicalSource, names] of numericRules) {
    const match = pattern.exec(source)
    if (match?.[0] === source) return { source: canonicalSource, values: Object.fromEntries(names.map((name, index) => [name, match[index + 1]])) }
  }
  const patternMatch = /^must match "([^"\r\n]{1,250})"$/.exec(source) ?? /^"([^"\r\n]{1,250})"와 일치해야 합니다$/.exec(source)
  return patternMatch?.[0] === source && customerPatterns.has(patternMatch[1])
    ? { source: '입력값은 {pattern} 형식과 일치해야 합니다.', values: { pattern: patternMatch[1] } }
    : undefined
}
