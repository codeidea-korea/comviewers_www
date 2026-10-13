import serverDisabledIcon from '@/assets/figma/icon-server-disabled.svg'
import { TranslatedText } from '@/i18n/translation'
import './format-waiting-server-state.css'

export function FormatWaitingServerState() {
  return <span className="modal-list__server-state format-waiting-server-state" data-ui="format-waiting-server-state">
    <i className="format-waiting-server-state__icon"><img alt="" data-status="disabled" src={serverDisabledIcon}/></i>
    <TranslatedText id="rental.formatWaiting"/>
  </span>
}
