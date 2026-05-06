import React, { useState, useEffect, useRef } from "react";
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

export default function ChatTab() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
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
    if (data) setMessages(data);
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
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", maxWidth: 640, margin: "0 auto" }}>

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
          <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={bubble(msg.role === "user")}>{msg.content}</div>
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
