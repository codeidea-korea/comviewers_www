import { useEffect, useRef } from 'react'
import type { Editor, JSONContent } from '@tiptap/core'

export type EditorImageUpload = (file: File) => Promise<{ attachmentId: number; blob: Blob }>
export type EditorImageLoader = (attachmentId: number) => Promise<Blob>

export function persistentEditorDocument(node: JSONContent): JSONContent {
  const attributes = node.attrs ? { ...node.attrs } : undefined
  if (node.type === 'image' && attributes) {
    delete attributes.src
    delete attributes.srcset
  }
  return {
    ...node,
    ...(attributes ? { attrs: attributes } : {}),
    ...(node.content ? { content: node.content.map(persistentEditorDocument) } : {}),
  }
}

export function persistentEditorHtml(html: string): string {
  const document = new DOMParser().parseFromString(html, 'text/html')
  document.querySelectorAll('img').forEach(image => {
    image.removeAttribute('src')
    image.removeAttribute('srcset')
  })
  return document.body.innerHTML
}

/** Blob URLs are view state only. Persisted documents reference authorized attachment IDs. */
export function useEditorImagePreviews(editor: Editor | null, loadImage?: EditorImageLoader, value?: string | JSONContent) {
  const previews = useRef(new Map<number, string>())
  const rememberImage = (attachmentId: number, blob: Blob) => {
    if (!/^image\/(png|jpeg|gif|webp)$/i.test(blob.type)) throw new Error('이미지를 불러올 수 없습니다.')
    const previous = previews.current.get(attachmentId)
    if (previous) URL.revokeObjectURL(previous)
    const url = URL.createObjectURL(blob)
    previews.current.set(attachmentId, url)
    return url
  }

  useEffect(() => {
    const urls = previews.current
    return () => { urls.forEach(url => URL.revokeObjectURL(url)); urls.clear() }
  }, [])

  useEffect(() => {
    if (!editor) return
    let cancelled = false
    const pending = new Set<number>()
    const failed = new Set<number>()
    const hydrate = () => {
      if (cancelled || editor.isDestroyed) return
      const ids = new Set<number>()
      editor.state.doc.descendants(node => {
        const id = Number(node.attrs.attachmentId)
        if (node.type.name === 'image' && Number.isSafeInteger(id) && id > 0) ids.add(id)
      })
      previews.current.forEach((url, id) => {
        if (!ids.has(id)) { URL.revokeObjectURL(url); previews.current.delete(id) }
      })
      const apply = (id: number, src: string) => {
        if (cancelled || editor.isDestroyed) return
        const transaction = editor.state.tr
        editor.state.doc.descendants((node, position) => {
          if (node.type.name === 'image' && Number(node.attrs.attachmentId) === id && node.attrs.src !== src) {
            transaction.setNodeMarkup(position, undefined, { ...node.attrs, src })
          }
        })
        if (transaction.docChanged) editor.view.dispatch(transaction.setMeta('preventUpdate', true).setMeta('addToHistory', false))
      }
      ids.forEach(id => {
        const existing = previews.current.get(id)
        if (existing) { apply(id, existing); return }
        if (!loadImage || pending.has(id) || failed.has(id)) return
        pending.add(id)
        void loadImage(id).then(blob => {
          if (cancelled || editor.isDestroyed) return
          if (!/^image\/(png|jpeg|gif|webp)$/i.test(blob.type)) throw new Error('Invalid image type')
          let present = false
          editor.state.doc.descendants(node => {
            if (node.type.name === 'image' && Number(node.attrs.attachmentId) === id) present = true
          })
          if (!present) return
          const url = URL.createObjectURL(blob)
          previews.current.set(id, url)
          apply(id, url)
        }).catch(() => { failed.add(id) }).finally(() => { pending.delete(id) })
      })
    }
    hydrate()
    editor.on('transaction', hydrate)
    editor.on('create', hydrate)
    return () => { cancelled = true; editor.off('transaction', hydrate); editor.off('create', hydrate) }
  }, [editor, loadImage, value])

  return rememberImage
}
