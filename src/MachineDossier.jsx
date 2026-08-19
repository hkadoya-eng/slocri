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
        図1：的は毎回どこかに置かれ、弾は必ず飛んでくる。だから打ち手は「的の出方」に一喜一憂する。<b>この仕掛けは下の図2・図3の◎印の場面で毎回使われる</b>——通常時から特化ゾーンまで、この台のほぼ全場面が同じ射的でできている。
      </figcaption>
    </figure>
  );
}

/* ---------------- 参考図: 純増の階段（現在SAO2では未使用・他機種で再利用可） ---------------- */
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
        棒の高さ＝1ゲームで増える枚数。
      </figcaption>
    </figure>
  );
}

/* ---------------- 図4: 差枚数管理ゲージ ---------------- */
function FigGauge() {
  const lbl = { fontSize: 10.5, fill: C.muted };
  const note = { fontSize: 11.5, fill: C.ink, fontWeight: 700 };
  const rows = [
    { y: 34, label: "AT開始", fill: 54, text: "初期150枚＋αからスタート" },
    { y: 100, label: "消化中", fill: 104, text: "レア役から20〜2000枚の上乗せ抽選" },
    { y: 166, label: "特化ゾーン", fill: 182, text: "絶剣なら一気に+2,200枚ぶん（ループごと+1,100枚）", hot: true },
  ];
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox="0 0 660 214" role="img" style={{ width: "100%", height: "auto" }}
        aria-label="差枚数管理の概念図。ATは初期150枚+αから始まり、レア役で20〜2000枚の上乗せ抽選、特化ゾーンでは絶剣が2200枚＋ループ毎1100枚を加算する。残量を棒で表した概念図であり、実機の画面表示ではない。">
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
        図4：差枚数管理＝<b>残量ゲージ</b>。1ゲームの出入りが直接ゲージに反映されるので1Gすべてに意味がある。
      </figcaption>
    </figure>
  );
}

/* ---------------- 5角形チャート（評価5軸） ----------------
   軸ごとに単位が違うので、すべて「同種の機種と比べた上位%（パーセンタイル）」に揃える。
   レーダーは軸の並び順で形が変わるため、順序は 需要→持続→ホール→関心→納得 に固定する。 */
function FigRadar({ spec }) {
  const cx = 285, cy = 232, R = 138;
  const axes = spec.axes, n = axes.length;
  const ang = i => (-90 + i * (360 / n)) * Math.PI / 180;
  const pt = (i, v) => [cx + R * (v / 100) * Math.cos(ang(i)), cy + R * (v / 100) * Math.sin(ang(i))];
  const poly = vals => vals.map((v, i) => pt(i, v).map(x => Math.round(x * 10) / 10).join(",")).join(" ");
  const grid = [25, 50, 75, 100];
  return (
    <figure style={{ margin: 0 }}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 2 }}>
        {spec.series.map(s => (
          <span key={s.label} style={{ fontSize: 11.5, color: C.ink2, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <i style={{ width: 13, height: 3, borderRadius: 2, background: s.color === "blue" ? C.blue : C.brand, display: "inline-block" }} />
            {s.label}
          </span>
        ))}
      </div>
      <svg viewBox="0 0 570 470" role="img" style={{ width: "100%", height: "auto", maxWidth: 520, margin: "0 auto", display: "block" }}
        aria-label={`評価5軸の5角形チャート。${spec.series.map(s => `${s.label}は${axes.map((a, i) => `${a.name}が上位${100 - s.values[i]}%（percentile ${s.values[i]}）`).join("、")}`).join("。")}`}>
        {grid.map(g => (
          <polygon key={g} points={poly(axes.map(() => g))} fill="none"
            stroke={C.hair} strokeWidth={g === 100 ? 1.4 : 1} />
        ))}
        {axes.map((a, i) => {
          const [x, y] = pt(i, 100);
          return <line key={a.name} x1={cx} y1={cy} x2={x} y2={y} stroke={C.hair} strokeWidth="1" />;
        })}
        {grid.map(g => {
          const [, y] = pt(0, g);
          return <text key={g} x={cx + 4} y={y + 3} style={{ fontSize: 9, fill: C.muted }}>{g}</text>;
        })}
        {spec.series.map(s => {
          const col = s.color === "blue" ? C.blue : C.brand;
          return (
            <g key={s.label}>
              <polygon points={poly(s.values)} fill={col} fillOpacity={s.color === "blue" ? 0.06 : 0.16}
                stroke={col} strokeWidth="2.2" strokeDasharray={s.color === "blue" ? "5 4" : undefined} />
              {s.values.map((v, i) => {
                const [x, y] = pt(i, v);
                return <circle key={i} cx={x} cy={y} r="4" fill={col} />;
              })}
            </g>
          );
        })}
        {axes.map((a, i) => {
          const [x, y] = pt(i, 100);
          const dx = Math.cos(ang(i)), dy = Math.sin(ang(i));
          const anchor = Math.abs(dx) < 0.2 ? "middle" : (dx > 0 ? "start" : "end");
          const lx = x + dx * 20, ly = y + dy * 22 + (Math.abs(dx) < 0.2 ? (dy < 0 ? -4 : 14) : 0);
          const v = spec.series[0].values[i];
          return (
            <g key={a.name}>
              <text x={lx} y={ly} textAnchor={anchor} style={{ fontSize: 12.5, fill: C.ink, fontWeight: 700 }}>
                {a.name}{a.small ? "※" : ""}
              </text>
              <text x={lx} y={ly + 15} textAnchor={anchor} style={{ fontSize: 11, fill: C.brand, fontWeight: 700 }}>
                上位{100 - v}%
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.7, marginTop: 4 }}>
        <RichText v={spec.caption} />
      </figcaption>
    </figure>
  );
}

/* ---------------- フロー図の部品 ---------------- */
function Box({ x, y, w, h, title, lines, tone = "ink", strong, mark }) {
  const col = { ink: C.ink2, brand: C.brand, blue: C.blue, tier: C.tier, muted: C.muted }[tone];
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="8" fill="#fff" stroke={col}
        strokeWidth={strong ? 2.2 : 1.3} opacity={tone === "muted" ? 0.8 : 1} />
      {/* mark=バレットサークルが出る場面。図1の仕掛けがどこで使われるかを示す */}
      {mark && (
        <g>
          <circle cx={x + 12} cy={y + 15} r="7" fill={C.brand} fillOpacity="0.14" stroke={C.brand} strokeWidth="1.4" />
          <circle cx={x + 12} cy={y + 15} r="2.4" fill={C.brand} />
        </g>
      )}
      <text x={x + w / 2 + (mark ? 8 : 0)} y={y + 19} textAnchor="middle"
        style={{ fontSize: 12.5, fill: col, fontWeight: 700 }}>{title}</text>
      {(lines || []).map((l, i) => (
        <text key={i} x={x + w / 2} y={y + 36 + i * 14} textAnchor="middle"
          style={{ fontSize: 10.5, fill: C.muted }}>{l}</text>
      ))}
    </g>
  );
}
function Arrow({ x1, y1, x2, y2, label, dash, tone = "ink", up }) {
  const col = { ink: C.ink2, brand: C.brand, muted: C.muted }[tone];
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth={dash ? 1.4 : 1.8}
        strokeDasharray={dash ? "5 4" : undefined} markerEnd="url(#fAr)" opacity={dash ? 0.75 : 1} />
      {label && (
        <text x={(x1 + x2) / 2} y={y1 === y2 ? y1 - 6 : (y1 + y2) / 2 + (up ? -6 : 14)} textAnchor="middle"
          style={{ fontSize: 10.5, fill: col, fontWeight: 600 }}>{label}</text>
      )}
    </g>
  );
}
const ARROW_DEF = (
  <defs>
    <marker id="fAr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill={C.ink2} />
    </marker>
  </defs>
);

/* ---------------- 図2: 通常時 → AT ---------------- */
function FigFlowNormal() {
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox="0 0 840 400" role="img" style={{ width: "100%", height: "auto" }}
        aria-label="通常時からATまでの流れ図。通常時はモードで規定ゲーム数が変わり、液晶ゲーム数の規定数到達66％・バレットカウンター7個19％・レア役15％の3つの契機からCZスコードロンバトル（勝利期待度約55％）へ。勝利でAT、失敗ならEXアイコンや曠野の決闘を経て通常時へ戻る。中段チェリーは1/16384でAT直撃。">
        {ARROW_DEF}
        <text x="14" y="20" style={{ fontSize: 12, fill: C.brand, fontWeight: 700 }}>図2　通常時 → AT（入口）</text>

        {/* ウルティマ・チェリー（枠を広げ、本文は2行に分ける） */}
        <Box x={196} y={38} w={340} h={70} title="ウルティマ・チェリー（中段チェリー）" tone="tier"
          lines={["1/16384（全設定共通）", "AT直撃／ロングフリーズの契機"]} />
        <path d="M 536 73 C 620 73 686 96 744 138" fill="none" stroke={C.tier} strokeWidth="1.8" markerEnd="url(#fAr)" />
        <text x={556} y={62} style={{ fontSize: 10.5, fill: C.tier, fontWeight: 700 }}>CZを飛ばして直撃</text>

        <Box x={14} y={142} w={176} h={104} title="通常時" tone="ink"
          lines={["内部モードで規定G数が変わる", "通常A/B/C 250〜650G", "通常D 350G以内", "天国 100G以内"]} />

        {/* CZ当選の内訳：枠で囲んで矢印を枠の外に出す（テキストと矢印が重ならないように） */}
        <rect x={206} y={142} width={196} height={104} rx="8" fill="none" stroke={C.hair} strokeWidth="1.3" />
        <text x={304} y={161} textAnchor="middle" style={{ fontSize: 11.5, fill: C.ink, fontWeight: 700 }}>CZ当選の内訳</text>
        {[["液晶G数が規定数に到達", "66%", 184], ["バレットカウンター7個", "19%", 206], ["レア役（強チェリー ほか）", "15%", 228]].map(([t, p, y]) => (
          <g key={t}>
            <text x={216} y={y} style={{ fontSize: 10.5, fill: C.muted }}>{t}</text>
            <text x={392} y={y} textAnchor="end" style={{ fontSize: 11, fill: C.brand, fontWeight: 700 }}>{p}</text>
          </g>
        ))}
        <Arrow x1={190} y1={194} x2={204} y2={194} />
        <Arrow x1={404} y1={194} x2={438} y2={194} />

        <Box x={442} y={142} w={168} h={104} title="CZ スコードロンバトル" tone="blue" strong mark
          lines={["勝利期待度 約55%", "前半パート＋ジャッジパート", "弾痕を貯めて最後に告知"]} />
        <Arrow x1={610} y1={194} x2={654} y2={194} label="勝利" tone="brand" />
        <Box x={658} y={142} w={168} h={104} title="AT バレットオブバレッツ" tone="brand" strong
          lines={["初期150枚＋α", "純増約3.6枚・差枚数管理", "以降は図3へ"]} />

        <Box x={442} y={292} w={168} h={60} title="CZ失敗" tone="muted"
          lines={["EXアイコン付与／曠野の決闘", "（設定差あり・示唆が残る）"]} />
        <Arrow x1={526} y1={246} x2={526} y2={290} dash tone="muted" label="約45%" />
        <Arrow x1={442} y1={322} x2={196} y2={322} dash tone="muted" label="通常時へ戻る" />

        <Box x={14} y={278} w={176} h={64} title="シューティングチャージ" tone="muted" mark
          lines={["弱チェリー・弱チャンス目など", "→ 液晶G数を大幅に加算"]} />
        <Arrow x1={102} y1={278} x2={102} y2={250} tone="muted" />

        <circle cx="24" cy="382" r="7" fill={C.brand} fillOpacity="0.14" stroke={C.brand} strokeWidth="1.4" />
        <circle cx="24" cy="382" r="2.4" fill={C.brand} />
        <text x={40} y={386} style={{ fontSize: 11, fill: C.ink }}>
          ＝ 図1の<tspan fill={C.brand} fontWeight="700">バレットサークル（的と弾）</tspan>が出る場面。ここでは「弾痕を貯める」「液晶G数を伸ばす」役を担う。
        </text>
      </svg>
      <figcaption style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.7, marginTop: 6 }}>
        図2：ATへの入口は<b>3本</b>あり、実際の当選は<b>液晶G数の規定数到達が約66%で主役</b>。シューティングチャージはその液晶G数を伸ばすゾーン。CZに負けても示唆（EXアイコン・曠野の決闘）が残るので、失敗も情報になる。
      </figcaption>
    </figure>
  );
}

/* ---------------- 図3: AT → 上位ATのループ ---------------- */
function FigFlowLoop() {
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox="0 0 840 434" role="img" style={{ width: "100%", height: "auto" }}
        aria-label="ATから上位ATへのループ図。AT中はスナイパーチャンス（約50%）に勝つと差枚上乗せや特化ゾーン、3回勝利で上位CZデス・ガンバトル（約50%、ウルティマ状態なら大幅アップ）の権利。勝利の一部でウルティマナイトバトルや絶剣を経て上位ATフルダイブ（純増7.2枚）へ。上位ATは消化後必ず上位CZへ戻りループする。">
        {ARROW_DEF}
        <text x="14" y="20" style={{ fontSize: 12, fill: C.brand, fontWeight: 700 }}>図3　AT → 上位AT（ループの本体）</text>

        <Box x={14} y={176} w={162} h={92} title="AT バレットオブバレッツ" tone="brand" strong
          lines={["純増約3.6枚・差枚数管理", "差枚が尽きたら終了"]} />
        <Arrow x1={176} y1={222} x2={218} y2={222} />
        <Box x={222} y={176} w={172} h={92} title="スナイパーチャンス" tone="blue" strong mark
          lines={["AT中のCZ・勝利期待度約50%", "レア役／規定液晶G数から", "エピソード4G＋ジャッジ1G"]} />

        <Box x={222} y={300} w={172} h={72} title="勝利の恩恵" tone="ink"
          lines={["① 差枚 +100〜300枚", "② 特化ゾーン（下位）", "③ 3回勝利で上位CZの権利"]} />
        <Arrow x1={308} y1={268} x2={308} y2={298} tone="brand" />
        <Arrow x1={222} y1={336} x2={100} y2={272} dash label="①はATへ" tone="muted" />
        <Box x={14} y={300} w={162} h={72} title="下位の特化ゾーン" tone="tier" mark
          lines={["ナイトバトル 約250枚", "すくーるばんばん 約600枚", "シノンアタック 50〜3000枚"]} />

        <Arrow x1={394} y1={222} x2={440} y2={222} label="③の権利で" tone="brand" />
        <Box x={444} y={176} w={168} h={92} title="上位CZ デス・ガンバトル" tone="blue" strong
          lines={["勝利期待度 約50%", "ウルティマ状態なら大幅アップ", "敗北時はATへ戻る"]} />
        <Box x={444} y={300} w={176} h={72} title="上位の特化ゾーン" tone="tier" strong mark
          lines={["ウルティマナイトバトル 約850枚", "絶剣 2200枚＋ループ毎1100枚", "→ 上位ATの初期枚数が決まる"]} />
        <Arrow x1={528} y1={268} x2={528} y2={298} tone="brand" />
        <text x={536} y={288} style={{ fontSize: 10.5, fill: C.brand, fontWeight: 600 }}>勝利の一部</text>
        <Arrow x1={622} y1={336} x2={702} y2={274} tone="brand" />

        <Box x={648} y={176} w={178} h={92} title="上位AT フルダイブ" tone="brand" strong
          lines={["純増約7.2枚（ATの2倍）", "平均約3000枚（非ウルティマ）", "ウルティマ状態なら期待約7000枚"]} />

        <path d="M 826 200 C 838 120 560 120 528 172" fill="none" stroke={C.brand} strokeWidth="2.4" markerEnd="url(#fAr2)" />
        <text x={676} y={118} textAnchor="middle" style={{ fontSize: 11.5, fill: C.brand, fontWeight: 700 }}>
          消化後は必ず上位CZへ戻る＝ループ
        </text>
        <text x={676} y={136} textAnchor="middle" style={{ fontSize: 10.5, fill: C.muted }}>
          勝ち続ける限り 7.2枚 × 上乗せが続く
        </text>

        <text x={14} y={398} style={{ fontSize: 11, fill: C.ink, fontWeight: 700 }}>
          要点：この台の出玉は<tspan fill={C.brand}>「上位CZに何回挑めたか」</tspan>でほぼ決まる。ATはそこへ行くための通過点である。
        </text>
        <circle cx="24" cy="420" r="7" fill={C.brand} fillOpacity="0.14" stroke={C.brand} strokeWidth="1.4" />
        <circle cx="24" cy="420" r="2.4" fill={C.brand} />
        <text x={40} y={424} style={{ fontSize: 11, fill: C.ink }}>
          ＝ バレットサークルが出る場面。特化ゾーンでは<tspan fill={C.brand} fontWeight="700">サークルの数がもらえる枚数そのものを決める</tspan>（赤4個以上で平均約850枚）。
        </text>
      </svg>
      <figcaption style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.7, marginTop: 6 }}>
        図3：純増は3.6枚から7.2枚へ上がり、上位ATは<b>消化後に必ず上位CZへ戻る</b>ので、勝ち続ければ出玉は雪だるま式に伸びる。届かなければ3.6枚のまま差枚が尽きる。
      </figcaption>
    </figure>
  );
}

const FIGURES = {
  bulletCircle: FigBulletCircle, ladder: FigLadder, gauge: FigGauge,
  flowNormal: FigFlowNormal, flowLoop: FigFlowLoop,
};

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
      return <p style={{ ...p, whiteSpace: "pre-line" }}><RichText v={s.v} /></p>;
    case "note":
      return (
        <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.8, background: "#F7F8FA", borderRadius: 10, padding: "10px 12px", margin: "0 0 10px", whiteSpace: "pre-line" }}>
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
                {Array.isArray(st.body) ? (
                  <ul style={{ margin: "2px 0 0", paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                    {st.body.map((b, k) => (
                      <li key={k} style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.75, paddingLeft: 14, position: "relative" }}>
                        <span style={{ position: "absolute", left: 2, top: "0.68em", width: 5, height: 5, borderRadius: "50%", background: C.hair }} />
                        <RichText v={b} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.8 }}><RichText v={st.body} /></div>
                )}
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
    case "bullets": {
      // 見出し＋リード＋箇条書き（sub で1段ネスト）
      const tone = s.tone === "primer" ? { bg: "#FBF3EF", bd: C.brand } : { bg: "#fff", bd: C.hair };
      return (
        <div style={{ background: tone.bg, border: `0.5px solid ${tone.bd === C.brand ? "#F0DAD0" : C.hair}`, borderRadius: 14, padding: "14px 16px", margin: "0 0 12px" }}>
          {s.title && <div style={{ fontSize: 14, fontWeight: 700, color: s.tone === "primer" ? C.brand : C.ink, marginBottom: 7 }}>{s.title}</div>}
          {s.lead && <p style={{ margin: "0 0 9px", fontSize: 13.5, color: C.ink2, lineHeight: 1.8 }}><RichText v={s.lead} /></p>}
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
            {s.items.map((it, i) => {
              const text = typeof it === "string" ? it : it.t;
              const sub = typeof it === "string" ? null : it.sub;
              return (
                <li key={i} style={{ fontSize: 13, color: C.ink2, lineHeight: 1.78, paddingLeft: 15, position: "relative" }}>
                  <span style={{ position: "absolute", left: 2, top: "0.66em", width: 5, height: 5, borderRadius: "50%", background: C.brand }} />
                  <RichText v={text} />
                  {sub && (
                    <ul style={{ margin: "4px 0 0", paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 3 }}>
                      {sub.map((x, j) => (
                        <li key={j} style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.7, paddingLeft: 13, position: "relative" }}>
                          <span style={{ position: "absolute", left: 2, top: "0.72em", width: 6, height: 1.5, background: C.hair }} />
                          <RichText v={x} />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          {s.tail && <p style={{ margin: "9px 0 0", fontSize: 12.5, color: C.muted, lineHeight: 1.75 }}><RichText v={s.tail} /></p>}
        </div>
      );
    }
    case "glossary":
      // 用語集。group ごとに 語→説明 を並べる
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, margin: "2px 0 12px" }}>
          {s.v.map(g => (
            <div key={g.group} style={{ background: "#fff", border: `0.5px solid ${C.hair}`, borderRadius: 12, padding: "12px 13px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.brand, marginBottom: 8 }}>{g.group}</div>
              <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {g.items.map(([term, desc]) => (
                  <div key={term} style={{ display: "grid", gridTemplateColumns: "minmax(88px,132px) 1fr", gap: 10, alignItems: "start" }}>
                    <dt style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, lineHeight: 1.6 }}>{term}</dt>
                    <dd style={{ margin: 0, fontSize: 12.5, color: C.ink2, lineHeight: 1.72 }}><RichText v={desc} /></dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      );
    case "voices":
      // テーマ別に声を束ね、最後に「何が起きているか」の読みを1行添える
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "2px 0 12px" }}>
          {s.v.map((th, i) => {
            const col = th.tone === "pos" ? C.good : th.tone === "neg" ? C.bad : C.brand;
            const bg = th.tone === "pos" ? "#F1FAF4" : th.tone === "neg" ? "#FDF3F3" : "#FBF3EF";
            return (
              <div key={i} style={{ background: "#fff", border: `0.5px solid ${C.hair}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ background: bg, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: col }}>
                    {th.tone === "pos" ? "◎" : th.tone === "neg" ? "×" : "△"}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{th.theme}</span>
                  {th.n && <span style={{ fontSize: 10.5, color: C.muted, marginLeft: "auto" }}>{th.n}</span>}
                </div>
                <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {th.quotes.map((q, j) => (
                    <div key={j} style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.7, paddingLeft: 12, borderLeft: `2px solid ${C.hair}` }}>{q}</div>
                  ))}
                  {th.read && (
                    <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.75, marginTop: 3, background: "#F7F8FA", borderRadius: 8, padding: "7px 10px" }}>
                      <b style={{ color: col }}>読み</b>　<RichText v={th.read} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    case "videos":
      return (
        <div style={{ margin: "2px 0 12px", display: "flex", flexDirection: "column", gap: 12 }}>
          {s.v.map(g => (
            <div key={g.group} style={{ background: "#fff", border: `0.5px solid ${C.hair}`, borderRadius: 12, padding: "12px 13px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, marginBottom: 8 }}>{g.group}</div>
              {g.items.map(it => (
                <div key={it.url} style={{ marginBottom: 11 }}>
                  <a href={it.url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 13, color: C.brand, textDecoration: "none", lineHeight: 1.6, overflowWrap: "anywhere" }}>▶ {it.title}</a>
                  {(it.ch || it.len) && (
                    <div style={{ fontSize: 11, color: "#bbb", margin: "1px 0 2px" }}>
                      {it.ch}{it.ch && it.len ? " · " : ""}{it.len && `${it.len}`}
                    </div>
                  )}
                  {/* at は「見どころの時間」。手で埋めたら ?t= 付きリンクになる（自動では特定できない） */}
                  {(it.at || []).length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "2px 0 3px" }}>
                      {it.at.map(a => {
                        const [mm, ss] = String(a.time).split(":").map(Number);
                        const sec = (mm || 0) * 60 + (ss || 0);
                        return (
                          <a key={a.time} href={`${it.url}&t=${sec}s`} target="_blank" rel="noreferrer"
                            style={{ fontSize: 11, color: C.brandDim, background: "#FAECE7", borderRadius: 6, padding: "2px 7px", textDecoration: "none" }}>
                            {a.time} {a.label}
                          </a>
                        );
                      })}
                    </div>
                  )}
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
    case "radar": {
      // 表（左）＋5角形（右）。狭い画面では自動で上下に積む
      const tb = s.v.table;
      return (
        <div style={{ margin: "8px 0 14px", display: "grid", gap: 14,
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", alignItems: "start" }}>
          {tb && (
            <div style={{ background: "#fff", border: `0.5px solid ${C.hair}`, borderRadius: 12, padding: "12px 13px" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
                  <thead><tr>{tb.head.map((h, i) => (
                    <th key={i} style={{ padding: "6px 7px", textAlign: i ? "right" : "left", fontSize: 10.5, color: C.muted, borderBottom: `1px solid ${C.hair}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}</tr></thead>
                  <tbody>
                    {tb.rows.map((r, ri) => (
                      <tr key={ri} style={ri === tb.hi ? { background: "#F5E9FA" } : undefined}>
                        {r.map((c, ci) => (
                          <td key={ci} style={{ padding: "6px 7px", textAlign: ci ? "right" : "left", color: ri === tb.hi ? C.tier : C.ink2, fontWeight: ri === tb.hi ? 700 : 400, borderBottom: `1px solid ${C.hair}`, lineHeight: 1.5 }}>
                            <RichText v={c} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {tb.note && <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.7, marginTop: 7 }}><RichText v={tb.note} /></div>}
            </div>
          )}
          <FigRadar spec={s.v} />
        </div>
      );
    }
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
