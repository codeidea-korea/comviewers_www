import { useRef, useState } from 'react'
import { z } from 'zod'
import { checkoutDraftSchema } from '@/domain/checkout/checkoutDraft'

export type PaymentMethod = '' | 'virtual-account' | 'card' | 'payco' | 'global-card'
export type ReceiptType = 'not_requested' | 'income_deduction' | 'business_expense'
export type CheckoutValidatedDraft = z.infer<typeof checkoutDraftSchema>
export interface CheckoutContact {
  name: string
  emailId: string
  emailDomain: string
  phonePrefix: string
  phoneMiddle: string
  phoneLast: string
  messenger: string
  messengerId: string
}
export function useCheckoutForm() {
  const contactEdited = useRef(false)
  const [contact, setContact] = useState<CheckoutContact>({ name: '', emailId: '', emailDomain: '', phonePrefix: '010', phoneMiddle: '', phoneLast: '', messenger: '', messengerId: '' })
  const [payment, setPayment] = useState<PaymentMethod>('')
  const [receiptType, setReceiptType] = useState<ReceiptType>('not_requested')
  const [receiptNumber, setReceiptNumber] = useState('')
  const [receiptPhone, setReceiptPhone] = useState({ prefix: '010', middle: '', last: '' })
  const [errors, setErrors] = useState<string[]>([])
  const [orderAgreed, setOrderAgreed] = useState(false)
  const [providerAgreed, setProviderAgreed] = useState(false)
  function changeContact(field: keyof CheckoutContact, value: string) {
    contactEdited.current = true
    setContact((current) => ({ ...current, [field]: value }))
  }
  function fillProfile(profile: { name: string | null; email: string | null; phone: string | null; messengerType: string | null; messengerId: string | null }, force = false) {
    if (contactEdited.current && !force) return
    const [emailId = '', emailDomain = ''] = (profile.email ?? '').split('@')
    const phone = (profile.phone ?? '').replace(/\D/g, '')
    setContact({ name: profile.name ?? '', emailId, emailDomain, phonePrefix: phone.slice(0, 3) || '010', phoneMiddle: phone.slice(3, -4), phoneLast: phone.slice(-4), messenger: profile.messengerType ?? '', messengerId: profile.messengerId ?? '' })
  }
  function changeReceiptType(next: ReceiptType) {
    setReceiptType(next)
    setReceiptNumber('')
    setReceiptPhone({ prefix: '010', middle: '', last: '' })
  }
  function validate(): CheckoutValidatedDraft | null {
    const result = checkoutDraftSchema.safeParse({
      contact: { name: contact.name, email: `${contact.emailId}@${contact.emailDomain}`, phone: contact.phoneMiddle || contact.phoneLast ? `${contact.phonePrefix}-${contact.phoneMiddle}-${contact.phoneLast}` : '', messengerType: contact.messenger, messengerId: contact.messengerId },
      payment, receiptType, receiptIdentifier: receiptType === 'business_expense' ? receiptNumber : `${receiptPhone.prefix}${receiptPhone.middle}${receiptPhone.last}`,
      orderAgreed, providerAgreed,
    })
    setErrors(result.success ? [] : result.error.issues.map((issue) => issue.message))
    return result.success ? result.data : null
  }
  return { contact, changeContact, fillProfile, payment, setPayment, receiptType, changeReceiptType, receiptNumber, setReceiptNumber, receiptPhone, setReceiptPhone, orderAgreed, setOrderAgreed, providerAgreed, setProviderAgreed, errors, validate }
}
export type CheckoutFormModel = ReturnType<typeof useCheckoutForm>
