import chevronLeft from '../../assets/figma/chevron-left.svg'
import chevronRight from '../../assets/figma/chevron-right.svg'
import chevronRightDisabled from '../../assets/figma/chevron-right-disabled.svg'
import eye from '../../assets/figma/eye.svg'
import eyeOff from '../../assets/figma/eye-off.svg'
import eyeDisabled from '../../assets/figma/eye-disabled.svg'

const iconSources = {
  'chevron-left': chevronLeft,
  'chevron-right': chevronRight,
  eye,
  'eye-off': eyeOff,
  'eye-disabled': eyeDisabled,
}

export type IconName = keyof typeof iconSources
export interface IconProps { name: IconName; alt?: string; size?: number; tone?: 'default' | 'inverse' | 'disabled' }

export function Icon({ name, alt = '', size = 24, tone = 'default' }: IconProps) {
  const source = tone === 'disabled' && name === 'chevron-right' ? chevronRightDisabled : iconSources[name]
  if (!source) return null

  return (
    <img
      alt={alt}
      className={`icon${tone === 'inverse' ? ' icon--inverse' : ''}${tone === 'disabled' ? ' icon--disabled' : ''}`}
      height={size}
      src={source}
      width={size}
    />
  )
}
