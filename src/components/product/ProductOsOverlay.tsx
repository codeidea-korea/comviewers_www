import windowsMark from '@/assets/figma/windows-mark.svg'

export function ProductOsOverlay({ label }: { label: 'Windows 10' | 'Windows 11' | null }) {
  return label ? <span aria-hidden="true" className="product-os-overlay"><img alt="" src={windowsMark} /><span>{label}</span></span> : null
}
