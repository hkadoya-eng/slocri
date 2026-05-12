import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";

const STATUS = {
  pending:      { label: "⏳ 待機中",   color: "#888",    bg: "#F3F4F6" },
  questioning:  { label: "💬 回答待ち", color: "#7C3AED", bg: "#F5F3FF" },
  processing:   { label: "⚙️ 生成中",  color: "#2563EB", bg: "#EFF6FF" },
  done:         { label: "✅ 完成",     color: "#16A34A", bg: "#F0FDF4" },
  error:        { label: "❌ エラー",   color: "#DC2626", bg: "#FEF2F2" },
};

const RATINGS = {
  1:  { label: "👍 良い",    color: "#16A34A", bg: "#D1FAE5", activeBg: "#A7F3D0" },
  0:  { label: "✏️ 修正希望", color: "#B45309", bg: "#FEF3C7", activeBg: "#FDE68A" },
  "-1": { label: "👎 悪い",  color: "#DC2626", bg: "#FEE2E2", activeBg: "#FECACA" },
};

const S = {
  card: { background: "#E8ECF0", borderRadius: 14, boxShadow: "4px 4px 8px #C5C9D4, -3px -3px 6px #FFFFFF", padding: "16px 16px", marginBottom: 12, overflow: "hidden" },
  input: { width: "100%", padding: "10px 12px", borderRadius: 10, border: "none", background: "#E8ECF0", boxShadow: "inset 3px 3px 6px #C5C9D4, inset -2px -2px 5px #FFFFFF", fontSize: 15, outline: "none", boxSizing: "border-box", color: "#333", fontFamily: "inherit" },
};

export default function ProposeTab() {
  const [proposeMode, setProposeMode] = useState("full");
  const [requests, setRequests] = useState([]);
  const [ipName, setIpName] = useState("");
  const [target, setTarget] = useState("");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [featureText, setFeatureText] = useState("");
  const [featureSubmitting, setFeatureSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [toast, setToast] = useState("");
  const [answers, setAnswers] = useState({});
  const [answerSubmitting, setAnswerSubmitting] = useState({});
  const [proposalRatings, setProposalRatings] = useState({});
  const [revisionInputs, setRevisionInputs] = useState({});
  const [revisionSubmitting, setRevisionSubmitting] = useState({});

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
    if (data) {
      setRequests(data);
      const r = {};
      data.forEach(req => { if (req.rating != null) r[req.id] = req.rating; });
      setProposalRatings(prev => ({ ...prev, ...r }));
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("proposal_requests").insert({
      ip_name: ipName.trim(),
      target: target.trim(),
      concept_memo: memo.trim(),
      status: "pending",
    });
    if (!error) {
      setIpName(""); setTarget(""); setMemo("");
      showToast("依頼しました。まずヒアリング質問が届きます（〜30分）");
    }
    setSubmitting(false);
    load();
  }

  async function handleFeatureSubmit(e) {
    e.preventDefault();
    if (!featureText.trim()) return;
    setFeatureSubmitting(true);
    const { error } = await supabase.from("proposal_requests").insert({
      ip_name: featureText.trim().slice(0, 40),
      target: "機能単体",
      concept_memo: featureText.trim(),
      status: "pending",
    });
    if (!error) {
      setFeatureText("");
      showToast("依頼しました。設計提案書が届きます（〜30分）");
    }
    setFeatureSubmitting(false);
    load();
  }

  async function submitAnswers(req) {
    const ans = (answers[req.id] || "").trim();
    if (!ans) return;
    setAnswerSubmitting(prev => ({ ...prev, [req.id]: true }));
    await supabase.from("proposal_requests").update({
      answers: ans,
      status: "pending",
      updated_at: new Date().toISOString(),
    }).eq("id", req.id);
    setAnswerSubmitting(prev => ({ ...prev, [req.id]: false }));
    showToast("回答を送信しました。提案書を生成します（〜30分）");
    load();
  }

  async function rateProposal(req, value) {
    const current = proposalRatings[req.id];
    const next = current === value ? null : value;
    setProposalRatings(prev => ({ ...prev, [req.id]: next }));
    await supabase.from("proposal_requests").update({ rating: next }).eq("id", req.id);
    if (next === 1) showToast("👍 確定済みとして蓄積しました！");
  }

  async function submitRevision(req) {
    const comment = (revisionInputs[req.id] || "").trim();
    if (!comment) return;
    setRevisionSubmitting(prev => ({ ...prev, [req.id]: true }));

    const history = req.revision_history || [];
    const newHistory = [...history, {
      round: history.length + 1,
      result: req.result,
      rating: proposalRatings[req.id] ?? null,
      feedback: comment,
      revised_at: new Date().toISOString(),
    }];

    await supabase.from("proposal_requests").update({
      rating: proposalRatings[req.id] ?? null,
      revision_request: comment,
      revision_history: newHistory,
      status: "pending",
      updated_at: new Date().toISOString(),
    }).eq("id", req.id);

    setRevisionInputs(prev => ({ ...prev, [req.id]: "" }));
    setRevisionSubmitting(prev => ({ ...prev, [req.id]: false }));
    showToast("修正依頼を送信しました。改善版を生成します（〜30分）");
    load();
  }

  function copyResult(text) {
    navigator.clipboard.writeText(text);
    showToast("コピーしました");
  }

  const displayedRequests = requests.filter(req =>
    proposeMode === "feature"
      ? req.target === "機能単体"
      : req.target !== "機能単体"
  );

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "14px 12px 100px", position: "relative" }}>

      {toast && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "#333", color: "#fff", padding: "10px 20px", borderRadius: 20, fontSize: 13, zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
          {toast}
        </div>
      )}

      {/* モード切替 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[["full", "🎮 全体企画"], ["feature", "⚡ 機能単体"]].map(([k, l]) => (
          <button key={k} onClick={() => setProposeMode(k)}
            style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer", transition: "all 0.15s",
              background: proposeMode === k ? "#D85A30" : "#E8ECF0",
              color: proposeMode === k ? "#fff" : "#888",
              boxShadow: proposeMode === k ? "inset 2px 2px 5px rgba(0,0,0,0.15)" : "2px 2px 5px #C5C9D4, -1px -1px 3px #FFFFFF",
            }}>{l}</button>
        ))}
      </div>

      {/* 機能単体フォーム */}
      {proposeMode === "feature" && (
        <div style={S.card}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, color: "#444", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 20 }}>⚡</span> 機能・ゲーム性を1つ指定して提案
          </div>
          <form onSubmit={handleFeatureSubmit}>
            <div style={{ marginBottom: 16 }}>
              <textarea
                style={{ ...S.input, resize: "vertical", minHeight: 100, lineHeight: 1.6 }}
                value={featureText}
                onChange={e => setFeatureText(e.target.value)}
                placeholder={"例：高純増AT機のCZ設計を提案して\n例：やめ時がない継続ループのボーナス設計\n例：天井300Gのライトスペック向けゲームフロー"}
              />
            </div>
            <button type="submit" disabled={featureSubmitting || !featureText.trim()}
              style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                background: (featureSubmitting || !featureText.trim()) ? "#C5C9D4" : "#D85A30",
                color: "#fff", fontSize: 15, fontWeight: 700,
                cursor: (featureSubmitting || !featureText.trim()) ? "not-allowed" : "pointer",
                boxShadow: (featureSubmitting || !featureText.trim()) ? "none" : "3px 3px 8px #C5C9D4, -1px -1px 4px #FFFFFF",
                transition: "all 0.15s",
              }}>
              {featureSubmitting ? "送信中…" : "設計提案を依頼する ✉"}
            </button>
            <p style={{ fontSize: 12, color: "#aaa", marginTop: 8, textAlign: "center", lineHeight: 1.5 }}>
              AIが設計提案書を作成します（〜30分）
            </p>
          </form>
        </div>
      )}

      {/* 全体企画フォーム */}
      {proposeMode === "full" && (
        <div style={S.card}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, color: "#444", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 20 }}>🎮</span> ゲーム性企画を依頼する
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: "#666", display: "block", marginBottom: 5 }}>IP名 / 台名 <span style={{ color: "#aaa", fontSize: 11 }}>(任意)</span></label>
              <input style={S.input} value={ipName} onChange={e => setIpName(e.target.value)} placeholder="例：北斗の拳、バイオハザード、エヴァンゲリオン…（空欄でオリジナルIPとして提案）" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: "#666", display: "block", marginBottom: 5 }}>ターゲット層（任意）</label>
              <input style={S.input} value={target} onChange={e => setTarget(e.target.value)} placeholder="例：30代男性・格ゲー好き、20代女性・アニメファン…" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: "#666", display: "block", marginBottom: 5 }}>コンセプトメモ（任意）</label>
              <textarea style={{ ...S.input, resize: "vertical", minHeight: 80, lineHeight: 1.6 }} value={memo} onChange={e => setMemo(e.target.value)} placeholder="こんなゲーム性にしたい、このシーンを使いたい、感情の起伏のイメージ…" />
            </div>
            <button type="submit" disabled={submitting}
              style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                background: submitting ? "#C5C9D4" : "#D85A30",
                color: "#fff", fontSize: 15, fontWeight: 700,
                cursor: submitting ? "not-allowed" : "pointer",
                boxShadow: submitting ? "none" : "3px 3px 8px #C5C9D4, -1px -1px 4px #FFFFFF",
                transition: "all 0.15s",
              }}>
              {submitting ? "送信中…" : "企画書を依頼する ✉"}
            </button>
            <p style={{ fontSize: 12, color: "#aaa", marginTop: 8, textAlign: "center", lineHeight: 1.5 }}>
              まずヒアリング質問が届き、回答後に提案書が生成されます
            </p>
          </form>
        </div>
      )}

      {/* 依頼履歴リスト */}
      <div style={{ fontWeight: 600, fontSize: 13, color: "#888", marginBottom: 10, paddingLeft: 4 }}>
        依頼履歴（最新30件）
      </div>

      {displayedRequests.length === 0 && (
        <div style={{ textAlign: "center", color: "#bbb", padding: "40px 0", fontSize: 14 }}>まだ依頼がありません</div>
      )}

      {displayedRequests.map(req => {
        const st = STATUS[req.status] || STATUS.pending;
        const isOpen = expanded === req.id;
        const questions = req.questions ? req.questions.split("\n").filter(Boolean) : [];
        const isClickable = req.result || req.status === "questioning";
        const currentRating = proposalRatings[req.id] ?? null;
        const showRevisionForm = (currentRating === 0 || currentRating === -1) && req.status === "done";
        const revisionHistory = req.revision_history || [];

        return (
          <div key={req.id} style={{ ...S.card, cursor: isClickable ? "pointer" : "default" }}
               onClick={() => isClickable && setExpanded(isOpen ? null : req.id)}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{req.ip_name}</div>
                {req.target && req.target !== "機能単体" && <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>🎯 {req.target}</div>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: st.bg, color: st.color, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>{st.label}</span>
                {revisionHistory.length > 0 && (
                  <span style={{ fontSize: 11, color: "#888" }}>第{revisionHistory.length + 1}稿</span>
                )}
              </div>
            </div>

            {req.concept_memo && (
              <div style={{ fontSize: 12, color: "#999", background: "#F0F2F5", borderRadius: 8, padding: "6px 10px", marginBottom: 6 }}>{req.concept_memo}</div>
            )}

            {/* ヒアリング質問 */}
            {req.status === "questioning" && questions.length > 0 && isOpen && (
              <div style={{ marginTop: 10 }} onClick={e => e.stopPropagation()}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED", marginBottom: 10 }}>💬 以下の質問に回答してください</div>
                {questions.map((q, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#555", marginBottom: 6, padding: "7px 12px", background: "#F5F3FF", borderRadius: 8, borderLeft: "3px solid #7C3AED" }}>
                    <span style={{ fontWeight: 700, color: "#7C3AED" }}>Q{i + 1}.</span> {q}
                  </div>
                ))}
                {!req.answers ? (
                  <>
                    <textarea
                      style={{ ...S.input, resize: "vertical", minHeight: 120, lineHeight: 1.7, marginTop: 10, marginBottom: 8 }}
                      value={answers[req.id] || ""}
                      onChange={e => setAnswers(prev => ({ ...prev, [req.id]: e.target.value }))}
                      placeholder={questions.map((_, i) => `Q${i + 1}: `).join("\n")}
                    />
                    <button
                      onClick={() => submitAnswers(req)}
                      disabled={answerSubmitting[req.id] || !(answers[req.id] || "").trim()}
                      style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "none",
                        background: !(answers[req.id] || "").trim() ? "#C5C9D4" : "#7C3AED",
                        color: "#fff", fontSize: 14, fontWeight: 700,
                        cursor: !(answers[req.id] || "").trim() ? "not-allowed" : "pointer", transition: "all 0.15s" }}
                    >
                      {answerSubmitting[req.id] ? "送信中…" : "回答して提案書を生成 →"}
                    </button>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: "#16A34A", marginTop: 8, padding: "7px 12px", background: "#F0FDF4", borderRadius: 8 }}>
                    ✅ 回答済み。提案書を生成中です…
                  </div>
                )}
              </div>
            )}

            {/* 修正履歴 */}
            {isOpen && revisionHistory.length > 0 && (
              <div style={{ marginTop: 10 }} onClick={e => e.stopPropagation()}>
                {revisionHistory.map((h, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 4 }}>
                      第{h.round}稿
                      {h.rating === 1 && " 👍"}
                      {h.rating === 0 && " ✏️"}
                      {h.rating === -1 && " 👎"}
                    </div>
                    <div style={{ background: "#F8F9FA", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#555", lineHeight: 1.8, whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto", overflowX: "hidden", border: "1px solid #E0E4E8", opacity: 0.75 }}>
                      {h.result}
                    </div>
                    {h.feedback && (
                      <div style={{ marginTop: 6, padding: "6px 10px", background: "#FEF3C7", borderRadius: 8, fontSize: 12, color: "#92400E", borderLeft: "3px solid #F59E0B" }}>
                        💬 修正依頼：{h.feedback}
                      </div>
                    )}
                  </div>
                ))}
                <div style={{ fontSize: 12, fontWeight: 700, color: "#444", marginBottom: 4 }}>
                  第{revisionHistory.length + 1}稿（最新）
                </div>
              </div>
            )}

            {/* 提案書展開 */}
            {req.result && isOpen && (
              <div style={{ marginTop: revisionHistory.length > 0 ? 0 : 10 }} onClick={e => e.stopPropagation()}>
                <div style={{ background: "#F8F9FA", borderRadius: 10, padding: 14, fontSize: 13, color: "#333", lineHeight: 1.8, whiteSpace: "pre-wrap", maxHeight: 500, overflowY: "auto", overflowX: "hidden", border: "1px solid #E0E4E8" }}>
                  {req.result.split("\n").map((line, i) => {
                    if (line.startsWith("# ")) return <div key={i} style={{ fontSize: 17, fontWeight: 700, color: "#333", marginTop: 8, marginBottom: 6 }}>{line.slice(2)}</div>;
                    if (line.startsWith("## ")) return <div key={i} style={{ fontSize: 14, fontWeight: 700, color: "#D85A30", marginTop: 14, marginBottom: 4 }}>{line.slice(3)}</div>;
                    if (line.startsWith("- ") || line.startsWith("* ")) return <div key={i} style={{ paddingLeft: 12, marginBottom: 2 }}>• {line.slice(2)}</div>;
                    if (line.trim() === "---") return <hr key={i} style={{ border: "none", borderTop: "0.5px solid #eee", margin: "8px 0" }} />;
                    return <div key={i} style={{ marginBottom: line === "" ? 6 : 0 }}>{line}</div>;
                  })}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); copyResult(req.result); }}
                  style={{ marginTop: 8, padding: "7px 16px", borderRadius: 8, border: "none", background: "#E8ECF0", color: "#555", fontSize: 13, cursor: "pointer", boxShadow: "2px 2px 5px #C5C9D4, -1px -1px 3px #FFFFFF" }}
                >
                  📋 コピー
                </button>

                {/* 評価ボタン */}
                {req.status === "done" && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>この提案書を評価してください</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[1, 0, -1].map(val => {
                        const r = RATINGS[val];
                        const isActive = currentRating === val;
                        return (
                          <button key={val} onClick={() => rateProposal(req, val)}
                            style={{ flex: 1, padding: "9px 4px", borderRadius: 10, border: "none",
                              background: isActive ? r.activeBg : "#E8ECF0",
                              color: isActive ? r.color : "#888",
                              fontSize: 13, fontWeight: isActive ? 700 : 400, cursor: "pointer",
                              boxShadow: isActive ? `inset 2px 2px 5px ${r.activeBg}` : "2px 2px 5px #C5C9D4, -1px -1px 3px #FFFFFF",
                              transition: "all 0.15s",
                            }}>
                            {r.label}
                          </button>
                        );
                      })}
                    </div>

                    {currentRating === 1 && (
                      <div style={{ fontSize: 12, color: "#16A34A", marginTop: 8, padding: "7px 12px", background: "#F0FDF4", borderRadius: 8 }}>
                        ✅ 確定済みとして蓄積されました
                      </div>
                    )}

                    {showRevisionForm && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 12, color: currentRating === -1 ? "#DC2626" : "#B45309", marginBottom: 6, fontWeight: 600 }}>
                          {currentRating === -1 ? "👎 どこが問題でしたか？" : "✏️ どのような修正を希望しますか？"}
                        </div>
                        <textarea
                          style={{ ...S.input, resize: "vertical", minHeight: 100, lineHeight: 1.7, marginBottom: 8 }}
                          value={revisionInputs[req.id] || ""}
                          onChange={e => setRevisionInputs(prev => ({ ...prev, [req.id]: e.target.value }))}
                          placeholder="例：スペック設定を変えてほしい、演出アイデアをもっと原作に寄せてほしい…"
                        />
                        <button
                          onClick={() => submitRevision(req)}
                          disabled={revisionSubmitting[req.id] || !(revisionInputs[req.id] || "").trim()}
                          style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "none",
                            background: !(revisionInputs[req.id] || "").trim() ? "#C5C9D4" : "#D85A30",
                            color: "#fff", fontSize: 14, fontWeight: 700,
                            cursor: !(revisionInputs[req.id] || "").trim() ? "not-allowed" : "pointer",
                            transition: "all 0.15s",
                          }}>
                          {revisionSubmitting[req.id] ? "送信中…" : "修正を依頼する →"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isClickable && (
              <div style={{ fontSize: 12, color: "#D85A30", textAlign: "right", marginTop: 4, fontWeight: 600 }}>
                {isOpen ? "▲ 閉じる" : req.status === "questioning" ? "▼ 質問に回答する" : "▼ 提案書を見る"}
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
