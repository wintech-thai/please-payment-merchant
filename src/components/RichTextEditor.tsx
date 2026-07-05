'use client'

import { useRef } from 'react'
import { useEditor, EditorContent, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Send } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  onSubmit: (jsonContent: string) => void
  disabled?: boolean
  sending?: boolean
}

export default function RichTextEditor({ onSubmit, disabled = false, sending = false }: Props) {
  const submitRef = useRef<() => void>(() => {})

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[60px] max-h-[160px] overflow-y-auto px-3 py-2 text-sm text-gray-800 leading-relaxed',
      },
      handleKeyDown: (_view, event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          submitRef.current()
          return true
        }
        return false
      },
    },
  })

  submitRef.current = () => {
    if (!editor || editor.isEmpty || disabled || sending) return
    onSubmit(JSON.stringify(editor.getJSON()))
    editor.commands.clearContent()
    editor.commands.focus()
  }

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
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-1 px-2 py-1 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-0.5">
          {toolBtn('bold',   <strong className="font-bold">B</strong>)}
          {toolBtn('italic', <em className="italic not-italic" style={{ fontStyle: 'italic' }}>I</em>)}
          {toolBtn('strike', <s>S</s>)}
          {toolBtn('code',   <span className="font-mono text-[11px]">{'</>'}</span>)}
        </div>
        <span className="text-[10px] text-gray-400 pr-1">Shift+Enter {'↵'}</span>
      </div>
      {/* Editor */}
      <EditorContent editor={editor} />
      {/* Footer: send button */}
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
    </div>
  )
}
