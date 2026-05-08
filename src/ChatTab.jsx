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

  useEffect(() => {
    load();
    const ch = supabase
      .channel("chat_messages_ch")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    setSending(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  async function newSession() {
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
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#bbb", padding: "60px 0 20px", fontSize: 14 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
            パチスロについて何でも聞いてください<br />
            <span style={{ fontSize: 12 }}>1〜2分で返答します</span>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={bubble(msg.role === "user")}>
              {msg.role === "assistant" ? <CollapsibleContent content={msg.content} /> : msg.content}
            </div>
            {msg.role === "assistant" && (
              <div style={{ display: "flex", gap: 6, marginTop: 4, marginLeft: 4 }}>
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
              </div>
            )}
          </div>
        ))}

        {lastIsUser && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ ...bubble(false), color: "#aaa", fontSize: 13 }}>⏳ 返答を生成中…（1〜2分）</div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      <div style={{ padding: "10px 12px 14px", borderTop: "1px solid #E0E4E8", background: "#F4F6F8" }}>
        <form onSubmit={send} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            rows={2}
            style={{ flex: 1, padding: "10px 12px", borderRadius: 12, border: "none", background: "#E8ECF0", boxShadow: "inset 3px 3px 6px #C5C9D4, inset -2px -2px 5px #FFFFFF", fontSize: 14, outline: "none", resize: "none", fontFamily: "inherit", color: "#333" }}
            placeholder="メッセージを入力（Shift+Enterで改行、Enterで送信）"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            style={{ padding: "10px 16px", borderRadius: 12, border: "none", background: (!input.trim() || sending) ? "#C5C9D4" : "#D85A30", color: "#fff", fontSize: 15, fontWeight: 700, cursor: (!input.trim() || sending) ? "not-allowed" : "pointer", boxShadow: (!input.trim() || sending) ? "none" : "3px 3px 8px #C5C9D4", flexShrink: 0, transition: "all 0.15s" }}
          >
            送信
          </button>
        </form>
      </div>
    </div>
  );
}
