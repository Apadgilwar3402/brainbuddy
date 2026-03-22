import { useState, useRef, useEffect } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import WelcomeScreen from "./components/WelcomeScreen";
import UserBubble from "./components/UserBubble";
import ThinkingIndicator from "./components/ThinkingIndicator";
import ResponseCard from "./components/ResponseCard";
import ErrorMessage from "./components/ErrorMessage";
import ChatInput from "./components/ChatInput";
import { explainConcept, getConversation } from "./api";

function safeParseJson(raw) {
  if (!raw) return null;
  try {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// ── Memory saved toast ───────────────────────────────────
function MemoryToast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: "90px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--navy)",
        color: "var(--citrus)",
        padding: "10px 20px",
        borderRadius: "999px",
        fontSize: "13px",
        fontWeight: 500,
        boxShadow: "var(--shadow-md)",
        zIndex: 999,
        animation: "fadeUp 0.3s ease both",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        whiteSpace: "nowrap",
      }}
    >
      🧩 Memory saved:{" "}
      <em style={{ color: "white", fontStyle: "normal" }}>{message}</em>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const [memoryRefresh, setMemoryRefresh] = useState(0);
  const [memoryToast, setMemoryToast] = useState(null);
  const [isDark, setIsDark] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (localStorage.getItem("bb-theme") === "night") {
      setIsDark(true);
      document.documentElement.classList.add("night");
    }
  }, []);

  const handleToggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("night", next);
    localStorage.setItem("bb-theme", next ? "night" : "day");
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleNew = () => {
    setMessages([]);
    setConversationId(null);
  };

  const handleSelectConversation = async (id) => {
    if (id === conversationId) return;
    try {
      const conv = await getConversation(id);
      setConversationId(conv.id);
      const rebuilt = [];
      for (const m of conv.messages) {
        if (m.role === "user") {
          rebuilt.push({ type: "user", text: m.content });
        } else if (m.role === "assistant") {
          const parsed = safeParseJson(m.ai_response);
          rebuilt.push({
            type: "response",
            data: parsed
              ? { ...parsed, talk_id: null, video_requested: false }
              : {
                  explanation: m.content,
                  analogy: "",
                  video_script: null,
                  follow_up_questions: [],
                  talk_id: null,
                  video_requested: false,
                },
          });
        }
      }
      setMessages(rebuilt);
    } catch (err) {
      console.error("Failed to load conversation:", err);
    }
  };

  const handleSend = async (concept) => {
    if (!concept.trim() || isLoading) return;
    setMessages((prev) => [...prev, { type: "user", text: concept }]);
    setIsLoading(true);

    try {
      const data = await explainConcept(concept, conversationId);

      if (!conversationId) setConversationId(data.conversation_id);
      setMessages((prev) => [...prev, { type: "response", data }]);
      setSidebarRefresh((n) => n + 1);

      // Show toast and refresh memory panel if a preference was saved
      if (data.memory_saved && data.memory_instruction) {
        setMemoryToast(data.memory_instruction);
        setMemoryRefresh((n) => n + 1);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { type: "error", message: err.message, retryText: concept },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = (retryText) => {
    setMessages((prev) => prev.filter((m) => m.type !== "error"));
    handleSend(retryText);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <Header isDark={isDark} onToggleTheme={handleToggleTheme} />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar
          activeId={conversationId}
          onSelect={handleSelectConversation}
          onNew={handleNew}
          refreshTrigger={sidebarRefresh}
          memoryRefresh={memoryRefresh}
        />

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
            <div
              style={{
                maxWidth: "680px",
                margin: "0 auto",
                paddingTop: messages.length ? "32px" : "0",
              }}
            >
              {!messages.length && <WelcomeScreen onSelectTopic={handleSend} />}

              {messages.map((msg, i) => {
                if (msg.type === "user")
                  return <UserBubble key={i} text={msg.text} />;
                if (msg.type === "response")
                  return (
                    <ResponseCard
                      key={i}
                      data={msg.data}
                      onFollowUp={handleSend}
                    />
                  );
                if (msg.type === "error")
                  return (
                    <ErrorMessage
                      key={i}
                      message={msg.message}
                      onRetry={() => handleRetry(msg.retryText)}
                    />
                  );
                return null;
              })}

              {isLoading && <ThinkingIndicator />}
              <div ref={bottomRef} style={{ height: "1px" }} />
            </div>
          </div>

          <ChatInput onSend={handleSend} isLoading={isLoading} />
        </div>
      </div>

      {/* Memory saved toast notification */}
      {memoryToast && (
        <MemoryToast
          message={memoryToast}
          onDone={() => setMemoryToast(null)}
        />
      )}
    </div>
  );
}
