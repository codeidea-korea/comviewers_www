import { NativeSelect } from '@/components/ui/SelectControl'
import { emailDomainOptions, messengerOptionLabel, messengerOptions, phonePrefixOptions } from '@/mocks/selectOptions'
import type { CheckoutFormModel } from './hooks/useCheckoutForm'
import { CheckoutField, CheckoutSectionTitle } from './CheckoutFields'

export function CheckoutCustomer({ form, pending = false }: { form: CheckoutFormModel; pending?: boolean }) {
  const { contact, changeContact } = form
  const emailDomains = contact.emailDomain && !emailDomainOptions.includes(contact.emailDomain)
    ? [contact.emailDomain, ...emailDomainOptions]
    : emailDomainOptions
  return <section aria-busy={pending} className="checkout-customer">
    <CheckoutSectionTitle>주문자 정보</CheckoutSectionTitle>
    
    <CheckoutField label="이름" required><input aria-label="주문자 이름" maxLength={18} required onChange={(event) => changeContact('name', event.target.value)} value={contact.name} /><small>1~18자, 한글·영문·하이픈·아포스트로피</small></CheckoutField>
    <CheckoutField label="E-mail" required><div className="email-fields">
      <input aria-label="주문자 이메일 아이디" maxLength={100} required onChange={(event) => changeContact('emailId', event.target.value)} value={contact.emailId} /><span>@</span>
      <input aria-label="주문자 이메일 도메인" maxLength={100} required onChange={(event) => changeContact('emailDomain', event.target.value)} value={contact.emailDomain} />
      <NativeSelect aria-label="이메일 도메인 선택" onChange={(event) => changeContact('emailDomain', event.target.value)} value={contact.emailDomain}><option value="">직접입력</option>{emailDomains.map((option) => <option key={option}>{option}</option>)}</NativeSelect>
    </div></CheckoutField>
    <CheckoutField label="핸드폰"><div className="phone-fields">
      <NativeSelect aria-label="핸드폰 번호 앞자리" onChange={(event) => changeContact('phonePrefix', event.target.value)} value={contact.phonePrefix}>{phonePrefixOptions.map((option) => <option key={option}>{option}</option>)}</NativeSelect>
      <input aria-label="핸드폰 번호 가운데 자리" inputMode="numeric" maxLength={4} onChange={(event) => changeContact('phoneMiddle', event.target.value.replace(/\D/g, ''))} value={contact.phoneMiddle} />
      <input aria-label="핸드폰 번호 끝자리" inputMode="numeric" maxLength={4} onChange={(event) => changeContact('phoneLast', event.target.value.replace(/\D/g, ''))} value={contact.phoneLast} />
    </div></CheckoutField>
    <CheckoutField label="메신저 ID"><div className="messenger-fields">
      <NativeSelect aria-label="메신저 선택" onChange={(event) => changeContact('messenger', event.target.value)} value={contact.messenger}><option value="">선택</option>{messengerOptions.map((option) => <option key={option} value={option}>{messengerOptionLabel(option)}</option>)}</NativeSelect>
      <input aria-label="메신저 아이디" maxLength={100} onChange={(event) => changeContact('messengerId', event.target.value)} value={contact.messengerId} />
    </div></CheckoutField>
  </section>
}
