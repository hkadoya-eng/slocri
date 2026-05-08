import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

const LS_KEY = (id) => `col_fb_${id}`;

export default function ColumnFeedback({ columnId, columnTitle }) {
  const [myRating, setMyRating] = useState(null);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [counts, setCounts] = useState({ good: 0, bad: 0 });
  const [toast, setToast] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(LS_KEY(columnId))) setSubmitted(true);
    fetchCounts();
  }, [columnId]);

  async function fetchCounts() {
    try {
      const { data } = await supabase
        .from("column_feedback")
        .select("rating")
        .eq("column_id", columnId);
      if (data) {
        setCounts({
          good: data.filter((d) => d.rating === 1).length,
          bad: data.filter((d) => d.rating === -1).length,
        });
      }
    } catch {}
  }

  async function handleSubmit() {
    if (!myRating || submitted || sending) return;
    setSending(true);
    try {
      await supabase.from("column_feedback").insert({
        column_id: columnId,
        column_title: columnTitle,
        rating: myRating,
        comment: comment.trim() || null,
      });
      localStorage.setItem(LS_KEY(columnId), "1");
      setSubmitted(true);
      setShowComment(false);
      await fetchCounts();
      const msg = myRating === 1 ? "👍 ありがとうございます！" : "👎 フィードバックありがとうございます";
      setToast(msg);
      setTimeout(() => setToast(""), 2500);
    } catch {}
    setSending(false);
  }

  const btn = (active, activeColor, activeBg) => ({
    padding: "4px 12px",
    borderRadius: 20,
    border: "none",
    fontSize: 13,
    cursor: submitted ? "default" : "pointer",
    fontWeight: active ? 700 : 400,
    background: active ? activeBg : "#E8ECF0",
    color: active ? activeColor : "#aaa",
    boxShadow: active
      ? `inset 2px 2px 4px ${activeBg}`
      : "2px 2px 4px #C5C9D4, -1px -1px 3px #FFFFFF",
    transition: "all 0.15s",
  });

  return (
    <div style={{ borderTop: "0.5px solid #f0f0f0", padding: "10px 14px" }}>
      {toast && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          background: "#333", color: "#fff", padding: "8px 18px", borderRadius: 20,
          fontSize: 13, zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }}>
          {toast}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {!submitted && (
          <span style={{ fontSize: 12, color: "#bbb" }}>このコラムは？</span>
        )}

        <button
          onClick={() => !submitted && setMyRating(myRating === 1 ? null : 1)}
          style={btn(myRating === 1, "#16A34A", "#D1FAE5")}
        >
          👍{counts.good > 0 ? ` ${counts.good}` : ""}
        </button>

        <button
          onClick={() => !submitted && setMyRating(myRating === -1 ? null : -1)}
          style={btn(myRating === -1, "#DC2626", "#FEE2E2")}
        >
          👎{counts.bad > 0 ? ` ${counts.bad}` : ""}
        </button>

        {!submitted && (
          <button
            onClick={() => setShowComment((v) => !v)}
            style={{
              padding: "4px 10px", borderRadius: 20, border: "none", fontSize: 12,
              cursor: "pointer", background: showComment ? "#E0E7FF" : "#E8ECF0",
              color: showComment ? "#4338CA" : "#aaa",
              boxShadow: "2px 2px 4px #C5C9D4, -1px -1px 3px #FFFFFF",
            }}
          >
            💬 {showComment ? "閉じる" : "コメント"}
          </button>
        )}

        {submitted && (
          <span style={{ fontSize: 12, color: "#bbb" }}>評価済み</span>
        )}
      </div>

      {!submitted && showComment && (
        <div style={{ marginTop: 8 }}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="感想・改善点など（任意）"
            rows={2}
            style={{
              width: "100%", padding: "8px 10px", borderRadius: 10, border: "none",
              background: "#E8ECF0", fontSize: 14, resize: "none",
              fontFamily: "inherit", boxSizing: "border-box", outline: "none",
              boxShadow: "inset 2px 2px 5px #C5C9D4, inset -1px -1px 4px #FFFFFF",
            }}
          />
        </div>
      )}

      {!submitted && myRating && (
        <div style={{ marginTop: 8 }}>
          <button
            onClick={handleSubmit}
            disabled={sending}
            style={{
              padding: "6px 18px", borderRadius: 20, border: "none",
              background: sending ? "#ccc" : "#D85A30",
              color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: sending ? "not-allowed" : "pointer",
              boxShadow: sending ? "none" : "2px 2px 6px rgba(216,90,48,0.35)",
              transition: "all 0.15s",
            }}
          >
            {sending ? "送信中…" : "送信"}
          </button>
        </div>
      )}
    </div>
  );
}
