import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase";

const SESSION_KEY = "slocri_chat_session";

function getOrCreateSession() {
  let s = localStorage.getItem(SESSION_KEY);
  if (!s) { s = crypto.randomUUID(); localStorage.setItem(SESSION_KEY, s); }
  return s;
}

function bubble(isUser) {
  return {
    maxWidth: "82%",
    padding: "10px 14px",
    borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
    background: isUser ? "#D85A30" : "#E8ECF0",
    color: isUser ? "#fff" : "#333",
    fontSize: 14,
    lineHeight: 1.75,
    boxShadow: isUser
      ? "2px 2px 8px rgba(216,90,48,0.3)"
      : "3px 3px 6px #C5C9D4, -2px -2px 4px #FFFFFF",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  };
}

const COLLAPSE_THRESHOLD = 200;

const QUICK_QUESTIONS = [
  "今週の新台おすすめは？",
  "天井狙いにいい台を教えて",
  "荒くない安定して出る台は？",
  "設定6が入りやすい機種は？",
  "最近稼働が伸びてる台は？",
  "初心者に向いてる台は？",
];

function CollapsibleContent({ content }) {
  const [expanded, setExpanded] = useState(false);
  const long = content.length > COLLAPSE_THRESHOLD;
  return (
    <span>
      {long && !expanded ? content.slice(0, COLLAPSE_THRESHOLD) + "…" : content}
      {long && (
        <button
          onClick={() => setExpanded(v => !v)}
          style={{ display: "block", marginTop: 6, fontSize: 12, color: "#D85A30", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}
        >
          {expanded ? "折りたたむ ▲" : "続きを読む ▼"}
        </button>
      )}
    </span>
  );
}

export default function ChatTab() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [ratings, setRatings] = useState({});
  const [ratingToast, setRatingToast] = useState("");
  const sessionId = useRef(getOrCreateSession());
  const bottomRef = useRef(null);
  const scrollRef = useRef(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("chat_messages_ch")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  // ユーザーが一番下付近にいる時だけ自動スクロール。上を読んでる時は触らない
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stickToBottomRef.current = nearBottom;
  }

  async function load() {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId.current)
      .order("created_at", { ascending: true })
      .limit(100);
    if (data) {
      setMessages(data);
      const r = {};
      data.forEach(m => { if (m.rating) r[m.id] = m.rating; });
      setRatings(r);
    }
  }

  async function rate(msgId, value) {
    const current = ratings[msgId];
    const next = current === value ? null : value;
    setRatings(prev => ({ ...prev, [msgId]: next }));
    await supabase.from("chat_messages").update({ rating: next }).eq("id", msgId);
    if (next === 1) { setRatingToast("👍 ありがとうございます！"); setTimeout(() => setRatingToast(""), 2000); }
    if (next === -1) { setRatingToast("👎 フィードバックありがとうございます"); setTimeout(() => setRatingToast(""), 2000); }
  }

  async function send(e) {
    e?.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    await supabase.from("chat_messages").insert({
      session_id: sessionId.current,
      role: "user",
      content,
    });
    await load();
    setSending(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  async function newSession() {
    if (messages.length > 0 && !window.confirm("現在の会話を終了して新しいスレッドを始めますか？\n（過去の会話は履歴から確認できます）")) return;
    localStorage.removeItem(SESSION_KEY);
    sessionId.current = getOrCreateSession();
    setMessages([]);
    setInput("");
  }

  const lastIsUser = messages.length > 0 && messages[messages.length - 1].role === "user";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", maxWidth: 640, margin: "0 auto", position: "relative" }}>
      {ratingToast && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "#333", color: "#fff", padding: "8px 18px", borderRadius: 20, fontSize: 13, zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
          {ratingToast}
        </div>
      )}

      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px 6px", borderBottom: "1px solid #E0E4E8" }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: "#444" }}>💬 チャット</span>
        <button onClick={newSession} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, border: "none", background: "#E8ECF0", boxShadow: "2px 2px 5px #C5C9D4, -1px -1px 3px #FFFFFF", color: "#888", cursor: "pointer" }}>
          新しい会話
        </button>
      </div>

      {/* メッセージ一覧 */}
      <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ padding: "32px 4px 8px" }}>
            <div style={{ textAlign: "center", color: "#bbb", marginBottom: 20, fontSize: 14 }}>
              <div style={{ fontSize: 34, marginBottom: 10 }}>💬</div>
              気になる台や話題をなんでも聞いてみよう<br />
              <span style={{ fontSize: 12 }}>1〜2分で返答します</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {QUICK_QUESTIONS.map(q => (
                <button key={q} onClick={() => setInput(q)}
                  style={{ padding: "8px 14px", borderRadius: 20, border: "none", background: "#E8ECF0", color: "#555", fontSize: 13, cursor: "pointer", boxShadow: "2px 2px 5px #C5C9D4, -1px -1px 3px #FFFFFF", transition: "all 0.15s", lineHeight: 1.4 }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          const ts = msg.created_at ? new Date(msg.created_at) : null;
          const timeStr = ts ? `${ts.getHours().toString().padStart(2,"0")}:${ts.getMinutes().toString().padStart(2,"0")}` : "";
          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={bubble(msg.role === "user")}>
                {msg.role === "assistant" ? <CollapsibleContent content={msg.content} /> : msg.content}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 4, marginLeft: 4, marginRight: 4, alignItems: "center" }}>
                {msg.role === "assistant" && (
                  <>
                    <button
                      onClick={() => rate(msg.id, 1)}
                      title="良い回答"
                      style={{ padding: "3px 10px", borderRadius: 20, border: "none", fontSize: 13, cursor: "pointer", background: ratings[msg.id] === 1 ? "#D1FAE5" : "#E8ECF0", color: ratings[msg.id] === 1 ? "#16A34A" : "#aaa", boxShadow: ratings[msg.id] === 1 ? "inset 2px 2px 4px #A7F3D0" : "2px 2px 4px #C5C9D4, -1px -1px 3px #FFFFFF", transition: "all 0.15s", fontWeight: ratings[msg.id] === 1 ? 700 : 400 }}
                    >👍</button>
                    <button
                      onClick={() => rate(msg.id, -1)}
                      title="改善が必要"
                      style={{ padding: "3px 10px", borderRadius: 20, border: "none", fontSize: 13, cursor: "pointer", background: ratings[msg.id] === -1 ? "#FEE2E2" : "#E8ECF0", color: ratings[msg.id] === -1 ? "#DC2626" : "#aaa", boxShadow: ratings[msg.id] === -1 ? "inset 2px 2px 4px #FECACA" : "2px 2px 4px #C5C9D4, -1px -1px 3px #FFFFFF", transition: "all 0.15s", fontWeight: ratings[msg.id] === -1 ? 700 : 400 }}
                    >👎</button>
                  </>
                )}
                {timeStr && <span style={{ fontSize: 10, color: "#bbb" }}>{timeStr}</span>}
              </div>
            </div>
          );
        })}

        {lastIsUser && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ ...bubble(false), color: "#888", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              <span>返答を生成中</span>
              <span style={{ display: "inline-flex", gap: 3 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#D85A30", animation: "slocriChatPulse 1.2s infinite", animationDelay: "0s" }} />
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#D85A30", animation: "slocriChatPulse 1.2s infinite", animationDelay: "0.2s" }} />
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#D85A30", animation: "slocriChatPulse 1.2s infinite", animationDelay: "0.4s" }} />
              </span>
              <style>{`@keyframes slocriChatPulse { 0%, 80%, 100% { opacity: 0.2 } 40% { opacity: 1 } }`}</style>
            </div>
          </div>
        )}

        {messages.length > 0 && !lastIsUser && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, justifyContent: "center" }}>
            {QUICK_QUESTIONS.slice(0, 3).map(q => (
              <button key={q} onClick={() => setInput(q)}
                style={{ padding: "5px 12px", borderRadius: 14, border: "none", background: "rgba(216,90,48,0.08)", color: "#D85A30", fontSize: 12, cursor: "pointer", lineHeight: 1.4 }}>
                {q}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      <div style={{ padding: "10px 12px 14px", borderTop: "1px solid #E0E4E8", background: "#F4F6F8" }}>
        <form onSubmit={send} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={e => {
              setInput(e.target.value);
              // auto-grow
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
            }}
            onKeyDown={handleKeyDown}
            disabled={sending}
            rows={1}
            style={{ flex: 1, padding: "12px 14px", borderRadius: 14, border: "none", background: "#E8ECF0", boxShadow: "inset 3px 3px 6px #C5C9D4, inset -2px -2px 5px #FFFFFF", fontSize: 16, outline: "none", resize: "none", fontFamily: "inherit", color: "#333", minHeight: 44, maxHeight: 160, lineHeight: 1.5 }}
            placeholder="気になる台や話題をなんでも…（Enterで送信）"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            aria-label="送信"
            style={{ width: 56, height: 56, borderRadius: 16, border: "none", background: (!input.trim() || sending) ? "#C5C9D4" : "linear-gradient(135deg, #E86B3F 0%, #D85A30 100%)", color: "#fff", fontSize: 22, fontWeight: 700, cursor: (!input.trim() || sending) ? "not-allowed" : "pointer", boxShadow: (!input.trim() || sending) ? "none" : "0 4px 12px rgba(216,90,48,0.4), inset 0 1px 0 rgba(255,255,255,0.3)", flexShrink: 0, transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {sending ? "…" : "➤"}
          </button>
        </form>
      </div>
    </div>
  );
}
