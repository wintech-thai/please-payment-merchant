import React from 'react'

function renderMarks(text: string, marks: any[] = []): React.ReactNode {
  let node: React.ReactNode = text
  for (const mark of marks) {
    if (mark.type === 'bold') node = <strong className="font-bold">{node}</strong>
    else if (mark.type === 'italic') node = <em className="italic">{node}</em>
    else if (mark.type === 'strike') node = <s>{node}</s>
    else if (mark.type === 'code') node = <code className="bg-black/10 rounded px-0.5 font-mono text-[11px]">{node}</code>
  }
  return node
}

function renderInline(node: any, i: number): React.ReactNode {
  if (node.type === 'text') return <React.Fragment key={i}>{renderMarks(node.text ?? '', node.marks)}</React.Fragment>
  if (node.type === 'hardBreak') return <br key={i} />
  return null
}

function renderBlock(node: any, i: number): React.ReactNode {
  if (node.type === 'paragraph') {
    return <p key={i} className="mb-1 last:mb-0 empty:h-4">{node.content?.map(renderInline)}</p>
  }
  if (node.type === 'bulletList') {
    return <ul key={i} className="list-disc pl-4 mb-1 last:mb-0">{node.content?.map((li: any, j: number) => <li key={j}>{li.content?.map(renderBlock)}</li>)}</ul>
  }
  if (node.type === 'orderedList') {
    return <ol key={i} className="list-decimal pl-4 mb-1 last:mb-0">{node.content?.map((li: any, j: number) => <li key={j}>{li.content?.map(renderBlock)}</li>)}</ol>
  }
  if (node.type === 'codeBlock') {
    return <pre key={i} className="bg-black/10 rounded p-2 font-mono text-xs mb-1 last:mb-0 whitespace-pre-wrap">{node.content?.map((n: any) => n.text).join('')}</pre>
  }
  if (node.type === 'blockquote') {
    return <blockquote key={i} className="border-l-2 border-current/30 pl-2 mb-1 last:mb-0">{node.content?.map(renderBlock)}</blockquote>
  }
  if (node.type === 'listItem') {
    return <React.Fragment key={i}>{node.content?.map(renderBlock)}</React.Fragment>
  }
  return null
}

export default function RichContent({ content }: { content?: string | null }) {
  if (!content) return null

  try {
    const doc = JSON.parse(content)
    if (typeof doc !== 'object' || doc === null || Array.isArray(doc) || !doc.content) {
      return <span className="whitespace-pre-wrap break-words">{content}</span>
    }
    return <div className="text-sm leading-relaxed">{doc.content.map(renderBlock)}</div>
  } catch {
    return <span className="whitespace-pre-wrap break-words">{content}</span>
  }
}
