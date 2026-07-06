'use client'

import { useRef, forwardRef, useImperativeHandle } from 'react'
import { useEditor, EditorContent, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TipTapImage from '@tiptap/extension-image'
import { Send, X, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import clsx from 'clsx'

export interface ReplyTarget {
  id: string
  author: string
  content: string
}

export interface RichTextEditorRef {
  getContent: () => string
  isEmpty: () => boolean
}

interface Props {
  onSubmit?: (jsonContent: string) => void
  disabled?: boolean
  sending?: boolean
  replyTo?: ReplyTarget | null
  onClearReply?: () => void
  expandable?: boolean
}

function extractReplyPreview(content?: string | null): { text: string; imageSrc?: string } {
  if (!content) return { text: '' }
  try {
    const doc = JSON.parse(content)
    if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) return { text: content }
    const texts: string[] = []
    let imageSrc: string | undefined
    const walk = (node: any) => {
      if (node.type === 'text') texts.push(node.text ?? '')
      else if (node.type === 'image' && !imageSrc) imageSrc = node.attrs?.src
      else if (node.content) node.content.forEach(walk)
    }
    if (doc.content) doc.content.forEach(walk)
    return { text: texts.join('').trim(), imageSrc }
  } catch {
    return { text: content }
  }
}

function compressImage(file: File, maxPx = 1200, maxBytes = 500 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Not an image'))
      return
    }
    const url = URL.createObjectURL(file)
    const img = document.createElement('img')
    img.onload = () => {
      URL.revokeObjectURL(url)
      let w = img.naturalWidth
      let h = img.naturalHeight
      if (w > maxPx || h > maxPx) {
        const ratio = Math.min(maxPx / w, maxPx / h)
        w = Math.round(w * ratio)
        h = Math.round(h * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      for (const quality of [0.85, 0.7, 0.55, 0.4]) {
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        const bytes = (dataUrl.length - 'data:image/jpeg;base64,'.length) * 3 / 4
        if (bytes <= maxBytes) { resolve(dataUrl); return }
      }
      reject(new Error('Image too large. Try a smaller image (max ~500KB).'))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')) }
    img.src = url
  })
}

const RichTextEditor = forwardRef<RichTextEditorRef, Props>(function RichTextEditor(
  { onSubmit, disabled = false, sending = false, replyTo, onClearReply, expandable = false },
  ref
) {
  const submitRef = useRef<() => void>(() => {})
  const insertImageRef = useRef<((file: File) => void) | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const onSubmitRef = useRef(onSubmit)
  onSubmitRef.current = onSubmit

  const editorMinMax = expandable
    ? 'min-h-[120px] max-h-[320px]'
    : 'min-h-[60px] max-h-[160px]'

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, TipTapImage.configure({ inline: false, allowBase64: true })],
    editorProps: {
      attributes: {
        class: `outline-none overflow-y-auto px-3 py-2 text-sm text-gray-800 leading-relaxed ${editorMinMax}`,
      },
      handleKeyDown: (_view, event) => {
        if (event.key === 'Enter' && !event.shiftKey && onSubmitRef.current) {
          submitRef.current()
          return true
        }
        return false
      },
      handlePaste: (_view, event) => {
        const items = Array.from(event.clipboardData?.items ?? [])
        const imageItem = items.find(item => item.type.startsWith('image/'))
        if (!imageItem) return false
        const file = imageItem.getAsFile()
        if (!file) return false
        event.preventDefault()
        insertImageRef.current?.(file)
        return true
      },
    },
  })

  insertImageRef.current = (file: File) => {
    if (!editor) return
    compressImage(file).then(dataUrl => {
      editor.chain().focus().setImage({ src: dataUrl }).run()
    }).catch(err => {
      toast.error(err instanceof Error ? err.message : 'Image too large')
    })
  }

  submitRef.current = () => {
    if (!editor || editor.isEmpty || disabled || sending || !onSubmit) return
    const json = editor.getJSON() as any
    if (replyTo) {
      json.replyTo = { id: replyTo.id, author: replyTo.author, content: replyTo.content }
    }
    onSubmit(JSON.stringify(json))
    editor.commands.clearContent()
    editor.commands.focus()
    onClearReply?.()
  }

  useImperativeHandle(ref, () => ({
    getContent: () => editor ? JSON.stringify(editor.getJSON()) : '',
    isEmpty: () => editor?.isEmpty ?? true,
  }))

  const activeState = useEditorState({
    editor,
    selector: ctx => ({
      bold:   ctx.editor?.isActive('bold')   ?? false,
      italic: ctx.editor?.isActive('italic') ?? false,
      strike: ctx.editor?.isActive('strike') ?? false,
      code:   ctx.editor?.isActive('code')   ?? false,
    }),
  })

  const toggle = (name: 'bold' | 'italic' | 'strike' | 'code') => {
    if (!editor) return
    const chain = editor.chain().focus()
    if (name === 'bold') chain.toggleBold().run()
    else if (name === 'italic') chain.toggleItalic().run()
    else if (name === 'strike') chain.toggleStrike().run()
    else if (name === 'code') chain.toggleCode().run()
  }

  const toolBtn = (name: 'bold' | 'italic' | 'strike' | 'code', label: React.ReactNode) => (
    <button
      key={name}
      type="button"
      onMouseDown={e => { e.preventDefault(); toggle(name) }}
      disabled={disabled}
      className={clsx(
        'w-7 h-7 flex items-center justify-center rounded text-xs transition-colors select-none',
        activeState?.[name] ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-200'
      )}
    >
      {label}
    </button>
  )

  return (
    <div className={clsx(
      'flex-1 border rounded-xl overflow-hidden transition-all',
      disabled
        ? 'bg-gray-50 border-gray-200 opacity-60'
        : 'border-gray-200 focus-within:ring-2 focus-within:ring-primary-300 focus-within:border-transparent bg-white'
    )}>
      {/* Quote reply preview */}
      {replyTo && (() => {
        const { text, imageSrc } = extractReplyPreview(replyTo.content)
        return (
          <div className="flex items-start gap-2 px-3 py-2 bg-primary-50/70 border-b border-primary-100">
            <div className="w-0.5 self-stretch bg-primary-400 rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0 flex gap-2 items-center">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-primary-600 mb-0.5">{replyTo.author}</p>
                {text
                  ? <p className="text-xs text-gray-500 truncate">{text}</p>
                  : imageSrc && <p className="text-xs text-gray-400 italic">Image</p>
                }
              </div>
              {imageSrc && (
                <img src={imageSrc} alt="" className="h-9 w-9 rounded object-cover flex-shrink-0 opacity-80" />
              )}
            </div>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); onClearReply?.() }}
              className="p-0.5 text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })()}
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-1 px-2 py-1 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-0.5">
          {toolBtn('bold',   <strong className="font-bold">B</strong>)}
          {toolBtn('italic', <em className="italic not-italic" style={{ fontStyle: 'italic' }}>I</em>)}
          {toolBtn('strike', <s>S</s>)}
          {toolBtn('code',   <span className="font-mono text-[11px]">{'</>'}</span>)}
          <div className="w-px h-4 bg-gray-200 mx-0.5" />
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); fileInputRef.current?.click() }}
            disabled={disabled}
            title="Insert image"
            className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) insertImageRef.current?.(file)
              e.target.value = ''
            }}
          />
        </div>
        {onSubmit && <span className="text-[10px] text-gray-400 pr-1">Shift+Enter {'↵'}</span>}
      </div>
      {/* Editor */}
      <EditorContent editor={editor} />
      {/* Footer: send button — only shown in chat mode */}
      {onSubmit && (
        <div className="flex justify-end px-2 py-1.5 border-t border-gray-100">
          <button
            type="button"
            onClick={() => submitRef.current()}
            disabled={disabled || sending}
            className="p-1.5 rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      )}
    </div>
  )
})

export default RichTextEditor
