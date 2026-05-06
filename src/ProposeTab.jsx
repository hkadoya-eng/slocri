import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

const STATUS = {
  pending:    { label: "⏳ 待機中", color: "#888",    bg: "#F3F4F6" },
  processing: { label: "⚙️ 生成中", color: "#2563EB", bg: "#EFF6FF" },
  done:       { label: "✅ 完成",   color: "#16A34A", bg: "#F0FDF4" },
  error:      { label: "❌ エラー", color: "#DC2626", bg: "#FEF2F2" },
};

const S = {
  card: { background: "#E8ECF0", borderRadius: 14, boxShadow: "4px 4px 8px #C5C9D4, -3px -3px 6px #FFFFFF", padding: "16px 16px", marginBottom: 12 },
  input: { width: "100%", padding: "10px 12px", borderRadius: 10, border: "none", background: "#E8ECF0", boxShadow: "inset 3px 3px 6px #C5C9D4, inset -2px -2px 5px #FFFFFF", fontSize: 15, outline: "none", boxSizing: "border-box", color: "#333", fontFamily: "inherit" },
};

export default function ProposeTab() {
  const [requests, setRequests] = useState([]);
  const [ipName, setIpName] = useState("");
  const [target, setTarget] = useState("");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    load();
    const ch = supabase
      .channel("proposal_requests_ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "proposal_requests" }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  async function load() {
    const { data } = await supabase
      .from("proposal_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) setRequests(data);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!ipName.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("proposal_requests").insert({
      ip_name: ipName.trim(),
      target: target.trim(),
      concept_memo: memo.trim(),
      status: "pending",
    });
    if (!error) {
      setIpName(""); setTarget(""); setMemo("");
      showToast("依頼を送信しました。次回のCron実行時に生成されます。");
    }
    setSubmitting(false);
    load();
  }

  function copyResult(text) {
    navigator.clipboard.writeText(text);
    showToast("コピーしました");
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "14px 12px 100px", position: "relative" }}>

      {/* トースト */}
      {toast && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "#333", color: "#fff", padding: "10px 20px", borderRadius: 20, fontSize: 13, zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
          {toast}
        </div>
      )}

      {/* 入力フォーム */}
      <div style={S.card}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, color: "#444", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 20 }}>🎮</span> ゲーム性企画を依頼する
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, color: "#666", display: "block", marginBottom: 5 }}>IP名 / 台名 <span style={{ color: "#D85A30" }}>*</span></label>
            <input
              style={S.input}
              value={ipName}
              onChange={e => setIpName(e.target.value)}
              placeholder="例：モンスターストライク、北斗の拳、バイオハザード…"
              required
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, color: "#666", display: "block", marginBottom: 5 }}>ターゲット層（任意）</label>
            <input
              style={S.input}
              value={target}
              onChange={e => setTarget(e.target.value)}
              placeholder="例：30代男性・元モン廃、20代女性・アニメファン…"
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: "#666", display: "block", marginBottom: 5 }}>コンセプトメモ（任意）</label>
            <textarea
              style={{ ...S.input, resize: "vertical", minHeight: 80, lineHeight: 1.6 }}
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="こんなゲーム性にしたい、このシーンを使いたい、感情の山谷のイメージ…"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !ipName.trim()}
            style={{
              width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
              background: (submitting || !ipName.trim()) ? "#C5C9D4" : "#D85A30",
              color: "#fff", fontSize: 15, fontWeight: 700,
              cursor: (submitting || !ipName.trim()) ? "not-allowed" : "pointer",
              boxShadow: (submitting || !ipName.trim()) ? "none" : "3px 3px 8px #C5C9D4, -1px -1px 4px #FFFFFF",
              transition: "all 0.15s",
            }}
          >
            {submitting ? "送信中…" : "企画書を依頼する ✉"}
          </button>
          <p style={{ fontSize: 12, color: "#aaa", marginTop: 8, textAlign: "center", lineHeight: 1.5 }}>
            Claude Codeが次回処理時に自動生成します（数分〜数時間後）
          </p>
        </form>
      </div>

      {/* 一覧 */}
      <div style={{ fontWeight: 600, fontSize: 13, color: "#888", marginBottom: 10, paddingLeft: 4 }}>
        依頼履歴（最新30件）
      </div>

      {requests.length === 0 && (
        <div style={{ textAlign: "center", color: "#bbb", padding: "40px 0", fontSize: 14 }}>
          まだ依頼がありません
        </div>
      )}

      {requests.map(req => {
        const st = STATUS[req.status] || STATUS.pending;
        const isOpen = expanded === req.id;
        return (
          <div key={req.id} style={{ ...S.card, cursor: req.result ? "pointer" : "default" }}
               onClick={() => req.result && setExpanded(isOpen ? null : req.id)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {req.ip_name}
                </div>
                {req.target && (
                  <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                    🎯 {req.target}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: st.bg, color: st.color, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                {st.label}
              </span>
            </div>

            {req.concept_memo && (
              <div style={{ fontSize: 12, color: "#999", background: "#F0F2F5", borderRadius: 8, padding: "6px 10px", marginBottom: 6 }}>
                {req.concept_memo}
              </div>
            )}

            {/* 企画書展開 */}
            {req.result && isOpen && (
              <div style={{ marginTop: 10 }}>
                <div style={{ background: "#F8F9FA", borderRadius: 10, padding: 14, fontSize: 13, color: "#333", lineHeight: 1.8, whiteSpace: "pre-wrap", maxHeight: 500, overflowY: "auto", border: "1px solid #E0E4E8" }}>
                  {req.result}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); copyResult(req.result); }}
                  style={{ marginTop: 8, padding: "7px 16px", borderRadius: 8, border: "none", background: "#E8ECF0", color: "#555", fontSize: 13, cursor: "pointer", boxShadow: "2px 2px 5px #C5C9D4, -1px -1px 3px #FFFFFF" }}
                >
                  📋 コピー
                </button>
              </div>
            )}

            {req.result && (
              <div style={{ fontSize: 12, color: "#D85A30", textAlign: "right", marginTop: 4, fontWeight: 600 }}>
                {isOpen ? "▲ 閉じる" : "▼ 企画書を見る"}
              </div>
            )}

            <div style={{ fontSize: 11, color: "#ccc", marginTop: 6 }}>
              {new Date(req.created_at).toLocaleString("ja-JP")}
            </div>
          </div>
        );
      })}
    </div>
  );
}
