import React from 'react'

function parseTable(lines) {
  const sep = lines[1]
  if (!sep || !sep.match(/^\|?[\s\-|:]+\|?$/)) return null
  const parseRow = (line) => line.split('|').map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1)
  return { headers: parseRow(lines[0]), rows: lines.slice(2).map(parseRow).filter(r => r.length > 0) }
}

function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/).map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : p
  )
}

function MarkdownTable({ headers, rows }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', border: '1.5px solid var(--border-main)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{ background: 'var(--navy)', color: 'var(--citrus)', padding: '10px 14px', textAlign: 'left', fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: '12px', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? 'var(--bg-input)' : 'var(--cream-dark)' }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: '9px 14px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-main)', lineHeight: 1.5, fontSize: '14px' }}>{renderInline(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function MarkdownRenderer({ content }) {
  if (!content) return null
  const lines  = content.split('\n')
  const blocks = []
  let i        = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      blocks.push(<h3 key={i} style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', margin: '16px 0 8px' }}>{line.slice(3)}</h3>)
      i++; continue
    }

    if (line.match(/^\*\*[^*]+\*\*:?\s*$/)) {
      blocks.push(<h3 key={i} style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', margin: '16px 0 8px' }}>{line.replace(/\*\*/g, '').replace(/:$/, '')}</h3>)
      i++; continue
    }

    if (line.trim().startsWith('|')) {
      const tableLines = []
      while (i < lines.length && lines[i].trim().startsWith('|')) { tableLines.push(lines[i]); i++ }
      const parsed = parseTable(tableLines)
      if (parsed) blocks.push(<MarkdownTable key={i} {...parsed} />)
      continue
    }

    if (line.match(/^[-*]\s+/)) {
      const items = []
      while (i < lines.length && lines[i].match(/^[-*]\s+/)) { items.push(lines[i].replace(/^[-*]\s+/, '')); i++ }
      blocks.push(<ul key={i} style={{ paddingLeft: '20px', margin: '8px 0', color: 'var(--text-primary)', fontSize: '15px', lineHeight: 1.7 }}>{items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}</ul>)
      continue
    }

    if (line.trim() === '') { blocks.push(<div key={i} style={{ height: '6px' }} />); i++; continue }

    blocks.push(<p key={i} style={{ fontSize: '15px', lineHeight: 1.7, color: 'var(--text-primary)', margin: '0 0 8px' }}>{renderInline(line)}</p>)
    i++
  }

  return <div>{blocks}</div>
}
