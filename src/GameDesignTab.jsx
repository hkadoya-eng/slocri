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
  "L虚構推理":                          { CZ: "虚構連モード突入抽選",    AT: "虚構連モード（強制突入）" },
  "異世界かるてっとBT":                 { CZ: "チャレンジゾーン",        AT: "BT（ボーナスタイム）" },
  "スマスロ ヨルムンガンド":             { CZ: "ストーリーCZ（前半10G+後半3G）" },
  "スマスロ甲鉄城のカバネリ 海門決戦":   { CZ: "カバネリアタック" },
  "L真打吉宗":                          { CZ: "周期CZ（6周期確定）",     AT: "真BB / 1G連ループ" },
  "Lガンダムユニコーン覚醒DRIVE":        { AT: "覚醒DRIVE（3段階強化）" },
  "L戦国乙女5":                         { AT: "3段階AT（純増UP型）" },
  "スマスロ ミリオンゴッド-神々の軌跡-": { AT: "SGG（スーパーゴッドゲーム）" },
  "パチスロ 沖ドキ！":                  { ボーナス: "ドキドキモード / 超ドキドキモード" },
};

const DATA = {
  CZ: {
    types: {
      "軽量CZ型": {
        description: GAME_LIBRARY.czDesignPatterns["軽量CZ型"].description,
        note: GAME_LIBRARY.czDesignPatterns["軽量CZ型"].designNote,
        machines: [
          { name: "L虚構推理",         detail: "CZ確率1/124.5（設定不問）。攻略勢に大好評で稼働首位の主因。" },
          { name: "異世界かるてっとBT", detail: "CZ確率1/124.5（設定不問）。CZは軽いがBTに繋がらないフラストレーションが問題で評価1.8/5。" },
        ],
      },
      "重量CZ型": {
        description: GAME_LIBRARY.czDesignPatterns["重量CZ型"].description,
        note: GAME_LIBRARY.czDesignPatterns["重量CZ型"].risk,
        machines: [
          { name: "スマスロ ヨルムンガンド",           detail: "通常時1500G回してCZ0回の報告が続出。導入2日目に通路化確定するホールが出た。" },
          { name: "スマスロ甲鉄城のカバネリ 海門決戦", detail: "低設定は構造的にCZが来ない設計。設定狙い専用機になってしまっている。" },
        ],
      },
      "段階CZ型": {
        description: GAME_LIBRARY.czDesignPatterns["段階CZ型"].description,
        note: GAME_LIBRARY.czDesignPatterns["段階CZ型"].designNote,
        machines: [
          { name: "スマスロ ヨルムンガンド", detail: "前半10G+後半3Gの2部構成ストーリーCZ。3回成功でPC突入という段階設計。失敗時の絶望も大きい。" },
        ],
      },
      "周期CZ型": {
        description: GAME_LIBRARY.czDesignPatterns["周期CZ型"].description,
        note: null,
        machines: [
          { name: "L真打吉宗", detail: "6周期でCZ確定（最大1000G）。周期天井が明確で立ち回りの指針が立てやすい。設定1でも97.8%を実現。" },
        ],
      },
    },
  },
  AT: {
    types: Object.fromEntries(
      Object.entries(GAME_LIBRARY.gameFlowPatterns).map(([typeName, data]) => [
        typeName,
        {
          description: data.description,
          emotion: data.playerEmotion || null,
          note: null,
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
    _note: "通常時フロー（周期・ゾーン・天井設計）のデータは準備中です。情報提供をお待ちしています。",
    types: {},
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
                {typeData.emotion && (
                  <div style={{ padding: "8px 14px 0", fontSize: 12, color: catCfg.accent, fontStyle: "italic" }}>
                    💭 {typeData.emotion}
                  </div>
                )}
                {typeData.note && (
                  <div style={{ padding: "6px 14px 0", fontSize: 12, color: "#888" }}>
                    設計メモ: {typeData.note}
                  </div>
                )}

                {/* 機種リスト */}
                {(typeData.machines || []).length === 0 && (
                  <div style={{ padding: "14px", fontSize: 13, color: "#aaa", textAlign: "center" }}>
                    機種データなし（情報提供募集中）
                  </div>
                )}

                {(typeData.machines || []).map((m, i) => {
                  const featureName  = FEATURE_NAMES[m.name]?.[activeCat] ?? null;
                  const mKey         = `${activeCat}__${typeName}__${i}`;
                  const isCorrecting = corrKey === mKey;

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

                      {/* 内容 */}
                      {m.detail ? (
                        <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7, marginBottom: 8 }}>
                          {m.detail}
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: "#aaa", fontStyle: "italic", marginBottom: 8 }}>
                          詳細データなし（確認できた情報のみ掲載・情報提供募集中）
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
    </div>
  );
}
