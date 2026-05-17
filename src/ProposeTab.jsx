import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";

// スマホ判定: UA + 画面幅。情報漏洩防止のためダウンロードを無効化する条件
function detectMobile() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const uaMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  const narrow = typeof window !== "undefined" && window.innerWidth < 768;
  return uaMobile || narrow;
}

// 将来: 会社IPチェックなどの追加条件をここに足す
// 今は「PCならOK」とだけ。
function canDownload(isMobile) {
  return !isMobile;
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

// CDN動的ロード(npm依存ゼロ)。同じURLは1度しかfetchしない
const PDF_LIBS = {
  jsPDF: "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
  html2canvas: "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
  mermaid: "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js",
};
const SCRIPT_CACHE = {};
function loadScript(src) {
  if (SCRIPT_CACHE[src]) return SCRIPT_CACHE[src];
  return (SCRIPT_CACHE[src] = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("script load failed: " + src));
    document.head.appendChild(s);
  }));
}
let mermaidInited = false;
async function ensurePdfLibs() {
  await Promise.all([loadScript(PDF_LIBS.jsPDF), loadScript(PDF_LIBS.html2canvas), loadScript(PDF_LIBS.mermaid)]);
  if (!mermaidInited && window.mermaid) {
    window.mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "loose" });
    mermaidInited = true;
  }
}

// Markdown表をHTMLテーブルに変換
function parseMarkdownTable(tableText) {
  const lines = tableText.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 1) return "";
  const cells = (line) => line.split("|").slice(1, -1).map((c) => c.trim());
  const hasSeparator = lines.length >= 2 && /^[\s|:\-]+$/.test(lines[1]);
  const headerRows = hasSeparator ? [lines[0]] : [];
  const bodyRows = hasSeparator ? lines.slice(2) : lines;
  let html = '<table class="pdf-table">';
  if (headerRows.length) {
    html += "<thead><tr>";
    cells(headerRows[0]).forEach((c) => (html += `<th>${escapeHTML(c)}</th>`));
    html += "</tr></thead>";
  }
  html += "<tbody>";
  bodyRows.forEach((r) => {
    html += "<tr>";
    cells(r).forEach((c) => (html += `<td>${escapeHTML(c)}</td>`));
    html += "</tr>";
  });
  html += "</tbody></table>";
  return html;
}

// 提案テキスト全体をリッチHTMLに変換(Mermaid・表・章分け対応)
function parseResultToDocumentHTML(text) {
  if (!text) return "";
  // 1. Mermaidブロック退避
  const mermaidBlocks = [];
  let s = text.replace(/```mermaid\n([\s\S]*?)\n```/g, (_, code) => {
    mermaidBlocks.push(code);
    return `\n@@MERMAID_${mermaidBlocks.length - 1}@@\n`;
  });
  // 2. 表ブロック退避
  const tableBlocks = [];
  s = s.replace(/(^|\n)((?:\|[^\n]*\|\n)+)/g, (m, pre, tbl) => {
    tableBlocks.push(tbl);
    return `${pre}@@TABLE_${tableBlocks.length - 1}@@\n`;
  });
  // 3. 行ごと変換
  const lines = s.split("\n");
  const out = [];
  let inList = false;
  const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };
  for (const line of lines) {
    const mMermaid = line.match(/^@@MERMAID_(\d+)@@$/);
    if (mMermaid) {
      closeList();
      out.push(`<div class="mermaid-target" data-graph="${escapeHTML(mermaidBlocks[+mMermaid[1]])}"></div>`);
      continue;
    }
    const mTable = line.match(/^@@TABLE_(\d+)@@$/);
    if (mTable) {
      closeList();
      out.push(parseMarkdownTable(tableBlocks[+mTable[1]]));
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${escapeHTML(line.slice(2))}</li>`);
      continue;
    }
    closeList();
    if (line.startsWith("# ")) { out.push(`<h1>${escapeHTML(line.slice(2))}</h1>`); continue; }
    if (line.startsWith("## ")) { out.push(`<h2>${escapeHTML(line.slice(3))}</h2>`); continue; }
    if (line.startsWith("### ")) { out.push(`<h3>${escapeHTML(line.slice(4))}</h3>`); continue; }
    if (line.trim() === "---") { out.push("<hr/>"); continue; }
    if (line.trim() === "") { out.push(""); continue; }
    out.push(`<p>${escapeHTML(line)}</p>`);
  }
  closeList();
  return out.join("\n");
}

function buildProposalDocumentHTML(req) {
  const today = new Date().toLocaleDateString("ja-JP");
  const ip = escapeHTML(req.ip_name || "提案書");
  const target = req.target && req.target !== "機能単体" ? escapeHTML(req.target) : "";
  const concept = req.concept_memo ? escapeHTML(req.concept_memo) : "";
  const stylesheet = `
<style>
  .pdf-doc { background: white; color: #2D2D2D; font-family: 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic UI', 'Meiryo', sans-serif; }
  .pdf-cover { padding: 60px 50px 50px; border-bottom: 4px solid #D85A30; margin-bottom: 0; }
  .pdf-cover .brand { font-size: 12px; color: #aaa; letter-spacing: 0.18em; margin-bottom: 14px; }
  .pdf-cover .title { font-size: 36px; font-weight: 800; color: #222; margin: 0 0 18px; line-height: 1.25; }
  .pdf-cover .meta-row { font-size: 13px; color: #444; margin: 8px 0; padding: 10px 16px; background: #F5F3FF; border-left: 4px solid #7C3AED; border-radius: 4px; }
  .pdf-cover .date { font-size: 11px; color: #aaa; margin-top: 30px; text-align: right; }
  .pdf-body { padding: 28px 50px 40px; }
  .pdf-body h1 { font-size: 22px; font-weight: 700; color: #222; margin: 26px 0 12px; padding: 4px 0 4px 14px; border-left: 5px solid #D85A30; background: linear-gradient(90deg, #FFF5EE 0%, transparent 100%); }
  .pdf-body h2 { font-size: 16px; font-weight: 700; color: #D85A30; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px dashed #FFCBB0; }
  .pdf-body h3 { font-size: 13px; font-weight: 700; color: #555; margin: 14px 0 4px; }
  .pdf-body p { margin: 6px 0; font-size: 13px; line-height: 1.85; }
  .pdf-body ul { margin: 6px 0 6px 18px; padding: 0; }
  .pdf-body li { font-size: 13px; line-height: 1.7; margin: 3px 0; }
  .pdf-body hr { border: none; border-top: 1px dashed #ccc; margin: 18px 0; }
  .pdf-body .pdf-table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 12px; }
  .pdf-body .pdf-table th { background: #D85A30; color: white; padding: 8px 10px; text-align: left; font-weight: 600; }
  .pdf-body .pdf-table td { padding: 8px 10px; border-bottom: 1px solid #E0E4E8; vertical-align: top; }
  .pdf-body .pdf-table tr:nth-child(even) td { background: #FAFAFA; }
  .pdf-body .mermaid-target { margin: 14px 0; padding: 14px; background: #F8F9FA; border-radius: 8px; text-align: center; border: 1px solid #E8ECF0; }
  .pdf-body .mermaid-target svg { max-width: 100%; height: auto; }
  .pdf-footer { padding: 18px 50px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: right; }
</style>`;
  return `${stylesheet}
<div class="pdf-doc">
  <div class="pdf-cover">
    <div class="brand">SLOCRI GAME DESIGN PROPOSAL</div>
    <div class="title">${ip}</div>
    ${target ? `<div class="meta-row"><strong>🎯 ターゲット</strong>　${target}</div>` : ""}
    ${concept ? `<div class="meta-row"><strong>💡 コンセプト</strong>　${concept}</div>` : ""}
    <div class="date">出力: ${today}</div>
  </div>
  <div class="pdf-body">${parseResultToDocumentHTML(req.result)}</div>
  <div class="pdf-footer">スロクリ ゲーム性提案 — ${ip} — ${today}</div>
</div>`;
}

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

export default function ProposeTab({ user }) {
  // 投稿者識別: Googleログインメールを使う。未ログインは null = 匿名扱い
  const ownerId = user?.email || null;
  const isLoggedIn = !!ownerId;
  const isMobile = useMemo(detectMobile, []);

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
    // 公開済み or 自分のメール所有のもの のみ取得
    const filter = isLoggedIn
      ? `visibility.eq.public,owner_id.eq.${ownerId}`
      : `visibility.eq.public`;
    const { data } = await supabase
      .from("proposal_requests")
      .select("*")
      .or(filter)
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
      owner_id: ownerId,  // 未ログインなら null（匿名提出）
      visibility: isLoggedIn ? "private" : "public",
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
      owner_id: ownerId,  // 未ログインなら null（匿名提出）
      visibility: isLoggedIn ? "private" : "public",
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

  async function toggleVisibility(req) {
    if (!isLoggedIn) {
      showToast("Googleログインが必要です");
      return;
    }
    if (req.owner_id !== ownerId) return;
    const next = req.visibility === "public" ? "private" : "public";
    await supabase.from("proposal_requests").update({ visibility: next }).eq("id", req.id);
    showToast(next === "public" ? "🌍 公開しました" : "🔒 非公開に戻しました");
    load();
  }

  // owner_id が NULL の(古い)提案を自分のメールに紐づける
  async function claimProposal(req) {
    if (!isLoggedIn) {
      showToast("Googleログインが必要です");
      return;
    }
    if (req.owner_id) return;
    await supabase.from("proposal_requests").update({ owner_id: ownerId }).eq("id", req.id);
    showToast("🆔 マイ提案に登録しました");
    load();
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }

  function safeFileName(s) {
    return String(s || "proposal").replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
  }

  function downloadMarkdown(req) {
    if (!canDownload(isMobile)) {
      showToast("スマホからはダウンロードできません");
      return;
    }
    const out = [];
    out.push(`# ${req.ip_name || "提案書"}`);
    if (req.target && req.target !== "機能単体") out.push(`\n> ターゲット: ${req.target}`);
    if (req.concept_memo) out.push(`\n> コンセプト: ${req.concept_memo}`);
    out.push("\n---\n");
    out.push(req.result || "");
    const blob = new Blob([out.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFileName(req.ip_name)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Markdownを保存しました");
  }

  async function downloadPDF(req) {
    if (!canDownload(isMobile)) {
      showToast("スマホからはダウンロードできません");
      return;
    }
    try {
      showToast("📄 PDF生成中…(数秒お待ちください)");
      await ensurePdfLibs();

      const container = document.createElement("div");
      container.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;background:#fff;";
      container.innerHTML = buildProposalDocumentHTML(req);
      document.body.appendChild(container);

      // Mermaidブロック描画
      const mermaidTargets = container.querySelectorAll(".mermaid-target");
      for (let i = 0; i < mermaidTargets.length; i++) {
        const target = mermaidTargets[i];
        const graph = target.getAttribute("data-graph");
        try {
          const id = `mermaid-${Date.now()}-${i}`;
          const result = await window.mermaid.render(id, graph);
          target.innerHTML = result.svg || result;
        } catch (e) {
          target.innerHTML = `<pre style="background:#FEE;padding:10px;border-radius:4px;color:#900;text-align:left;">${escapeHTML(graph)}</pre>`;
        }
      }

      // レイアウト確定待ち
      await new Promise((r) => setTimeout(r, 250));

      const canvas = await window.html2canvas(container, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = 210, pageH = 297;
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      let remaining = imgH;
      let yOffset = 0;
      pdf.addImage(dataUrl, "JPEG", 0, yOffset, imgW, imgH);
      remaining -= pageH;
      while (remaining > 0) {
        yOffset -= pageH;
        pdf.addPage();
        pdf.addImage(dataUrl, "JPEG", 0, yOffset, imgW, imgH);
        remaining -= pageH;
      }
      document.body.removeChild(container);

      const blob = pdf.output("blob");
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const fileName = `${safeFileName(req.ip_name)}_${ts}.pdf`;

      // ローカル保存(ブラウザの保存ダイアログ)
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Supabase Storage にもアーカイブ
      const storagePath = `${req.id}/${fileName}`;
      const { error: upErr } = await supabase.storage.from("proposal_pdfs").upload(storagePath, blob, { contentType: "application/pdf", upsert: true });
      if (upErr) {
        console.warn("Storage upload failed", upErr);
        showToast("⚠️ ローカル保存のみ完了（Storageエラー）");
      } else {
        const { data: pub } = supabase.storage.from("proposal_pdfs").getPublicUrl(storagePath);
        await supabase.from("proposal_requests").update({ pdf_url: pub.publicUrl }).eq("id", req.id);
        showToast("✅ PDF保存＆アーカイブしました");
        load();
      }
    } catch (e) {
      console.error("downloadPDF error", e);
      showToast("PDF生成エラー: " + (e.message || String(e)));
    }
  }

  function openArchive(req) {
    if (!req.pdf_url) return;
    window.open(req.pdf_url, "_blank", "noopener,noreferrer");
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

      {/* 公開/非公開の説明バナー */}
      {isLoggedIn ? (
        <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12, lineHeight: 1.7, color: "#1E40AF" }}>
          💡 <strong>{user.email}</strong> でログイン中。自分の提案は<strong>🌍 公開 ⇔ 🔒 非公開</strong>を切り替えできます。<br />
          🔒 非公開にすると自分しか見えなくなり、🌍 公開にすると他の人にも表示されます。
        </div>
      ) : (
        <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 10, padding: "12px 14px", marginBottom: 12, fontSize: 12, lineHeight: 1.7, color: "#78350F", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            🔒 <strong>Googleログイン</strong>すると、自分の提案を<strong>公開/プライベートで管理</strong>できます。<br />
            <span style={{ fontSize: 11, color: "#92400E" }}>※ @key-cre.co.jp アカウント限定</span>
          </div>
          <button onClick={handleGoogleLogin}
            style={{ padding: "8px 16px", background: "#fff", color: "#333", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            ログイン
          </button>
        </div>
      )}

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
                {req.owner_id === ownerId && isLoggedIn && (
                  <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 12, background: "#DBEAFE", color: "#1E40AF", fontWeight: 600, whiteSpace: "nowrap" }}>
                    👤 自分の提案
                  </span>
                )}
                {(req.visibility === "public" || req.owner_id === ownerId) && (
                  req.owner_id === ownerId && isLoggedIn ? (
                    <button
                      onClick={e => { e.stopPropagation(); toggleVisibility(req); }}
                      title={req.visibility === "public" ? "タップで非公開に戻す" : "タップで公開する"}
                      style={{
                        fontSize: 11, padding: "3px 10px", borderRadius: 12, border: "none",
                        background: req.visibility === "public" ? "#D1FAE5" : "#FEF3C7",
                        color: req.visibility === "public" ? "#047857" : "#92400E",
                        fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer",
                        boxShadow: "1px 1px 3px #C5C9D4",
                      }}
                    >
                      {req.visibility === "public" ? "🌍 公開中" : "🔒 プライベート"}
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 12, background: req.visibility === "public" ? "#D1FAE5" : "#FEF3C7", color: req.visibility === "public" ? "#047857" : "#92400E", whiteSpace: "nowrap" }}>
                      {req.visibility === "public" ? "🌍 公開中" : "🔒 プライベート"}
                    </span>
                  )
                )}
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
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  <button
                    onClick={e => { e.stopPropagation(); copyResult(req.result); }}
                    style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#E8ECF0", color: "#555", fontSize: 13, cursor: "pointer", boxShadow: "2px 2px 5px #C5C9D4, -1px -1px 3px #FFFFFF" }}
                  >
                    📋 コピー
                  </button>
                  {!isMobile && canDownload(isMobile) && (
                    <>
                      <button
                        onClick={e => { e.stopPropagation(); downloadMarkdown(req); }}
                        style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#E8ECF0", color: "#555", fontSize: 13, cursor: "pointer", boxShadow: "2px 2px 5px #C5C9D4, -1px -1px 3px #FFFFFF" }}
                      >
                        📝 Markdown
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); downloadPDF(req); }}
                        style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#E8ECF0", color: "#555", fontSize: 13, cursor: "pointer", boxShadow: "2px 2px 5px #C5C9D4, -1px -1px 3px #FFFFFF" }}
                      >
                        📄 PDF
                      </button>
                    </>
                  )}
                  {req.pdf_url && (
                    <button
                      onClick={e => { e.stopPropagation(); openArchive(req); }}
                      style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#F0FDF4", color: "#047857", fontSize: 13, cursor: "pointer", boxShadow: "2px 2px 5px #C5C9D4, -1px -1px 3px #FFFFFF" }}
                    >
                      📥 アーカイブ
                    </button>
                  )}
                  {!req.owner_id && (
                    <button
                      onClick={e => { e.stopPropagation(); claimProposal(req); }}
                      title="この投稿を自分の端末IDに紐づけて、以降「マイ提案」として管理できるようにします"
                      style={{ padding: "7px 14px", borderRadius: 8, border: "none",
                        background: "#EFF6FF", color: "#2563EB",
                        fontSize: 13, fontWeight: 600, cursor: "pointer",
                        boxShadow: "2px 2px 5px #C5C9D4, -1px -1px 3px #FFFFFF" }}
                    >
                      🆔 マイ提案に登録
                    </button>
                  )}
                </div>
                {isMobile && (
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 6, paddingLeft: 4 }}>
                    📵 ダウンロードはPCからご利用ください
                  </div>
                )}

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
