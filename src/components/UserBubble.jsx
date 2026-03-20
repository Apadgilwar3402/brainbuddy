export default function UserBubble({ text }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px', animation: 'fadeUp 0.3s ease both' }}>
      <div style={{ background: 'var(--navy)', color: 'var(--white)', padding: '12px 18px', borderRadius: '18px 18px 4px 18px', maxWidth: '70%', fontSize: '15px', lineHeight: 1.55, boxShadow: 'var(--shadow-sm)' }}>
        {text}
      </div>
    </div>
  )
}
