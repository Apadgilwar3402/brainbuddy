import { useState } from "react";
import VideoPlayer from "./VideoPlayer";
import MarkdownRenderer from "./MarkdownRenderer";

function useReadAloud() {
  const [speaking, setSpeaking] = useState(false);
  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1.05;
    u.lang = "en-US";
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  };
  const stop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };
  return { speaking, speak, stop };
}

function Section({
  icon,
  title,
  content,
  bg,
  borderColor,
  iconBg,
  onReadAloud,
  speaking,
  markdown,
}) {
  return (
    <div
      style={{
        background: bg,
        border: `1.5px solid ${borderColor}`,
        borderRadius: "var(--radius-md)",
        padding: "16px 18px",
        marginBottom: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              background: iconBg,
              borderRadius: "6px",
              width: "26px",
              height: "26px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              flexShrink: 0,
            }}
          >
            {icon}
          </span>
          <span
            style={{
              fontFamily: "Fraunces, serif",
              fontWeight: 700,
              fontSize: "13px",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            {title}
          </span>
        </div>
        {window.speechSynthesis && (
          <button
            onClick={
              speaking ? onReadAloud.stop : () => onReadAloud.speak(content)
            }
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "15px",
              color: "var(--text-muted)",
              opacity: 0.6,
              transition: "opacity 0.15s",
              padding: "2px 4px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.6)}
          >
            {speaking ? "⏹️" : "🔊"}
          </button>
        )}
      </div>
      {markdown ? (
        <MarkdownRenderer content={content} />
      ) : (
        <p
          style={{
            fontSize: "15px",
            lineHeight: 1.7,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          {content}
        </p>
      )}
    </div>
  );
}

function VideoScriptSection({ script }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div
      style={{
        background: "var(--navy)",
        border: "1.5px solid var(--navy-mid)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        marginBottom: "12px",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              background: "rgba(255,255,255,0.12)",
              borderRadius: "6px",
              width: "26px",
              height: "26px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
            }}
          >
            🎬
          </span>
          <span
            style={{
              fontFamily: "Fraunces, serif",
              fontWeight: 700,
              fontSize: "13px",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            Video Script
          </span>
        </div>
        <span
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: "18px",
            transform: open ? "rotate(90deg)" : "rotate(0)",
            transition: "transform 0.2s ease",
          }}
        >
          ›
        </span>
      </button>
      {open && (
        <div
          style={{ padding: "0 18px 18px", animation: "fadeUp 0.2s ease both" }}
        >
          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.7,
              color: "rgba(255,255,255,0.85)",
              fontStyle: "italic",
              borderLeft: "3px solid var(--citrus)",
              paddingLeft: "14px",
              marginBottom: "14px",
            }}
          >
            {script}
          </p>
          <button
            onClick={handleCopy}
            style={{
              background: copied ? "var(--teal)" : "var(--citrus)",
              color: "var(--navy)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "background 0.2s ease",
            }}
          >
            {copied ? "✓ Copied!" : "Copy Script"}
          </button>
        </div>
      )}
    </div>
  );
}

function FollowUps({ questions, onAsk, onContinue, hasMore }) {
  const safeQuestions = (questions || [])
    .map((q) =>
      typeof q === "string"
        ? q
        : typeof q === "object"
          ? Object.values(q)[0] || ""
          : String(q),
    )
    .filter((q) => q && q.trim().length > 0);

  // Always show section if we have questions OR a continue button
  if (safeQuestions.length === 0 && !hasMore) return null;

  return (
    <div style={{ marginTop: "16px" }}>
      <p
        style={{
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: "10px",
        }}
      >
        Dig deeper →
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {hasMore && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onContinue();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "var(--navy)",
              border: "1.5px solid var(--navy-mid)",
              borderRadius: "999px",
              padding: "7px 16px",
              fontSize: "13px",
              color: "white",
              cursor: "pointer",
              transition: "all 0.15s ease",
              fontWeight: 500,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Continue → next steps
          </button>
        )}
        {safeQuestions.map((q, i) => (
          <button
            key={i}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAsk(q);
            }}
            style={{
              background: "var(--bg-input)",
              border: "1.5px solid var(--border-main)",
              borderRadius: "999px",
              padding: "7px 14px",
              fontSize: "13px",
              color: "var(--text-primary)",
              cursor: "pointer",
              transition: "all 0.15s ease",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--teal)";
              e.currentTarget.style.background = "var(--teal-pale)";
              e.currentTarget.style.color = "var(--teal)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-main)";
              e.currentTarget.style.background = "var(--bg-input)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ResponseCard({ data, onFollowUp }) {
  const readAloud = useReadAloud();

  // Continue sends a message that asks the AI to continue from where it left off
  const handleContinue = () =>
    onFollowUp("Continue — give me the next steps from where you left off");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        marginBottom: "32px",
        animation: "fadeUp 0.4s ease both",
      }}
    >
      <div
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "50%",
          background: "var(--navy)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "16px",
          flexShrink: 0,
          marginTop: "2px",
        }}
      >
        🧠
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {data.video_requested && <VideoPlayer talkId={data.talk_id} />}
        <Section
          icon="💡"
          title="Explanation"
          content={data.explanation}
          bg="var(--citrus-pale)"
          borderColor="#F5D99A"
          iconBg="rgba(245,166,35,0.2)"
          onReadAloud={readAloud}
          speaking={readAloud.speaking}
          markdown={true}
        />
        {data.analogy && data.analogy.length > 5 && (
          <Section
            icon="🌍"
            title="Real-World Analogy"
            content={data.analogy}
            bg="var(--coral-pale)"
            borderColor="#F5C4B6"
            iconBg="rgba(232,105,74,0.15)"
            onReadAloud={readAloud}
            speaking={readAloud.speaking}
            markdown={false}
          />
        )}
        {data.video_requested && data.video_script && (
          <VideoScriptSection script={data.video_script} />
        )}
        <FollowUps
          questions={data.follow_up_questions || []}
          onAsk={onFollowUp}
          onContinue={handleContinue}
          hasMore={data.has_more || false}
        />
      </div>
    </div>
  );
}
