import type { ComponentProps } from 'react'
import { PopupLayer } from '@/components/ui/PopupLayerControl'
import { useMobileInquiryViewport } from '../inquiries/inquiryViewport'

export function ManagerSurface(props: ComponentProps<typeof PopupLayer>) {
  const mobile = useMobileInquiryViewport()
  if (!props.isOpen) return null
  return mobile ? <main className="manager-settings-page"><section aria-label={props.title} className={props.dialogClassName}>
    {props.showTitle !== false ? <h2>{props.title}</h2> : null}{props.children}
  </section></main> : <PopupLayer {...props}/>
}
