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
    types: {
      "段階クリア型": {
        description: GAME_LIBRARY.czDesignPatterns["段階クリア型"].description,
        probability: GAME_LIBRARY.czDesignPatterns["段階クリア型"].probability,
        reward: GAME_LIBRARY.czDesignPatterns["段階クリア型"].reward,
        note: GAME_LIBRARY.czDesignPatterns["段階クリア型"].designNote,
        rules: GAME_LIBRARY.czDesignPatterns["段階クリア型"].rules,
        presentation: GAME_LIBRARY.czDesignPatterns["段階クリア型"].presentation,
        machines: [
          { name: "スマスロ ヨルムンガンド", detail: "前半10G+後半3Gの2部構成ストーリーCZ。3回成功でPC突入という段階設計。失敗時の絶望も大きい。" },
          { name: "押忍！番長4", detail: "シリーズ伝統の「特訓→対決」2段階フロー。天井699G+αで確定。青7ボーナス選択割合に6倍の設定差。2024年販売台数1位。" },
          { name: "スマスロ マギアレコード 魔法少女まどか☆マギカ外伝", detail: "・ボーナス初当たり確率：1/240.6（設定1）〜1/184.3（設定6）\n・マギアチャレンジ：通常CZ、成功でマギアラッシュ突入\n・黒江チャレンジ：レアCZ、当選確率は高設定で2倍（設定4以上濃厚の判別手段）\n・エピソード振り分けに設定差（黒江エピソード発生で設定5以上期待大）\n・「みたまボーナス」最終ジャッジのウワサ発展AT当選率に大きな設定差" },
        ],
      },
      "自力演出型": {
        description: GAME_LIBRARY.czDesignPatterns["自力演出型"].description,
        probability: GAME_LIBRARY.czDesignPatterns["自力演出型"].probability,
        reward: GAME_LIBRARY.czDesignPatterns["自力演出型"].reward,
        note: null,
        rules: GAME_LIBRARY.czDesignPatterns["自力演出型"].rules,
        presentation: GAME_LIBRARY.czDesignPatterns["自力演出型"].presentation,
        machines: [
          { name: "スマスロ甲鉄城のカバネリ 海門決戦", detail: "カバネリアタック中はベル・弱チェ・強チェ・特殊役でAT移行率が変動。役の強さで手応えが変わる設計。" },
          { name: "スマスロ モンキーターンV", detail: "超抜チャレンジはベル当選でのAT移行抽選が主軸。役を引いて自分でATを勝ち取る感覚。P-WORLDアワード2024受賞。" },
        ],
      },
      "カウントアップ型": {
        description: GAME_LIBRARY.czDesignPatterns["カウントアップ型"].description,
        probability: GAME_LIBRARY.czDesignPatterns["カウントアップ型"].probability,
        reward: GAME_LIBRARY.czDesignPatterns["カウントアップ型"].reward,
        note: null,
        rules: GAME_LIBRARY.czDesignPatterns["カウントアップ型"].rules,
        presentation: GAME_LIBRARY.czDesignPatterns["カウントアップ型"].presentation,
        machines: [
          { name: "スマスロ モンキーターンV", detail: "超抜チャレンジの天井保証として機能。一定カウント到達でAT確定し、自力解除を逃しても必ず結果が出る安心設計。" },
        ],
      },
    },
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
