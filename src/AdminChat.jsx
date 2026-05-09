import React, { useState, useEffect, useRef } from "react";

const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwemJ0dXVjb3B1Y2FibHd5cWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Mjk2MzEsImV4cCI6MjA5MTIwNTYzMX0.qry7pSzmm3lWK82Vnp7Wz-R9wHsDVwbj7ysy62xUhuA";
const BASE = "https://vpzbtuucopucablwyqeq.supabase.co/rest/v1";

function getSessionId() {
  let sid = localStorage.getItem("admin_chat_sid");
  if (!sid) {
    sid = "admin_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    localStorage.setItem("admin_chat_sid", sid);
  }
  return sid;
}

export default function AdminChat() {
  const [sid] = useState(getSessionId);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const bottomRef = useRef(null);
  const prevCountRef = useRef(0);

  async function load() {
    const res = await fetch(
      `${BASE}/chat_messages?session_id=eq.${encodeURIComponent(sid)}&order=created_at.asc&select=role,content,created_at`,
      { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }
    );
    if (!res.ok) return;
    const data = await res.json();
    if (data.length > prevCountRef.current) {
      prevCountRef.current = data.length;
      setWaiting(false);
    }
    setMsgs(data);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [sid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send(text) {
    if (!text.trim() || sending) return;
    setSending(true);
    setInput("");
    setWaiting(true);
    prevCountRef.current = msgs.length + 1;
    setMsgs(prev => [...prev, { role: "user", content: text }]);
    await fetch(`${BASE}/chat_messages`, {
      method: "POST",
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${ANON}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ session_id: sid, role: "user", content: text }),
    });
    setSending(false);
  }

  function newSession() {
    localStorage.removeItem("admin_chat_sid");
    window.location.reload();
  }

  const lastMsg = msgs[msgs.length - 1];
  const isAwaitingConfirm =
    lastMsg?.role === "assistant" &&
    (lastMsg.content.includes("実行しますか") || lastMsg.content.includes("進めますか") || lastMsg.content.includes("よろしいですか"));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: 440 }}>

      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: "#888" }}>
          指示 → Claude確認 → 実行 の流れで動きます
        </span>
        <button onClick={newSession}
          style={{ fontSize: 11, color: "#aaa", background: "none", border: "1px solid #ddd", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>
          会話リセット
        </button>
      </div>

      {/* メッセージ一覧 */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 12, paddingRight: 2 }}>
        {msgs.length === 0 && !waiting && (
          <div style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: "28px 0", lineHeight: 2 }}>
            何でも指示してください<br />
            <span style={{ fontSize: 11 }}>
              「SISの○○を直して」<br />
              「バイオRE3の記事を集めて」<br />
              「機種分析を更新して」
            </span>
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "88%",
            background: m.role === "user" ? "#1A56B0" : "#ffffff",
            color: m.role === "user" ? "#fff" : "#333",
            borderRadius: m.role === "user" ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
            padding: "9px 13px",
            fontSize: 13,
            lineHeight: 1.65,
            boxShadow: "1px 2px 6px rgba(0,0,0,0.1)",
            whiteSpace: "pre-wrap",
          }}>
            {m.content}
          </div>
        ))}

        {/* 待機中インジケーター */}
        {waiting && (
          <div style={{
            alignSelf: "flex-start", background: "#fff",
            borderRadius: "14px 14px 14px 3px",
            padding: "10px 16px", fontSize: 20, color: "#aaa",
            boxShadow: "1px 2px 6px rgba(0,0,0,0.08)",
            letterSpacing: 4,
          }}>
            ···
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 実行確認ショートカット */}
      {isAwaitingConfirm && (
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button onClick={() => send("おねがい！")}
            style={{
              flex: 1, padding: "10px", border: "none", borderRadius: 10,
              background: "#1A56B0", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
              boxShadow: "2px 2px 5px rgba(0,0,0,0.15)",
            }}>
            ✅ 実行する
          </button>
          <button onClick={() => send("やめておきます")}
            style={{
              padding: "10px 14px", border: "1px solid #ddd", borderRadius: 10,
              background: "none", color: "#888", fontSize: 13, cursor: "pointer",
            }}>
            キャンセル
          </button>
        </div>
      )}

      {/* 入力欄 */}
      <div style={{ display: "flex", gap: 6 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder="指示・質問を入力（Enterで送信 / Shift+Enterで改行）"
          style={{
            flex: 1, fontSize: 16, padding: "8px 10px", borderRadius: 10,
            border: "none", background: "#E8ECF0",
            boxShadow: "inset 2px 2px 5px #C5C9D4, inset -2px -2px 5px #FFFFFF",
            resize: "none", outline: "none", height: "52px", maxHeight: "52px",
            overflowY: "hidden", lineHeight: 1.4,
          }}
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || sending}
          style={{
            padding: "0 14px", borderRadius: 10, border: "none",
            background: !input.trim() || sending ? "#ccc" : "#1A56B0",
            color: "#fff", fontWeight: 700, fontSize: 13,
            cursor: !input.trim() || sending ? "default" : "pointer",
            alignSelf: "stretch",
          }}>
          送信
        </button>
      </div>
    </div>
  );
}
