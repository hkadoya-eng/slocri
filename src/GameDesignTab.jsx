import React, { useState } from "react";
import GAME_LIBRARY from "./gameDesignLibrary.json";

const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwemJ0dXVjb3B1Y2FibHd5cWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Mjk2MzEsImV4cCI6MjA5MTIwNTYzMX0.qry7pSzmm3lWK82Vnp7Wz-R9wHsDVwbj7ysy62xUhuA";

const CAT_CONFIG = {
  CZ:     { label: "CZ",     bg: "#FCE5CD", accent: "#B45309" },
  AT:     { label: "AT",     bg: "#CFE2F3", accent: "#1A56B0" },
  ボーナス: { label: "ボーナス", bg: "#EAD1DC", accent: "#8B2252" },
  通常:   { label: "通常",   bg: "#D9EAD3", accent: "#4A7C3F" },
  その他:  { label: "その他", bg: "#FFF2CC", accent: "#8B6914" },
};

const FEATURE_NAMES = {
  "L虚構推理":                          { CZ: "鋼人七瀬攻略会議",        AT: "虚構連モード（強制突入）" },
  "異世界かるてっとBT":                 { CZ: "チャレンジゾーン",        AT: "BT（ボーナスタイム）" },
  "スマスロ ヨルムンガンド":             { CZ: "ストーリーCZ（前半10G+後半3G）" },
  "スマスロ甲鉄城のカバネリ 海門決戦":   { CZ: "カバネリアタック" },
  "L真打吉宗":                          { AT: "真BB / 1G連ループ", 通常: "周期保証型（6周期確定）" },
  "Lガンダムユニコーン覚醒DRIVE":        { AT: "覚醒DRIVE（3段階強化）" },
  "L戦国乙女5":                         { AT: "3段階AT（純増UP型）", 通常: "周期保証型（6サイクル天井）" },
  "スマスロ ミリオンゴッド-神々の軌跡-": { AT: "SGG（スーパーゴッドゲーム）" },
  "パチスロ 沖ドキ！":                  { ボーナス: "ドキドキモード / 超ドキドキモード" },
  "スマスロ モンキーターンV":            { CZ: "超抜チャレンジ", AT: "SG RUSH / 青島SG", 通常: "周期保証型（最大6周期・795G）" },
  "押忍！番長4":                        { CZ: "特訓→対決（段階クリア型）", AT: "頂RISE + 漢気ダブルアクセル" },
  "スマスロ マギアレコード 魔法少女まどか☆マギカ外伝": { CZ: "マギアチャレンジ / 黒江チャレンジ", AT: "マギアラッシュ", 通常: "周期保証型" },
  "スマスロ Re:ゼロから始める異世界生活 season2": { AT: "殲滅RUSH / 超強欲RUSH", 通常: "直AT型" },
  "スマスロ ビッグドリーム THE GOLDEN PUSHER": { AT: "GOLDEN BONUS（差枚管理）" },
  "Lタクトオーパス デスティニー":         { AT: "コンダクターAT（差枚管理+ゲーム数上乗せ）" },
};

const DATA = {
  CZ: {
    types: Object.fromEntries(
      Object.entries(GAME_LIBRARY.czDesignPatterns).map(([typeName, data]) => [
        typeName,
        {
          description: data.description,
          probability: data.probability,
          reward: data.reward,
          note: data.designNote || null,
          rules: data.rules,
          presentation: data.presentation,
          machines: (data.examples || []).map(e => ({ name: e.machine, detail: e.detail || null })),
        },
      ])
    ),
  },
  AT: {
    types: Object.fromEntries(
      Object.entries(GAME_LIBRARY.gameFlowPatterns)
        .filter(([typeName]) => typeName !== "周期保証型" && typeName !== "強制ループ型" && typeName !== "直AT型")
        .map(([typeName, data]) => [
          typeName,
          {
            description: data.description,
            emotion: data.playerEmotion || null,
            note: null,
            rules: data.rules || null,
            presentation: data.presentation || null,
            machines: (data.examples || []).map(e => ({ name: e.machine, detail: e.detail || null })),
          },
        ])
    ),
  },
  ボーナス: {
    types: {
      "原始的連荘型": {
        description: "シンプルなボーナス+連荘設計で誰でも楽しめる普遍的ゲーム性。シリーズが長続きする理由。",
        note: GAME_LIBRARY.classicMachines["パチスロ 沖ドキ！"].designLesson,
        emotion: GAME_LIBRARY.classicMachines["パチスロ 沖ドキ！"].playerEmotion,
        machines: [
          { name: "パチスロ 沖ドキ！", detail: GAME_LIBRARY.classicMachines["パチスロ 沖ドキ！"].highlight },
        ],
      },
      "爆裂BB型（旧世代）": {
        description: "旧来のBB演出・爆音を再現し、旧世代プレイヤーの記憶に訴える設計。",
        note: null,
        emotion: "あの音が戻ってきた、という感動",
        machines: [
          { name: "L真打吉宗", detail: "爆音BB演出が吉宗世代に刺さる。「あの音が戻ってきた」とファンが泣くほどの再現度。4月稼働独走の主因の一つ。" },
        ],
      },
      "ST（ストック）型": {
        description: "ボーナスをストックし、放出タイミングを内部抽選で管理する設計。やめどきが難しい。",
        note: null,
        emotion: null,
        machines: [
          { name: "ミリオンゴッド（初代）", detail: null },
        ],
      },
    },
  },
  通常: {
    types: {
      "周期保証型": {
        description: GAME_LIBRARY.gameFlowPatterns["周期保証型"].description,
        emotion: GAME_LIBRARY.gameFlowPatterns["周期保証型"].playerEmotion || null,
        note: null,
        rules: GAME_LIBRARY.gameFlowPatterns["周期保証型"].rules || null,
        presentation: GAME_LIBRARY.gameFlowPatterns["周期保証型"].presentation || null,
        machines: (GAME_LIBRARY.gameFlowPatterns["周期保証型"].examples || []).map(e => ({ name: e.machine, detail: e.detail || null })),
      },
      "強制ループ型": {
        description: GAME_LIBRARY.gameFlowPatterns["強制ループ型"].description,
        emotion: GAME_LIBRARY.gameFlowPatterns["強制ループ型"].playerEmotion || null,
        note: null,
        rules: GAME_LIBRARY.gameFlowPatterns["強制ループ型"].rules || null,
        presentation: GAME_LIBRARY.gameFlowPatterns["強制ループ型"].presentation || null,
        machines: (GAME_LIBRARY.gameFlowPatterns["強制ループ型"].examples || []).map(e => ({ name: e.machine, detail: e.detail || null })),
      },
      "直AT型": {
        description: GAME_LIBRARY.gameFlowPatterns["直AT型"].description,
        emotion: GAME_LIBRARY.gameFlowPatterns["直AT型"].playerEmotion || null,
        note: null,
        rules: GAME_LIBRARY.gameFlowPatterns["直AT型"].rules || null,
        presentation: GAME_LIBRARY.gameFlowPatterns["直AT型"].presentation || null,
        machines: (GAME_LIBRARY.gameFlowPatterns["直AT型"].examples || []).map(e => ({ name: e.machine, detail: e.detail || null })),
      },
    },
  },
  その他: {
    _note: "設定差設計・スペック設計・演出設計などのデータは準備中です。",
    types: {},
  },
};

// 表現評価（介入度）の一覧。分析タブの独立モード「表現評価」として使う。
// 型のexamplesに載っているかに依存せず、presentationを持つ全機種を介入度の降順で出す。
// ※新台診断の仕分けには使わない（説明軸。昇格条件は presentationDesign.介入度の検証状況 に明記）
/* 演出・表現分析。2026-08-21、介入度（0〜3）を物差しにした一覧をやめ、
   ゲーム性分析と同じ「型 → 該当機種」の形に変えた。介入度は寿命の予測に使えないと
   分かっているので型の軸には使わない（値そのものは各機種の詳細に残してある）。
   型は presentationDesign.表現の型 に置き、実データ（noticeType / disclosure）から起こしている。 */
export function PresentationTab() {
  const T = GAME_LIBRARY.presentationDesign?.["表現の型"];
  const [axis, setAxis] = useState("告知の型");
  const [open, setOpen] = useState({});
  if (!T) return <div style={{ textAlign: "center", color: "#aaa", padding: "2rem" }}>表現の型が未登録です</div>;
  const AXES = ["告知の型", "開示の型"];
  const types = Object.entries(T[axis] || {}).sort((a, b) => b[1].count - a[1].count);
  const total = types.reduce((s, [, v]) => s + v.count, 0);
  const card = { background: "#fff", borderRadius: 12, boxShadow: "3px 3px 7px #C8CED8, -3px -3px 7px #FFFFFF" };
  return (
    <div>
      <div style={{ ...card, padding: "10px 12px", marginBottom: 10, fontSize: 11.5, color: "#777", lineHeight: 1.7 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#333", marginBottom: 5 }}>🎬 演出・表現分析</div>
        {T["軸"]}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {AXES.map(a => {
          const on = axis === a;
          const n = Object.values(T[a] || {}).reduce((s, v) => s + v.count, 0);
          return <button key={a} onClick={() => { setAxis(a); setOpen({}); }}
            style={{ border: "none", borderRadius: 9, padding: "6px 13px", fontSize: 12.5, fontWeight: on ? 700 : 500,
              background: on ? "#D85A30" : "#fff", color: on ? "#fff" : "#888", cursor: "pointer",
              boxShadow: on ? "inset 2px 2px 5px rgba(0,0,0,0.2)" : "2px 2px 5px #C8CED8,-2px -2px 5px #fff" }}>
            {a}<span style={{ opacity: 0.75, marginLeft: 5 }}>{n}</span>
          </button>;
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {types.map(([name, v]) => {
          const on = open[name] !== false; // 既定は開く（型の中身を見せるのが目的のタブ）
          const pct = total ? Math.round(v.count / total * 100) : 0;
          return (
            <div key={name} style={card}>
              <button onClick={() => setOpen(o => ({ ...o, [name]: !on }))}
                style={{ width: "100%", textAlign: "left", border: "none", background: on ? "#FBF3EF" : "#fff",
                  borderRadius: on ? "12px 12px 0 0" : 12, borderLeft: "4px solid #D85A30", cursor: "pointer", padding: "10px 13px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: "#333" }}>{name}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#993C1D", background: "#FAECE7", borderRadius: 5, padding: "2px 8px" }}>{v.count}機種・{pct}%</span>
                  <span style={{ marginLeft: "auto", fontSize: 15, color: "#D85A30", fontWeight: 700 }}>{on ? "−" : "＋"}</span>
                </div>
                <div style={{ fontSize: 12, color: "#666", lineHeight: 1.7 }}>{v.description}</div>
              </button>
              {on && (
                <div style={{ padding: "4px 13px 12px" }}>
                  {v.examples.map(e => (
                    <div key={e.machine} style={{ borderTop: "1px dashed #eee", padding: "9px 0 0", marginTop: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1A56B0", marginBottom: 3 }}>{e.machine}</div>
                      <div style={{ fontSize: 12, color: "#555", lineHeight: 1.8 }}>{e.detail}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, fontSize: 10.5, color: "#aaa", lineHeight: 1.7 }}>
        該当機種の説明は記録した原文をそのまま出している（要約すると根拠が消えるため）。
        介入度・範囲・効く先の値は各機種のデータに残してあるが、<b>型の物差しには使っていない</b>。
        貢献週が確定した機種で介入度2が真逆に割れており（東京喰種76週 vs ダンバイン8週）、寿命を分離できないことが分かっているため。
      </div>
    </div>
  );
}

export default function GameDesignTab() {
  const [activeCat, setActiveCat]     = useState("CZ");
  const [openTypes, setOpenTypes]     = useState({});  // { typeName: bool }
  const [corrKey, setCorrKey]         = useState(null);
  const [corrText, setCorrText]       = useState("");
  const [corrSent, setCorrSent]       = useState(false);
  const [corrLoading, setCorrLoading] = useState(false);
  const [reqText, setReqText]         = useState("");
  const [reqSent, setReqSent]         = useState(false);
  const [reqLoading, setReqLoading]   = useState(false);

  const catCfg  = CAT_CONFIG[activeCat] || {};
  const catData = DATA[activeCat] || {};
  const types   = catData.types || {};

  function switchCat(cat) {
    setActiveCat(cat);
    setOpenTypes({});
    setCorrKey(null);
  }
  function toggleType(t) {
    setOpenTypes(prev => ({ ...prev, [t]: !prev[t] }));
    setCorrKey(null);
    setCorrSent(false);
  }

  async function submitRequest() {
    if (!reqText.trim()) return;
    setReqLoading(true);
    try {
      await fetch("https://vpzbtuucopucablwyqeq.supabase.co/rest/v1/collection_requests", {
        method: "POST",
        headers: {
          apikey: ANON,
          Authorization: `Bearer ${ANON}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ theme: `【ゲーム性分析追加リクエスト】${reqText.trim()}`, status: "pending" }),
      });
      setReqSent(true);
      setReqText("");
      setTimeout(() => setReqSent(false), 4000);
    } catch { /* silent */ }
    setReqLoading(false);
  }

  async function submitCorrection(machine, typeName) {
    if (!corrText.trim()) return;
    setCorrLoading(true);
    try {
      await fetch("https://vpzbtuucopucablwyqeq.supabase.co/rest/v1/collection_requests", {
        method: "POST",
        headers: {
          apikey: ANON,
          Authorization: `Bearer ${ANON}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          theme: `修正提案：${activeCat}・${typeName}・${machine}\n内容：${corrText.trim()}`,
          status: "pending",
        }),
      });
      setCorrSent(true);
      setCorrText("");
    } catch {
      /* サイレントエラー */
    }
    setCorrLoading(false);
  }

  return (
    <div>
      {/* 状態タブ */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
        {Object.keys(CAT_CONFIG).map(cat => {
          const on = cat === activeCat;
          return (
            <button key={cat} onClick={() => switchCat(cat)}
              style={{
                flexShrink: 0, padding: "7px 14px", border: "none", borderRadius: 10, fontSize: 13,
                fontWeight: on ? 700 : 500,
                background: on ? "#E0E4E8" : "#E8ECF0",
                color: on ? CAT_CONFIG[cat].accent : "#888", cursor: "pointer",
                boxShadow: on
                  ? "inset 3px 3px 6px #C5C9D4, inset -2px -2px 5px #FFFFFF"
                  : "2px 2px 5px #C5C9D4, -2px -2px 5px #FFFFFF",
                transition: "all 0.15s", whiteSpace: "nowrap",
              }}>
              {cat}
            </button>
          );
        })}
      </div>

      {/* 準備中 */}
      {catData._note && (
        <div style={{
          background: "#E8ECF0",
          boxShadow: "inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",
          borderRadius: 12, padding: 16, textAlign: "center", color: "#888", fontSize: 14,
        }}>
          {catData._note}
          <div style={{ marginTop: 8, fontSize: 12, color: "#aaa" }}>情報提供は「情報を修正・追加する」ボタンから送れます</div>
        </div>
      )}

      {/* 機能型リスト（縦積みアコーディオン） */}
      {Object.entries(types).map(([typeName, typeData]) => {
        const isOpen = !!openTypes[typeName];
        return (
          <div key={typeName} style={{ marginBottom: 10 }}>

            {/* 機能型ヘッダー */}
            <button onClick={() => toggleType(typeName)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "11px 14px", border: "none", borderRadius: isOpen ? "12px 12px 0 0" : 12,
                background: isOpen ? catCfg.bg : "#E8ECF0",
                boxShadow: isOpen
                  ? `inset 2px 2px 5px rgba(0,0,0,0.08)`
                  : "2px 2px 5px #C5C9D4, -2px -2px 5px #FFFFFF",
                cursor: "pointer", textAlign: "left", transition: "all 0.15s",
              }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8,
                background: catCfg.accent, color: "#fff", flexShrink: 0,
              }}>
                {typeName}
              </span>
              <span style={{ flex: 1, fontSize: 12, color: isOpen ? catCfg.accent : "#666", lineHeight: 1.4 }}>
                {typeData.description}
              </span>
              <span style={{ fontSize: 12, color: "#aaa", flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
            </button>

            {/* 展開パネル */}
            {isOpen && (
              <div style={{
                background: "#EAEEF2",
                boxShadow: "inset 2px 2px 6px #C5C9D4, inset -2px -2px 6px #FFFFFF",
                borderRadius: "0 0 12px 12px", overflow: "hidden",
              }}>
                {(typeData.probability || typeData.reward || typeData.emotion || typeData.note) && (
                  <div style={{
                    margin: "10px 14px 0",
                    padding: "8px 12px",
                    background: catCfg.bg,
                    borderLeft: `3px solid ${catCfg.accent}`,
                    borderRadius: 6,
                    display: "flex", flexDirection: "column", gap: 5,
                  }}>
                    {typeData.probability && (
                      <div style={{ fontSize: 12, color: "#444", display: "flex", gap: 6, alignItems: "flex-start" }}>
                        <span style={{ fontWeight: 700, color: catCfg.accent, flexShrink: 0 }}>【初当たり確率】</span>
                        <span>{typeData.probability}</span>
                      </div>
                    )}
                    {typeData.reward && (
                      <div style={{ fontSize: 12, color: "#444", display: "flex", gap: 6, alignItems: "flex-start" }}>
                        <span style={{ fontWeight: 700, color: catCfg.accent, flexShrink: 0 }}>【対価】</span>
                        <span>{typeData.reward}</span>
                      </div>
                    )}
                    {typeData.emotion && (
                      <div style={{ fontSize: 12, color: "#555" }}>・{typeData.emotion}</div>
                    )}
                    {typeData.note && (
                      <div style={{ fontSize: 12, color: "#555" }}>・{typeData.note}</div>
                    )}
                  </div>
                )}
                {/* 機種リスト */}
                {(typeData.machines || []).length === 0 && (
                  <div style={{ padding: "14px", fontSize: 13, color: "#aaa", textAlign: "center" }}>
                    機種データなし（情報提供募集中）
                  </div>
                )}

                {(typeData.machines || []).map((m, i) => {
                  const featureName    = FEATURE_NAMES[m.name]?.[activeCat] ?? null;
                  const mKey           = `${activeCat}__${typeName}__${i}`;
                  const isCorrecting   = corrKey === mKey;
                  const machineLib     = GAME_LIBRARY.machines?.[m.name];
                  const machineRules   = (activeCat === "CZ" && machineLib?.czRules)
                    ? machineLib.czRules
                    : (activeCat === "AT" && machineLib?.atRules)
                    ? machineLib.atRules
                    : machineLib?.description || typeData.rules;
                  const machinePresent = (activeCat === "CZ" && machineLib?.czPresentation)
                    ? machineLib.czPresentation
                    : (activeCat === "AT" && machineLib?.atPresentation)
                    ? machineLib.atPresentation
                    : machineLib?.presentationNote || typeData.presentation;

                  return (
                    <div key={i} style={{
                      borderTop: i === 0 && !typeData.emotion && !typeData.note ? "none" : "1px solid rgba(0,0,0,0.06)",
                      padding: "12px 14px",
                    }}>
                      {/* 機種名 + 機能名バッジ */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: featureName || m.detail ? 6 : 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>{m.name}</span>
                        {featureName && (
                          <span style={{
                            fontSize: 11, padding: "2px 9px", borderRadius: 10,
                            background: catCfg.bg, color: catCfg.accent, fontWeight: 600,
                          }}>
                            {featureName}
                          </span>
                        )}
                      </div>

                      {/* 仕組み・ルール（機種固有） */}
                      {machineRules && (
                        <div style={{ marginBottom: 6 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: catCfg.accent, marginBottom: 4 }}>⚙️ 仕組み・ルール</div>
                          <div style={{ fontSize: 12, color: "#555", lineHeight: 1.85 }}>
                            {machineRules.split("\n").map((line, idx) => {
                              if (line === "") return <div key={idx} style={{ height: "0.9em" }} />;
                              if (line.startsWith("・")) return <div key={idx}>{line}</div>;
                              const sep = line.indexOf("：");
                              if (sep > 0 && sep <= 10) {
                                return (
                                  <div key={idx}>
                                    <span style={{ fontWeight: 700, color: catCfg.accent }}>{line.slice(0, sep + 1)}</span>
                                    {line.slice(sep + 1)}
                                  </div>
                                );
                              }
                              return <div key={idx}>{line}</div>;
                            })}
                          </div>
                        </div>
                      )}

                      {/* 演出・表現方法（機種固有） */}
                      {machinePresent && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: catCfg.accent, marginBottom: 3 }}>🎬 演出・表現方法</div>
                          <div style={{ fontSize: 12, color: "#555", lineHeight: 1.7 }}>
                            {machinePresent.split("\n").map((line, idx) => (
                              <span key={idx}>{line}{idx < machinePresent.split("\n").length - 1 && <br />}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 表現評価（presentation）。介入度を機種横断で比較できる定量フィールド。
                          判定基準は gameDesignLibrary.presentationDesign.介入度スコア基準 に定義。
                          ※新台診断の仕分けには使わない（説明軸。予測軸への昇格条件は検証状況に明記） */}
                      {machineLib?.presentation && (() => {
                        const p = machineLib.presentation;
                        const LV = ["完全自動", "押し順のみ", "狙い目あり", "常設の自力契機"];
                        const col = ["#999", "#8D9BA8", "#2a7ae8", "#7B1FA2"][p.intervention] || "#999";
                        const bg  = ["#F2F2F2", "#EFF2F5", "#EAF2FD", "#F5E9FA"][p.intervention] || "#F2F2F2";
                        return (
                          <div style={{ marginBottom: 8, background: "#FAFAFB", borderRadius: 10, padding: "9px 10px", border: "0.5px solid #ECEFF1" }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: catCfg.accent, marginBottom: 6 }}>🎯 表現評価</div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: col, background: bg, borderRadius: 6, padding: "3px 9px", whiteSpace: "nowrap" }}>
                                介入度 {p.intervention}／3・{LV[p.intervention] || "—"}
                              </span>
                              {p.interventionScope && (
                                <span style={{ fontSize: 11, fontWeight: 600, color: "#555", background: "#EEF1F4", borderRadius: 6, padding: "3px 9px", whiteSpace: "nowrap" }}>
                                  範囲: {p.interventionScope}
                                </span>
                              )}
                              {p.interventionPayoff && (
                                <span style={{ fontSize: 11, fontWeight: 600, color: p.interventionPayoff === "出玉量に直結" ? "#C77B00" : "#555", background: p.interventionPayoff === "出玉量に直結" ? "#FFF6E5" : "#EEF1F4", borderRadius: 6, padding: "3px 9px", whiteSpace: "nowrap" }}>
                                  効く先: {p.interventionPayoff}
                                </span>
                              )}
                            </div>
                            {p.interventionNote && (
                              <div style={{ fontSize: 11.5, color: "#666", lineHeight: 1.7 }}>{p.interventionNote}</div>
                            )}
                            {p.scopeNote && (
                              <div style={{ fontSize: 11, color: "#888", lineHeight: 1.65, marginTop: 4 }}>{p.scopeNote}</div>
                            )}
                            <div style={{ fontSize: 10.5, color: "#999", lineHeight: 1.7, marginTop: 5, borderTop: "0.5px solid #EEE", paddingTop: 5 }}>
                              {p.escalation && <div>段階: {p.escalation}</div>}
                              {p.noticeType && <div>告知: {p.noticeType}</div>}
                              {p.soundDesign && <div>音・筐体: {p.soundDesign}{p.cabinet ? `／${p.cabinet}` : ""}</div>}
                              <div style={{ color: "#bbb", marginTop: 3 }}>
                                {p.scoredBasis || "採点"}・{p.scoredAt}
                                {(p.evidence || []).length > 0 && <>／裏取り {(p.evidence || []).length}件</>}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 修正ボタン / フォーム */}
                      {!isCorrecting && (
                        <button onClick={() => { setCorrKey(mKey); setCorrSent(false); setCorrText(""); }}
                          style={{
                            fontSize: 11, color: "#888", background: "none",
                            border: "1px solid #ccc", borderRadius: 8, padding: "3px 10px", cursor: "pointer",
                          }}>
                          ✏️ 情報を修正・追加する
                        </button>
                      )}

                      {isCorrecting && (
                        <div style={{ marginTop: 6 }}>
                          {corrSent ? (
                            <div style={{ fontSize: 12, color: "#4A7C3F", fontWeight: 500 }}>
                              送信しました！ありがとうございます。編集部が確認後に反映します。
                            </div>
                          ) : (
                            <>
                              <textarea
                                value={corrText}
                                onChange={e => setCorrText(e.target.value)}
                                placeholder={`「${m.name}」の修正内容・追記情報を入力\n（例: 機能名は〇〇です / 詳細は〜です）`}
                                style={{
                                  width: "100%", minHeight: 80, fontSize: 13, borderRadius: 8,
                                  border: "none", background: "#E8ECF0",
                                  boxShadow: "inset 2px 2px 5px #C5C9D4, inset -2px -2px 5px #FFFFFF",
                                  padding: 8, boxSizing: "border-box", resize: "vertical",
                                }}
                              />
                              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                                <button onClick={() => submitCorrection(m.name, typeName)}
                                  disabled={corrLoading || !corrText.trim()}
                                  style={{
                                    fontSize: 12, padding: "6px 14px", border: "none", borderRadius: 8,
                                    background: corrLoading || !corrText.trim() ? "#ccc" : catCfg.accent,
                                    color: "#fff",
                                    cursor: corrLoading || !corrText.trim() ? "default" : "pointer",
                                    fontWeight: 600,
                                  }}>
                                  {corrLoading ? "送信中..." : "送信"}
                                </button>
                                <button onClick={() => { setCorrKey(null); setCorrText(""); }}
                                  style={{
                                    fontSize: 12, padding: "6px 12px", border: "1px solid #ccc",
                                    borderRadius: 8, background: "none", cursor: "pointer", color: "#888",
                                  }}>
                                  キャンセル
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* 追加リクエストフォーム */}
      <div style={{ marginTop: 20, background: "#E8ECF0", borderRadius: 12, boxShadow: "inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF", padding: "14px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#444", marginBottom: 6 }}>🔍 分析・機種の追加リクエスト</div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 10, lineHeight: 1.5 }}>
          「スマスロ〇〇のゲーム性を追加して」「周期保証型に〇〇を追加して」など自由に入力してください。調査できたものを30分以内に追加します。
        </div>
        {reqSent ? (
          <div style={{ fontSize: 13, color: "#16A34A", textAlign: "center", padding: "8px 0", fontWeight: 600 }}>✅ リクエストを受け付けました！</div>
        ) : (
          <>
            <input
              value={reqText}
              onChange={e => setReqText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitRequest()}
              placeholder="例: スマスロバイオRE:3のゲーム性を追加して"
              style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "none", background: "#E8ECF0", boxShadow: "inset 3px 3px 6px #C5C9D4, inset -2px -2px 5px #FFFFFF", fontSize: 14, outline: "none", boxSizing: "border-box", color: "#333", fontFamily: "inherit", marginBottom: 8 }}
            />
            <button onClick={submitRequest} disabled={reqLoading || !reqText.trim()}
              style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "none", background: reqLoading || !reqText.trim() ? "#C5C9D4" : "#4A7C3F", color: "#fff", fontSize: 14, fontWeight: 700, cursor: reqLoading || !reqText.trim() ? "not-allowed" : "pointer", boxShadow: reqLoading || !reqText.trim() ? "none" : "2px 2px 6px #C5C9D4", transition: "all 0.15s" }}>
              {reqLoading ? "送信中…" : "リクエストを送る"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
