import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import COLUMN_DATA from "./columnData.json";

/* ===================================================================
   機種評価（旧「稼働タブ＞診断」＋「分析タブ＞機種評価」を統合）

   2026-08-20、同じ「この台は何週生きるか」の予測と答え合わせが2箇所にあり、
   12件の編集部評価のうち10件は診断の対象機種と重複していたため1つにまとめた。
     ・本体 = 2週診断（直近約26週に導入された全機種・SIS実データから機械的に仕分け）
     ・編集部予測がある機種にはカード内に併記（予測週・答え合わせ）
     ・SISパネルに無い機種（パチンコ等）は末尾に別枠で出す
   稼働タブは生データ（日次・週次・貢献週）に専念する。
   =================================================================== */

const SUCCESS_WEEKS = 13; // 2週予測の合格ライン。確定台の上位25%相当

/* タブを離れるとコンポーネントが外れるため、そのままだと戻るたびに取り直して待たされる。
   週次データは1日1回しか変わらないので、モジュール変数に持って同じセッション内では再利用する
   （リロードすれば消える＝古いまま貼りつくことはない）。 */
let CACHE = null;

/* 機種名の正規化。編集部評価(columnData)とSISの機種名は表記が違うので突合に使う。
   部分一致だけに頼ると別機種を掴むため、候補が1件に絞れたときしか採用しない。 */
function normName(s) {
  return (s || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/^(lb|l|p|e)?\s*(スマスロ|スロット|パチスロ|スマート沖スロ)?\s*/, "")
    .replace(/[\s　・－\-—ー〜~！!：:]/g, "");
}

export default function MachineReviewTab({ onOpenMachine }) {
  const [weeklyData, setWeeklyData] = useState([]);
  const [nationalDaily, setNationalDaily] = useState({});
  const [machineStats, setMachineStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [oldMachines, setOldMachines] = useState(new Set());
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    let alive = true;
    if (CACHE) { // 2回目以降は即表示
      setMachineStats(CACHE.stats);
      setNationalDaily(CACHE.nat);
      setOldMachines(CACHE.old);
      setWeeklyData(CACHE.rows);
      setLoading(false);
      return () => { alive = false; };
    }
    (async () => {
      /* 【取得を直近26週に絞る理由】
         2週診断は「直近約26週に導入された機種」しか対象にしないので、全期間（約12,600行を
         1,000件ずつ13回）を取る必要がない。全期間取得だと読み込みが体感で長すぎたため、
         次の形に変えた（実データで検証: 対象33機種は全期間取得と完全に一致・13回→5回）。
           ① 最新週を1行だけ取る（カットオフの起点）
           ② 以下を並列で取る
              ・直近26週の週次データ（約3,200行＝4ページ）… 診断の計算に使う本体
              ・カットオフ直前8週に存在した機種名だけ（約900行＝1ページ）… 旧台を除くため
              ・全国平均アウト（カットオフ以降のみ）… 稼働値の分母
              ・公式の稼働貢献週
         「カットオフ以降にしか行が無い機種＝新台」なので、旧台を除くには
         カットオフより前に行があるかを知れば足りる。全履歴を見る代わりに直前8週の帯で判定する
         （8週まるごと欠けて後から復活する機種は実データでは1件も無かった）。 */
      const PAGE = 1000, RECENT_PAGES = 6; // 現在4ページ。増えても拾えるよう余裕を持たせる
      const lastRes = await supabase.from("sis_weekly_data")
        .select("week_start").order("week_start", { ascending: false }).limit(1);
      if (!alive) return;
      const latest = lastRes.data?.[0]?.week_start;
      if (!latest) { setLoading(false); return; }
      const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const ld = new Date(latest + "T00:00:00");
      const cutD = new Date(ld); cutD.setDate(ld.getDate() - 182);
      const bandD = new Date(cutD); bandD.setDate(cutD.getDate() - 56);
      const natD = new Date(cutD); natD.setDate(cutD.getDate() - 7);
      const cutoff = fmt(cutD), band = fmt(bandD), natFrom = fmt(natD);

      const jobs = [
        supabase.from("sis_machine_stats").select("machine,contrib_weeks"),
        supabase.from("sis_national_daily").select("date,avg_in").gte("date", natFrom),
        // 帯は現在約900行で1ページに収まるが、1,000行上限に当たると旧台を取りこぼして
        // 新台と誤判定するため2ページ分取り、それでも埋まっていたら下で追加取得する
        supabase.from("sis_weekly_data").select("machine")
          .gte("week_start", band).lt("week_start", cutoff)
          .order("week_start", { ascending: true }).range(0, PAGE - 1),
        supabase.from("sis_weekly_data").select("machine")
          .gte("week_start", band).lt("week_start", cutoff)
          .order("week_start", { ascending: true }).range(PAGE, PAGE * 2 - 1),
      ];
      for (let p = 0; p < RECENT_PAGES; p++) {
        jobs.push(supabase.from("sis_weekly_data")
          .select("machine,week_start,out_coins,avg_machine_count")
          .gte("week_start", cutoff)
          .order("week_start", { ascending: true })
          .range(p * PAGE, (p + 1) * PAGE - 1));
      }
      const res = await Promise.all(jobs);
      if (!alive) return;

      const m = {};
      (res[0].data || []).forEach(r => { m[r.machine.replace(/\s/g, "")] = r.contrib_weeks; });
      setMachineStats(m);
      const nd = {};
      (res[1].data || []).forEach(r => { nd[r.date] = r; });
      setNationalDaily(nd);
      // カットオフ前に存在した機種＝旧台。診断から除く
      let bandRows = (res[2].data || []).concat(res[3].data || []);
      if ((res[3].data || []).length === PAGE) {
        // 2ページ目まで埋まっている＝まだ続きがある。取りこぼすと誤判定になるので追う
        for (let p = 2; p < 12; p++) {
          const { data } = await supabase.from("sis_weekly_data").select("machine")
            .gte("week_start", band).lt("week_start", cutoff)
            .order("week_start", { ascending: true }).range(p * PAGE, (p + 1) * PAGE - 1);
          if (!data || !data.length) break;
          bandRows = bandRows.concat(data);
          if (data.length < PAGE) break;
        }
        if (!alive) return;
      }
      const oldSet = new Set(bandRows.map(r => r.machine));
      setOldMachines(oldSet);
      let rows = [];
      for (let i = 4; i < res.length; i++) rows = rows.concat(res[i].data || []);
      setWeeklyData(rows);
      CACHE = { stats: m, nat: nd, old: oldSet, rows };
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  /* 稼働値の分母＝その週の全国平均アウト（実値）。
     全国実値が取れない週は載せない（自前計算で代替しない＝稼働値は「—」になる） */
  const weekMarketBase = useMemo(() => {
    const out = {};
    if (!weeklyData.length || !Object.keys(nationalDaily).length) return out;
    new Set(weeklyData.map(r => r.week_start)).forEach(w => {
      const mon = new Date(w + "T00:00:00");
      const vals = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(mon); d.setDate(mon.getDate() + i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const v = nationalDaily[key]?.avg_in;
        if (v != null) vals.push(v);
      }
      if (vals.length) out[w] = vals.reduce((s, v) => s + v, 0) / vals.length;
    });
    return out;
  }, [weeklyData, nationalDaily]);

  /* 2週診断: 各機種の「2週持続率(2週÷初週アウト)×2週稼働値」で仕分ける。
     台数/IPは入口で、持続率と需要が生死を決めるという分析に基づく早期診断。直近約26週導入のみ。 */
  const diagnosis = useMemo(() => {
    if (!weeklyData.length) return [];
    const byM = {};
    let latest = "";
    weeklyData.forEach(r => {
      (byM[r.machine] = byM[r.machine] || []).push(r);
      if (r.week_start > latest) latest = r.week_start;
    });
    const wkMed = weekMarketBase;
    const latestD = new Date(latest + "T00:00:00");
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const recent = new Date(latestD); recent.setDate(latestD.getDate() - 21);
    const recentS = fmt(recent);
    const rows = [];
    Object.entries(byM).forEach(([machine, arr]) => {
      arr.sort((a, b) => a.week_start.localeCompare(b.week_start));
      const first = arr[0];
      // 取得を直近26週に絞ってあるので、ここでは「カットオフ前にも行があった機種＝旧台」を除く
      if (oldMachines.has(machine)) return;
      const w1 = first.out_coins, w2 = arr[1] && arr[1].out_coins, w4 = arr[3] && arr[3].out_coins, w8 = arr[7] && arr[7].out_coins;
      const c1 = first.avg_machine_count, cLast = arr[arr.length - 1].avg_machine_count;
      const peakC = arr.reduce((m, r) => Math.max(m, r.avg_machine_count || 0), 0);
      const base1 = wkMed[first.week_start], base2 = arr[1] && wkMed[arr[1].week_start];
      const lastR = arr[arr.length - 1];
      const baseLast = wkMed[lastR.week_start];
      rows.push({
        machine,
        firstWeek: first.week_start,
        weeksCount: arr.length,
        katsudo1: (w1 && base1) ? Math.round(w1 / base1 * 100) : null,
        katsudo2: (w2 && base2) ? Math.round(w2 / base2 * 100) : null,
        // 直近週の絶対稼働値。答え合わせに必須（持続率だけで採点すると、初週が高すぎた台が
        // 健全でも「外れ」になる）
        katsudoLast: (lastR.out_coins && baseLast) ? Math.round(lastR.out_coins / baseLast * 100) : null,
        ret2: (w1 && w2) ? Math.round(w2 / w1 * 100) : null,
        ret4: (w1 && w4) ? Math.round(w4 / w1 * 100) : null,
        ret8: (w1 && w8) ? Math.round(w8 / w1 * 100) : null,
        c1, cLast, peakC,
        cgrow: (c1 && cLast) ? Math.round((cLast / c1 - 1) * 100) : null,
        contrib: machineStats[machine.replace(/\s/g, "")] ?? null,
        // 貢献週はもう増えないか？ 直近4週すべて稼働値100%以下なら以後は増えない＝確定。
        // データが途切れている(撤去)場合も確定。設置終了だけを条件にすると死に台が数十週放置される
        contribDone: (() => {
          if (arr[arr.length - 1].week_start < recentS) return true;
          const tail = arr.slice(-4)
            .map(r => (r.out_coins && wkMed[r.week_start]) ? r.out_coins / wkMed[r.week_start] * 100 : null)
            .filter(v => v != null);
          return tail.length > 0 && !tail.some(v => v > 100);
        })(),
      });
    });
    rows.sort((a, b) => b.firstWeek.localeCompare(a.firstWeek));
    return rows;
  }, [weeklyData, machineStats, weekMarketBase, oldMachines]);

  /* 編集部評価(columnData)を機種名で診断に紐付ける。候補が1件に絞れたときだけ採用する */
  const editorialBy = useMemo(() => {
    const map = {};
    const dn = diagnosis.map(d => ({ key: normName(d.machine), machine: d.machine }));
    (COLUMN_DATA.columns || []).forEach(col => {
      const n = normName(col.name);
      let hit = dn.find(x => x.key === n);
      if (!hit) {
        const cands = dn.filter(x => x.key && (x.key.includes(n) || n.includes(x.key)) && Math.min(x.key.length, n.length) >= 5);
        if (cands.length === 1) hit = cands[0];
      }
      if (hit) map[hit.machine] = col;
    });
    return map;
  }, [diagnosis]);

  // SISの診断に紐付かなかった編集部評価（パチンコ等）は落とさず末尾に出す
  const editorialOnly = useMemo(() => {
    const used = new Set(Object.values(editorialBy).map(c => c.name));
    return (COLUMN_DATA.columns || []).filter(c => !used.has(c.name));
  }, [editorialBy]);

  const card = { background: "#fff", borderRadius: 12, padding: "10px 12px", boxShadow: "2px 2px 6px #C5C9D4,-2px -2px 6px #fff" };

  function EditorialRow({ col }) {
    const o = col.sisOutcome || {};
    const v = o.verdict;
    return (
      <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed #eee" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 10 }}>
          <span style={{ fontWeight: 700, color: "#1565C0", background: "#E9F1FB", borderRadius: 5, padding: "2px 7px" }}>
            編集部予測 {col.longevityMin === col.longevityMax ? `${col.longevityMin}週` : `${col.longevityMin}〜${col.longevityMax}週`}
          </span>
          {v === "hit" && (
            <span style={{ fontWeight: 700, color: "#1f7a4d", background: "#E8F5E9", borderRadius: 5, padding: "2px 7px" }}>
              ✓ 的中（実績{o.contribWeeks}週）
            </span>
          )}
          {v === "miss" && (
            <span style={{ fontWeight: 700, color: "#C62828", background: "#FDECEA", borderRadius: 5, padding: "2px 7px" }}>
              ✗ 外れ（実績{o.contribWeeks}週・{o.diff > 0 ? "+" : ""}{o.diff}週）
            </span>
          )}
          {!v && o.status === "継続中" && (
            <span style={{ color: "#888" }}>…継続中のため採点待ち</span>
          )}
        </div>
        {col.tag && <div style={{ marginTop: 4, fontSize: 10.5, color: "#777" }}>{col.tag}</div>}
      </div>
    );
  }

  if (loading) return <div style={{ textAlign: "center", color: "#aaa", padding: "2rem" }}>読み込み中...</div>;

  return (
    <div>
      <div style={{ ...card, fontSize: 11, color: "#888", marginBottom: 8, lineHeight: 1.6 }}>
        <b style={{ color: "#D85A30" }}>機種評価</b>：<b>2週時点だけで仕分けを確定</b>する。8週まで待てば誰でも分かる＝情報価値が無いため、早く言い切ることを優先。直近約26週に導入・導入日順。<b>編集部予測がある機種はカード内に併記</b>する。
        <button onClick={() => setShowHelp(v => !v)}
          style={{ marginLeft: 6, border: "none", background: "#fff", boxShadow: "2px 2px 5px #C8CED8,-2px -2px 5px #fff", color: "#D85A30", fontSize: 10.5, borderRadius: 7, padding: "3px 9px", cursor: "pointer" }}>
          {showHelp ? "基準を閉じる" : "仕分け基準と精度"}
        </button>
        {showHelp && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed #ddd" }}>
            ・<b>稼働値</b>（アウト÷<b>その週の全国平均アウト＝実値</b>）＝人気・絶対需要。<b>2週</b>の値を使う（r=+0.55。初週はr=+0.36）。<b>100%超＝全国平均超え＝稼働貢献週が増える状態</b>。<br />
            ・<b>持続率</b>（◯週目÷初週アウト）＝定着・減衰。2週持続率（r=+0.46）。<br />
            ・<b>傾き</b>＝2週稼働値−初週稼働値（r=+0.23）。超優良の条件にのみ使う。<br />
            <b>仕分け基準（2週で確定）</b>：<b>超優良</b>=持続率≥92% かつ 稼働値≥200% かつ 傾き≥−40／<b>優良</b>=持続率≥89% かつ 稼働値≥200%／<b>優良(定着型)</b>=持続率≥100% かつ 稼働値≥140%（<b>需要</b>下限の免除）／<b>優秀(需要型)</b>=持続率≥83% かつ 稼働値≥220%（<b>持続率</b>下限の免除）／<b>危険</b>=持続率&lt;73% または 稼働値&lt;170%／残りが<b>注意</b>。<br />
            ・<b>2つの拾い上げ枠</b>：<b>定着型</b>＝需要は小さいが客が離れない台（持続率100%超＝2週目のアウトが初週以上）。<b>需要型</b>＝持続率は平凡でも需要が突出して強い台。稼働値140%/220%の下限はリノヘブン型（稼働値25%→2週）の混入を防ぐために置いている。<br />
            <b>実測精度</b>（貢献週が確定した<b>178機種</b>でバックテスト。導入日で古い124件＝学習／新しい54件＝検証）：<b>学習 的中79%・捕獲84% / 検証 的中79%・捕獲79% / 短命混入(貢献6週以下)は両方0%</b>。階層別の当たり率は 超優良19件<b>100%</b>（貢献週 平均37.7）・優良18件67%・定着型3件67%・需要型8件62%・注意64件12%・<b>危険66件0%</b>。<br />
            ・<b>採点定義（探索前に固定）</b>：母集団=貢献週が確定した機種／当たり台=貢献週&gt;13／短命=貢献週≤6／的中率=上位判定のうち当たり台の割合／捕獲率=当たり台のうち上位判定の割合。<b>短命混入0%を必須条件にし、その中で的中と捕獲のF1が最大の組を採用</b>。<br />
            ・<b>✓/…/✗マーク</b>＝2週予測の答え合わせ。<b>成果変数である稼働貢献週で採点する</b>（持続率は予測の"入力"なので採点には使わない）。貢献週が成功ライン13週を超えたら<b>✓的中</b>／まだ稼働値100%超で貢献週が増える余地があれば<b>…判定保留</b>／平均を割ったまま13週以下で終わったら<b>✗外れ</b>。<br />
            ・<b>⚠供給過剰</b>＝大量導入(ピーク≥6台)なのに振るわない。割数(出玉率)・コイン単価・台数初動は寿命と無関係のため<b>非採用</b>。
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {diagnosis.length === 0 && <div style={{ textAlign: "center", color: "#aaa", padding: "2rem" }}>データなし</div>}
        {diagnosis.map(d => {
          const k1 = d.katsudo1, k2 = d.katsudo2;
          const slope = (k1 != null && k2 != null) ? k2 - k1 : null;
          const viaRetention = d.ret2 != null && k2 != null && d.ret2 >= 100 && k2 >= 140;
          const g = (d.ret2 == null || k2 == null)
            ? { l: "計測中", c: "#999", bg: "#ECECEC" }
            : (d.ret2 >= 92 && k2 >= 200 && (slope == null || slope >= -40)) ? { l: "超優良", c: "#7B1FA2", bg: "#F5E9FA", top: true }
            : (d.ret2 >= 89 && k2 >= 200) ? { l: "優良", c: "#1f9d4d", bg: "#E3F5E9", top: true }
            : viaRetention ? { l: "優良(定着型)", c: "#1f9d4d", bg: "#E3F5E9", top: true, retention: true }
            : (d.ret2 >= 83 && k2 >= 220) ? { l: "優秀(需要型)", c: "#5B9E6F", bg: "#EFF7F1", top: true, demand: true }
            : (d.ret2 < 73 || k2 < 170) ? { l: "危険", c: "#D03030", bg: "#FCE4E4" }
            : { l: "注意", c: "#C77B00", bg: "#FFF3DC" };
          const verdict = !g.top || d.contrib == null ? null
            : d.contrib > SUCCESS_WEEKS ? "hit"
            : (d.katsudoLast != null && d.katsudoLast > 100) ? "pending"
            : "miss";
          const oversupply = d.peakC >= 6 && (g.l.indexOf("危険") >= 0 || g.l.indexOf("注意") >= 0);
          const col = editorialBy[d.machine];
          return (
            <div key={d.machine} style={card}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div onClick={() => onOpenMachine && onOpenMachine(d.machine)}
                  style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: "#1A56B0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: onOpenMachine ? "pointer" : "default", textDecoration: onOpenMachine ? "underline" : "none", textDecorationColor: "rgba(26,86,176,0.3)", textUnderlineOffset: 2 }}>{d.machine}</div>
                <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: g.c, background: g.bg, borderRadius: 6, padding: "2px 8px" }}>{g.l}</span>
              </div>
              {/* 上段2つ(色付き)＝仕分けを決めた2週時点の軸。下段2つ(灰)＝後から届く答え合わせ用。 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "2px 8px" }}>
                <div><div style={{ color: "#bbb", fontSize: 9, marginBottom: 1 }}>稼働値 初週→2週</div><div style={{ fontWeight: 700, color: g.c, fontSize: 12, whiteSpace: "nowrap" }}>{k1 != null ? k1 : "—"}<span style={{ color: "#ccc" }}>→</span>{k2 != null ? k2 + "%" : "—"}</div></div>
                <div><div style={{ color: "#bbb", fontSize: 9, marginBottom: 1 }}>2週持続率</div><div style={{ fontWeight: 700, color: g.c, fontSize: 12 }}>{d.ret2 != null ? d.ret2 + "%" : "—"}</div></div>
                <div><div style={{ color: "#bbb", fontSize: 9, marginBottom: 1 }}>初月(4週)</div><div style={{ fontWeight: 600, color: "#888", fontSize: 12 }}>{d.ret4 != null ? d.ret4 + "%" : "—"}</div></div>
                <div><div style={{ color: "#bbb", fontSize: 9, marginBottom: 1 }}>8週持続</div><div style={{ fontWeight: 600, color: "#888", fontSize: 12 }}>{d.ret8 != null ? d.ret8 + "%" : "—"}</div></div>
              </div>
              <div style={{ marginTop: 5, fontSize: 10, color: "#999" }}>
                <span>台数 {d.c1 != null ? d.c1.toFixed(1) : "—"}→{d.cLast != null ? d.cLast.toFixed(1) : "—"}{d.cgrow != null ? ` (${d.cgrow > 0 ? "+" : ""}${d.cgrow}%)` : ""}</span>
                <span style={{ color: "#ccc" }}> ・ </span>
                <span style={{ fontWeight: 700, color: "#2a7ae8" }}>稼働貢献{d.contrib != null ? d.contrib + "週" : "—"}</span>
                <span style={{ color: "#ccc" }}> ・ </span>
                <span><b style={{ color: "#666" }}>{d.firstWeek}</b> 導入 → <b style={{ color: "#666" }}>{d.weeksCount}週目</b></span>
              </div>
              <div style={{ marginTop: 5, display: "flex", gap: 5, flexWrap: "wrap" }}>
                {d.contribDone
                  ? <span style={{ fontSize: 9, fontWeight: 700, color: "#777", background: "#ECECEC", borderRadius: 5, padding: "2px 7px" }}>■ 稼働貢献 終了（{d.contrib != null ? d.contrib + "週で確定" : "確定"}）</span>
                  : <span style={{ fontSize: 9, fontWeight: 700, color: "#1f7a4d", background: "#E6F5EC", borderRadius: 5, padding: "2px 7px" }}>▶ 稼働貢献 継続中{d.katsudoLast != null ? `（稼働値${d.katsudoLast}%）` : ""}</span>}
                {d.weeksCount >= 2
                  ? <span style={{ fontSize: 9, fontWeight: 700, color: "#7B1FA2", background: "#F5E9FA", borderRadius: 5, padding: "2px 7px" }}>■ 予測 確定済（2週到達・以降変更なし）</span>
                  : <span style={{ fontSize: 9, fontWeight: 700, color: "#C77B00", background: "#FFF3DC", borderRadius: 5, padding: "2px 7px" }}>▶ 予測 期間中（あと{2 - d.weeksCount}週で確定）</span>}
              </div>
              {oversupply && <div style={{ marginTop: 6, fontSize: 10, color: "#C77B00", background: "#FFF8EC", borderRadius: 6, padding: "3px 8px" }}>⚠ 大量導入(ピーク{d.peakC.toFixed(1)}台)なのに振るわない＝供給過剰の疑い</div>}
              {g.retention && <div style={{ marginTop: 6, fontSize: 10, color: "#1f7a4d", background: "#F0FAF3", borderRadius: 6, padding: "3px 8px" }}>▲ 定着型で拾い上げ: 稼働値{k2}%は需要下限(200%)未満だが2週持続率{d.ret2}%（＝2週目に客が増えた）ため上位判定</div>}
              {g.demand && <div style={{ marginTop: 6, fontSize: 10, color: "#3d7a5c", background: "#F0FAF3", borderRadius: 6, padding: "3px 8px" }}>▲ 需要型で拾い上げ: 2週持続率{d.ret2}%は優良の下限(89%)未満だが稼働値{k2}%（＝全国平均の{Math.round(k2 / 100 * 10) / 10}倍の需要）のため上位判定</div>}
              {verdict === "hit" && <div style={{ marginTop: 6, fontSize: 10, color: "#1f9d4d", background: "#F0FAF3", borderRadius: 6, padding: "3px 8px" }}>✓ 2週予測が的中: 稼働貢献{d.contrib}週で成功ライン(13週)超え</div>}
              {verdict === "pending" && <div style={{ marginTop: 6, fontSize: 10, color: "#2a7ae8", background: "#EEF4FD", borderRadius: 6, padding: "3px 8px" }}>… 判定保留: 貢献{d.contrib}週だが直近稼働値{d.katsudoLast}%で市場平均超え＝まだ伸びる</div>}
              {verdict === "miss" && <div style={{ marginTop: 6, fontSize: 10, color: "#D03030", background: "#FDF0F0", borderRadius: 6, padding: "3px 8px" }}>✗ 2週予測が外れ: 貢献{d.contrib}週で終了(稼働値{d.katsudoLast != null ? d.katsudoLast + "%" : "—"}＝平均割れ)</div>}
              {col && <EditorialRow col={col} />}
            </div>
          );
        })}
      </div>

      {editorialOnly.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>
            編集部評価のみ（SISのスロット週次パネルに無い機種）
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {editorialOnly.map(col => (
              <div key={col.id || col.name} style={card}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#333", marginBottom: 2 }}>{col.name}</div>
                <EditorialRow col={col} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 10.5, color: "#aaa", textAlign: "right" }}>
        編集部評価の更新: {COLUMN_DATA.updatedAt}
      </div>
    </div>
  );
}
