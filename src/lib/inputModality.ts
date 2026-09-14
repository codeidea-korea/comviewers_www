const navigationKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', 'Enter', ' '])

// Text inputs can match :focus-visible even after a mouse click. Track keyboard
// navigation separately so pointer editing stays quiet without hiding keyboard focus.
export function installInputModality(documentRef: Document = document) {
  const root = documentRef.documentElement
  const previous = root.getAttribute('data-input-modality')
  root.setAttribute('data-input-modality', 'keyboard')

  const onPointerDown = () => root.setAttribute('data-input-modality', 'pointer')
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const target = event.target
    const editing = target instanceof HTMLElement && (target.isContentEditable || target.tagName === 'TEXTAREA'
      || (target instanceof HTMLInputElement && !['checkbox', 'radio', 'range', 'button', 'submit', 'reset'].includes(target.type)))
    if (event.key === 'Tab' || (!editing && navigationKeys.has(event.key))) {
      root.setAttribute('data-input-modality', 'keyboard')
    }
  }
  documentRef.addEventListener('pointerdown', onPointerDown, true)
  documentRef.addEventListener('keydown', onKeyDown, true)

  return () => {
    documentRef.removeEventListener('pointerdown', onPointerDown, true)
    documentRef.removeEventListener('keydown', onKeyDown, true)
    if (previous === null) root.removeAttribute('data-input-modality')
    else root.setAttribute('data-input-modality', previous)
  }
}
