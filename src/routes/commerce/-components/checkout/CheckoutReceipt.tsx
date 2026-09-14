import { NativeSelect } from '@/components/ui/SelectControl'
import { Radio } from '@/components/ui/RadioControl'
import radioOffIcon from '@/assets/figma/select-radio-off.svg'
import radioOnIcon from '@/assets/figma/select-radio-on.svg'
import { phonePrefixOptions } from '@/mocks/selectOptions'
import type { CheckoutFormModel, ReceiptType } from './hooks/useCheckoutForm'
import { CheckoutField, CheckoutSectionTitle } from './CheckoutFields'

const receiptOptions: readonly { value: ReceiptType; label: string }[] = [
  { value: 'income_deduction', label: '개인 소득공제용' },
  { value: 'business_expense', label: '사업자지출증빙용' },
  { value: 'not_requested', label: '신청안함' },
]
export function CheckoutReceipt({ form }: { form: CheckoutFormModel }) {
  const { receiptType, changeReceiptType, receiptNumber, setReceiptNumber, receiptPhone, setReceiptPhone } = form
  return <section className="checkout-receipt">
    <CheckoutSectionTitle>현금영수증 발급 신청</CheckoutSectionTitle>
    
    <fieldset className="receipt-types"><legend className="sr-only">현금영수증 유형</legend>{receiptOptions.map(({ value, label }) => <Radio checked={receiptType === value} className={receiptType === value ? 'is-selected' : ''} iconClassName="receipt-radio-icon" key={value} name="receipt" offIcon={radioOffIcon} onChange={() => changeReceiptType(value)} onIcon={radioOnIcon} value={value}>{label}</Radio>)}</fieldset>
    {receiptType !== 'not_requested' && <CheckoutField label={receiptType === 'business_expense' ? '사업자등록번호' : '핸드폰'}>
      {receiptType === 'business_expense' ? <input aria-label="현금영수증 사업자등록번호" inputMode="numeric" maxLength={10} onChange={(event) => setReceiptNumber(event.target.value.replace(/\D/g, ''))} placeholder="10자리 숫자만 사용할 수 있습니다." value={receiptNumber} /> : <div className="phone-fields">
        <NativeSelect aria-label="현금영수증 핸드폰 번호 앞자리" onChange={(event) => setReceiptPhone({ ...receiptPhone, prefix: event.target.value })} value={receiptPhone.prefix}>{phonePrefixOptions.map((option) => <option key={option}>{option}</option>)}</NativeSelect>
        <input aria-label="현금영수증 핸드폰 번호 가운데 자리" inputMode="numeric" maxLength={4} onChange={(event) => setReceiptPhone({ ...receiptPhone, middle: event.target.value.replace(/\D/g, '') })} value={receiptPhone.middle} />
        <input aria-label="현금영수증 핸드폰 번호 끝자리" inputMode="numeric" maxLength={4} onChange={(event) => setReceiptPhone({ ...receiptPhone, last: event.target.value.replace(/\D/g, '') })} value={receiptPhone.last} />
      </div>}
    </CheckoutField>}
  </section>
}
