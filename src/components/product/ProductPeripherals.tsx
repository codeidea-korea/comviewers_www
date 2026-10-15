import type { Product } from '../../domain/products/types'
import keyboardActiveIcon from '../../assets/figma/keyboard-active.svg'
import keyboardIcon from '../../assets/figma/keyboard.svg'
import mouseActiveIcon from '../../assets/figma/mouse-active.svg'
import mouseIcon from '../../assets/figma/mouse.svg'
import { useUiTranslation } from '@/i18n/uiTranslation'

export function ProductPeripherals({ mouseIncluded, keyboardIncluded }: Pick<Product, 'mouseIncluded' | 'keyboardIncluded'>) {
  const { uiText } = useUiTranslation()
  const hasMouse = mouseIncluded === true
  const hasKeyboard = keyboardIncluded === true

  return <span className="product-card__peripherals">
    <span className={`product-card__mouse${hasMouse ? ' is-active' : ''}`}><img alt="" src={hasMouse ? mouseActiveIcon : mouseIcon} /></span>
    <span className={`product-card__keyboard${hasKeyboard ? ' is-active' : ''}`}><img alt="" src={hasKeyboard ? keyboardActiveIcon : keyboardIcon} /></span>
    <span className="sr-only notranslate" translate="no">{uiText(mouseIncluded === null ? '마우스 정보 없음' : hasMouse ? '마우스 포함' : '마우스 미포함')}, {uiText(keyboardIncluded === null ? '키보드 정보 없음' : hasKeyboard ? '키보드 포함' : '키보드 미포함')}</span>
  </span>
}
