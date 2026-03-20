import React, { useState } from 'react'

/* ── Small labelled badge ───────────────────────────────────── */
function Tag({ label, color }) {
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color,
      background: color + '20',   /* 12% opacity tint of the accent colour */
      border: `1px solid ${color}40`,
      borderRadius: 6,
      padding: '3px 9px',
      marginBottom: 10,
      fontFamily: 'var(--font-body)',
    }}>
      {label}
    </span>
  )
}

/* ── Section block inside the card ─────────────────────────── */
function Section({ tag, tagColor, icon, children }) {
  return (
    <div style={{
      background: 'var(--ink)',
      border: '1px solid var(--ink-border)',
      borderRadius: 'var(--radius-md)',
      padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <Tag label={tag} color={tagColor} />
      </div>
      <p style={{
        color: 'var(--text-primary)',
        fontSize: 14,
        lineHeight: 1.7,
        fontFamily: 'var(--font-body)',
      }}>
        {children}
      </p>
    </div>
  )
}

/* ── Follow-up question pill ────────────────────────────────── */
function FollowUp({ question, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={() => onClick(question)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: hovered ? 'var(--ink-mid)' : 'transparent',
        border: `1px solid ${hovered ? 'var(--yellow)' : 'var(--ink-border)'}`,
        borderRadius: 'var(--radius-sm)',
        padding: '10px 14px',
        color: hovered ? 'var(--yellow)' : 'var(--text-secondary)',
        fontSize: 13,
        fontFamily: 'var(--font-body)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        lineHeight: 1.45,
      }}
    >
      <span style={{ marginRight: 8, opacity: 0.5 }}>↗</span>
      {question}
    </button>
  )
}

/* ── Video Script box with copy button ─────────────────────── */
function VideoScript({ script }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(script)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      background: 'var(--ink)',
      border: '1px solid var(--lavender)40',
      borderRadius: 'var(--radius-md)',
      padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🎬</span>
          <Tag label="Video Script" color="var(--lavender)" />
        </div>
        <button
          onClick={handleCopy}
          style={{
            background: copied ? 'var(--teal)20' : 'var(--ink-mid)',
            border: `1px solid ${copied ? 'var(--teal)' : 'var(--ink-border)'}`,
            borderRadius: 6,
            padding: '4px 12px',
            color: copied ? 'var(--teal)' : 'var(--text-secondary)',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            transition: 'all 0.2s',
          }}
        >
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>
      <p style={{
        color: 'var(--text-secondary)',
        fontSize: 13,
        lineHeight: 1.75,
        fontStyle: 'italic',
        fontFamily: 'var(--font-body)',
        whiteSpace: 'pre-wrap',
      }}>
        {script}
      </p>
      <p style={{
        marginTop: 10,
        fontSize: 11,
        color: 'var(--text-dim)',
        fontFamily: 'var(--font-body)',
      }}>
        Paste this into D-ID, Synthesia, or ElevenLabs to generate a video
      </p>
    </div>
  )
}

/* ── Main ExplanationCard ───────────────────────────────────── */
export default function ExplanationCard({ data, onFollowUp }) {
  if (!data) {
    /* Empty state shown before any message is sent */
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 16,
        opacity: 0.4,
        textAlign: 'center',
        padding: 40,
      }}>
        <div style={{ fontSize: 52 }}>🧠</div>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          color: 'var(--text-secondary)',
          fontWeight: 500,
        }}>
          Ask me anything
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', maxWidth: 220, lineHeight: 1.6 }}>
          Type an engineering concept and I'll break it down like you're 5 years old
        </p>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      animation: 'fadeSlideUp 0.4s ease both',
      padding: '4px 2px',
    }}>

      {/* Main explanation */}
      <Section tag="Explanation" tagColor="var(--yellow)" icon="💡">
        {data.explanation}
      </Section>

      {/* Analogy */}
      <Section tag="Real-world analogy" tagColor="var(--teal)" icon="🌍">
        {data.analogy}
      </Section>

      {/* Video script */}
      <VideoScript script={data.video_script} />

      {/* Follow-up questions */}
      {data.follow_up_questions?.length > 0 && (
        <div style={{
          background: 'var(--ink)',
          border: '1px solid var(--ink-border)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>🤔</span>
            <Tag label="Keep exploring" color="var(--coral)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {data.follow_up_questions.map((q, i) => (
              <FollowUp key={i} question={q} onClick={onFollowUp} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
