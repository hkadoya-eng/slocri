import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import DOSSIER_DATA from "./machineDossiers.json";
import ColumnFeedback from "./ColumnFeedback";

/**
 * 機種深堀り分析（ドシエ）タブ。
 * 本文は src/machineDossiers.json（セクション配列）で管理し、ここは描画だけを担う。
 * コラムと同じ 分析タブ(🔒) の中に置くので、閲覧できるのは @key-cre.co.jp でログインした人だけ。
 *
 * セクション型: h / p / note / kpis / steps / table / quotes / videos / links / fig / chart
 *  - fig   … 図はこのファイル内のコンポーネント（FIGURES）をキーで参照する
 *  - chart … 稼働推移グラフ。sis_weekly_data と sis_national_daily から**毎回その場で計算**するので
 *            週次データが更新されれば本文を書き換えなくても数字が最新になる
 */

const C = {
  ink: "#333", ink2: "#444", muted: "#999", hair: "#e6e6e6",
  brand: "#D85A30", brandDim: "#993C1D", tier: "#7B1FA2",
  good: "#1F7A4D", bad: "#D03030", blue: "#2A6FA8", green: "#5E8C3A",
};

/* ---------------- 太字だけの軽量パーサ（**...**） ---------------- */
function RichText({ v, style }) {
  const parts = String(v).split(/(\*\*[^*]+\*\*)/g);
  return (
    <span style={style}>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**")
          ? <b key={i} style={{ color: C.ink }}>{p.slice(2, -2)}</b>
          : <React.Fragment key={i}>{p}</React.Fragment>
      )}
    </span>
  );
}

/* ---------------- 図1: バレットサークル ---------------- */
function FigBulletCircle() {
  const cell = { fill: "none", stroke: C.hair, strokeWidth: 1.5 };
  const lbl = { fontSize: 10.5, fill: C.muted };
  const note = { fontSize: 11.5, fill: C.ink, fontWeight: 700 };
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox="0 0 700 348" role="img" style={{ width: "100%", height: "auto" }}
        aria-label="3リールの上段と中段の合計6マスに丸い枠（バレットサークル）が1〜6個出現し、その枠内に弾の絵柄が止まれば成功という仕組みの図。">
        <rect x="44" y="76" width="252" height="168" rx="8" {...cell} />
        <line x1="128" y1="76" x2="128" y2="244" {...cell} />
        <line x1="212" y1="76" x2="212" y2="244" {...cell} />
        <line x1="44" y1="132" x2="296" y2="132" {...cell} />
        <line x1="44" y1="188" x2="296" y2="188" {...cell} />
        <rect x="44" y="76" width="252" height="112" rx="8" fill={C.brand} opacity="0.05" />
        <text x="86" y="68" textAnchor="middle" style={lbl}>左リール</text>
        <text x="170" y="68" textAnchor="middle" style={lbl}>中リール</text>
        <text x="254" y="68" textAnchor="middle" style={lbl}>右リール</text>
        <text x="38" y="110" textAnchor="end" style={lbl}>上段</text>
        <text x="38" y="166" textAnchor="end" style={lbl}>中段</text>
        <text x="38" y="222" textAnchor="end" style={lbl}>下段</text>

        {/* 的（サークル） */}
        <circle cx="170" cy="160" r="20" fill="none" stroke={C.brand} strokeWidth="2.5" strokeDasharray="4 3" />
        <text x="170" y="165" textAnchor="middle" style={{ fontSize: 11, fill: C.brand, fontWeight: 700 }}>的</text>
        {/* 弾＋的が重なったマス */}
        <rect x="234" y="86" width="40" height="40" rx="6" fill={C.brand} fillOpacity="0.18" stroke={C.brand} strokeWidth="2" />
        <circle cx="254" cy="106" r="20" fill="none" stroke={C.brand} strokeWidth="2.5" strokeDasharray="4 3" />
        <text x="254" y="111" textAnchor="middle" style={{ fontSize: 12, fill: C.brand, fontWeight: 700 }}>弾</text>
        {/* 左リール緑7 */}
        <rect x="66" y="86" width="40" height="40" rx="6" fill="none" stroke={C.green} strokeWidth="1.5" />
        <text x="86" y="111" textAnchor="middle" style={{ fontSize: 11, fill: C.green, fontWeight: 700 }}>緑7</text>

        <line x1="282" y1="106" x2="386" y2="106" stroke={C.muted} strokeWidth="1.5" markerEnd="url(#dAr)" />
        <text x="394" y="102" style={note}>的と弾が<tspan fill={C.brand}>重なった</tspan>＝成功</text>
        <text x="394" y="120" style={lbl}>枠内に止まればバトル勝利や恩恵</text>
        <line x1="192" y1="160" x2="386" y2="160" stroke={C.muted} strokeWidth="1.5" markerEnd="url(#dAr)" />
        <text x="394" y="156" style={note}>中リール中段は<tspan fill={C.brand}>必ず的が出る</tspan></text>
        <text x="394" y="174" style={lbl}>的の数は1〜6個・出方は全13パターン</text>
        <line x1="108" y1="106" x2="386" y2="212" stroke={C.muted} strokeWidth="1.5" markerEnd="url(#dAr)" />
        <text x="394" y="210" style={note}>左に緑7＝<tspan fill={C.brand}>1リール目で結果が判る</tspan></text>
        <text x="394" y="228" style={lbl}>上段に緑7停止で弾停止が確定</text>

        <text x="44" y="282" style={note}>リール側の仕掛け：<tspan fill={C.brand}>弾は毎ゲーム必ず飛んでくる</tspan></text>
        <text x="44" y="302" style={lbl}>中・右リールの上段か中段のどこかに、必ず弾（またはボーナス絵柄）が止まる配列。</text>
        <text x="44" y="322" style={lbl}>勝敗を決めるのは「弾を止められるか」ではなく<tspan fill={C.tier} fontWeight="700">「的がどこに出たか」</tspan>。</text>
        <text x="44" y="340" style={lbl}>だから中・右リールは目押し不要。</text>
        <defs>
          <marker id="dAr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.muted} />
          </marker>
        </defs>
      </svg>
      <figcaption style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.7, marginTop: 6 }}>
        図1：的は毎回どこかに置かれ、弾は必ず飛んでくる＝<b>射的の構造</b>。だから打ち手は「的の出方」に一喜一憂する。
      </figcaption>
    </figure>
  );
}

/* ---------------- 図2: 出玉の階段 ---------------- */
function FigLadder() {
  const stp = { fontSize: 11.5, fill: C.ink, fontWeight: 700 };
  const lbl = { fontSize: 10.5, fill: C.muted };
  const inb = { fontSize: 11, fill: "#fff", fontWeight: 700 };
  const bars = [
    { x: 40, y: 214, w: 84, h: 18, c: C.hair, name: "通常時", val: "", foot: "メダルは減る", tc: C.muted },
    { x: 140, y: 194, w: 76, h: 38, c: C.blue, name: "CZ", val: "約55%", foot: "勝てばAT" },
    { x: 232, y: 128, w: 88, h: 104, c: C.brand, name: "AT", val: "1G +3.6枚", foot: "3回勝つと上へ" },
    { x: 336, y: 194, w: 76, h: 38, c: C.blue, name: "上位CZ", val: "約50%", foot: "デス・ガン戦" },
    { x: 428, y: 164, w: 80, h: 68, c: C.tier, name: "特化ゾーン", val: "250〜2200枚", foot: "一気に加算" },
    { x: 524, y: 24, w: 92, h: 208, c: C.brand, name: "上位AT", val: "1G +7.2枚", foot: "到達が全て" },
  ];
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox="0 -26 660 316" role="img" style={{ width: "100%", height: "auto" }}
        aria-label="通常時からCZ、AT（1ゲーム3.6枚増）、上位CZ、特化ゾーン、上位AT（1ゲーム7.2枚増）へ昇る階段の図。上位ATの後は再び上位CZへ戻ってループする。">
        <line x1="34" y1="232" x2="632" y2="232" stroke={C.hair} strokeWidth="1.5" />
        {bars.map(b => (
          <g key={b.name}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="4" fill={b.c} opacity={b.c === C.hair ? 1 : 0.9} />
            <text x={b.x + b.w / 2} y={b.y - 7} textAnchor="middle" style={stp}>{b.name}</text>
            {b.val && <text x={b.x + b.w / 2} y={b.y + b.h / 2 + 4} textAnchor="middle" style={inb}>{b.val}</text>}
            <text x={b.x + b.w / 2} y="252" textAnchor="middle" style={lbl}>{b.foot}</text>
          </g>
        ))}
        <path d="M 612 30 C 640 -8 400 -8 374 184" fill="none" stroke={C.muted} strokeWidth="1.5"
          strokeDasharray="5 4" markerEnd="url(#dAr2)" />
        <text x="492" y="-6" textAnchor="middle" style={{ fontSize: 11, fill: C.ink, fontWeight: 700 }}>
          終わったらまた上位CZへ＝ループ
        </text>
        <defs>
          <marker id="dAr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.muted} />
          </marker>
        </defs>
      </svg>
      <figcaption style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.7, marginTop: 6 }}>
        図2：棒の高さ＝1ゲームで増える枚数。<b>AT 3.6枚と上位AT 7.2枚でちょうど倍</b>。昇れなければ駆け抜けで終わる。
      </figcaption>
    </figure>
  );
}

/* ---------------- 図3: 差枚数管理ゲージ ---------------- */
function FigGauge() {
  const lbl = { fontSize: 10.5, fill: C.muted };
  const note = { fontSize: 11.5, fill: C.ink, fontWeight: 700 };
  const rows = [
    { y: 34, label: "AT開始", fill: 54, text: "約150枚ぶんのゲージからスタート" },
    { y: 100, label: "消化中", fill: 104, text: "出れば増える／投入で減る。ゼロで終了" },
    { y: 166, label: "特化ゾーン", fill: 182, text: "絶剣なら一気に+2,200枚ぶん（ループごと+1,100枚）", hot: true },
  ];
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox="0 0 660 214" role="img" style={{ width: "100%", height: "auto" }}
        aria-label="差枚数管理の説明図。ATは約150枚の残量ゲージから始まり、メダルが出れば増え、投入すれば減り、ゼロで終了する。特化ゾーンでゲージが一気に伸びる。">
        {rows.map(r => (
          <g key={r.label}>
            <text x="10" y={r.y} style={note}>{r.label}</text>
            <rect x="10" y={r.y + 10} width="188" height="28" rx="6" fill="none" stroke={C.hair} strokeWidth="1.5" />
            <rect x="12" y={r.y + 12} width={r.fill} height="24" rx="4" fill={r.hot ? C.brand : C.blue} opacity="0.85" />
            <text x="212" y={r.y + 29} style={lbl}>{r.text}</text>
          </g>
        ))}
      </svg>
      <figcaption style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.7, marginTop: 6 }}>
        図3：差枚数管理＝<b>残量ゲージ</b>。1ゲームの出入りが直接ゲージに反映されるので1Gすべてに意味がある。
      </figcaption>
    </figure>
  );
}

const FIGURES = { bulletCircle: FigBulletCircle, ladder: FigLadder, gauge: FigGauge };

/* ---------------- 稼働推移グラフ（DBから毎回計算） ---------------- */
function KatsudoChart({ spec }) {
  const [state, setState] = useState({ loading: true, series: [], err: null });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const names = [spec.machine, ...(spec.peers || []).map(p => p.machine)];
        const { data: wk, error: e1 } = await supabase
          .from("sis_weekly_data")
          .select("machine,week_start,out_coins")
          .in("machine", names)
          .order("week_start", { ascending: true });
        if (e1) throw e1;
        if (!wk?.length) throw new Error("週次データが取得できませんでした");
        const first = wk.reduce((m, r) => (r.week_start < m ? r.week_start : m), wk[0].week_start);
        const { data: nat, error: e2 } = await supabase
          .from("sis_national_daily")
          .select("date,avg_in")
          .gte("date", first)
          .order("date", { ascending: true });
        if (e2) throw e2;
        const byDate = {};
        (nat || []).forEach(r => { if (r.avg_in != null) byDate[r.date] = r.avg_in; });
        // 稼働値の分母＝その週(月〜日)の全国アウト実値の平均
        const base = {};
        [...new Set(wk.map(r => r.week_start))].forEach(w => {
          const d0 = new Date(w + "T00:00:00");
          const vals = [];
          for (let i = 0; i < 7; i++) {
            const d = new Date(d0); d.setDate(d0.getDate() + i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            if (byDate[key] != null) vals.push(byDate[key]);
          }
          if (vals.length) base[w] = vals.reduce((s, v) => s + v, 0) / vals.length;
        });
        const mk = (name, label, color, dash) => {
          const rows = wk.filter(r => r.machine === name && r.out_coins && base[r.week_start]);
          return {
            label, color, dash,
            data: rows.slice(0, spec.weeks || 12).map(r => Math.round(r.out_coins / base[r.week_start] * 100)),
          };
        };
        const series = [mk(spec.machine, spec.label || spec.machine, C.brand, null),
          ...(spec.peers || []).map((p, i) => mk(p.machine, p.label, i === 0 ? C.blue : C.green, null))]
          .filter(s => s.data.length > 1);
        if (alive) setState({ loading: false, series, err: null });
      } catch (e) {
        if (alive) setState({ loading: false, series: [], err: e.message || "取得に失敗しました" });
      }
    })();
    return () => { alive = false; };
  }, [spec]);

  if (state.loading) return <div style={{ fontSize: 12, color: C.muted, padding: "18px 0" }}>稼働データを集計中...</div>;
  if (state.err) return <div style={{ fontSize: 12, color: C.bad, padding: "12px 0" }}>⚠ {state.err}</div>;

  const W = 640, H = 264, M = { t: 14, r: 96, b: 30, l: 42 };
  const maxW = Math.max(...state.series.map(s => s.data.length));
  const yMax = Math.ceil(Math.max(...state.series.flatMap(s => s.data), 100) / 50) * 50;
  const px = i => M.l + (maxW < 2 ? 0 : i * (W - M.l - M.r) / (maxW - 1));
  const py = v => H - M.b - (v / yMax) * (H - M.t - M.b);

  return (
    <figure style={{ margin: 0 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
        {state.series.map(s => (
          <span key={s.label} style={{ fontSize: 11, color: C.ink2, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <i style={{ width: 13, height: 3, borderRadius: 2, background: s.color, display: "inline-block" }} />{s.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" style={{ width: "100%", height: "auto" }}
        aria-label={`導入からの経過週ごとの稼働値推移。${state.series.map(s => `${s.label}は直近${s.data[s.data.length - 1]}%`).join("、")}。100%が全国平均。`}>
        {Array.from({ length: yMax / 50 + 1 }, (_, k) => k * 50).map(v => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={py(v)} y2={py(v)} stroke={C.hair} strokeWidth="1" />
            <text x={M.l - 7} y={py(v) + 3.5} textAnchor="end" style={{ fontSize: 9.5, fill: C.muted }}>{v}%</text>
          </g>
        ))}
        <line x1={M.l} x2={W - M.r} y1={py(100)} y2={py(100)} stroke={C.muted} strokeWidth="1.5" strokeDasharray="2 4" />
        <text x={W - M.r + 6} y={py(100) + 3.5} style={{ fontSize: 9.5, fill: C.muted }}>全国平均</text>
        {Array.from({ length: maxW }, (_, i) => i).filter(i => maxW <= 12 || i % 2 === 0).map(i => (
          <text key={i} x={px(i)} y={H - M.b + 16} textAnchor="middle" style={{ fontSize: 9.5, fill: C.muted }}>{i + 1}週</text>
        ))}
        {state.series.map(s => {
          const d = s.data.map((v, i) => `${i ? "L" : "M"}${px(i)} ${py(v)}`).join(" ");
          const li = s.data.length - 1;
          return (
            <g key={s.label}>
              <path d={d} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={px(li)} cy={py(s.data[li])} r="4" fill={s.color} />
              <text x={px(li) + 7} y={py(s.data[li]) + 3.5} style={{ fontSize: 10.5, fill: s.color, fontWeight: 700 }}>
                {s.data[li]}%
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.7, marginTop: 6 }}>
        横軸は各機種の<b>導入からの経過週</b>。稼働値＝1台あたりアウト÷その週の全国平均アウト（実値）。
        <b>このグラフは週次データから毎回計算しているので、更新のたびに自動で最新</b>になる。
      </figcaption>
    </figure>
  );
}

/* ---------------- セクション描画 ---------------- */
function Section({ s }) {
  const p = { fontSize: 13.5, color: C.ink2, lineHeight: 1.85, margin: "0 0 10px" };
  switch (s.t) {
    case "h":
      return <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, margin: "22px 0 8px", lineHeight: 1.5 }}>{s.v}</div>;
    case "p":
      return <p style={p}><RichText v={s.v} /></p>;
    case "note":
      return (
        <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.8, background: "#F7F8FA", borderRadius: 10, padding: "10px 12px", margin: "0 0 10px" }}>
          <RichText v={s.v} />
        </div>
      );
    case "kpis":
      return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(104px,1fr))", gap: 8, margin: "4px 0 14px" }}>
          {s.v.map(k => (
            <div key={k.k} style={{ background: "#fff", border: `0.5px solid ${C.hair}`, borderRadius: 10, padding: "9px 10px" }}>
              <div style={{ fontSize: 10, color: C.muted }}>{k.k}</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: C.ink, lineHeight: 1.35 }}>{k.v}</div>
              <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.5 }}>{k.n}</div>
            </div>
          ))}
        </div>
      );
    case "steps":
      return (
        <div style={{ margin: "2px 0 12px" }}>
          {s.v.map((st, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "26px 1fr", gap: 10, paddingBottom: 12 }}>
              <div style={{ fontSize: 11, color: C.brand, fontWeight: 700, textAlign: "center", paddingTop: 2 }}>{st.n}</div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{st.title}</div>
                {st.meta && <div style={{ fontSize: 11, color: C.brand, margin: "1px 0 3px" }}>{st.meta}</div>}
                <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.8 }}><RichText v={st.body} /></div>
              </div>
            </div>
          ))}
        </div>
      );
    case "table":
      return (
        <div style={{ margin: "0 0 12px" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12, minWidth: 420 }}>
              <thead>
                <tr>{s.head.map((h, i) => (
                  <th key={i} style={{ padding: "6px 8px", textAlign: i ? "right" : "left", fontSize: 10.5, color: C.muted, borderBottom: `1px solid ${C.hair}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {s.rows.map((r, ri) => (
                  <tr key={ri} style={ri === s.hi ? { background: "#F5E9FA" } : undefined}>
                    {r.map((c, ci) => (
                      <td key={ci} style={{ padding: "6px 8px", textAlign: ci ? "right" : "left", color: ri === s.hi ? C.tier : C.ink2, fontWeight: ri === s.hi ? 700 : 400, borderBottom: `1px solid ${C.hair}`, whiteSpace: "nowrap" }}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {s.note && <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.7, marginTop: 6 }}><RichText v={s.note} /></div>}
        </div>
      );
    case "quotes":
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, margin: "2px 0 12px" }}>
          {[["◎ 評価されている点", s.pos, C.good], ["× 不満が集まっている点", s.neg, C.bad]].map(([title, items, col]) => (
            <div key={title} style={{ background: "#fff", border: `0.5px solid ${C.hair}`, borderRadius: 12, padding: "12px 13px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: col, marginBottom: 7 }}>{title}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {items.map((q, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.7 }}>
                    <span style={{ fontSize: 10, color: C.muted, display: "block" }}>{q.tag}</span>
                    <RichText v={q.v} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    case "videos":
      return (
        <div style={{ margin: "2px 0 12px", display: "flex", flexDirection: "column", gap: 12 }}>
          {s.v.map(g => (
            <div key={g.group} style={{ background: "#fff", border: `0.5px solid ${C.hair}`, borderRadius: 12, padding: "12px 13px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, marginBottom: 8 }}>{g.group}</div>
              {g.items.map(it => (
                <div key={it.url} style={{ marginBottom: 9 }}>
                  <a href={it.url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 13, color: C.brand, textDecoration: "none", lineHeight: 1.6, overflowWrap: "anywhere" }}>▶ {it.title}</a>
                  <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.7 }}><RichText v={it.note} /></div>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    case "links":
      return (
        <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.9, margin: "0 0 10px" }}>
          参照：{s.v.map((l, i) => (
            <React.Fragment key={l.url}>
              {i > 0 && "／"}
              <a href={l.url} target="_blank" rel="noreferrer" style={{ color: C.brand, textDecoration: "none" }}>{l.label}</a>
            </React.Fragment>
          ))}
        </div>
      );
    case "fig": {
      const F = FIGURES[s.v];
      return F ? <div style={{ margin: "6px 0 14px" }}><F /></div> : null;
    }
    case "chart":
      return <div style={{ margin: "6px 0 14px" }}><KatsudoChart spec={s.v} /></div>;
    default:
      return null;
  }
}

/* ---------------- 一覧＋詳細 ---------------- */
export default function MachineDossierTab() {
  const [openId, setOpenId] = useState(null);
  const list = DOSSIER_DATA.dossiers || [];
  const open = useMemo(() => list.find(d => d.id === openId) || null, [list, openId]);

  if (open) {
    return (
      <div style={{ minWidth: 0 }}>
        <button onClick={() => setOpenId(null)}
          style={{ border: "none", background: "none", color: C.brand, fontSize: 13, cursor: "pointer", padding: "0 0 10px" }}>
          ← 一覧へ戻る
        </button>
        <div style={{ background: "#fff", border: `0.5px solid ${C.hair}`, borderRadius: 14, padding: "16px 15px", marginBottom: 16 }}>
          <div style={{ fontSize: 11.5, color: C.brand, fontWeight: 700, marginBottom: 4 }}>{open.machine}</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.ink, lineHeight: 1.45, marginBottom: 6 }}>{open.title}</div>
          <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.8, marginBottom: 10 }}><RichText v={open.lede} /></div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {(open.chips || []).map(c => (
              <span key={c.v} style={{
                fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
                color: c.k === "tier" ? C.tier : c.k === "good" ? C.good : c.k === "warn" ? "#B57200" : C.ink2,
                background: c.k === "tier" ? "#F5E9FA" : c.k === "good" ? "#E6F5EC" : c.k === "warn" ? "#FFF3DC" : "#F0F2F5",
              }}>{c.v}</span>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>{open.author} · 更新 {open.date}</div>
        </div>

        {(open.sections || []).map((s, i) => <Section key={i} s={s} />)}

        <div style={{ marginTop: 18 }}>
          <ColumnFeedback columnId={`dossier_${open.id}`} columnTitle={`【深堀り】${open.title}`} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>機種深堀り分析</span>
        <span style={{ fontSize: 12, color: "#bbb" }}>更新: {DOSSIER_DATA.updatedAt}</span>
      </div>
      {list.length === 0 && <div style={{ fontSize: 13, color: C.muted, padding: "24px 0", textAlign: "center" }}>まだありません</div>}
      {list.map(d => (
        <button key={d.id} onClick={() => setOpenId(d.id)}
          style={{ display: "block", width: "100%", textAlign: "left", background: "#fff", border: `0.5px solid ${C.hair}`, borderRadius: 14, padding: "13px 14px", marginBottom: 12, cursor: "pointer" }}>
          <div style={{ fontSize: 11.5, color: C.brand, fontWeight: 700, marginBottom: 3 }}>{d.machine}</div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, lineHeight: 1.45, marginBottom: 5 }}>{d.title}</div>
          <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.7, marginBottom: 7, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {String(d.lede).replace(/\*\*/g, "")}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {(d.chips || []).slice(0, 3).map(c => (
              <span key={c.v} style={{
                fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                color: c.k === "tier" ? C.tier : c.k === "good" ? C.good : c.k === "warn" ? "#B57200" : C.ink2,
                background: c.k === "tier" ? "#F5E9FA" : c.k === "good" ? "#E6F5EC" : c.k === "warn" ? "#FFF3DC" : "#F0F2F5",
              }}>{c.v}</span>
            ))}
            <span style={{ fontSize: 11, color: "#bbb", marginLeft: "auto" }}>{d.sections?.length || 0}節 · {d.date}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
