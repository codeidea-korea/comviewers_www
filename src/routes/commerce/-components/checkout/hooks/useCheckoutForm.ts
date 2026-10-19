import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { checkoutDraftSchema, checkoutPaymentMethodSchema } from '@/domain/checkout/checkoutDraft'
import { emailDomainOptions } from '@/lib/formOptions'
import { checkoutRecoveryContactSchema, type CheckoutRecovery } from '@/domain/checkout/checkoutRecovery'

export type PaymentMethod = z.infer<typeof checkoutPaymentMethodSchema>
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
type CheckoutValidationError = { path: string; message: string }
type Profile = { name: string | null; email: string | null; phone: string | null; messengerType: string | null; messengerId: string | null }
function profileContact(profile: Profile): CheckoutContact {
  const [emailId = '', emailDomain = ''] = (profile.email ?? '').split('@')
  const phone = (profile.phone ?? '').replace(/\D/g, '')
  return { name: profile.name ?? '', emailId, emailDomain, phonePrefix: phone.slice(0, 3) || '010', phoneMiddle: phone.slice(3, -4), phoneLast: phone.slice(-4), messenger: profile.messengerType ?? '', messengerId: profile.messengerId ?? '' }
}
export function useCheckoutForm(finalAmount: number | null, recovery?: CheckoutRecovery | null) {
  const contactEdited = useRef(false)
  const restoredKey = useRef<string | null>(null)
  const [contact, setContact] = useState<CheckoutContact>({ name: '', emailId: '', emailDomain: '', phonePrefix: '010', phoneMiddle: '', phoneLast: '', messenger: '', messengerId: '' })
  const [emailDomainSelection, setEmailDomainSelection] = useState('')
  const [payment, setPaymentState] = useState<PaymentMethod>('')
  const [receiptType, setReceiptType] = useState<ReceiptType>('not_requested')
  const [receiptNumber, setReceiptNumberState] = useState('')
  const [receiptPhone, setReceiptPhoneState] = useState({ prefix: '010', middle: '', last: '' })
  const [errors, setErrors] = useState<CheckoutValidationError[]>([])
  const [orderAgreed, setOrderAgreedState] = useState(false)
  const [paymentServiceAgreed, setPaymentServiceAgreedState] = useState(false)
  useEffect(() => {
    if (!recovery || restoredKey.current === recovery.request.creationKey) return
    restoredKey.current = recovery.request.creationKey
    const parsed = checkoutRecoveryContactSchema.safeParse(recovery.request.originalRequest)
    if (parsed.success) {
      contactEdited.current = true
      const restored = profileContact(parsed.data.contact)
      setContact(restored)
      setEmailDomainSelection(emailDomainOptions.includes(restored.emailDomain) ? restored.emailDomain : '')
    }
    if (recovery.display) setPaymentState(recovery.display.payment)
  }, [recovery])
  function clearError(path: string) {
    setErrors(current => current.filter(error => error.path !== path))
  }
  function fieldError(path: string) {
    if (finalAmount === 0 && (path === 'payment' || path === 'receiptIdentifier')) return undefined
    return errors.find(error => error.path === path)?.message
  }
  function changeContact(field: keyof CheckoutContact, value: string) {
    contactEdited.current = true
    setContact((current) => ({ ...current, [field]: value }))
    if (field === 'emailDomain') setEmailDomainSelection('')
    if (field === 'messenger' || field === 'messengerId') {
      setErrors(current => current.filter(error => error.path !== 'contact.messengerType' && error.path !== 'contact.messengerId'))
    } else {
      clearError(field === 'name' ? 'contact.name' : field.startsWith('email') ? 'contact.email' : 'contact.phone')
    }
  }
  function selectEmailDomain(value: string) {
    contactEdited.current = true
    if (value) changeContact('emailDomain', value)
    setEmailDomainSelection(value)
  }
  function fillProfile(profile: Profile, force = false) {
    if (contactEdited.current && !force) return
    const next = profileContact(profile)
    setContact(next)
    setEmailDomainSelection(emailDomainOptions.includes(next.emailDomain) ? next.emailDomain : '')
  }
  function changeReceiptType(next: ReceiptType) {
    setReceiptType(next)
    setReceiptNumberState('')
    setReceiptPhoneState({ prefix: '010', middle: '', last: '' })
    clearError('receiptIdentifier')
  }
  function setPayment(next: PaymentMethod) { setPaymentState(next); clearError('payment') }
  function setOrderAgreed(next: boolean) { setOrderAgreedState(next); clearError('orderAgreed') }
  function setPaymentServiceAgreed(next: boolean) { setPaymentServiceAgreedState(next); clearError('paymentServiceAgreed') }
  function setReceiptNumber(next: string) { setReceiptNumberState(next); clearError('receiptIdentifier') }
  function setReceiptPhone(next: typeof receiptPhone) { setReceiptPhoneState(next); clearError('receiptIdentifier') }
  function validate(): CheckoutValidatedDraft | null {
    const result = checkoutDraftSchema.safeParse({
      contact: { name: contact.name, email: `${contact.emailId}@${contact.emailDomain}`, phone: contact.phoneMiddle || contact.phoneLast ? `${contact.phonePrefix}-${contact.phoneMiddle}-${contact.phoneLast}` : '', messengerType: contact.messenger, messengerId: contact.messengerId },
      finalAmount, payment, receiptType, receiptIdentifier: receiptType === 'business_expense' ? receiptNumber : `${receiptPhone.prefix}${receiptPhone.middle}${receiptPhone.last}`,
      orderAgreed, paymentServiceAgreed,
    })
    setErrors(result.success ? [] : result.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })))
    return result.success ? result.data : null
  }
  return { finalAmount, contact, changeContact, emailDomainSelection, selectEmailDomain, fillProfile, payment, setPayment, receiptType, changeReceiptType, receiptNumber, setReceiptNumber, receiptPhone, setReceiptPhone, orderAgreed, setOrderAgreed, paymentServiceAgreed, setPaymentServiceAgreed, errors, fieldError, validate }
}
export type CheckoutFormModel = ReturnType<typeof useCheckoutForm>
