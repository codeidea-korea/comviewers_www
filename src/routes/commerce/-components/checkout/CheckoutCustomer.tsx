import { useState } from 'react'
import { NativeSelect } from '@/components/ui/SelectControl'
import { emailDomainOptions, messengerOptionLabel, messengerOptions, phonePrefixOptions } from '@/lib/formOptions'
import type { CheckoutFormModel } from './hooks/useCheckoutForm'
import { CheckoutField, CheckoutSectionTitle } from './CheckoutFields'

export function CheckoutCustomer({ form, pending = false }: { form: CheckoutFormModel; pending?: boolean }) {
  const { contact, changeContact } = form
  const [touched, setTouched] = useState({ name: false, email: false, phone: false, messenger: false })
  const emailDomains = contact.emailDomain && !emailDomainOptions.includes(contact.emailDomain)
    ? [contact.emailDomain, ...emailDomainOptions]
    : emailDomainOptions
  return <section aria-busy={pending} className="checkout-customer">
    <CheckoutSectionTitle>주문자 정보</CheckoutSectionTitle>
    
    <CheckoutField error={form.fieldError('contact.name') ?? (touched.name && !/^[가-힣A-Za-z'-]{1,18}$/.test(contact.name.trim()) ? '이름은 1~18자의 한글, 영문, 하이픈, 아포스트로피만 사용할 수 있습니다.' : undefined)} label="이름" required><input aria-label="주문자 이름" maxLength={18} required onChange={(event) => { setTouched(current => ({ ...current, name: true })); changeContact('name', event.target.value) }} value={contact.name} /></CheckoutField>
    <CheckoutField error={form.fieldError('contact.email') ?? (touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(`${contact.emailId}@${contact.emailDomain}`) ? '이메일 주소를 확인해 주세요.' : undefined)} label="E-mail" required><div className="email-fields">
      <input aria-label="주문자 이메일 아이디" maxLength={100} required onChange={(event) => { setTouched(current => ({ ...current, email: true })); changeContact('emailId', event.target.value) }} value={contact.emailId} /><span>@</span>
      <input aria-label="주문자 이메일 도메인" maxLength={100} required onChange={(event) => { setTouched(current => ({ ...current, email: true })); changeContact('emailDomain', event.target.value) }} value={contact.emailDomain} />
      <NativeSelect aria-label="이메일 도메인 선택" onChange={(event) => { setTouched(current => ({ ...current, email: true })); changeContact('emailDomain', event.target.value) }} value={contact.emailDomain}><option value="">직접입력</option>{emailDomains.map((option) => <option key={option}>{option}</option>)}</NativeSelect>
    </div></CheckoutField>
    <CheckoutField error={form.fieldError('contact.phone') ?? (touched.phone && (contact.phoneMiddle || contact.phoneLast) && (!/^\d{4}$/.test(contact.phoneMiddle) || !/^\d{4}$/.test(contact.phoneLast)) ? '핸드폰 번호의 가운데와 끝자리를 각각 4자리로 입력해 주세요.' : undefined)} label="핸드폰"><div className="phone-fields">
      <NativeSelect aria-label="핸드폰 번호 앞자리" onChange={(event) => changeContact('phonePrefix', event.target.value)} value={contact.phonePrefix}>{phonePrefixOptions.map((option) => <option key={option}>{option}</option>)}</NativeSelect>
      <input aria-label="핸드폰 번호 가운데 자리" inputMode="numeric" maxLength={4} onChange={(event) => { setTouched(current => ({ ...current, phone: true })); changeContact('phoneMiddle', event.target.value.replace(/\D/g, '')) }} value={contact.phoneMiddle} />
      <input aria-label="핸드폰 번호 끝자리" inputMode="numeric" maxLength={4} onChange={(event) => { setTouched(current => ({ ...current, phone: true })); changeContact('phoneLast', event.target.value.replace(/\D/g, '')) }} value={contact.phoneLast} />
    </div></CheckoutField>
    <CheckoutField error={form.fieldError('contact.messengerType') ?? form.fieldError('contact.messengerId') ?? (touched.messenger && Boolean(contact.messenger.trim()) !== Boolean(contact.messengerId.trim()) ? '메신저 종류와 아이디를 함께 입력해 주세요.' : undefined)} label="메신저 ID"><div className="messenger-fields">
      <NativeSelect aria-label="메신저 선택" onChange={(event) => { setTouched(current => ({ ...current, messenger: true })); changeContact('messenger', event.target.value) }} value={contact.messenger}><option value="">선택</option>{messengerOptions.map((option) => <option key={option} value={option}>{messengerOptionLabel(option)}</option>)}</NativeSelect>
      <input aria-label="메신저 아이디" maxLength={100} onChange={(event) => { setTouched(current => ({ ...current, messenger: true })); changeContact('messengerId', event.target.value) }} value={contact.messengerId} />
    </div></CheckoutField>
  </section>
}
