import React, { useState, useRef, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import MACHINE_ANALYSIS from "./machineAnalysis.json";
import COLUMN_DATA from "./columnData.json";
import EDITORIAL_DATA from "./editorialColumns.json";
import GAME_LIBRARY from "./gameDesignLibrary.json";
import MACHINE_LIBRARY from "./machineLibrary.json";
import ProposeTab from "./ProposeTab";
import ChatTab from "./ChatTab";
import GameDesignTab from "./GameDesignTab";
import ColumnFeedback from "./ColumnFeedback";
import AdminChat from "./AdminChat";

const CATS = {
  new:     { label:"新台",     bg:"#FFF3E0", color:"#BF360C", border:"#FF8A65" },
  info:    { label:"機種情報", bg:"#E6F1FB", color:"#185FA5", border:"#85B7EB" },
  jissen:  { label:"実戦",     bg:"#EEEDFE", color:"#3C3489", border:"#AFA9EC" },
  hall:    { label:"業界",     bg:"#F0F4E8", color:"#4A6B1A", border:"#A0C050" },
  episode: { label:"名機",     bg:"#FFF0F5", color:"#A0306A", border:"#F0A0C0" },
};
const SRC_COLORS = {
  twitter:      { bg:"#E6F1FB", color:"#185FA5" },
  youtube:      { bg:"#FCEBEB", color:"#A32D2D" },
  wiki:         { bg:"#F1EFE8", color:"#5F5E5A" },
  manual:       { bg:"#F3F3F3", color:"#555555" },
  ちょんぼりすた: { bg:"#FFF4E5", color:"#9A5C00" },
  WebSearch:    { bg:"#E8F5E9", color:"#2E7D32" },
  ウェブ検索:    { bg:"#E8F5E9", color:"#2E7D32" },
  マニュアル:    { bg:"#EEEDFE", color:"#3C3489" },
};
const ENG_DEFS = {
  twitter: [{key:"tw_likes",icon:"♥",label:"いいね"},{key:"tw_rt",icon:"↺",label:"RT"}],
  youtube: [{key:"yt_views",icon:"▶",label:"再生"},{key:"yt_likes",icon:"♥",label:"高評価"},{key:"yt_comments",icon:"◎",label:"コメント"}],
  wiki:    [{key:"wk_views",icon:"◈",label:"閲覧"}],
  manual:  [],
};
const AUTO_AUTHORS = [
  "編集部AI", "スロ好き編集マン", "スロキー編集部", "パチスロ記者", "編集長補佐",
  "ライター見習い", "スロ専門編集", "深夜のスロライター", "編集部のマニア",
];
function randomAuthor() { return AUTO_AUTHORS[Math.floor(Math.random() * AUTO_AUTHORS.length)]; }

const AUTO_THEMES = [
  "最近話題のパチスロ機種の演出や名言",
  "パチスロ北斗の拳シリーズの名シーン",
  "バジリスク絆2の攻略情報や感動エピソード",
  "ミリオンゴッドシリーズの伝説的な出来事",
  "人気パチスロの面白い思い出エピソード",
];
function getOrCreateUID() {
  let uid = localStorage.getItem("slotkey_uid");
  if (!uid) { uid = crypto.randomUUID(); localStorage.setItem("slotkey_uid", uid); }
  return uid;
}
const MY_UID = getOrCreateUID();
const MY_NAME = localStorage.getItem("slotkey_name") || "ゲスト";

function fmtNum(n) {
  if (!n && n !== 0) return null;
  const v = parseInt(n, 10);
  if (isNaN(v)) return null;
  if (v >= 10000) return (v / 10000).toFixed(1).replace(/\.0$/, "") + "万";
  if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return v.toLocaleString();
}
function normalizeName(s) {
  return s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/　/g, " ").trim();
}
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({length: m+1}, (_, i) => Array.from({length: n+1}, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = a[i-1] === b[j-1] ? d[i-1][j-1] : 1 + Math.min(d[i-1][j], d[i][j-1], d[i-1][j-1]);
  return d[m][n];
}

function relativeTime(ts) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}日前`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m}ヶ月前`;
  return `${Math.floor(m / 12)}年前`;
}

const TEMPLATES = {
  new:     "導入前後の新台情報・スペック速報など",
  info:    "天井・ゾーン・設定判別・解析情報など",
  jissen:  "実戦報告・演出・体験談・評判など",
  hall:    "ホール・メーカー・業界の話題",
  episode: "4号機・5号機の思い出・名機の特徴など",
};

function blank() {
  return { likes: [], bookmarks: [], comments: [], bads: [] };
}
function toggleArr(arr, uid) {
  if (arr.indexOf(uid) >= 0) return arr.filter(u => u !== uid);
  return [...arr, uid];
}

function CatBadge({ cat }) {
  const c = CATS[cat];
  if (!c) return null;
  return <span style={{fontSize:13,padding:"2px 8px",borderRadius:6,background:"#E8ECF0",boxShadow:`inset 2px 2px 4px #C5C9D4, inset -1px -1px 3px #FFFFFF, inset 0 0 0 1.5px ${c.border}`,color:c.color,fontWeight:600,whiteSpace:"nowrap"}}>{c.label}</span>;
}
function SrcBadge({ src }) {
  if (!src || src === "manual" || src === "マニュアル" || src === "手動") return null;
  const c = SRC_COLORS[src] || { bg:"#F1EFE8", color:"#5F5E5A" };
  const lbl = src==="twitter"?"X":src==="youtube"?"YT":src==="wiki"?"W":src==="ちょんぼりすた"?"ちょんぼ":(src==="WebSearch"||src==="ウェブ検索")?"検索":src;
  return <span style={{fontSize:13,padding:"2px 6px",borderRadius:6,background:c.bg,color:c.color,fontWeight:500}}>{lbl}</span>;
}
const QUALITY_CONF = {
  1: { color:"#9CA3AF", bg:"#F3F4F6", label:"情報Lv.1" },
  2: { color:"#2563EB", bg:"#EFF6FF", label:"情報Lv.2" },
  3: { color:"#DC2626", bg:"#FEF2F2", label:"情報Lv.3" },
};
function QualityBadge({ q }) {
  const level = q >= 5 ? 3 : q >= 4 ? 2 : 1;
  const c = QUALITY_CONF[level];
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:2,padding:"2px 7px",borderRadius:6,background:c.bg,border:`0.5px solid ${c.color}`,fontSize:13,flexShrink:0,whiteSpace:"nowrap"}}>
      <span style={{color:c.color,letterSpacing:1}}>{"★".repeat(level)}{"☆".repeat(3-level)}</span>
      <span style={{color:c.color,fontWeight:500}}>{c.label}</span>
    </span>
  );
}

function Logo({ size = 84 }) {
  return (
    <img src="/logo.png" alt="SLOKEY" height={size} style={{display:"block",objectFit:"contain"}}/>
  );
}

const VAPID_PUBLIC_KEY = "BLS4xYWrSHveQD3kkFS6hyGWbxSds9u5nschDHtkXgWK7pcw5zDmeMHKkHDuwzzOcC-h3CigylDQHdH9pkyJVY4";

function b64urlToUint8(b64) {
  const b64std = b64.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64std);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

async function registerPush(userName) {
  if (!("serviceWorker" in navigator)) { alert("このブラウザはService Workerに対応していません"); return null; }
  if (!("PushManager" in window)) { alert("このブラウザはPush通知に対応していません"); return null; }
  if (!("Notification" in window)) { alert("このブラウザはNotificationに対応していません"); return null; }
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return null;
    const existing = await reg.pushManager.getSubscription();
    if (existing) return existing;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: b64urlToUint8(VAPID_PUBLIC_KEY),
    });
    const { endpoint, keys } = sub.toJSON();
    await supabase.from("push_subscriptions").upsert({
      endpoint, p256dh: keys.p256dh, auth: keys.auth, user_name: userName,
    }, { onConflict: "endpoint" });
    return sub;
  } catch (e) {
    console.error("Push registration failed:", e);
    return null;
  }
}

async function unregisterPush() {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

function lookupAnalysis(machineName) {
  if (!machineName) return null;
  if (MACHINE_ANALYSIS[machineName]) return MACHINE_ANALYSIS[machineName];
  for (const [key, val] of Object.entries(MACHINE_ANALYSIS)) {
    if ((val.aliases || []).includes(machineName)) return val;
  }
  return null;
}

function MachineListTab({ posts, onGoToFeed, favMachines = [], toggleFavMachine }) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("posts");
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [selected, setSelected] = useState(null);
  const [sisStats, setSisStats] = useState({});
  const sheetRef = React.useRef(null);
  React.useEffect(() => { sheetRef.current?.scrollTo(0,0); }, [selected]);
  React.useEffect(() => {
    supabase.from("sis_machine_stats").select("machine,contrib_weeks").then(({ data }) => {
      if (!data) return;
      const m = {};
      data.forEach(s => { m[s.machine.replace(/\s/g, "")] = s.contrib_weeks; });
      setSisStats(m);
    });
  }, []);
  function getSisWeeks(name) { return sisStats[name.replace(/\s/g, "")] ?? null; }

  const machines = useMemo(() => {
    const m = {};
    posts.filter(p => p.machine && !p.machine.includes("全般")).forEach(p => {
      if (!m[p.machine]) m[p.machine] = { name: p.machine, count: 0, likes: 0, cats: {} };
      m[p.machine].count++;
      m[p.machine].likes += (p.internal?.likes?.length || 0);
      m[p.machine].cats[p.cat] = (m[p.machine].cats[p.cat] || 0) + 1;
    });
    return Object.values(m);
  }, [posts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return machines
      .filter(m => (!q || m.name.toLowerCase().includes(q)) && (!showFavOnly || favMachines.includes(m.name)))
      .sort((a, b) => sortBy === "likes" ? b.likes - a.likes : b.count - a.count);
  }, [machines, query, sortBy, showFavOnly, favMachines]);

  const selPosts = useMemo(() =>
    selected ? posts.filter(p => p.machine === selected).sort((a,b) => (b.internal?.likes?.length||0)-(a.internal?.likes?.length||0)) : []
  , [posts, selected]);

  const selAnalysis = useMemo(() => selected ? lookupAnalysis(selected) : null, [selected]);

  return (
    <div style={{minWidth:0}}>
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:198}}/>
          <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:199,background:"#E8ECF0",borderRadius:"20px 20px 0 0",maxHeight:"92vh",display:"flex",flexDirection:"column",maxWidth:740,margin:"0 auto"}}>
            <div style={{padding:"12px 16px 0",flexShrink:0}}>
              <div style={{width:40,height:4,background:"#C5C9D4",borderRadius:2,margin:"0 auto 14px"}}/>
              <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:10}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:18,fontWeight:700,color:"#333"}}>{selected}</div>
                  <div style={{display:"flex",gap:10,marginTop:2,flexWrap:"wrap"}}>
                    {selAnalysis?.releaseDate && (
                      <div style={{fontSize:12,color:"#888"}}>導入日: {selAnalysis.releaseDate}</div>
                    )}
                    {(() => { const w = getSisWeeks(selected); return w != null ? <div style={{fontSize:12,color:"#1A56B0",fontWeight:600}}>稼働 {w}週</div> : null; })()}
                  </div>
                  <div style={{fontSize:13,color:"#aaa",marginTop:1}}>{selPosts.length}件の投稿</div>
                </div>
                <button onClick={() => { onGoToFeed(selected); setSelected(null); }} style={{padding:"6px 14px",background:"#D85A30",color:"#fff",border:"none",borderRadius:20,fontSize:13,cursor:"pointer",fontWeight:600,flexShrink:0}}>フィードで見る</button>
                <button onClick={() => setSelected(null)} style={{background:"none",border:"none",fontSize:22,color:"#bbb",cursor:"pointer",padding:"0 4px",lineHeight:1,flexShrink:0}}>×</button>
              </div>
            </div>
            <div ref={sheetRef} style={{overflowY:"auto",padding:"0 16px 40px",flex:1}}>

              {/* 機種分析カード */}
              {selAnalysis && (
                <div style={{background:"#fff",borderRadius:14,padding:"14px 16px",marginBottom:14,border:"0.5px solid #E0E4E8"}}>
                  {selAnalysis.spec && (
                    <div style={{fontSize:11,color:"#888",marginBottom:10,lineHeight:1.5,borderBottom:"1px solid #F0F0F0",paddingBottom:8}}>{selAnalysis.spec}</div>
                  )}
                  {selAnalysis.summary && (
                    <div style={{fontSize:14,fontWeight:700,color:"#333",marginBottom:8}}>{selAnalysis.summary}</div>
                  )}
                  {selAnalysis.highlight && (
                    <div style={{fontSize:13,color:"#555",lineHeight:1.7,marginBottom:10}}>{selAnalysis.highlight}</div>
                  )}
                  {selAnalysis.pros?.length > 0 && (
                    <div style={{marginBottom:8}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#2E7D32",marginBottom:4}}>良い点</div>
                      {selAnalysis.pros.map((p, i) => (
                        <div key={i} style={{fontSize:12,color:"#444",lineHeight:1.6,paddingLeft:10,borderLeft:"2px solid #A0C050",marginBottom:5}}>{p}</div>
                      ))}
                    </div>
                  )}
                  {selAnalysis.cons?.length > 0 && (
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:"#B71C1C",marginBottom:4}}>気になる点</div>
                      {selAnalysis.cons.map((c, i) => (
                        <div key={i} style={{fontSize:12,color:"#444",lineHeight:1.6,paddingLeft:10,borderLeft:"2px solid #EF9A9A",marginBottom:5}}>{c}</div>
                      ))}
                    </div>
                  )}
                  {selAnalysis.updatedAt && (
                    <div style={{fontSize:11,color:"#bbb",marginTop:8,textAlign:"right"}}>分析更新: {selAnalysis.updatedAt}</div>
                  )}
                </div>
              )}

              {selPosts.map(p => (
                <div key={p.id} style={{background:"#fff",borderRadius:12,padding:"12px 14px",marginBottom:10,border:"0.5px solid #eee"}}>
                  <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:6}}>
                    <CatBadge cat={p.cat}/>
                    {AUTO_AUTHORS.includes(p.internal?.author||p.author) ? <QualityBadge q={p.quality||1}/> : null}
                    <span style={{marginLeft:"auto",fontSize:13,color:"#D85A30",fontWeight:500,flexShrink:0}}>♥ {p.internal?.likes?.length||0}</span>
                  </div>
                  <div style={{fontSize:15,fontWeight:600,color:"#333",marginBottom:4,overflowWrap:"anywhere"}}>{p.title}</div>
                  <div style={{fontSize:14,color:"#666",lineHeight:1.65,overflowWrap:"anywhere"}}>{p.body}</div>
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:5,marginTop:8,fontSize:13,color:"#185FA5",textDecoration:"none",overflow:"hidden"}}>
                      <span style={{flexShrink:0}}>🔗</span>
                      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.url}</span>
                    </a>
                  )}
                </div>
              ))}
              {selPosts.length === 0 && <div style={{textAlign:"center",color:"#aaa",padding:"32px 0"}}>投稿がありません</div>}
            </div>
          </div>
        </>
      )}

      <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
        <div style={{position:"relative",flex:1}}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="機種名で絞り込み..." style={{width:"100%",fontSize:16,padding:"8px 30px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",boxSizing:"border-box"}}/>
          <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:15,color:"#aaa",pointerEvents:"none"}}>⌕</span>
          {query && <button onClick={() => setQuery("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#aaa",padding:0}}>×</button>}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{fontSize:14,padding:"8px 6px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",color:"#666",flexShrink:0}}>
          <option value="posts">投稿数順</option>
          <option value="likes">いいね順</option>
        </select>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:10}}>
        <button onClick={() => setShowFavOnly(v => !v)} style={{padding:"5px 12px",border:"none",borderRadius:10,fontSize:13,background:"#E8ECF0",color:showFavOnly?"#E8B000":"#999",cursor:"pointer",fontWeight:showFavOnly?700:400,boxShadow:showFavOnly?"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF":"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF",whiteSpace:"nowrap"}}>
          ★ 注目台{favMachines.length > 0 ? ` (${favMachines.length})` : ""}
        </button>
      </div>

      <div style={{fontSize:13,color:"#aaa",marginBottom:8}}>{filtered.length}機種</div>

      {filtered.map(m => {
        const isFav = favMachines.includes(m.name);
        const sisW = getSisWeeks(m.name);
        return (
        <div key={m.name} style={{background:"#E8ECF0",boxShadow:"5px 5px 10px #C5C9D4, -5px -5px 10px #FFFFFF",borderRadius:14,padding:"12px 14px",marginBottom:10,cursor:"pointer",transition:"box-shadow 0.15s"}} onClick={() => setSelected(m.name)}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <div style={{flex:1,fontWeight:600,fontSize:15,color:"#333",overflowWrap:"anywhere"}}>{m.name}</div>
            {sisW != null && <span style={{fontSize:11,color:"#1A56B0",fontWeight:600,flexShrink:0,background:"rgba(26,86,176,0.08)",padding:"2px 7px",borderRadius:6}}>{sisW}週</span>}
            <button onClick={e => { e.stopPropagation(); toggleFavMachine(m.name); }} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:isFav?"#E8B000":"#ccc",padding:"0 2px",lineHeight:1,flexShrink:0}}>{isFav?"★":"☆"}</button>
            <div style={{fontSize:13,color:"#888",flexShrink:0,textAlign:"right"}}>
              <span>{m.count}件</span>
              {m.likes > 0 && <span style={{marginLeft:6,color:"#D85A30"}}>♥ {m.likes}</span>}
            </div>
          </div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {Object.entries(m.cats).sort((a,b)=>b[1]-a[1]).map(([cat, cnt]) => {
              const c = CATS[cat];
              if (!c) return null;
              return <span key={cat} style={{fontSize:11,padding:"2px 7px",borderRadius:6,background:c.bg,color:c.color,border:`1px solid ${c.border}`,fontWeight:600,whiteSpace:"nowrap"}}>{c.label} {cnt}</span>;
            })}
          </div>
        </div>
        );
      })}
    </div>
  );
}

function AdminLoginForm({ title = "管理者ログイン", desc = "社内専用エリアです" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErr("メールアドレスまたはパスワードが違います");
    setBusy(false);
  }
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"48px 24px"}}>
      <div style={{fontSize:32,marginBottom:12}}>🔒</div>
      <div style={{fontSize:18,fontWeight:700,marginBottom:6,color:"#333"}}>{title}</div>
      <div style={{fontSize:13,color:"#888",marginBottom:24,textAlign:"center"}}>{desc}</div>
      <form onSubmit={handleSubmit} style={{width:"100%",maxWidth:300}}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="メールアドレス"
          autoFocus
          style={{width:"100%",padding:"11px 14px",border:"1.5px solid #ddd",borderRadius:10,fontSize:16,boxSizing:"border-box",marginBottom:8,outline:"none"}}
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="パスワード"
          style={{width:"100%",padding:"11px 14px",border:`1.5px solid ${err?"#E53935":"#ddd"}`,borderRadius:10,fontSize:16,boxSizing:"border-box",marginBottom:8,outline:"none"}}
        />
        {err && <div style={{color:"#E53935",fontSize:13,marginBottom:8}}>{err}</div>}
        <button type="submit" disabled={busy} style={{width:"100%",padding:"11px 0",background:"#D85A30",color:"#fff",border:"none",borderRadius:10,fontSize:16,fontWeight:700,cursor:"pointer",opacity:busy?0.7:1}}>
          {busy ? "..." : "ログイン"}
        </button>
      </form>
    </div>
  );
}

function SisTab({ adminUser }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dates, setDates] = useState([]);
  const [dateIdx, setDateIdx] = useState(0);
  const [sortKey, setSortKey] = useState("out_coins");
  const [sortAsc, setSortAsc] = useState(false);
  const [machineStats, setMachineStats] = useState({});
  const [provMachines, setProvMachines] = useState(new Set());
  const [lastWeekStart, setLastWeekStart] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [sisView, _setSisView] = useState(() => sessionStorage.getItem("slokey_sisView") || "daily");
  const setSisView = (v) => { sessionStorage.setItem("slokey_sisView", v); _setSisView(v); };
  const [dateRange, setDateRange] = useState("1m");
  const [weekIdx, setWeekIdx] = useState(0);
  const swipeTouchX = useRef(null);
  const swipeTouchY = useRef(null);
  const swipeDir = useRef(null);
  const [animKey, setAnimKey] = useState(0);
  const [animClass, setAnimClass] = useState("");
  const [swipeDx, setSwipeDx] = useState(0);

  function handleSwipeStart(e) {
    swipeTouchX.current = e.touches[0].clientX;
    swipeTouchY.current = e.touches[0].clientY;
    swipeDir.current = null;
    setSwipeDx(0);
  }
  function handleSwipeMove(e) {
    if (swipeTouchX.current == null) return;
    const dx = e.touches[0].clientX - swipeTouchX.current;
    const dy = e.touches[0].clientY - swipeTouchY.current;
    if (!swipeDir.current && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      swipeDir.current = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
    }
    if (swipeDir.current === "x") setSwipeDx(dx);
  }
  function handleSwipeEnd(e) {
    if (swipeTouchX.current == null) return;
    const dx = e.changedTouches[0].clientX - swipeTouchX.current;
    swipeTouchX.current = null;
    swipeTouchY.current = null;
    swipeDir.current = null;
    setSwipeDx(0);
    if (Math.abs(dx) < 50) return;
    const dir = dx < 0 ? "left" : "right";
    setAnimClass(`sis-slide-${dir}`);
    setAnimKey(k => k + 1);
    if (sisView === "daily") {
      if (dx < 0) setDateIdx(i => Math.max(i - 1, 0));
      else setDateIdx(i => Math.min(i + 1, dates.length - 1));
    } else {
      if (dx < 0) setWeekIdx(i => Math.max(i - 1, 0));
      else setWeekIdx(i => Math.min(i + 1, weeks.length - 1));
    }
  }

  useEffect(() => {
    if (!adminUser) return;
    setLoading(true);
    const cutoff = new Date();
    if (dateRange === "3m") cutoff.setMonth(cutoff.getMonth() - 3);
    else if (dateRange === "6m") cutoff.setMonth(cutoff.getMonth() - 6);
    else if (dateRange === "1m") cutoff.setMonth(cutoff.getMonth() - 1);
    const cutoffStr = dateRange === "all" ? null : cutoff.toISOString().slice(0, 10);
    const PAGE = 1000;
    async function fetchSisData() {
      let allRows = [];
      let page = 0;
      while (true) {
        let q = supabase
          .from("sis_data")
          .select("machine,date,out_coins,coin_price,payout_rate,gross_profit,operation_ratio,machine_count")
          .order("date", { ascending: false })
          .range(page * PAGE, (page + 1) * PAGE - 1);
        if (cutoffStr) q = q.gte("date", cutoffStr);
        const { data } = await q;
        if (!data || data.length === 0) break;
        allRows = allRows.concat(data);
        if (data.length < PAGE) break;
        page++;
        if (allRows.length >= 30000) break;
      }
      return allRows;
    }
    Promise.all([
      fetchSisData(),
      supabase.from("sis_machine_stats").select("machine,contrib_weeks,last_week_start"),
    ]).then(([data, { data: stats }]) => {
      if (data) {
        setRows(data);
        const ds = [...new Set(data.map(r => r.date))].sort().reverse();
        setDates(ds);
        setDateIdx(0);
        setWeekIdx(0);
        if (data.length > 0) {
          const latestDate = data.reduce((a, b) => a.date > b.date ? a : b).date;
          const latestDt = new Date(latestDate + "T00:00:00");
          const today = new Date(); today.setHours(0,0,0,0);
          const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
          if (latestDt >= monday) {
            setProvMachines(new Set(data.filter(r => r.date === latestDate).map(r => r.machine.replace(/\s/g,""))));
          } else {
            setProvMachines(new Set());
          }
        }
      }
      if (stats) {
        const m = {};
        stats.forEach(s => {
          if (s.machine === "__config__") {
            if (s.last_week_start) setLastWeekStart(s.last_week_start);
          } else {
            m[s.machine.replace(/\s/g, "")] = s.contrib_weeks;
          }
        });
        setMachineStats(m);
      }
      setLoading(false);
    });
  }, [adminUser, dateRange]);

  useEffect(() => {
    if (!adminUser) return;
    async function fetchWeeklyData() {
      let all = [], page = 0;
      const PAGE = 1000;
      while (true) {
        const { data } = await supabase
          .from("sis_weekly_data")
          .select("machine,week_start,out_coins,gross_profit,payout_rate,coin_price,avg_machine_count")
          .order("week_start", { ascending: false })
          .range(page * PAGE, (page + 1) * PAGE - 1);
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < PAGE) break;
        page++;
      }
      setWeeklyData(all);
    }
    fetchWeeklyData();
  }, [adminUser]);

  // Hooks must be called before any early returns
  const weeks = useMemo(() => {
    const wkMap = {};
    weeklyData.forEach(r => {
      const key = r.week_start;
      if (!wkMap[key]) wkMap[key] = { key, machines: {} };
      wkMap[key].machines[r.machine] = {
        out: r.out_coins,
        profit: r.gross_profit,
        payout_rate: r.payout_rate,
        coin_price: r.coin_price,
      };
    });
    const today = new Date(); today.setHours(0,0,0,0);
    return Object.values(wkMap).filter(w => {
      const mon = new Date(w.key + "T00:00:00");
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      if (sun >= today) return false;
      if (lastWeekStart && w.key > lastWeekStart) return false;
      return true;
    }).sort((a,b) => b.key.localeCompare(a.key));
  }, [weeklyData, lastWeekStart]);

  const machineWeeks = useMemo(() => {
    const map = {};
    weeklyData.forEach(r => {
      const mk = r.machine.replace(/\s/g, "");
      if (!map[mk]) map[mk] = new Set();
      map[mk].add(r.week_start);
    });
    return map;
  }, [weeklyData]);

  if (!adminUser) {
    return <AdminLoginForm title="稼働データ" desc="社内専用。管理者ログインが必要です。" />;
  }

  if (loading) return <div style={{textAlign:"center",padding:"2rem",color:"#888"}}>読み込み中...</div>;

  const selDate = dates[dateIdx] || null;
  const dayRows = rows.filter(r => r.date === selDate);
  const _todayMon = new Date(); _todayMon.setHours(0,0,0,0); _todayMon.setDate(_todayMon.getDate() - ((_todayMon.getDay() + 6) % 7));
  const currentWeekKey = `${_todayMon.getFullYear()}-${String(_todayMon.getMonth()+1).padStart(2,"0")}-${String(_todayMon.getDate()).padStart(2,"0")}`;


  function avg(arr, key) {
    const valid = arr.filter(r => r[key] != null);
    if (!valid.length) return null;
    return valid.reduce((s, r) => s + r[key], 0) / valid.length;
  }
  const avgOp = avg(dayRows, "operation_ratio");
  const avgRate = avg(dayRows, "payout_rate");
  const totalProfit = dayRows.reduce((s, r) => s + (r.gross_profit || 0), 0);
  const totalOut = dayRows.reduce((s, r) => s + (r.out_coins || 0), 0);

  function sortVal(r) {
    if (sortKey === "gross_profit") return r.gross_profit == null ? Infinity : r.gross_profit;
    return r[sortKey] == null ? (sortAsc ? Infinity : -Infinity) : r[sortKey];
  }
  const ranked = [...dayRows].sort((a, b) => sortAsc ? sortVal(a) - sortVal(b) : sortVal(b) - sortVal(a));

  function fmtNum(n) { return n == null ? "—" : n.toLocaleString(); }
  function fmtRate(n) { return n == null ? "—" : n.toFixed(1) + "%"; }
  function fmtProfitShort(n) {
    if (n == null) return "—";
    const s = n < 0 ? "▲" : "▼";
    const a = Math.abs(n);
    return s + Math.round(a);
  }
  function rateColor(n) {
    if (n == null) return "#888";
    if (n >= 110) return "#2a9d3f";
    if (n >= 100) return "#5a9d6f";
    if (n >= 90) return "#bf8c00";
    return "#E53935";
  }
  function fmtDateLabel(d) {
    if (!d) return "";
    const dt = new Date(d + "T00:00:00");
    const w = ["日","月","火","水","木","金","土"][dt.getDay()];
    return `${dt.getMonth()+1}/${dt.getDate()}（${w}）`;
  }
  function opBadge(val) {
    if (val == null || avgOp == null) return null;
    const diff = val - avgOp;
    if (Math.abs(diff) < 0.5) return null;
    const up = diff > 0;
    return (
      <span style={{fontSize:10,fontWeight:700,color:up?"#2a9d3f":"#E53935",background:up?"#e8f5e9":"#fdecea",borderRadius:4,padding:"1px 4px",marginLeft:4,whiteSpace:"nowrap"}}>
        {up ? "▲" : "▼"}{Math.abs(diff).toFixed(1)}%
      </span>
    );
  }

  const SORT_OPTS = [
    {k:"out_coins",   label:"IN枚数"},
    {k:"payout_rate", label:"出玉率"},
    {k:"gross_profit",label:"粗利"},
  ];

  function handleSort(k) {
    if (sortKey === k) setSortAsc(a => !a);
    else { setSortKey(k); setSortAsc(false); }
  }

  const selWeek = weeks[weekIdx] || null;
  const weekRows = selWeek ? Object.entries(selWeek.machines).map(([machine, v]) => ({
    machine,
    out_coins: v.out != null ? Math.round(v.out) : null,
    gross_profit: v.profit != null ? Math.round(v.profit) : null,
    payout_rate: v.payout_rate,
    coin_price: v.coin_price,
  })) : [];

  function fmtWeekLabel(key) {
    if (!key) return "";
    const mon = new Date(key + "T00:00:00");
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return `${mon.getMonth()+1}/${mon.getDate()}〜${sun.getMonth()+1}/${sun.getDate()}`;
  }

  const wkSortedRows = [...weekRows].sort((a,b) => {
    if (sortKey === "gross_profit") return sortAsc ? a.gross_profit - b.gross_profit : b.gross_profit - a.gross_profit;
    const av = a[sortKey] ?? (sortAsc ? Infinity : -Infinity);
    const bv = b[sortKey] ?? (sortAsc ? Infinity : -Infinity);
    return sortAsc ? av - bv : bv - av;
  });

  const wkAvgProfit = weekRows.length ? weekRows.reduce((s,r)=>s+(r.gross_profit||0),0)/weekRows.length : null;
  const wkAvgRate = weekRows.length ? weekRows.filter(r=>r.payout_rate!=null).reduce((s,r)=>s+r.payout_rate,0) / weekRows.filter(r=>r.payout_rate!=null).length : null;

  return (
    <div onTouchStart={handleSwipeStart} onTouchMove={handleSwipeMove} onTouchEnd={handleSwipeEnd} style={{position:"relative",touchAction:"pan-y"}}>
      {/* スワイプ中ピークラベル */}
      {swipeDx !== 0 && sisView === "daily" && (() => {
        const peekOpacity = Math.min(1, Math.abs(swipeDx) / 80);
        const prevDate = dates[dateIdx + 1];
        const nextDate = dates[dateIdx - 1];
        return <>
          {swipeDx > 20 && prevDate && (
            <div style={{position:"absolute",left:8,top:"50%",transform:`translateY(-50%) translateX(${Math.min(0, swipeDx - 80)}px)`,opacity:peekOpacity,zIndex:10,background:"#fff",borderRadius:10,padding:"6px 10px",boxShadow:"2px 2px 8px rgba(0,0,0,0.15)",pointerEvents:"none",textAlign:"center"}}>
              <div style={{fontSize:12,color:"#aaa"}}>前の日</div>
              <div style={{fontSize:13,fontWeight:700,color:"#333"}}>{fmtDateLabel(prevDate)}</div>
              <div style={{fontSize:11,color:"#888"}}>{rows.filter(r=>r.date===prevDate).length}機種</div>
            </div>
          )}
          {swipeDx < -20 && nextDate && (
            <div style={{position:"absolute",right:8,top:"50%",transform:`translateY(-50%) translateX(${Math.max(0, swipeDx + 80)}px)`,opacity:peekOpacity,zIndex:10,background:"#fff",borderRadius:10,padding:"6px 10px",boxShadow:"2px 2px 8px rgba(0,0,0,0.15)",pointerEvents:"none",textAlign:"center"}}>
              <div style={{fontSize:12,color:"#aaa"}}>次の日</div>
              <div style={{fontSize:13,fontWeight:700,color:"#333"}}>{fmtDateLabel(nextDate)}</div>
              <div style={{fontSize:11,color:"#888"}}>{rows.filter(r=>r.date===nextDate).length}機種</div>
            </div>
          )}
        </>;
      })()}
      {swipeDx !== 0 && sisView === "weekly" && (() => {
        const peekOpacity = Math.min(1, Math.abs(swipeDx) / 80);
        const prevWeek = weeks[weekIdx + 1];
        const nextWeek = weeks[weekIdx - 1];
        return <>
          {swipeDx > 20 && prevWeek && (
            <div style={{position:"absolute",left:8,top:"50%",transform:`translateY(-50%) translateX(${Math.min(0, swipeDx - 80)}px)`,opacity:peekOpacity,zIndex:10,background:"#fff",borderRadius:10,padding:"6px 10px",boxShadow:"2px 2px 8px rgba(0,0,0,0.15)",pointerEvents:"none",textAlign:"center"}}>
              <div style={{fontSize:12,color:"#aaa"}}>前の週</div>
              <div style={{fontSize:12,fontWeight:700,color:"#333"}}>{fmtWeekLabel(prevWeek.key)}</div>
            </div>
          )}
          {swipeDx < -20 && nextWeek && (
            <div style={{position:"absolute",right:8,top:"50%",transform:`translateY(-50%) translateX(${Math.max(0, swipeDx + 80)}px)`,opacity:peekOpacity,zIndex:10,background:"#fff",borderRadius:10,padding:"6px 10px",boxShadow:"2px 2px 8px rgba(0,0,0,0.15)",pointerEvents:"none",textAlign:"center"}}>
              <div style={{fontSize:12,color:"#aaa"}}>次の週</div>
              <div style={{fontSize:12,fontWeight:700,color:"#333"}}>{fmtWeekLabel(nextWeek.key)}</div>
            </div>
          )}
        </>;
      })()}
      {/* デイリー/ウィークリー サブタブ + 期間フィルター */}
      <div style={{position:"sticky",top:52,zIndex:15,background:"#E8ECF0",paddingBottom:6}}>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {[{k:"daily",l:"デイリー"},{k:"weekly",l:"ウィークリー"}].map(({k,l}) => {
            const on = sisView === k;
            return <button key={k} onClick={() => setSisView(k)} style={{flex:1,padding:"8px 0",border:"none",borderRadius:10,fontSize:14,fontWeight:on?700:500,background:on?"#D85A30":"#E8ECF0",color:on?"#fff":"#888",cursor:"pointer",boxShadow:on?"inset 2px 2px 5px rgba(0,0,0,0.2)":"2px 2px 5px #C5C9D4,-2px -2px 5px #fff"}}>{l}</button>;
          })}
          <div style={{display:"flex",gap:3,background:"#E8ECF0",borderRadius:10,padding:3,boxShadow:"inset 2px 2px 4px #C5C9D4,inset -2px -2px 4px #fff",flexShrink:0}}>
            {[{k:"1m",l:"1ヶ月"},{k:"3m",l:"3ヶ月"},{k:"6m",l:"6ヶ月"},{k:"all",l:"全期間"}].map(({k,l}) => {
              const on = dateRange === k;
              return <button key={k} onClick={() => setDateRange(k)} style={{padding:"5px 10px",border:"none",borderRadius:8,fontSize:12,fontWeight:on?700:400,background:on?"#fff":"transparent",color:on?"#D85A30":"#aaa",cursor:"pointer",boxShadow:on?"1px 1px 3px #C5C9D4":"none",transition:"all 0.15s"}}>{l}</button>;
            })}
          </div>
        </div>
      </div>

      {sisView === "daily" && <>
        <div style={{position:"sticky",top:96,zIndex:14,background:"#E8ECF0",paddingBottom:6}}>
          {/* 日付ナビ */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,background:"#fff",borderRadius:10,padding:"6px 10px",boxShadow:"2px 2px 6px #C5C9D4,-2px -2px 6px #fff"}}>
          <button onClick={() => setDateIdx(i => Math.min(i+1, dates.length-1))} disabled={dateIdx >= dates.length-1}
            style={{border:"none",background:"none",fontSize:20,cursor:"pointer",color:dateIdx>=dates.length-1?"#ccc":"#555",padding:"0 6px"}}>‹</button>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:15,fontWeight:700,color:"#333"}}>{fmtDateLabel(selDate)}</span>
            <span style={{fontSize:11,color:"#aaa"}}>{dayRows.length}機種</span>
          </div>
          <button onClick={() => setDateIdx(i => Math.max(i-1, 0))} disabled={dateIdx <= 0}
            style={{border:"none",background:"none",fontSize:20,cursor:"pointer",color:dateIdx<=0?"#ccc":"#555",padding:"0 6px"}}>›</button>
        </div>
        {dayRows.length > 0 && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5,marginBottom:6}}>
            {[
              {label:"平均IN",   val: dayRows.length ? Math.round(totalOut/dayRows.length).toLocaleString() : "—", color:"#444"},
              {label:"平均出玉率", val: avgRate != null ? avgRate.toFixed(1)+"%" : "—", color: avgRate != null ? rateColor(avgRate) : "#888"},
              {label:"平均粗利",   val: dayRows.length ? (totalProfit/dayRows.length<0?"▲":"▼")+" ¥"+Math.abs(Math.round(totalProfit/dayRows.length)) : "—", color: totalProfit/dayRows.length < 0 ? "#2a9d3f" : "#E53935"},
            ].map(s => (
              <div key={s.label} style={{background:"#fff",borderRadius:8,padding:"3px 4px",boxShadow:"2px 2px 5px #C5C9D4,-2px -2px 5px #fff",textAlign:"center"}}>
                <div style={{fontSize:8,color:"#aaa",marginBottom:0}}>{s.label}</div>
                <div style={{fontSize:11,fontWeight:700,color:s.color,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.val}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{display:"flex",gap:6}}>
          {SORT_OPTS.map(o => { const on = sortKey === o.k; return (
            <button key={o.k} onClick={() => handleSort(o.k)} style={{flex:1,padding:"6px 0",border:"none",borderRadius:8,fontSize:12,fontWeight:on?700:500,background:on?"#D85A30":"#E8ECF0",color:on?"#fff":"#888",cursor:"pointer",boxShadow:on?"inset 2px 2px 4px rgba(0,0,0,0.2)":"2px 2px 4px #C5C9D4,-2px -2px 4px #fff"}}>
              {o.label}{on ? (sortAsc ? " ↑" : " ↓") : ""}
            </button>
          );})}
        </div>
      </div>
      <div style={{overflow:"hidden"}}>
        <div key={animKey} className={animClass} style={{transform:`translateX(${swipeDx * 0.5}px)`,transition:swipeDx===0?"transform 0.2s ease-out":"none",marginTop:8}}>
          {ranked.length === 0 && <div style={{textAlign:"center",color:"#aaa",padding:"2rem"}}>データなし</div>}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {ranked.map((r, idx) => {
            const profit = r.gross_profit;
            const profitColor = profit == null ? "#888" : profit < 0 ? "#2a9d3f" : "#E53935";
            const profitLabel = profit == null ? "—" : (profit < 0 ? "▲" : "▼") + " ¥" + Math.abs(profit).toLocaleString();
            return (
              <div key={r.machine} style={{background:"#fff",borderRadius:12,padding:"10px 12px",boxShadow:"2px 2px 6px #C5C9D4,-2px -2px 6px #fff",display:"flex",alignItems:"flex-start",gap:10}}>
                <div style={{minWidth:24,fontWeight:700,fontSize:14,color:idx<3?"#D85A30":"#bbb",paddingTop:2}}>{idx+1}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:6}}>
                    <span style={{fontSize:13,fontWeight:700,color:"#333",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,minWidth:0}}>{r.machine}</span>
                    {r.machine_count != null && <span style={{fontSize:10,color:"#aaa",whiteSpace:"nowrap",flexShrink:0}}>{r.machine_count}台</span>}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"2px 8px"}}>
                    <div><div style={{color:"#bbb",fontSize:9,marginBottom:1}}>IN枚数</div><div style={{fontWeight:600,color:"#444",fontSize:11}}>{fmtNum(r.out_coins)}</div></div>
                    <div><div style={{color:"#bbb",fontSize:9,marginBottom:1}}>出玉率</div><div style={{fontWeight:700,color:rateColor(r.payout_rate),fontSize:11}}>{fmtRate(r.payout_rate)}</div></div>
                    <div><div style={{color:"#bbb",fontSize:9,marginBottom:1}}>粗利</div><div style={{fontWeight:600,color:profitColor,fontSize:11}}>{fmtProfitShort(r.gross_profit)}</div></div>
                    <div><div style={{color:"#bbb",fontSize:9,marginBottom:1}}>単価</div><div style={{fontWeight:600,color:"#555",fontSize:11}}>{r.coin_price != null ? r.coin_price.toFixed(2)+"円" : "—"}</div></div>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>
      </>}

      {sisView === "weekly" && <>
        <div style={{position:"sticky",top:96,zIndex:14,background:"#E8ECF0",paddingBottom:6}}>
          {/* 週ナビ */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,background:"#fff",borderRadius:10,padding:"6px 10px",boxShadow:"2px 2px 6px #C5C9D4,-2px -2px 6px #fff"}}>
            <button onClick={() => setWeekIdx(i => Math.min(i+1, weeks.length-1))} disabled={weekIdx >= weeks.length-1}
              style={{border:"none",background:"none",fontSize:20,cursor:"pointer",color:weekIdx>=weeks.length-1?"#ccc":"#555",padding:"0 6px"}}>‹</button>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:14,fontWeight:700,color:"#333"}}>{fmtWeekLabel(selWeek?.key)}</span>
              <span style={{fontSize:11,color:"#aaa"}}>{weekRows.length}機種</span>
            </div>
            <button onClick={() => setWeekIdx(i => Math.max(i-1, 0))} disabled={weekIdx <= 0}
              style={{border:"none",background:"none",fontSize:20,cursor:"pointer",color:weekIdx<=0?"#ccc":"#555",padding:"0 6px"}}>›</button>
          </div>
          {weekRows.length > 0 && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5,marginBottom:6}}>
              {[
                {label:"平均IN",    val: weekRows.length ? Math.round(weekRows.reduce((s,r)=>s+(r.out_coins||0),0)/weekRows.length).toLocaleString() : "—", color:"#444"},
                {label:"平均出玉率", val: wkAvgRate != null ? wkAvgRate.toFixed(1)+"%" : "—", color: wkAvgRate != null ? rateColor(wkAvgRate) : "#888"},
                {label:"平均粗利",   val: wkAvgProfit != null ? (wkAvgProfit < 0 ? "▲" : "▼")+" ¥"+Math.abs(Math.round(wkAvgProfit)) : "—", color: wkAvgProfit != null ? (wkAvgProfit < 0 ? "#2a9d3f" : "#E53935") : "#888"},
              ].map(s => (
                <div key={s.label} style={{background:"#fff",borderRadius:8,padding:"3px 4px",boxShadow:"2px 2px 5px #C5C9D4,-2px -2px 5px #fff",textAlign:"center"}}>
                  <div style={{fontSize:8,color:"#aaa",marginBottom:0}}>{s.label}</div>
                  <div style={{fontSize:11,fontWeight:700,color:s.color,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.val}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{display:"flex",gap:6}}>
            {SORT_OPTS.map(o => { const on = sortKey === o.k; return (
              <button key={o.k} onClick={() => handleSort(o.k)} style={{flex:1,padding:"6px 0",border:"none",borderRadius:8,fontSize:12,fontWeight:on?700:500,background:on?"#D85A30":"#E8ECF0",color:on?"#fff":"#888",cursor:"pointer",boxShadow:on?"inset 2px 2px 4px rgba(0,0,0,0.2)":"2px 2px 4px #C5C9D4,-2px -2px 4px #fff"}}>
                {o.label}{on ? (sortAsc ? " ↑" : " ↓") : ""}
              </button>
            );})}
          </div>
        </div>
        <div style={{overflow:"hidden"}}>
          <div key={`w${animKey}`} className={animClass} style={{transform:`translateX(${swipeDx * 0.5}px)`,transition:swipeDx===0?"transform 0.2s ease-out":"none",marginTop:8}}>
            {wkSortedRows.length === 0 && <div style={{textAlign:"center",color:"#aaa",padding:"2rem"}}>データなし</div>}
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {wkSortedRows.map((r, idx) => {
                const profit = r.gross_profit;
                const profitColor = profit == null ? "#888" : profit < 0 ? "#2a9d3f" : "#E53935";
                const profitLabel = profit == null ? "—" : (profit < 0 ? "▲" : "▼") + " ¥" + Math.abs(profit).toLocaleString();
                return (
                  <div key={r.machine} style={{background:"#fff",borderRadius:12,padding:"10px 12px",boxShadow:"2px 2px 6px #C5C9D4,-2px -2px 6px #fff",display:"flex",alignItems:"flex-start",gap:10}}>
                    <div style={{minWidth:24,fontWeight:700,fontSize:14,color:idx<3?"#D85A30":"#bbb",paddingTop:2}}>{idx+1}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#333",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:6}}>{r.machine}</div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"2px 8px"}}>
                        <div><div style={{color:"#bbb",fontSize:9,marginBottom:1}}>平均IN</div><div style={{fontWeight:600,color:"#444",fontSize:11}}>{fmtNum(r.out_coins)}</div></div>
                        <div><div style={{color:"#bbb",fontSize:9,marginBottom:1}}>出玉率</div><div style={{fontWeight:700,color:rateColor(r.payout_rate),fontSize:11}}>{fmtRate(r.payout_rate)}</div></div>
                        <div><div style={{color:"#bbb",fontSize:9,marginBottom:1}}>平均粗利</div><div style={{fontWeight:600,color:profitColor,fontSize:11}}>{fmtProfitShort(r.gross_profit)}</div></div>
                        <div><div style={{color:"#bbb",fontSize:9,marginBottom:1}}>単価</div><div style={{fontWeight:600,color:"#555",fontSize:11}}>{r.coin_price != null ? r.coin_price.toFixed(2)+"円" : "—"}</div></div>
                        <div style={{whiteSpace:"nowrap"}}><div style={{color:"#bbb",fontSize:9,marginBottom:1}}>貢献週</div><div style={{fontWeight:700,color:(()=>{ const mk=r.machine.replace(/\s/g,""); const total=machineStats[mk]; const isProv=selWeek.key===currentWeekKey&&provMachines.has(mk); if(total==null&&!isProv) return "#ccc"; const wkKeys=weeks.map(w=>w.key); const selIdx=wkKeys.indexOf(selWeek.key); const after=selIdx>0?wkKeys.slice(0,selIdx).filter(k=>{const w=weeks.find(x=>x.key===k);return w&&w.machines[r.machine];}).length:0; return ((total||0)-after+(isProv?1:0))>0?"#2a7ae8":"#ccc"; })(),fontSize:11}}>{(()=>{ const mk=r.machine.replace(/\s/g,""); const total=machineStats[mk]; const isProv=selWeek.key===currentWeekKey&&provMachines.has(mk); if(total==null&&!isProv) return "—"; const wkKeys=weeks.map(w=>w.key); const selIdx=wkKeys.indexOf(selWeek.key); const after=selIdx>0?wkKeys.slice(0,selIdx).filter(k=>{const w=weeks.find(x=>x.key===k);return w&&w.machines[r.machine];}).length:0; const cnt=(total||0)-after+(isProv?1:0); return cnt>0?cnt+"週"+(isProv?"（暫定）":""):"—"; })()}</div></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </>}

      <div style={{textAlign:"right",marginTop:16}}>
        <button onClick={() => supabase.auth.signOut()}
          style={{fontSize:12,color:"#aaa",background:"none",border:"none",cursor:"pointer",padding:"4px 0"}}>ログアウト</button>
      </div>
    </div>
  );
}

export default function App() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, _setTab] = useState(() => sessionStorage.getItem("slokey_tab") || "feed");
  const setTab = (t) => { sessionStorage.setItem("slokey_tab", t); _setTab(t); };
  const [feedFilter, setFeedFilter] = useState("all");
  const [toast, setToast] = useState("");
  const [aiEnabled, setAiEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [notifSettings, setNotifSettings] = useState({ enabled: true, maintenance_message: "", pending_count: 0, notify_threshold: 3 });
  const [showNotifAdmin, setShowNotifAdmin] = useState(false);
  const [showSites, setShowSites] = useState(false);
  const [directPost, setDirectPost] = useState(null);
  const [pullIndicator, setPullIndicator] = useState(0);
  const pullYRef = useRef(0);
  const touchStartYRef = useRef(0);
  const [showLanding, setShowLanding] = useState(() => !localStorage.getItem("slokey_visited"));
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showIOSSteps, setShowIOSSteps] = useState(false);
  const [showNotifDetail, setShowNotifDetail] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [fbCat, setFbCat] = useState("機能要望");
  const [fbName, setFbName] = useState(() => localStorage.getItem("slotkey_name") || "");
  const [fbBody, setFbBody] = useState("");
  const [fbSending, setFbSending] = useState(false);
  const [fbDone, setFbDone] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [showFbInbox, setShowFbInbox] = useState(false);
  const [adminInboxTab, setAdminInboxTab] = useState("feedback");
  const [favMachines, setFavMachines] = useState(() => JSON.parse(localStorage.getItem("slotkey_favs") || "[]"));
  function toggleFavMachine(machine) {
    setFavMachines(prev => {
      const next = prev.includes(machine) ? prev.filter(m => m !== machine) : [...prev, machine];
      localStorage.setItem("slotkey_favs", JSON.stringify(next));
      return next;
    });
  }
  const logoTapRef = useRef(0);
  const logoTapTimerRef = useRef(null);

  function goToFeedWithFilter(cat) { setFeedFilter(cat); setTab("feed"); }

  function handleLogoTap() {
    logoTapRef.current++;
    clearTimeout(logoTapTimerRef.current);
    logoTapTimerRef.current = setTimeout(() => { logoTapRef.current = 0; }, 2000);
    if (logoTapRef.current >= 5) { logoTapRef.current = 0; setShowFbInbox(true); }
  }

  async function submitFeedback() {
    if (!fbBody.trim()) return;
    setFbSending(true);
    await addPost({
      cat: "feedback",
      machine: "",
      title: fbCat,
      body: fbBody.trim(),
      source: "manual",
      author: fbName.trim() || "匿名",
      internal: { ...blank(), author: fbName.trim() || "匿名", feedbackCat: fbCat, submitterUid: MY_UID },
    });
    setFbSending(false);
    setFbDone(true);
    setFbBody("");
  }
  const nextId = useRef(1000);

  useEffect(() => {
    const onTouchStart = e => {
      touchStartYRef.current = e.touches[0].clientY;
      pullYRef.current = 0;
    };
    const onTouchMove = e => {
      if (window.scrollY > 5) { pullYRef.current = 0; setPullIndicator(0); return; }
      const dy = e.touches[0].clientY - touchStartYRef.current;
      if (dy > 0) { pullYRef.current = Math.min(dy * 0.5, 64); setPullIndicator(pullYRef.current); }
    };
    const onTouchEnd = () => {
      if (pullYRef.current >= 55) { loadPosts(); setShowSites(false); setShowNotifAdmin(false); setShowLanding(false); }
      pullYRef.current = 0;
      setPullIndicator(0);
    };
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  useEffect(() => {
    const handler = e => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setAdminUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => setAdminUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadPosts();
    fetch("/api/health").then(r => r.json()).then(d => setAiEnabled(!!d.aiEnabled)).catch(() => setAiEnabled(false));
    // 現在の購読状態チェック
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.getRegistration("/sw.js").then(reg => {
        if (!reg) return;
        reg.pushManager.getSubscription().then(sub => setPushEnabled(!!sub));
      });
    }
    // 通知設定取得
    supabase.from("notification_settings").select("enabled,maintenance_message,pending_count,notify_threshold").eq("id", 1).single()
      .then(({ data }) => { if (data) setNotifSettings(data); });
  }, []);

  async function loadPosts() {
    setLoading(true);
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      const mapped = data.map(p => ({ ...p, internal: p.internal || blank(), eng: p.eng || {} }));
      setPosts(mapped);
      // ?post=ID で直リンクを処理
      const urlParam = new URLSearchParams(window.location.search).get("post");
      if (urlParam) {
        const target = mapped.find(p => String(p.id) === urlParam);
        if (target) { setTab("feed"); setFeedFilter("all"); setTimeout(() => setDirectPost(target), 100); }
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
    setLoading(false);
  }

  async function addPost(item) {
    const internal = { ...(item.internal || blank()), author: item.author || MY_NAME };
    const { data, error } = await supabase.from("posts").insert([{
      cat: item.cat,
      source: item.source,
      machine: item.machine,
      title: item.title,
      body: item.body,
      url: item.url || "",
      quality: item.quality || 3,
      dup_key: item.dupKey || "",
      eng: item.eng || {},
      internal,
      author: item.author || MY_NAME,
    }]).select().single();
    if (error) { console.error("addPost error:", error.message); return; }
    if (data) {
      setPosts(prev => [{ ...data, internal: data.internal || blank(), eng: data.eng || {} }, ...prev]);
      showToast("追加しました！");
      // 手動投稿のみEdge Functionに通知トリガーを送る
      if (item.source === "manual" || !item.source) {
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/super-api`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ record: data }),
        }).catch(() => {}); // Edge Function: super-api
      }
    }
  }

  async function updatePost(id, updates) {
    const { error } = await supabase.from("posts").update(updates).eq("id", id);
    if (!error) {
      setPosts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    }
  }

  async function deletePost(id) {
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (!error) {
      setPosts(prev => prev.filter(p => p.id !== id));
      showToast("削除しました");
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  const TABS = ["feed","collect","overview","research","sis"];
  const LABELS = { feed:"投稿", collect:"追加", overview:"まとめ", research:"分析", sis:"稼働" };
  const normalPosts = posts.filter(p => p.cat !== "feedback");
  const feedbackPosts = posts.filter(p => p.cat === "feedback");

  return (
    <div style={{padding:"16px",maxWidth:740,width:"100%",boxSizing:"border-box",margin:"0 auto",fontFamily:"sans-serif",textAlign:"left",background:"#E8ECF0",minHeight:"100svh"}}>
      {pullIndicator > 0 && (
        <div style={{position:"fixed",top:0,left:0,right:0,zIndex:300,display:"flex",justifyContent:"center",alignItems:"center",gap:6,padding:"10px 0",background:"#E8ECF0",boxShadow:"0 2px 8px rgba(0,0,0,0.08)",fontSize:13,color:pullIndicator>=55?"#2a9d3f":"#aaa",transition:"color 0.15s"}}>
          <span style={{display:"inline-block",transform:`rotate(${pullIndicator>=55?180:0}deg)`,transition:"transform 0.2s"}}>↓</span>
          {pullIndicator >= 55 ? "放して更新" : "引いて更新"}
        </div>
      )}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.6rem"}}>
        <div onClick={handleLogoTap} style={{cursor:"pointer"}}><Logo size={56}/></div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={() => setShowSites(v => !v)} title="おすすめサイト"
          style={{background:"#E8ECF0",border:"none",borderRadius:"50%",width:36,height:36,fontSize:17,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:showSites?"inset 2px 2px 5px #C5C9D4, inset -2px -2px 5px #FFFFFF":"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF",color:showSites?"#D85A30":"#aaa"}}>🔗</button>
          {/* 通知ベルボタン */}
          <button onClick={async () => {
            if (pushEnabled) {
              await unregisterPush();
              setPushEnabled(false);
              showToast("通知をオフにしました");
            } else {
              const sub = await registerPush(MY_NAME);
              if (sub) { setPushEnabled(true); showToast("通知をオンにしました"); }
              else showToast("通知の許可が必要です");
            }
          }} title={pushEnabled ? "通知ON（タップでオフ）" : "通知オフ（タップでオン）"}
          style={{background:"#E8ECF0",border:"none",borderRadius:"50%",width:36,height:36,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:pushEnabled?"inset 2px 2px 5px #C5C9D4, inset -2px -2px 5px #FFFFFF":"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF",color:pushEnabled?"#D85A30":"#aaa"}}>
            {pushEnabled ? "🔔" : "🔕"}
          </button>
          {/* 管理者：通知設定パネル開閉 */}
          <button onClick={() => setShowNotifAdmin(v => !v)} title="設定"
          style={{background:"#E8ECF0",border:"none",borderRadius:"50%",width:28,height:28,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:showNotifAdmin?"inset 2px 2px 5px #C5C9D4, inset -2px -2px 5px #FFFFFF":"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF",color:showNotifAdmin?"#D85A30":"#aaa"}}>⚙</button>
          <span style={{fontSize:12,color:"#D85A30",background:"#E8ECF0",boxShadow:"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF",borderRadius:20,padding:"5px 14px",fontWeight:600,letterSpacing:"0.2px"}}>{normalPosts.length}件</span>
        </div>
      </div>
      {showSites && (
        <div style={{background:"#E8ECF0",boxShadow:"inset 4px 4px 8px #C5C9D4, inset -4px -4px 8px #FFFFFF",borderRadius:14,padding:"12px 14px",marginBottom:10}}>
          {/* SNS上段 */}
          <div style={{fontSize:12,color:"#aaa",marginBottom:6,fontWeight:500}}>SNS</div>
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            {[
              {label:"𝕏 #スマスロ",  url:"https://x.com/search?q=%23スマスロ&f=live",       color:"#000"},
              {label:"▶ YouTube",    url:"https://www.youtube.com/results?search_query=スマスロ", color:"#FF0000"},
              {label:"♪ TikTok",    url:"https://www.tiktok.com/search?q=スマスロ",           color:"#010101"},
            ].map(({label,url,color}) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"9px 6px",borderRadius:10,background:"#E8ECF0",boxShadow:"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF",textDecoration:"none",color,fontSize:13,fontWeight:600,whiteSpace:"nowrap"}}>
                {label}
              </a>
            ))}
          </div>
          {/* サイト下段 */}
          <div style={{fontSize:12,color:"#aaa",marginBottom:6,fontWeight:500}}>サイト</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {[
              {label:"一撃",         url:"https://1geki.jp/"},
              {label:"DMMぱちタウン",url:"https://p-town.dmm.com/"},
              {label:"ちょんぼりすた",url:"https://chonborista.com"},
              {label:"スロ板RUSH",   url:"https://fiveslot777.com/"},
              {label:"パチ７",       url:"https://pachiseven.jp"},
              {label:"パチスロログ", url:"https://slotlog.net"},
              {label:"爆裂アンテナ", url:"https://pachisoku.com/"},
              {label:"P-WORLD",      url:"https://www.p-world.co.jp/"},
              {label:"ハズセ",       url:"https://hazuse.com/"},
              {label:"パチビー",     url:"https://www.pachibee.jp/"},
              {label:"パチンコビスタ",url:"https://www.pachinkovista.com/"},
              {label:"パチキュレーション",url:"https://pachinko-curation.com/"},
              {label:"2chまとめ",    url:"https://2chmatome.biz/pachisuro"},
              {label:"フルスロットル",url:"https://parlourfullslotl.com/"},
              {label:"みんスロ",     url:"https://minslo.com/"},
              {label:"すろぱちくえすと",url:"https://www.slopachi-quest.com/"},
              {label:"期待値見える化",url:"https://slotjin.com/"},
              {label:"みんぱち",     url:"https://minpachi.com/"},
            ].map(({label,url}) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                style={{display:"flex",alignItems:"center",gap:6,padding:"8px 10px",borderRadius:10,background:"#E8ECF0",boxShadow:"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF",textDecoration:"none",color:"#444",fontSize:13}}>
                <span style={{fontSize:11,color:"#aaa",flexShrink:0}}>↗</span>
                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{label}</span>
              </a>
            ))}
          </div>
        </div>
      )}


      {/* 設定パネル */}
      {showNotifAdmin && (
        <div style={{background:"#E8ECF0",boxShadow:"inset 4px 4px 8px #C5C9D4, inset -4px -4px 8px #FFFFFF",borderRadius:14,padding:"10px 12px",marginBottom:10,display:"flex",flexDirection:"column",gap:2}}>
          {/* Android追加 */}
          {installPrompt && (
            <button onClick={async () => { installPrompt.prompt(); const {outcome} = await installPrompt.userChoice; if (outcome==="accepted") setInstallPrompt(null); }}
              style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF",fontSize:14,color:"#D85A30",fontWeight:600,cursor:"pointer",textAlign:"left",width:"100%"}}>
              <span>📲</span><span>Androidでホームに追加</span>
            </button>
          )}
          {/* iOSアコーディオン */}
          <button onClick={() => setShowIOSSteps(v => !v)}
            style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF",fontSize:14,color:"#555",cursor:"pointer",textAlign:"left",width:"100%"}}>
            <span>🍎</span><span style={{flex:1}}>iOSでホームに追加する方法</span><span style={{fontSize:12,color:"#bbb"}}>{showIOSSteps?"▲":"▼"}</span>
          </button>
          {showIOSSteps && (
            <div style={{padding:"8px 14px 4px",display:"flex",flexDirection:"column",gap:6}}>
              {[["1","Safariで開く（Chrome不可）"],["2","下部の □↑ をタップ"],["3","「ホーム画面に追加」を選ぶ"],["4","「追加」をタップして完了"]].map(([n,t]) => (
                <div key={n} style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{background:"#D85A30",color:"#fff",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{n}</span>
                  <span style={{fontSize:13,color:"#555"}}>{t}</span>
                </div>
              ))}
            </div>
          )}
          {/* アプリについて */}
          <button onClick={() => setShowLanding(v => !v)}
            style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF",fontSize:14,color:"#555",cursor:"pointer",textAlign:"left",width:"100%"}}>
            <span>ℹ</span><span style={{flex:1}}>このアプリについて</span><span style={{fontSize:12,color:"#bbb"}}>{showLanding?"▲":"▼"}</span>
          </button>
          {showLanding && (
            <div style={{padding:"8px 14px 4px",display:"flex",flexDirection:"column",gap:6}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <img src="/logo.png" alt="SLOKEY" style={{height:32,objectFit:"contain"}}/>
                <div style={{fontSize:13,fontWeight:700,color:"#333"}}>スロ好きのネタまとめ</div>
              </div>
              {[
                ["🎰","スペック・演出・設定判別","玄人向けの深い情報が集まる"],
                ["🏪","ホール・業界の裏話","設定師目線の情報も"],
                ["💬","コメント・いいね","気になるネタに反応できる"],
              ].map(([icon,title,sub]) => (
                <div key={title} style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:16,flexShrink:0}}>{icon}</span>
                  <span style={{fontSize:13,color:"#444"}}>{title}<span style={{color:"#aaa",fontSize:12}}> — {sub}</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {toast && <div style={{background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",borderRadius:12,padding:"10px 16px",fontSize:15,color:"#3B6D11",fontWeight:500,marginBottom:10,textAlign:"center"}}>{toast}</div>}

      <div style={{display:"flex",gap:4,marginBottom:"0.8rem",background:"#E8ECF0",boxShadow:"5px 5px 10px #C5C9D4, -5px -5px 10px #FFFFFF",borderRadius:14,padding:5,position:"sticky",top:0,zIndex:20}}>
        {TABS.map(k => {
          const on = tab === k;
          return <button key={k} onClick={() => setTab(k)} style={{flex:1,padding:"9px 0",border:"none",borderRadius:10,fontSize:15,background:on?"#E0E4E8":"#E8ECF0",color:on?"#D85A30":"#888",cursor:"pointer",fontWeight:on?700:500,textAlign:"center",boxShadow:on?"inset 4px 4px 8px #B8BCC8, inset -2px -2px 5px #FFFFFF":"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF",transition:"all 0.18s"}}>{LABELS[k]}</button>;
        })}
      </div>

      {loading && <div style={{textAlign:"center",padding:"2rem",color:"#888"}}>読み込み中...</div>}

      {!loading && tab === "feed"     && <FeedTab     posts={normalPosts} updatePost={updatePost} deletePost={deletePost} addPost={addPost} showToast={showToast} initialFilter={feedFilter} onFilterChange={setFeedFilter} directPost={directPost} onDirectPostClear={() => setDirectPost(null)} favMachines={favMachines} toggleFavMachine={toggleFavMachine} />}
      {!loading && tab === "collect"  && <CollectTab  posts={normalPosts} showToast={showToast} onCatClick={goToFeedWithFilter} loadPosts={loadPosts} />}
      {!loading && tab === "overview" && <OverviewTab posts={normalPosts} updatePost={updatePost} />}
      {!loading && tab === "research" && (adminUser ? (
        <ResearchTab posts={normalPosts} aiEnabled={aiEnabled} updatePost={updatePost} />
      ) : (
        <AdminLoginForm title="分析タブ" desc="管理者ログインが必要です" />
      ))}
      {tab === "sis"        && <SisTab adminUser={adminUser} />}

      {/* フローティングフィードバックボタン（投稿タブのみ表示） */}
      {tab === "feed" && <div style={{position:"fixed",bottom:80,right:16,zIndex:200}}>
        <button onClick={() => { setShowFeedback(true); setFbDone(false); }}
          style={{background:"#D85A30",color:"#fff",border:"none",borderRadius:"50%",width:50,height:50,fontSize:20,cursor:"pointer",boxShadow:"3px 3px 10px rgba(0,0,0,0.25)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          💬
        </button>
      </div>}

      {/* フィードバック送信モーダル */}
      {showFeedback && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:400,display:"flex",alignItems:"flex-end"}} onClick={e => { if(e.target===e.currentTarget) setShowFeedback(false); }}>
          <div style={{background:"#E8ECF0",borderRadius:"16px 16px 0 0",padding:"20px 20px 32px",width:"100%",maxWidth:740,margin:"0 auto",boxSizing:"border-box"}}>
            <div style={{width:40,height:4,background:"#C5C9D4",borderRadius:2,margin:"0 auto 16px"}}/>
            {fbDone ? (
              <div style={{textAlign:"center",padding:"24px 0"}}>
                <div style={{fontSize:36,marginBottom:10}}>✅</div>
                <div style={{fontSize:16,fontWeight:600,color:"#333",marginBottom:6}}>送信しました！</div>
                <div style={{fontSize:14,color:"#888",marginBottom:20}}>フィードバックありがとうございます。</div>
                <button onClick={() => { setShowFeedback(false); setFbDone(false); }}
                  style={{padding:"10px 28px",border:"none",borderRadius:10,background:"#D85A30",color:"#fff",fontSize:15,cursor:"pointer",fontWeight:600}}>閉じる</button>
              </div>
            ) : (
              <>
                <div style={{fontSize:16,fontWeight:600,marginBottom:6}}>フィードバックを送る</div>
                <div style={{fontSize:13,color:"#888",marginBottom:14}}>ご意見・ご要望をお気軽にどうぞ。内容は管理者のみ確認できます。</div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:13,color:"#888",marginBottom:6}}>種類</div>
                  <div style={{display:"flex",gap:6}}>
                    {["機能要望","バグ報告","その他"].map(k => (
                      <button key={k} onClick={() => setFbCat(k)}
                        style={{padding:"6px 14px",border:`0.5px solid ${fbCat===k?"#D85A30":"#ddd"}`,borderRadius:8,fontSize:13,background:fbCat===k?"#FAECE7":"#fff",color:fbCat===k?"#993C1D":"#888",cursor:"pointer",fontWeight:fbCat===k?600:400}}>{k}</button>
                    ))}
                  </div>
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:13,color:"#888",marginBottom:4}}>名前 <span style={{color:"#bbb",fontSize:12}}>（省略可・匿名になります）</span></div>
                  <input value={fbName} onChange={e => setFbName(e.target.value)} placeholder="例：田中"
                    style={{width:"100%",padding:"9px 12px",border:"none",borderRadius:10,background:"#fff",fontSize:16,boxSizing:"border-box"}}/>
                </div>
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:13,color:"#888",marginBottom:4}}>内容 <span style={{color:"#e57373"}}>*</span></div>
                  <textarea value={fbBody} onChange={e => setFbBody(e.target.value)} placeholder="気になった点・改善してほしい点など" rows={4}
                    style={{width:"100%",padding:"9px 12px",border:"none",borderRadius:10,background:"#fff",fontSize:16,resize:"vertical",boxSizing:"border-box"}}/>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={() => setShowFeedback(false)}
                    style={{flex:1,padding:"11px 0",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF",color:"#888",fontSize:15,cursor:"pointer"}}>キャンセル</button>
                  <button onClick={submitFeedback} disabled={!fbBody.trim()||fbSending}
                    style={{flex:2,padding:"11px 0",border:"none",borderRadius:10,background:(!fbBody.trim()||fbSending)?"#ccc":"#D85A30",color:"#fff",fontSize:15,fontWeight:600,cursor:(!fbBody.trim()||fbSending)?"not-allowed":"pointer"}}>
                    {fbSending?"送信中…":"送信する"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 管理者パネル（ロゴ5回タップで表示） */}
      {showFbInbox && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:500,display:"flex",alignItems:"flex-end"}} onClick={e => { if(e.target===e.currentTarget) setShowFbInbox(false); }}>
          <div style={{background:"#E8ECF0",borderRadius:"16px 16px 0 0",padding:"20px 20px 32px",width:"100%",maxWidth:740,margin:"0 auto",boxSizing:"border-box",maxHeight:"88vh",display:"flex",flexDirection:"column"}}>
            <div style={{width:40,height:4,background:"#C5C9D4",borderRadius:2,margin:"0 auto 14px"}}/>

            {/* タブ切り替え */}
            <div style={{display:"flex",gap:6,marginBottom:14}}>
              {[["feedback","📬 フィードバック"],["claude","🤖 Claudeと話す"]].map(([key,label]) => {
                const on = adminInboxTab === key;
                return (
                  <button key={key} onClick={() => setAdminInboxTab(key)}
                    style={{flex:1,padding:"8px",border:"none",borderRadius:10,fontSize:13,
                      fontWeight:on?700:500,
                      background:on?"#1A56B0":"#D8DCE4",
                      color:on?"#fff":"#666",cursor:"pointer",
                      boxShadow:on?"inset 2px 2px 5px rgba(0,0,0,0.2)":"2px 2px 5px #C5C9D4,-2px -2px 5px #FFFFFF",
                      transition:"all 0.15s"}}>
                    {label}
                  </button>
                );
              })}
              <button onClick={() => setShowFbInbox(false)} style={{background:"none",border:"none",fontSize:20,color:"#aaa",cursor:"pointer",padding:"0 6px"}}>✕</button>
            </div>

            {/* フィードバック一覧 */}
            {adminInboxTab === "feedback" && (
              <div style={{overflowY:"auto",flex:1}}>
                <div style={{fontSize:13,color:"#aaa",marginBottom:10}}>{feedbackPosts.length}件</div>
                {feedbackPosts.length === 0 ? (
                  <div style={{textAlign:"center",color:"#aaa",padding:"32px 0",fontSize:14}}>まだフィードバックはありません</div>
                ) : feedbackPosts.map(p => (
                  <div key={p.id} style={{background:"#fff",borderRadius:12,padding:"12px 14px",marginBottom:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                      <span style={{fontSize:12,padding:"2px 8px",borderRadius:6,background:p.title==="バグ報告"?"#FCEBEB":p.title==="機能要望"?"#E6F1FB":"#F3EFF9",color:p.title==="バグ報告"?"#A32D2D":p.title==="機能要望"?"#185FA5":"#6B3FA0",fontWeight:600}}>{p.title}</span>
                      <span style={{fontSize:12,color:"#aaa"}}>{p.internal?.author || "匿名"}</span>
                      <span style={{fontSize:12,color:"#ccc",marginLeft:"auto"}}>{p.created_at ? new Date(p.created_at).toLocaleDateString("ja-JP") : ""}</span>
                    </div>
                    <div style={{fontSize:14,color:"#333",lineHeight:1.6}}>{p.body}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Claudeチャット */}
            {adminInboxTab === "claude" && <AdminChat />}
          </div>
        </div>
      )}
    </div>
  );
}

function FeedTab({ posts, updatePost, deletePost, addPost, showToast, initialFilter = "all", onFilterChange, directPost, onDirectPostClear, favMachines, toggleFavMachine }) {
  const [filter, setFilter] = useState(initialFilter);
  const [showMachines, setShowMachines] = useState(false);
  const CAT_KEYS = ["new","info","jissen","hall","episode"];
  const [showCats, setShowCats] = useState(() => CAT_KEYS.includes(initialFilter));
  function updateFilter(v) { setFilter(v); onFilterChange?.(v); if (!CAT_KEYS.includes(v)) setShowCats(false); setShowMachines(false); }
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("new");
  const [commentOpen, setCommentOpen] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [fMachine, setFMachine] = useState("");
  const [fCat, setFCat] = useState("info");
  const [fBody, setFBody] = useState("");
  const [fName, setFName] = useState(MY_NAME);
  const [currentName, setCurrentName] = useState(() => localStorage.getItem("slotkey_name") || "ゲスト");
  const [editId, setEditId] = useState(null);
  const [eMachine, setEMachine] = useState("");
  const [eCat, setECat] = useState("jissen");
  const [eBody, setEBody] = useState("");
  const [eUrl, setEUrl] = useState("");
  const [eImage, setEImage] = useState(null);
  const [eImagePreview, setEImagePreview] = useState(null);
  const [eUploading, setEUploading] = useState(false);
  const [fUrl, setFUrl] = useState("");
  const [fOgImage, setFOgImage] = useState("");
  const [fBodyFetching, setFBodyFetching] = useState(false);
  const [fMachineOpen, setFMachineOpen] = useState(false);
  const [fShopName, setFShopName] = useState("");
  const [fImage, setFImage] = useState(null);
  const [fImagePreview, setFImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [shopFilter, setShopFilter] = useState("");
  const [expandedPosts, setExpandedPosts] = useState({});
  const [imgSelectedPost, setImgSelectedPost] = useState(null);
  const imgModalScrollRef = React.useRef(null);
  React.useEffect(() => { imgModalScrollRef.current?.scrollTo(0, 0); }, [imgSelectedPost?.id]);
  const [replyTo, setReplyTo] = useState(null); // {postId, idx}
  const [replyText, setReplyText] = useState("");
  const [fullscreenImg, setFullscreenImg] = useState(null);
  const [shareOpen, setShareOpen] = useState(null);
  const [editOpen, setEditOpen] = useState(null);
  const [machineModal, setMachineModal] = useState(null);

  useEffect(() => {
    if (directPost) {
      setExpandedPosts(prev => ({ ...prev, [directPost.id]: true }));
      onDirectPostClear?.();
      setTimeout(() => {
        document.getElementById(`post-${directPost.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }
  }, [directPost]);

  useEffect(() => {
    if (!shareOpen) return;
    const close = () => setShareOpen(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [shareOpen]);

  useEffect(() => {
    if (!editOpen) return;
    const close = () => setEditOpen(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [editOpen]);

  const [machineSuggestion, setMachineSuggestion] = useState(null);

  const machineNames = useMemo(() => [...new Set(posts.map(p => p.machine).filter(Boolean))], [posts]);

  function checkMachineName(val) {
    const norm = normalizeName(val);
    if (!norm) { setMachineSuggestion(null); return; }
    const exact = machineNames.find(m => normalizeName(m) === norm);
    if (exact) { if (exact !== val) setFMachine(exact); setMachineSuggestion(null); return; }
    let best = null, bestDist = Infinity;
    for (const m of machineNames) {
      const d = levenshtein(norm, normalizeName(m));
      if (d > 0 && d <= 2 && d < bestDist) { best = m; bestDist = d; }
    }
    setMachineSuggestion(best);
  }

  function resetForm() { setShowForm(false); setFMachine(""); setFCat("info"); setFBody(""); setFUrl(""); setFOgImage(""); setFShopName(""); setFImage(null); setFImagePreview(null); }

  function onImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const MAX = 1200;
    const QUALITY = 0.85;
    const img = new Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => {
        const resized = new File([blob], file.name, { type: "image/jpeg" });
        setFImage(resized);
        setFImagePreview(URL.createObjectURL(resized));
      }, "image/jpeg", QUALITY);
    };
    img.src = URL.createObjectURL(file);
  }

  function startEdit(p) {
    setEditId(p.id);
    setEMachine(p.machine);
    setECat(p.cat);
    setEBody(p.body);
    setEUrl(p.url || "");
    setEImage(null);
    setEImagePreview(p.internal?.imageUrl || null);
  }

  function onEditImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const MAX = 1200, QUALITY = 0.85;
    const img = new Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => {
        const resized = new File([blob], file.name, { type: "image/jpeg" });
        setEImage(resized);
        setEImagePreview(URL.createObjectURL(resized));
      }, "image/jpeg", QUALITY);
    };
    img.src = URL.createObjectURL(file);
  }

  async function saveEdit(p) {
    const b = eBody.trim();
    if (!b || !eMachine.trim()) return;
    try {
      setEUploading(true);
      let imageUrl = p.internal?.imageUrl || "";
      if (eImage) {
        const ext = eImage.name.split(".").pop();
        const path = `posts/${Date.now()}.${ext}`;
        const { data: upData, error: upErr } = await supabase.storage.from("images").upload(path, eImage);
        if (upErr) throw new Error("画像アップロード失敗: " + upErr.message);
        const { data: { publicUrl } } = supabase.storage.from("images").getPublicUrl(upData.path);
        imageUrl = publicUrl;
      }
      await updatePost(p.id, {
        machine: eMachine.trim(), cat: eCat, body: b,
        title: b.length > 30 ? b.slice(0,30)+"..." : b,
        url: eUrl.trim(),
        internal: { ...p.internal, imageUrl },
      });
      setEditId(null);
      showToast("更新しました");
    } catch(e) {
      alert(e.message || "更新に失敗しました");
    } finally {
      setEUploading(false);
    }
  }

  async function fetchBodyFromUrl() {
    const url = fUrl.trim();
    if (!url) return;
    setFBodyFetching(true);
    try {
      const res = await fetch("/api/fetch-url", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (data.body) {
        setFBody(data.body);
        if (!fMachine.trim()) {
          const allMachines = [...new Set(posts.map(p => p.machine).filter(m => m && m !== "全般"))];
          const found = allMachines.sort((a, b) => b.length - a.length).find(m => data.body.includes(m));
          if (found) setFMachine(found);
        }
      }
      setFOgImage(data.ogImage || "");
    } catch(e) {
    } finally {
      setFBodyFetching(false);
    }
  }

  async function submitPost() {
    let b = fBody.trim();
    if (!b) {
      if (fImage) b = "画像投稿";
      else if (fUrl.trim()) b = "引用投稿";
      else return;
    }
    const authorName = fName.trim() || "ゲスト";
    if (authorName === "ゲスト") {
      const ok = window.confirm("名前が「ゲスト」のまま投稿すると、あとから編集・削除できません。\nこのまま投稿しますか？");
      if (!ok) return;
    }
    localStorage.setItem("slotkey_name", authorName);
    setCurrentName(authorName);
    try {
      setUploading(true);
      let imageUrl = "";
      if (fImage) {
        const ext = fImage.name.split(".").pop();
        const path = `posts/${Date.now()}.${ext}`;
        const { data: upData, error: upErr } = await supabase.storage.from("images").upload(path, fImage);
        if (upErr) throw new Error("画像アップロード失敗: " + upErr.message);
        const { data: { publicUrl } } = supabase.storage.from("images").getPublicUrl(upData.path);
        imageUrl = publicUrl;
      }
      await addPost({
        cat: fCat, source: "manual", machine: fMachine.trim() || "全般",
        title: b.length > 30 ? b.slice(0,30)+"..." : b,
        body: b, url: fUrl.trim(), quality: 3, dupKey: "", author: authorName, eng: {},
        internal: { ...blank(), imageUrl, ogImageUrl: fImage ? "" : fOgImage, shopName: "" },
      });
    } catch(e) {
      console.error("投稿エラー:", e);
      alert(e.message || "投稿に失敗しました");
    } finally {
      setUploading(false);
    }
    resetForm();
  }

  async function toggleLike(p) {
    const newLikes = toggleArr(p.internal.likes || [], MY_UID);
    await updatePost(p.id, { internal: { ...p.internal, likes: newLikes } });
  }
  async function toggleBM(p) {
    const newBMs = toggleArr(p.internal.bookmarks || [], MY_UID);
    await updatePost(p.id, { internal: { ...p.internal, bookmarks: newBMs } });
  }
  async function toggleBad(p) {
    const newBads = toggleArr(p.internal.bads || [], MY_UID);
    await updatePost(p.id, { internal: { ...p.internal, bads: newBads } });
  }
  async function addComment(p) {
    if (!commentText.trim()) return;
    const comments = [...(p.internal.comments || []), { uid: MY_UID, text: commentText.trim(), ts: "たった今", replies: [] }];
    await updatePost(p.id, { internal: { ...p.internal, comments } });
    setCommentText("");
  }
  async function addReply(p, commentIdx) {
    if (!replyText.trim()) return;
    const comments = [...(p.internal.comments || [])];
    const c = { ...comments[commentIdx], replies: [...(comments[commentIdx].replies || []), { uid: MY_UID, text: replyText.trim(), ts: "たった今" }] };
    comments[commentIdx] = c;
    await updatePost(p.id, { internal: { ...p.internal, comments } });
    setReplyText("");
    setReplyTo(null);
  }
  async function handleDelete(id) {
    if (!window.confirm("削除しますか？")) return;
    await deletePost(id);
  }

  const filtered = posts.filter(p => {
    if (filter === "img") return !!(p.internal?.imageUrl || p.internal?.ogImageUrl);
    if (filter !== "all" && p.cat !== filter) return false;
    if (query.trim() && !(p.machine+p.title+p.body).toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }).sort((a,b) => sortBy === "internal" ? (b.internal?.likes?.length||0) - (a.internal?.likes?.length||0) : new Date(b.created_at) - new Date(a.created_at));

  return (
    <div style={{minWidth:0}}>
      {fullscreenImg && (
        <div onClick={() => setFullscreenImg(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out"}}>
          <img src={fullscreenImg} alt="" decoding="async" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}} onClick={e => e.stopPropagation()} />
          <button onClick={() => setFullscreenImg(null)} style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,0.15)",border:"none",borderRadius:"50%",width:36,height:36,fontSize:20,color:"#fff",cursor:"pointer",lineHeight:1}}>×</button>
        </div>
      )}
      {/* 画像タブ投稿モーダル */}
      {imgSelectedPost && (
        <div onClick={() => setImgSelectedPost(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={e => e.stopPropagation()} style={{background:"#fff",borderRadius:"16px 16px 0 0",width:"100%",maxWidth:740,maxHeight:"80vh",display:"flex",flexDirection:"column",boxSizing:"border-box"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px 8px",borderBottom:"0.5px solid #eee",flexShrink:0}}>
              <div style={{display:"flex",gap:5,alignItems:"center"}}>
                <CatBadge cat={imgSelectedPost.cat}/>
              </div>
              <button onClick={() => setImgSelectedPost(null)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#aaa",padding:"0 4px",lineHeight:1}}>×</button>
            </div>
            <div ref={imgModalScrollRef} style={{overflowY:"auto",padding:"12px 16px 16px",flex:1,minHeight:0}}>
              <div style={{fontSize:14,color:"#888",marginBottom:4,display:"flex",gap:8,flexWrap:"wrap"}}>
                <span style={{fontWeight:500,color:"#555"}}>@{imgSelectedPost.internal?.author||imgSelectedPost.author||"ゲスト"}</span>
                <span>機種: <span style={{color:"#333",fontWeight:500}}>{imgSelectedPost.machine}</span></span>
              </div>
              <div style={{fontSize:16,fontWeight:500,color:"#333",marginBottom:6,overflowWrap:"anywhere"}}>{imgSelectedPost.title}</div>
              <div style={{fontSize:15,color:"#666",lineHeight:1.65,marginBottom:8,overflowWrap:"anywhere"}}>{imgSelectedPost.body}</div>
              {imgSelectedPost.internal?.imageUrl && (
                <img src={imgSelectedPost.internal.imageUrl} alt="" decoding="async" onClick={() => setFullscreenImg(imgSelectedPost.internal.imageUrl)} style={{width:"100%",maxHeight:340,objectFit:"contain",borderRadius:8,marginBottom:8,display:"block",background:"#f9f9f9",cursor:"zoom-in"}} />
              )}
              {imgSelectedPost.url && imgSelectedPost.internal?.ogImageUrl && !imgSelectedPost.internal?.imageUrl && (
                <img src={imgSelectedPost.internal.ogImageUrl} alt="" decoding="async" style={{width:"100%",maxHeight:220,objectFit:"contain",borderRadius:8,marginBottom:8,display:"block",background:"#f9f9f9"}} />
              )}
              {imgSelectedPost.url && (
                <a href={imgSelectedPost.url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:6,background:"#f4f3ec",borderRadius:8,padding:"6px 10px",textDecoration:"none",overflow:"hidden",marginBottom:8}}>
                  <span style={{fontSize:14,color:"#888",flexShrink:0}}>🔗</span>
                  <span style={{fontSize:14,color:"#185FA5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,minWidth:0}}>{imgSelectedPost.url}</span>
                </a>
              )}
              <div style={{display:"flex",gap:8,marginTop:4}}>
                <button onClick={() => { toggleLike(imgSelectedPost); setImgSelectedPost(p => ({...p, internal:{...p.internal,likes:(p.internal?.likes||[]).indexOf(MY_UID)>=0?(p.internal.likes.filter(x=>x!==MY_UID)):[...(p.internal.likes||[]),MY_UID]}})); }} style={{flex:1,padding:"8px 0",border:"none",borderRadius:10,background:(imgSelectedPost.internal?.likes||[]).indexOf(MY_UID)>=0?"#D85A30":"#E8ECF0",color:(imgSelectedPost.internal?.likes||[]).indexOf(MY_UID)>=0?"#fff":"#555",fontSize:14,cursor:"pointer",boxShadow:"3px 3px 6px #C5C9D4,-3px -3px 6px #FFFFFF"}}>♥ {(imgSelectedPost.internal?.likes||[]).length}</button>
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?post=${imgSelectedPost.id}`); showToast("リンクをコピーしました"); }} style={{padding:"8px 14px",border:"none",borderRadius:10,background:"#E8ECF0",color:"#555",fontSize:14,cursor:"pointer",boxShadow:"3px 3px 6px #C5C9D4,-3px -3px 6px #FFFFFF"}}>🔗</button>
                {imgSelectedPost.internal?.imageUrl && <button onClick={() => setFullscreenImg(imgSelectedPost.internal.imageUrl)} style={{padding:"8px 14px",border:"none",borderRadius:10,background:"#E8ECF0",color:"#555",fontSize:14,cursor:"pointer",boxShadow:"3px 3px 6px #C5C9D4,-3px -3px 6px #FFFFFF"}}>⛶</button>}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 機種別まとめモーダル */}
      {machineModal && (() => {
        const mPosts = posts.filter(p => p.machine === machineModal).sort((a,b) => (b.internal?.likes?.length||0)-(a.internal?.likes?.length||0));
        return (
          <>
            <div onClick={() => setMachineModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:198}}/>
            <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:199,background:"#E8ECF0",borderRadius:"20px 20px 0 0",maxHeight:"88vh",display:"flex",flexDirection:"column",maxWidth:740,margin:"0 auto"}}>
              <div style={{padding:"12px 16px 0",flexShrink:0}}>
                <div style={{width:40,height:4,background:"#C5C9D4",borderRadius:2,margin:"0 auto 14px"}}/>
                <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:14}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:18,fontWeight:700,color:"#333"}}>{machineModal}</div>
                    <div style={{fontSize:13,color:"#aaa",marginTop:2}}>{mPosts.length}件の投稿</div>
                  </div>
                  <button onClick={() => setMachineModal(null)} style={{background:"none",border:"none",fontSize:22,color:"#bbb",cursor:"pointer",padding:"0 4px",lineHeight:1,flexShrink:0}}>×</button>
                </div>
              </div>
              <div style={{overflowY:"auto",padding:"0 16px 40px",flex:1}}>
                {mPosts.map(p => (
                  <div key={p.id} style={{background:"#fff",borderRadius:12,padding:"12px 14px",marginBottom:10,border:"0.5px solid #eee"}}>
                    <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:6}}>
                      <CatBadge cat={p.cat}/>
                      {AUTO_AUTHORS.includes(p.internal?.author||p.author) ? <QualityBadge q={p.quality||1}/> : null}
                      <span style={{marginLeft:"auto",fontSize:13,color:"#D85A30",fontWeight:500,flexShrink:0}}>♥ {p.internal?.likes?.length||0}</span>
                    </div>
                    <div style={{fontSize:15,fontWeight:600,color:"#333",marginBottom:4,overflowWrap:"anywhere"}}>{p.title}</div>
                    <div style={{fontSize:14,color:"#666",lineHeight:1.65,overflowWrap:"anywhere"}}>{p.body}</div>
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:5,marginTop:8,fontSize:13,color:"#185FA5",textDecoration:"none",overflow:"hidden"}}>
                        <span style={{flexShrink:0}}>🔗</span>
                        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.url}</span>
                      </a>
                    )}
                  </div>
                ))}
                {mPosts.length === 0 && <div style={{textAlign:"center",color:"#aaa",padding:"32px 0"}}>投稿がありません</div>}
              </div>
            </div>
          </>
        );
      })()}

      {/* FAB */}
      <button onClick={() => setShowForm(v => !v)} style={{position:"fixed",bottom:24,right:20,zIndex:210,width:56,height:56,borderRadius:"50%",background:showForm?"#E8ECF0":"linear-gradient(135deg,#E8622A,#C84420)",color:showForm?"#D85A30":"#fff",border:"none",fontSize:26,cursor:"pointer",boxShadow:showForm?"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF":"0 4px 16px rgba(216,90,48,0.5)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>{showForm?"×":"＋"}</button>

      {/* ボトムシート */}
      {showForm && (
        <>
          <div onClick={() => { setShowForm(false); resetForm(); }} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:198}} />
          <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:199,background:"#E8ECF0",borderRadius:"20px 20px 0 0",maxHeight:"85vh",overflowY:"auto",padding:"12px 16px 32px",boxSizing:"border-box",boxShadow:"0 -4px 24px rgba(0,0,0,0.18)"}}>
            <div style={{width:40,height:4,background:"#C5C9D4",borderRadius:2,margin:"0 auto 14px"}}/>
            <div style={{fontSize:15,fontWeight:500,marginBottom:10}}>新規投稿</div>
            {(()=>{const lbl={fontSize:13,color:"#888",whiteSpace:"nowrap",minWidth:52,paddingTop:2};const row={display:"flex",alignItems:"flex-start",gap:8,marginBottom:8};const inp={flex:1,fontSize:16,padding:"9px 10px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",boxSizing:"border-box"};return(<>
            <div style={row}><span style={lbl}>名前</span><input value={fName} onChange={e=>setFName(e.target.value)} placeholder="例: ゲスト" style={inp}/></div>
            {fCat!=="fun"&&<div style={row}><span style={lbl}>機種名</span><div style={{flex:1,position:"relative"}}>{(()=>{const allM=[...new Set(posts.map(p=>p.machine).filter(Boolean))].sort((a,b)=>{const s=n=>n.replace(/^(Lパチスロ\s*|LB|L\s*|e|スマスロ\s*|すますろ\s*|Sパチスロ\s*|S|Pパチスロ\s*|P)/,"").trim();const r=n=>n.startsWith("L")?0:n.startsWith("スマスロ")||n.startsWith("すますろ")?1:n.startsWith("e")?2:3;const d=s(a).localeCompare(s(b),"ja");return d!==0?d:r(a)-r(b);});const filtered=fMachine.trim()?allM.filter(m=>m.includes(fMachine)):allM;return(<><input value={fMachine} onChange={e=>{setFMachine(e.target.value);setMachineSuggestion(null);setFMachineOpen(true);}} onFocus={()=>setFMachineOpen(true)} onBlur={()=>setTimeout(()=>{setFMachineOpen(false);checkMachineName(fMachine);},150)} placeholder="例: バジリスク絆2（任意）" style={{...inp,width:"100%",marginBottom:machineSuggestion?4:0,boxSizing:"border-box"}}/>{fMachineOpen&&filtered.length>0&&<div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",borderRadius:10,boxShadow:"0 4px 20px rgba(0,0,0,0.15)",zIndex:200,maxHeight:220,overflowY:"auto",marginTop:4}}>{filtered.map(name=><div key={name} onMouseDown={()=>{setFMachine(name);setFMachineOpen(false);setMachineSuggestion(null);}} style={{padding:"10px 14px",fontSize:14,color:"#333",borderBottom:"0.5px solid #f0f0f0",cursor:"pointer"}}>{name}</div>)}</div>}{machineSuggestion&&<div style={{fontSize:14,color:"#666",marginTop:4,display:"flex",alignItems:"center",gap:6}}>もしかして:<button onClick={()=>{setFMachine(machineSuggestion);setMachineSuggestion(null);}} style={{fontSize:14,color:"#D85A30",background:"none",border:"none",cursor:"pointer",padding:0,fontWeight:500,textDecoration:"underline"}}>{machineSuggestion}</button><button onClick={()=>setMachineSuggestion(null)} style={{fontSize:13,color:"#aaa",background:"none",border:"none",cursor:"pointer",padding:0}}>✕</button></div>}</>);})()}</div></div>}
            <div style={row}><span style={lbl}>カテゴリ</span><select value={fCat} onChange={e=>setFCat(e.target.value)} style={{...inp,color:CATS[fCat]?.color||"#555",fontWeight:700,background:CATS[fCat]?.bg||"#E8ECF0",boxShadow:`inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF, inset 0 0 0 2px ${CATS[fCat]?.border||"#ddd"}`,fontSize:16}}><option value="new">新台</option><option value="info">機種情報</option><option value="jissen">実戦</option><option value="hall">業界</option><option value="episode">名機</option></select></div>
            <div style={row}><span style={lbl}>URL</span><div style={{flex:1,display:"flex",gap:6,alignItems:"center"}}><input value={fUrl} onChange={e=>{setFUrl(e.target.value);if(!e.target.value.trim())setFOgImage("");}} placeholder="引用元URL（任意）" style={{...inp,flex:1,fontSize:16,minWidth:0}}/>{fUrl.trim()&&<button type="button" onClick={fetchBodyFromUrl} disabled={fBodyFetching} style={{padding:"8px 10px",border:"none",borderRadius:10,background:fBodyFetching?"#ddd":"#E8ECF0",boxShadow:fBodyFetching?"none":"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF",fontSize:13,color:fBodyFetching?"#aaa":"#555",cursor:fBodyFetching?"default":"pointer",whiteSpace:"nowrap",flexShrink:0}}>{fBodyFetching?"取得中…":"本文取得"}</button>}</div></div>
            {fOgImage&&!fImage&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,paddingLeft:60}}><img src={fOgImage} alt="OGP" style={{width:80,height:52,objectFit:"cover",borderRadius:6,flexShrink:0,background:"#ddd"}} onError={e=>{e.target.style.display="none";}}/><span style={{fontSize:12,color:"#aaa"}}>URLのサムネイル</span><button onClick={()=>setFOgImage("")} style={{marginLeft:"auto",background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:16,padding:"0 4px",lineHeight:1}}>×</button></div>}
            <div style={{...row,alignItems:"flex-start"}}><span style={{...lbl,paddingTop:10}}>本文<br/><span style={{fontSize:11,color:"#bbb",fontWeight:400}}>任意</span></span><textarea value={fBody} onChange={e=>setFBody(e.target.value)} placeholder={fBodyFetching?"取得中...":(TEMPLATES[fCat]||"URLから自動取得、または手動入力")} disabled={fBodyFetching} style={{...inp,resize:"vertical",minHeight:88,opacity:fBodyFetching?0.6:1}}/></div>
            {!fBody.trim()&&<div style={{fontSize:12,color:"#aaa",marginTop:-4,marginBottom:6,paddingLeft:60}}>画像やURLがあれば本文なしでそのまま投稿できます</div>}
            </>);})()}
            <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:10}}>
              <span style={{fontSize:13,color:"#888",whiteSpace:"nowrap",minWidth:52,paddingTop:9}}>画像</span>
              <div style={{flex:1}}>
                <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                  <div style={{padding:"7px 14px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",fontSize:15,color:"#555",whiteSpace:"nowrap",flexShrink:0}}>📷 選ぶ</div>
                  <span style={{fontSize:14,color:"#aaa",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fImage ? fImage.name : "未選択（自動リサイズあり）"}</span>
                  <input type="file" accept="image/*" onChange={onImageChange} style={{display:"none"}} />
                </label>
                {fImagePreview && (
                  <div style={{position:"relative",marginTop:8}}>
                    <img src={fImagePreview} alt="preview" style={{width:"100%",borderRadius:8,maxHeight:200,objectFit:"cover"}} />
                    <button onClick={() => { setFImage(null); setFImagePreview(null); }} style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,0.5)",color:"#fff",border:"none",borderRadius:"50%",width:22,height:22,cursor:"pointer",fontSize:15,lineHeight:1,padding:0}}>×</button>
                  </div>
                )}
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={submitPost} disabled={uploading} style={{flex:1,padding:"9px 0",background:uploading?"#aaa":"#2a9d3f",color:"#fff",border:"none",borderRadius:8,fontSize:16,fontWeight:500,cursor:uploading?"not-allowed":"pointer"}}>{uploading?"アップロード中...":"投稿"}</button>
              <button onClick={resetForm} style={{padding:"9px 16px",background:"#f0f0f0",color:"#666",border:"0.5px solid #ddd",borderRadius:8,fontSize:15,cursor:"pointer"}}>キャンセル</button>
            </div>
          </div>
        </>
      )}

<div style={{display:"flex",gap:6,marginBottom:10}}>
        <div style={{position:"relative",flex:1}}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="機種名・キーワードで検索..." style={{width:"100%",fontSize:16,padding:"8px 30px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",boxSizing:"border-box"}} />
          <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:15,color:"#aaa",pointerEvents:"none"}}>⌕</span>
          {query && <button onClick={() => setQuery("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#aaa",padding:0}}>×</button>}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{fontSize:14,padding:"8px 6px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",color:"#666",flexShrink:0}}>
          <option value="new">新着順</option>
          <option value="internal">評価順</option>
        </select>
      </div>

      <div style={{marginBottom:"1rem"}}>
        <div className="scroll-x" style={{display:"flex",gap:5,paddingBottom:6}}>
          {[
            ["all","すべて","#D85A30"],
            ["img","🖼 画像","#6B3FA0"],
          ].map(([k,label,activeColor]) => {
            const on = filter === k && !showMachines;
            return <button key={k} onClick={() => updateFilter(k)} style={{padding:"6px 9px",border:"none",borderRadius:10,fontSize:13,background:"#E8ECF0",color:on?activeColor:"#999",cursor:"pointer",fontWeight:on?700:400,whiteSpace:"nowrap",flexShrink:0,boxShadow:on?`inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF`:"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF",transition:"all 0.15s"}}>{label}</button>;
          })}
          {(() => { const on = CAT_KEYS.includes(filter) && !showMachines; return <button onClick={() => { setShowCats(v => !v); setShowMachines(false); }} style={{padding:"6px 9px",border:"none",borderRadius:10,fontSize:13,background:"#E8ECF0",color:on?"#D85A30":showCats?"#555":"#999",cursor:"pointer",fontWeight:on||showCats?700:400,whiteSpace:"nowrap",flexShrink:0,boxShadow:on||showCats?`inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF`:"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF",transition:"all 0.15s"}}>カテゴリ {showCats?"▲":"▼"}</button>; })()}
          <button onClick={() => { setShowMachines(v => !v); setShowCats(false); }} style={{padding:"6px 9px",border:"none",borderRadius:10,fontSize:13,background:"#E8ECF0",color:showMachines?"#2E7D32":"#999",cursor:"pointer",fontWeight:showMachines?700:400,whiteSpace:"nowrap",flexShrink:0,boxShadow:showMachines?`inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF`:"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF",transition:"all 0.15s"}}>機種 {showMachines?"▲":"▼"}</button>
        </div>
        {showCats && (
          <div style={{display:"flex",gap:5,flexWrap:"wrap",paddingBottom:2}}>
            {CAT_KEYS.map(k => {
              const on = filter === k;
              return <button key={k} onClick={() => updateFilter(k)} style={{padding:"5px 10px",border:"none",borderRadius:10,fontSize:13,background:"#E8ECF0",color:on?CATS[k].color:"#999",cursor:"pointer",fontWeight:on?700:400,whiteSpace:"nowrap",flexShrink:0,boxShadow:on?`inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF`:"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF",transition:"all 0.15s"}}>{CATS[k].label}</button>;
            })}
          </div>
        )}
      </div>

      {showMachines && <MachineListTab posts={posts} onGoToFeed={() => setShowMachines(false)} favMachines={favMachines} toggleFavMachine={toggleFavMachine} />}

      {!showMachines && filtered.length === 0 && <div style={{textAlign:"center",padding:"2rem",color:"#aaa",fontSize:15}}>投稿がありません</div>}

      {!showMachines && filter === "img" && filtered.length > 0 && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:12}}>
          {filtered.map(p => (
            <div key={p.id} onClick={() => setImgSelectedPost(p)} style={{borderRadius:12,overflow:"hidden",background:"#E8ECF0",boxShadow:"3px 3px 8px #C5C9D4, -3px -3px 8px #FFFFFF",cursor:"pointer",position:"relative"}}>
              <img src={p.internal.imageUrl || p.internal.ogImageUrl} alt="" loading="lazy" decoding="async" style={{width:"100%",aspectRatio:"1",objectFit:"cover",display:"block"}}/>
              <div style={{padding:"6px 8px"}}>
                <div style={{display:"flex",gap:4,alignItems:"center",marginBottom:3}}><CatBadge cat={p.cat}/></div>
                <div style={{fontSize:13,fontWeight:500,color:"#333",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</div>
                <div style={{fontSize:12,color:"#aaa",marginTop:2}}>{p.machine}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!showMachines && filter !== "img" && filtered.map(p => {
        const engDefs = ENG_DEFS[p.source] || [];
        const hasEng = engDefs.some(d => fmtNum(p.eng?.[d.key]));
        const iLiked = (p.internal?.likes || []).indexOf(MY_UID) >= 0;
        const isOpen = commentOpen === p.id;
        const postAuthor = p.internal?.author || p.author || "ゲスト";
        const isOwn = currentName !== "ゲスト" && postAuthor === currentName;
        const isEditing = editId === p.id;
        return (
          <div key={p.id} id={`post-${p.id}`} style={{background:"#E8ECF0",border:"none",boxShadow:isOwn?"5px 5px 10px #C5C9D4, -5px -5px 10px #FFFFFF, inset 0 0 0 2px #F0997B":"5px 5px 10px #C5C9D4, -5px -5px 10px #FFFFFF",borderRadius:16,padding:"14px",marginBottom:12,overflow:"hidden",minWidth:0}}>
            {isEditing ? (
              <div>
                <select value={eCat} onChange={e => setECat(e.target.value)} style={{width:"100%",fontSize:15,padding:"7px 10px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",marginBottom:8,boxSizing:"border-box"}}>
                  <option value="new">新台</option>
                  <option value="info">機種情報</option>
                  <option value="jissen">実戦</option>
                  <option value="hall">業界</option>
                  <option value="episode">名機</option>
                </select>
                <input value={eMachine} onChange={e => setEMachine(e.target.value)} placeholder="機種名" style={{width:"100%",fontSize:16,padding:"7px 10px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",marginBottom:8,boxSizing:"border-box"}} />
                <textarea value={eBody} onChange={e => setEBody(e.target.value)} style={{width:"100%",fontSize:16,padding:"7px 10px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",resize:"vertical",minHeight:80,marginBottom:8,boxSizing:"border-box"}} />
                <input value={eUrl} onChange={e => setEUrl(e.target.value)} placeholder="引用元URL（任意）" style={{width:"100%",fontSize:16,padding:"7px 10px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",marginBottom:8,boxSizing:"border-box"}} />
                <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,cursor:"pointer"}}>
                  <div style={{padding:"6px 12px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",fontSize:15,color:"#555",whiteSpace:"nowrap"}}>📷 画像を変更</div>
                  <span style={{fontSize:14,color:"#aaa",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{eImage ? eImage.name : "未選択（自動リサイズあり）"}</span>
                  <input type="file" accept="image/*" onChange={onEditImageChange} style={{display:"none"}} />
                </label>
                {eImagePreview && (
                  <div style={{position:"relative",marginBottom:8}}>
                    <img src={eImagePreview} alt="preview" style={{width:"100%",borderRadius:8,maxHeight:200,objectFit:"contain",background:"#f9f9f9"}} />
                    <button onClick={() => { setEImage(null); setEImagePreview(null); }} style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,0.5)",color:"#fff",border:"none",borderRadius:"50%",width:22,height:22,cursor:"pointer",fontSize:15,lineHeight:1,padding:0}}>×</button>
                  </div>
                )}
                <div style={{display:"flex",gap:8}}>
                  <button onClick={() => saveEdit(p)} disabled={eUploading} style={{flex:1,padding:"7px 0",background:eUploading?"#aaa":"#2a9d3f",color:"#fff",border:"none",borderRadius:8,fontSize:15,fontWeight:500,cursor:eUploading?"not-allowed":"pointer"}}>{eUploading?"アップロード中...":"保存"}</button>
                  <button onClick={() => setEditId(null)} style={{padding:"7px 14px",background:"#f0f0f0",color:"#666",border:"0.5px solid #ddd",borderRadius:8,fontSize:15,cursor:"pointer"}}>キャンセル</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:6,gap:6}}>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center",minWidth:0,flex:1}}><CatBadge cat={p.cat}/></div>
                  {AUTO_AUTHORS.includes(p.internal?.author || p.author) ? <QualityBadge q={p.quality || 1}/> : null}
                </div>
                <div style={{fontSize:14,color:"#888",marginBottom:3,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{fontWeight:500,color:isOwn?"#D85A30":"#555",whiteSpace:"nowrap"}}>@{postAuthor}{isOwn&&<span style={{fontSize:12,marginLeft:3,color:"#D85A30"}}>（自分）</span>}</span>
                  <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0}}>機種: <span onClick={e => { e.stopPropagation(); setMachineModal(p.machine); }} style={{color:"#185FA5",fontWeight:500,cursor:"pointer",textDecoration:"underline",textDecorationStyle:"dotted",textUnderlineOffset:2}}>{p.machine}</span></span>
                  <span style={{fontSize:12,color:"#bbb",whiteSpace:"nowrap",flexShrink:0,marginLeft:"auto"}}>{relativeTime(p.created_at)}</span>
                </div>
                <div style={{fontSize:16,fontWeight:500,color:"#333",marginBottom:4,overflowWrap:"anywhere"}}>{p.title}</div>
                {(function CollapseBody() {
                  const hasImage = !!(p.internal?.imageUrl || p.internal?.ogImageUrl);
                  const isAuto = AUTO_AUTHORS.includes(postAuthor);
                  if (isAuto && hasImage) return null;
                  const LIMIT = 60;
                  const isLong = p.body.length > LIMIT;
                  const isExpanded = !!expandedPosts[p.id];
                  return (
                    <div style={{marginBottom:(p.internal?.imageUrl||p.url)?6:10}}>
                      <div style={{fontSize:15,color:"#666",lineHeight:1.65,overflowWrap:"anywhere"}}>{isLong && !isExpanded ? p.body.slice(0, LIMIT) + "…" : p.body}</div>
                      {isLong && <button onClick={() => setExpandedPosts(prev => ({...prev, [p.id]: !prev[p.id]}))} style={{fontSize:14,color:"#D85A30",background:"none",border:"none",padding:"2px 0",cursor:"pointer",fontWeight:500}}>{isExpanded ? "折りたたむ" : "もっと見る"}</button>}
                    </div>
                  );
                })()}
                {p.internal?.imageUrl && (
                  <img src={p.internal.imageUrl} alt="" loading="lazy" decoding="async" onClick={() => setFullscreenImg(p.internal.imageUrl)} style={{width:"100%",maxHeight:360,objectFit:"contain",borderRadius:8,marginBottom:6,display:"block",background:"#f9f9f9",cursor:"zoom-in"}} />
                )}
                {p.url && p.internal?.ogImageUrl && !p.internal?.imageUrl ? (() => {
                  const isYT = /youtube\.com|youtu\.be/.test(p.url);
                  return (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" style={{display:"block",borderRadius:10,overflow:"hidden",marginBottom:10,textDecoration:"none",border: isYT ? "1.5px solid #ff0000" : "0.5px solid #ddd"}}>
                      <div style={{position:"relative",height:160,background:"#e8e4dc",flexShrink:0}}>
                        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <span style={{fontSize:36,opacity:0.3}}>{isYT ? "▶" : "🔗"}</span>
                        </div>
                        <img src={p.internal.ogImageUrl} alt="" loading="lazy" decoding="async" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",display:"block"}} onError={e=>{e.target.style.display="none";}}/>
                        {isYT && <span style={{position:"absolute",top:6,right:6,background:"#ff0000",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:4}}>▶ YouTube</span>}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",background: isYT ? "#fff1f0" : "#f4f3ec",overflow:"hidden"}}>
                        <span style={{fontSize:13,color: isYT ? "#ff0000" : "#888",flexShrink:0}}>{isYT ? "▶" : "🔗"}</span>
                        <span style={{fontSize:13,color:"#185FA5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{p.url}</span>
                        {isYT && <span style={{fontSize:11,color:"#ff0000",flexShrink:0,fontWeight:600}}>音量注意</span>}
                      </div>
                    </a>
                  );
                })() : p.url ? (() => {
                  const isYT = /youtube\.com|youtu\.be/.test(p.url);
                  return (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:6,background: isYT ? "#fff1f0" : "#f4f3ec",borderRadius:8,padding:"6px 10px",marginBottom:10,textDecoration:"none",overflow:"hidden",minWidth:0,border: isYT ? "1px solid #ffcccc" : "none"}}>
                      <span style={{fontSize:14,color: isYT ? "#ff0000" : "#888",flexShrink:0}}>{isYT ? "▶" : "🔗"}</span>
                      <span style={{fontSize:14,color:"#185FA5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0,flex:1}}>{p.url}</span>
                      {isYT && <span style={{fontSize:11,color:"#ff0000",flexShrink:0,fontWeight:600}}>音量注意</span>}
                    </a>
                  );
                })() : null}

                {hasEng && (
                  <div style={{background:"#E8ECF0",borderRadius:10,boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",padding:"6px 10px",marginBottom:10,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                    <span style={{fontSize:13,color:"#aaa"}}>外部</span>
                    {engDefs.map(d => { const v=fmtNum(p.eng?.[d.key]); if(!v)return null; return <span key={d.key} style={{fontSize:14,display:"flex",alignItems:"center",gap:3}}><span style={{color:"#aaa"}}>{d.icon}</span><span style={{fontWeight:500,color:"#333"}}>{v}</span><span style={{fontSize:13,color:"#aaa"}}>{d.label}</span></span>; })}
                  </div>
                )}

                <div style={{paddingTop:10,marginTop:8,borderTop:"1px solid rgba(197,201,212,0.4)",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <button onClick={() => toggleLike(p)} style={{display:"flex",alignItems:"center",gap:3,padding:"5px 9px",border:"none",borderRadius:20,background:"#E8ECF0",color:iLiked?"#D85A30":"#999",fontSize:13,cursor:"pointer",fontWeight:iLiked?600:400,whiteSpace:"nowrap",boxShadow:iLiked?"inset 2px 2px 5px #C5C9D4, inset -2px -2px 5px #FFFFFF":"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF"}}><span>♥</span><span>いいね</span><span style={{fontSize:12}}>{(p.internal?.likes||[]).length}</span></button>
                  <button onClick={() => { setCommentOpen(isOpen?null:p.id); setCommentText(""); }} style={{display:"flex",alignItems:"center",gap:3,padding:"5px 9px",border:"none",borderRadius:20,background:"#E8ECF0",color:isOpen?"#3C3489":"#999",fontSize:13,cursor:"pointer",fontWeight:isOpen?600:400,whiteSpace:"nowrap",boxShadow:isOpen?"inset 2px 2px 5px #C5C9D4, inset -2px -2px 5px #FFFFFF":"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF"}}><span>💬</span><span style={{fontSize:12}}>{(p.internal?.comments||[]).length}</span></button>
                  {!p.machine?.includes("全般") && (() => { const isFav=favMachines.includes(p.machine); return <button onClick={()=>toggleFavMachine(p.machine)} title={isFav?"注目台から外す":"この機種を注目台に追加"} style={{padding:"5px 7px",border:"none",borderRadius:20,background:"#E8ECF0",color:isFav?"#E8B000":"#999",fontSize:16,cursor:"pointer",lineHeight:1,boxShadow:isFav?"inset 2px 2px 5px #C5C9D4, inset -2px -2px 5px #FFFFFF":"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF"}}>{isFav?"★":"☆"}</button>; })()}
                  <div style={{marginLeft:"auto",display:"flex",gap:4}}>
                    <div style={{position:"relative"}}>
                      <button onClick={e => { e.stopPropagation(); setShareOpen(shareOpen===p.id?null:p.id); }} style={{padding:"5px 10px",border:"none",borderRadius:20,background:"#E8ECF0",color:"#888",fontSize:13,cursor:"pointer",whiteSpace:"nowrap",boxShadow:"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF"}}>シェア ↗</button>
                      {shareOpen===p.id && (
                        <div onClick={e => e.stopPropagation()} style={{position:"absolute",right:0,bottom:"calc(100% + 6px)",background:"#fff",borderRadius:12,boxShadow:"0 4px 16px rgba(0,0,0,0.15)",padding:8,display:"flex",flexDirection:"column",gap:4,minWidth:150,zIndex:100}}>
                          <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/api/og?post=${p.id}`); showToast("リンクをコピーしました"); setShareOpen(null); }} style={{padding:"8px 12px",border:"none",borderRadius:8,background:"#f5f5f5",color:"#555",fontSize:14,cursor:"pointer",textAlign:"left"}}>🔗 リンクをコピー</button>
                          <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`【SLOKEY】${p.machine} - ${p.title}\n#パチスロ #SLOKEY`)}&url=${encodeURIComponent(`${window.location.origin}/api/og?post=${p.id}`)}`} target="_blank" rel="noopener noreferrer" onClick={() => setShareOpen(null)} style={{padding:"8px 12px",borderRadius:8,background:"#f5f5f5",color:"#333",fontSize:14,textDecoration:"none",display:"block"}}>𝕏 でシェア</a>
                          <a href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(`${window.location.origin}/api/og?post=${p.id}`)}&text=${encodeURIComponent(`【SLOKEY】${p.machine} - ${p.title}`)}`} target="_blank" rel="noopener noreferrer" onClick={() => setShareOpen(null)} style={{padding:"8px 12px",borderRadius:8,background:"#f5f5f5",color:"#06C755",fontSize:14,fontWeight:600,textDecoration:"none",display:"block"}}>LINE でシェア</a>
                          {(() => { const isBad=(p.internal?.bads||[]).indexOf(MY_UID)>=0; return <button onClick={() => { toggleBad(p); setShareOpen(null); }} style={{padding:"8px 12px",border:"none",borderRadius:8,background:isBad?"#fff0f0":"#f5f5f5",color:isBad?"#c62828":"#999",fontSize:14,cursor:"pointer",textAlign:"left"}}>🚫 {isBad?"NG解除":"NG報告"}</button>; })()}
                        </div>
                      )}
                    </div>
                    {isOwn && (
                      <div style={{position:"relative"}}>
                        <button onClick={e => { e.stopPropagation(); setEditOpen(editOpen===p.id?null:p.id); }} style={{padding:"5px 10px",border:"none",borderRadius:20,background:"#E8ECF0",color:"#888",fontSize:13,cursor:"pointer",whiteSpace:"nowrap",boxShadow:"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF"}}>編集 ▾</button>
                        {editOpen===p.id && (
                          <div onClick={e => e.stopPropagation()} style={{position:"absolute",right:0,bottom:"calc(100% + 6px)",background:"#fff",borderRadius:12,boxShadow:"0 4px 16px rgba(0,0,0,0.15)",padding:8,display:"flex",flexDirection:"column",gap:4,minWidth:130,zIndex:100}}>
                            <button onClick={() => { startEdit(p); setEditOpen(null); }} style={{padding:"8px 12px",border:"none",borderRadius:8,background:"#f5f5f5",color:"#555",fontSize:14,cursor:"pointer",textAlign:"left"}}>✏️ 編集する</button>
                            <button onClick={() => { handleDelete(p.id); setEditOpen(null); }} style={{padding:"8px 12px",border:"none",borderRadius:8,background:"#fff0f0",color:"#c62828",fontSize:14,cursor:"pointer",textAlign:"left"}}>🗑️ 削除する</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {isOpen && (
                  <div style={{marginTop:10}}>
                    {(p.internal?.comments||[]).map((c,i) => (
                      <div key={i} style={{marginBottom:10}}>
                        <div style={{display:"flex",gap:8}}>
                          <div style={{width:24,height:24,borderRadius:"50%",background:c.uid===MY_UID?"#FAECE7":"#f0f0f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:c.uid===MY_UID?"#993C1D":"#888",flexShrink:0,fontWeight:500}}>{c.uid===MY_UID?"自":"他"}</div>
                          <div style={{flex:1}}>
                            <div style={{background:"#E8ECF0",borderRadius:10,boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",padding:"6px 10px",fontSize:15,color:"#333",lineHeight:1.5}}>{c.text}<span style={{fontSize:13,color:"#aaa",marginLeft:8}}>{c.ts}</span></div>
                            <button onClick={() => { setReplyTo(replyTo?.postId===p.id&&replyTo?.idx===i?null:{postId:p.id,idx:i}); setReplyText(""); }} style={{fontSize:12,color:"#aaa",background:"none",border:"none",cursor:"pointer",padding:"2px 4px"}}>↩ 返信</button>
                          </div>
                        </div>
                        {(c.replies||[]).map((r,j) => (
                          <div key={j} style={{display:"flex",gap:6,marginTop:6,paddingLeft:32}}>
                            <div style={{width:20,height:20,borderRadius:"50%",background:r.uid===MY_UID?"#FAECE7":"#f0f0f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:r.uid===MY_UID?"#993C1D":"#888",flexShrink:0,fontWeight:500}}>{r.uid===MY_UID?"自":"他"}</div>
                            <div style={{flex:1,background:"#E8ECF0",borderRadius:10,boxShadow:"inset 2px 2px 4px #C5C9D4, inset -2px -2px 4px #FFFFFF",padding:"5px 8px",fontSize:14,color:"#333",lineHeight:1.5}}>{r.text}<span style={{fontSize:12,color:"#aaa",marginLeft:8}}>{r.ts}</span></div>
                          </div>
                        ))}
                        {replyTo?.postId===p.id && replyTo?.idx===i && (
                          <div style={{display:"flex",gap:6,marginTop:6,paddingLeft:32}}>
                            <input value={replyText} onChange={e=>setReplyText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addReply(p,i);}}} placeholder="返信を入力… (Enter)" style={{flex:1,fontSize:16,padding:"5px 8px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF"}} autoFocus />
                            <button onClick={()=>addReply(p,i)} style={{padding:"5px 12px",background:"#D85A30",color:"#fff",border:"none",borderRadius:8,fontSize:14,cursor:"pointer"}}>送信</button>
                          </div>
                        )}
                      </div>
                    ))}
                    <div style={{display:"flex",gap:6}}>
                      <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => { if(e.key==="Enter"){e.preventDefault();addComment(p);}}} placeholder="コメントを入力… (Enter)" style={{flex:1,fontSize:16,padding:"6px 10px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF"}} />
                      <button onClick={() => addComment(p)} style={{padding:"6px 14px",background:"#D85A30",color:"#fff",border:"none",borderRadius:8,fontSize:15,cursor:"pointer"}}>送信</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CollectTab({ posts, showToast, onCatClick, loadPosts }) {
  const [collectRequests, setCollectRequests] = useState([]);
  const [collectTheme, setCollectTheme] = useState("");
  const [collectCat, setCollectCat] = useState("");
  const [collectSubmitting, setCollectSubmitting] = useState(false);
  const [openCat, setOpenCat] = useState(null);

  useEffect(() => {
    loadCollectRequests();
    const ch = supabase
      .channel("collection_requests_ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "collection_requests" }, loadCollectRequests)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  async function loadCollectRequests() {
    const { data } = await supabase.from("collection_requests").select("*").order("created_at", { ascending: false }).limit(5);
    if (data) setCollectRequests(data);
  }

  async function requestCollect() {
    setCollectSubmitting(true);
    const themeVal = collectTheme.trim();
    const catLabel = collectCat ? { new:"新台情報", info:"機種情報", jissen:"実戦", hall:"業界ニュース", episode:"名機エピソード" }[collectCat] : "";
    const fullTheme = [catLabel, themeVal].filter(Boolean).join("・");
    await supabase.from("collection_requests").insert({ theme: fullTheme, status: "pending" });
    setCollectTheme("");
    setCollectCat("");
    setCollectSubmitting(false);
    showToast("収集を依頼しました。30分以内に反映されます");
  }

  const counts = {};
  ["new","info","jissen","hall","episode"].forEach(k => { counts[k] = posts.filter(p => p.cat===k).length; });

  return (
    <div>

      {/* Claude収集依頼（サーバー側） */}
      <div style={{background:"#E8ECF0",borderRadius:14,boxShadow:"4px 4px 8px #C5C9D4, -3px -3px 6px #FFFFFF",padding:"14px 14px",marginBottom:"1.25rem"}}>
        <div style={{fontWeight:700,fontSize:15,color:"#444",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:18}}>🤖</span> Claudeに収集を依頼
        </div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
          {[["","なんでも"],["new","新台"],["info","機種情報"],["jissen","実戦"],["hall","業界"],["episode","名機"]].map(([val,label]) => {
            const on = collectCat === val;
            return <button key={val} onClick={() => setCollectCat(val)} style={{padding:"4px 10px",border:`0.5px solid ${on?"#D85A30":"#ddd"}`,borderRadius:16,fontSize:12,background:on?"#FAECE7":"#fff",color:on?"#993C1D":"#888",cursor:"pointer",fontWeight:on?600:400,whiteSpace:"nowrap"}}>{label}</button>;
          })}
        </div>
        <input
          style={{width:"100%",padding:"9px 12px",borderRadius:10,border:"none",background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -2px -2px 5px #FFFFFF",fontSize:16,outline:"none",boxSizing:"border-box",color:"#333",fontFamily:"inherit",marginBottom:10}}
          value={collectTheme}
          onChange={e => setCollectTheme(e.target.value)}
          placeholder="機種名やテーマ（任意）例：バイオRE3天井、夏の新台…"
        />
        <button
          onClick={requestCollect}
          disabled={collectSubmitting}
          style={{width:"100%",padding:"11px 0",borderRadius:12,border:"none",background:collectSubmitting?"#C5C9D4":"#D85A30",color:"#fff",fontSize:14,fontWeight:700,cursor:collectSubmitting?"not-allowed":"pointer",boxShadow:collectSubmitting?"none":"3px 3px 8px #C5C9D4, -1px -1px 4px #FFFFFF",transition:"all 0.15s"}}
        >
          {collectSubmitting ? "依頼中…" : "3〜5件の収集を依頼 ✉"}
        </button>
        {collectRequests.length > 0 && (
          <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:6}}>
            {collectRequests.map(r => {
              const stInfo = {pending:{label:"⏳ 待機中",color:"#888"},processing:{label:"⚙️ 収集中",color:"#2563EB"},done:{label:"✅ 完了",color:"#16A34A"},error:{label:"❌ エラー",color:"#DC2626"}};
              const st = stInfo[r.status] || stInfo.pending;
              return (
                <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,color:"#888",background:"#F0F2F5",borderRadius:8,padding:"5px 10px"}}>
                  <span>{r.theme || "（テーマなし）"}{r.result_count > 0 && <span style={{color:"#16A34A",marginLeft:6}}>{r.result_count}件追加</span>}{r.result_machines && <span style={{color:"#555",marginLeft:6}}>{r.result_machines}</span>}</span>
                  <span style={{color:st.color,fontWeight:600,flexShrink:0,marginLeft:8}}>{st.label}</span>
                </div>
              );
            })}
          </div>
        )}
        <p style={{fontSize:11,color:"#aaa",marginTop:8,textAlign:"center",lineHeight:1.5}}>30分以内に自動処理・機種情報にも反映されます</p>
      </div>


      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom: openCat ? 8 : "1.25rem"}}>
        {["new","info","jissen","hall","episode"].map(k => {
          const isOpen = openCat === k;
          return (
            <div key={k} onClick={() => setOpenCat(isOpen ? null : k)}
              style={{background: isOpen ? CATS[k].bg : "#E8ECF0",borderRadius:10,boxShadow: isOpen ? `0 0 0 2px ${CATS[k].border}` : "inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",padding:"8px 10px",cursor:"pointer",border:`1.5px solid ${isOpen ? CATS[k].border : "transparent"}`,transition:"all 0.15s"}}>
              <div style={{fontSize:22,fontWeight:500,color:"#333"}}>{counts[k]}</div>
              <div style={{fontSize:13,color:CATS[k].color,marginTop:2,fontWeight:500,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span>{CATS[k].label}</span>
                <span style={{fontSize:11,color:"#bbb"}}>{isOpen ? "▲" : "▼"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {openCat && (() => {
        const catPosts = posts.filter(p => p.cat === openCat).sort((a,b) => new Date(b.created_at||0) - new Date(a.created_at||0)).slice(0,5);
        return (
          <div style={{marginBottom:"1.25rem",background:"#fff",border:`1px solid ${CATS[openCat].border}`,borderRadius:12,overflow:"hidden"}}>
            <div style={{background:CATS[openCat].bg,padding:"8px 12px",fontSize:13,fontWeight:700,color:CATS[openCat].color,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span>{CATS[openCat].label} — 最新{catPosts.length}件</span>
              <button onClick={() => { onCatClick?.(openCat); }} style={{fontSize:11,background:"none",border:"none",color:CATS[openCat].color,cursor:"pointer",textDecoration:"underline",padding:0}}>全件を投稿タブで見る →</button>
            </div>
            {catPosts.length === 0
              ? <div style={{padding:"14px 12px",color:"#aaa",fontSize:13}}>まだ投稿がありません</div>
              : catPosts.map(p => (
                <div key={p.id} style={{padding:"10px 12px",borderTop:`0.5px solid #f0f0f0`}}>
                  <div style={{fontSize:12,color:"#888",marginBottom:2}}>{p.machine || "全般"}</div>
                  <div style={{fontSize:14,fontWeight:500,color:"#333",lineHeight:1.4}}>{p.title}</div>
                  <div style={{fontSize:12,color:"#666",marginTop:3,lineHeight:1.4}}>{p.body?.slice(0,60)}{p.body?.length > 60 ? "…" : ""}</div>
                </div>
              ))
            }
          </div>
        );
      })()}

    </div>
  );
}

function OverviewTab({ posts, updatePost }) {
  const [view, _setView] = useState(() => sessionStorage.getItem("slokey_overviewView") || "rank");
  const setView = (v) => { sessionStorage.setItem("slokey_overviewView", v); _setView(v); };
  const nextCalendarRef = useRef(null);
  useEffect(() => {
    if (view === "calendar") {
      setTimeout(() => nextCalendarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    }
  }, [view]);
  const [selM, setSelM] = useState(null);
  const [filter, setFilter] = useState({ machine:"", cat:"" });
  const [rankSort, setRankSort] = useState("posts");
  const [selectedPost, setSelectedPost] = useState(null);
  const [postList, setPostList] = useState([]);
  const postIdx = postList.findIndex(p => p.id === selectedPost?.id);
  const hasPrev = postIdx > 0;
  const hasNext = postIdx < postList.length - 1 && postList.length > 1;
  const modalScrollRef = React.useRef(null);
  React.useEffect(() => { modalScrollRef.current?.scrollTo(0, 0); }, [selectedPost?.id]);
  const [expandedMachinePostId, setExpandedMachinePostId] = useState(null);
  const [expandedRankId, setExpandedRankId] = useState(null);
  const [expandedMachineId, setExpandedMachineId] = useState(null);
  const [expandedCat, setExpandedCat] = useState(null);
  const [expandedAuthor, setExpandedAuthor] = useState(null);

  const machinePosts = useMemo(() =>
    selM ? posts.filter(p => p.machine === selM).sort((a,b) => (b.internal?.likes?.length||0)-(a.internal?.likes?.length||0)) : []
  , [posts, selM]);

  const machines = useMemo(() => {
    const m = {};
    posts.filter(p => p.cat !== "fun").forEach(p => {
      if (!m[p.machine]) m[p.machine] = { name:p.machine, count:0, likes:0, cats:{} };
      m[p.machine].count++;
      m[p.machine].likes += (p.internal?.likes?.length||0);
      m[p.machine].cats[p.cat] = (m[p.machine].cats[p.cat]||0)+1;
    });
    return Object.values(m).sort((a,b) => b.likes-a.likes);
  }, [posts]);

  const catDist = useMemo(() => {
    const base = posts.length;
    return ["new","info","jissen","hall","episode"].map(k => {
      const ps = posts.filter(p => p.cat===k);
      const likes = ps.reduce((s,p) => s+(p.internal?.likes?.length||0), 0);
      const top = ps.slice().sort((a,b) => (b.internal?.likes?.length||0)-(a.internal?.likes?.length||0))[0];
      return { key:k, label:CATS[k].label, bg:CATS[k].bg, color:CATS[k].color, cnt:ps.length, pct:base?Math.round(ps.length/base*100):0, likes, top, isFun:false };
    });
  }, [posts]);

  const filteredPosts = useMemo(() =>
    posts.filter(p => (!filter.machine||p.machine===filter.machine)&&(!filter.cat||p.cat===filter.cat))
      .sort((a,b) => (b.internal?.likes?.length||0)-(a.internal?.likes?.length||0))
  , [posts, filter]);

  const authorRank = useMemo(() => {
    const a = {};
    posts.forEach(p => {
      const name = p.internal?.author || p.author || "ゲスト";
      if (!a[name]) a[name] = { name, count:0, likes:0, top:null };
      a[name].count++;
      a[name].likes += (p.internal?.likes?.length || 0);
      if (!a[name].top || (p.internal?.likes?.length||0) > (a[name].top.internal?.likes?.length||0)) a[name].top = p;
    });
    return Object.values(a).sort((a,b) => b.likes - a.likes || b.count - a.count);
  }, [posts]);

  const th = { fontSize:13, color:"#888", padding:"6px 10px", textAlign:"left", fontWeight:500, borderBottom:"0.5px solid #eee", whiteSpace:"nowrap" };
  const td = { fontSize:15, padding:"7px 10px", color:"#333", borderBottom:"0.5px solid #eee", verticalAlign:"middle" };

  return (
    <div>
      {selectedPost && (
        <div onClick={() => setSelectedPost(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={e => e.stopPropagation()} style={{background:"#fff",borderRadius:"16px 16px 0 0",width:"100%",maxWidth:740,maxHeight:"80vh",display:"flex",flexDirection:"column",boxSizing:"border-box"}}>
            {/* 上部バー：カテゴリ＋閉じる */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px 8px",borderBottom:"0.5px solid #eee",flexShrink:0}}>
              <div style={{display:"flex",gap:5,alignItems:"center"}}>
                <CatBadge cat={selectedPost.cat}/>
                {AUTO_AUTHORS.includes(selectedPost.internal?.author||selectedPost.author) ? <QualityBadge q={selectedPost.quality || 1}/> : null}
              </div>
              <button onClick={() => setSelectedPost(null)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#aaa",padding:"0 4px",lineHeight:1}}>×</button>
            </div>
            {/* スクロールエリア */}
            <div ref={modalScrollRef} style={{overflowY:"auto",padding:"12px 16px 16px",flex:1,minHeight:0}}>
              <div style={{fontSize:14,color:"#888",marginBottom:4,display:"flex",gap:8,flexWrap:"wrap"}}>
                <span style={{fontWeight:500,color:"#555"}}>@{selectedPost.internal?.author||selectedPost.author||"ゲスト"}</span>
                <span>機種: <span style={{color:"#333",fontWeight:500}}>{selectedPost.machine}</span></span>
              </div>
              <div style={{fontSize:16,fontWeight:500,color:"#333",marginBottom:6,overflowWrap:"anywhere"}}>{selectedPost.title}</div>
              <div style={{fontSize:15,color:"#666",lineHeight:1.65,marginBottom:8,overflowWrap:"anywhere"}}>{selectedPost.body}</div>
              {selectedPost.internal?.imageUrl && (
                <img src={selectedPost.internal.imageUrl} alt="" decoding="async" style={{width:"100%",maxHeight:300,objectFit:"contain",borderRadius:8,marginBottom:8,display:"block",background:"#f9f9f9"}} />
              )}
              {selectedPost.url && (
                <a href={selectedPost.url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:6,background:"#f4f3ec",borderRadius:8,padding:"6px 10px",textDecoration:"none",overflow:"hidden",marginBottom:8}}>
                  <span style={{fontSize:14,color:"#888",flexShrink:0}}>🔗</span>
                  <span style={{fontSize:14,color:"#185FA5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,minWidth:0}}>{selectedPost.url}</span>
                </a>
              )}
              {(() => {
                const related = posts.filter(p => p.id !== selectedPost.id && p.machine === selectedPost.machine && p.machine !== "全般").sort((a,b) => (b.internal?.likes?.length||0)-(a.internal?.likes?.length||0)).slice(0,3);
                if (!related.length) return null;
                return (
                  <div style={{marginTop:4}}>
                    <div style={{fontSize:13,color:"#aaa",marginBottom:6}}>同じ機種の投稿</div>
                    {related.map(p => (
                      <div key={p.id} onClick={() => setSelectedPost(p)} style={{background:"#f9f9f9",borderRadius:10,padding:"8px 12px",marginBottom:6,cursor:"pointer",border:"0.5px solid #eee"}}>
                        <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:3}}><CatBadge cat={p.cat}/><span style={{marginLeft:"auto",fontSize:13,color:"#D85A30",fontWeight:500}}>♥ {p.internal?.likes?.length||0}</span></div>
                        <div style={{fontSize:14,fontWeight:500,color:"#333",overflowWrap:"anywhere"}}>{p.title}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            {/* 下部固定ナビバー */}
            {postList.length > 1 && (
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,padding:"10px 16px",borderTop:"0.5px solid #eee",flexShrink:0,background:"#fff"}}>
                <button onClick={() => setSelectedPost(postList[postIdx-1])} disabled={!hasPrev} style={{background:"#E8ECF0",border:"none",borderRadius:10,padding:"8px 20px",fontSize:20,cursor:hasPrev?"pointer":"default",color:hasPrev?"#555":"#ccc",boxShadow:hasPrev?"3px 3px 6px #C5C9D4,-3px -3px 6px #FFFFFF":"none",lineHeight:1}}>‹</button>
                <span style={{fontSize:14,color:"#aaa",minWidth:48,textAlign:"center"}}>{postIdx+1} / {postList.length}</span>
                <button onClick={() => setSelectedPost(postList[postIdx+1])} disabled={!hasNext} style={{background:"#E8ECF0",border:"none",borderRadius:10,padding:"8px 20px",fontSize:20,cursor:hasNext?"pointer":"default",color:hasNext?"#555":"#ccc",boxShadow:hasNext?"3px 3px 6px #C5C9D4,-3px -3px 6px #FFFFFF":"none",lineHeight:1}}>›</button>
              </div>
            )}
          </div>
        </div>
      )}
      <div style={{position:"sticky",top:52,zIndex:10,background:"#E8ECF0",paddingBottom:8,marginBottom:"1.25rem"}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[["rank","ランキング"],["machine","機種別"],["cat","カテゴリ分布"],["author","投稿者"],["browse","絞り込み"],["gap","ギャップ表"],["calendar","新台カレンダー"]].map(([k,l]) => {
            const on = view===k;
            return <button key={k} onClick={() => { setView(k); setSelM(null); }} style={{padding:"5px 10px",border:`0.5px solid ${on?"#D85A30":"#ddd"}`,borderRadius:8,fontSize:13,background:on?"#FAECE7":"#fff",color:on?"#993C1D":"#888",cursor:"pointer",fontWeight:on?500:400,whiteSpace:"nowrap"}}>{l}</button>;
          })}
        </div>
      </div>

      {view==="rank" && (() => {
        const TWO_WEEKS = Date.now() - 14 * 24 * 60 * 60 * 1000;
        const machineMap = {};
        posts.filter(p => p.machine && p.machine !== "全般").forEach(p => {
          if (!machineMap[p.machine]) machineMap[p.machine] = { posts:0, likes:0, quality:[], recent:0 };
          const m = machineMap[p.machine];
          m.posts++;
          m.likes += (p.internal?.likes?.length || 0);
          if (p.quality) m.quality.push(p.quality);
          if (p.created_at && new Date(p.created_at).getTime() > TWO_WEEKS) m.recent++;
        });
        const rows = Object.entries(machineMap).map(([name, d]) => ({
          name,
          posts: d.posts,
          likes: d.likes,
          quality: d.quality.length ? Math.round(d.quality.reduce((a,b)=>a+b,0) / d.quality.length * 10) / 10 : null,
          recent: d.recent,
        }));
        const SORTS = [["posts","投稿数"],["likes","いいね"],["quality","品質"],["recent","直近2週"]];
        const sorted = [...rows].sort((a,b) => {
          if (rankSort === "quality") return (b.quality||0) - (a.quality||0);
          return b[rankSort] - a[rankSort];
        });
        return (
          <div>
            <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
              {SORTS.map(([k,l]) => {
                const on = rankSort===k;
                return <button key={k} onClick={() => setRankSort(k)} style={{padding:"5px 14px",border:`0.5px solid ${on?"#185FA5":"#ddd"}`,borderRadius:8,fontSize:13,background:on?"#E6F1FB":"#fff",color:on?"#185FA5":"#888",cursor:"pointer",fontWeight:on?600:400}}>{l}</button>;
              })}
            </div>
            <div style={{background:"#fff",border:"0.5px solid #eee",borderRadius:14,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"28px 1fr 44px 44px 52px 52px",padding:"6px 12px",background:"#E8ECF0",fontSize:12,color:"#888",fontWeight:500,gap:4,alignItems:"center"}}>
                <span>#</span><span>機種</span><span style={{textAlign:"right"}}>投稿</span><span style={{textAlign:"right"}}>いいね</span><span style={{textAlign:"right"}}>品質</span><span style={{textAlign:"right"}}>直近2週</span>
              </div>
              {sorted.map((r,i) => {
                const isTop = i === 0;
                const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":null;
                return (
                  <div key={r.name} style={{display:"grid",gridTemplateColumns:"28px 1fr 44px 44px 52px 52px",padding:"9px 12px",borderTop:"0.5px solid #f0f0f0",background:isTop?"#FFFDE7":"#fff",fontSize:14,gap:4,alignItems:"center"}}>
                    <span style={{fontSize:15}}>{medal || <span style={{color:"#bbb",fontSize:12}}>{i+1}</span>}</span>
                    <span style={{fontWeight:isTop?600:400,color:"#333",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:13}}>{r.name}</span>
                    <span style={{textAlign:"right",color:rankSort==="posts"?"#185FA5":"#555",fontWeight:rankSort==="posts"?600:400}}>{r.posts}</span>
                    <span style={{textAlign:"right",color:rankSort==="likes"?"#185FA5":"#555",fontWeight:rankSort==="likes"?600:400}}>{r.likes}</span>
                    <span style={{textAlign:"right",color:rankSort==="quality"?"#185FA5":"#555",fontWeight:rankSort==="quality"?600:400}}>{r.quality ?? "—"}</span>
                    <span style={{textAlign:"right",color:rankSort==="recent"?"#185FA5":"#555",fontWeight:rankSort==="recent"?600:400}}>{r.recent > 0 ? `+${r.recent}` : "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {view==="machine" && (
        <div style={{background:"#fff",border:"0.5px solid #eee",borderRadius:12,overflow:"hidden"}}>
          <div style={{display:"flex",padding:"6px 10px",background:"#f9f9f9",borderBottom:"0.5px solid #eee"}}>
            <span style={{...th,flex:1,padding:0}}>機種名</span>
            <span style={{...th,width:40,textAlign:"right",padding:0}}>件数</span>
            <span style={{...th,width:48,textAlign:"right",padding:0}}>♥</span>
            <span style={{width:36}}/>
          </div>
          {machines.map((m,i) => {
            const sel = selM===m.name;
            const mPosts = sel ? machinePosts : [];
            return (
              <React.Fragment key={m.name}>
                <div onClick={() => setSelM(sel?null:m.name)} style={{display:"flex",alignItems:"center",padding:"7px 10px",background:sel?"#FAECE7":i%2===0?"#fff":"#fafafa",cursor:"pointer",borderBottom:"0.5px solid #eee"}}>
                  <span style={{flex:1,fontSize:15,fontWeight:sel?600:400,color:sel?"#993C1D":"#333",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0}}>{m.name}</span>
                  <span style={{width:40,textAlign:"right",fontSize:14,color:"#888",flexShrink:0}}>{m.count}</span>
                  <span style={{width:48,textAlign:"right",fontSize:15,fontWeight:500,color:"#D85A30",flexShrink:0}}>{m.likes}</span>
                  <span style={{width:36,textAlign:"center",fontSize:12,color:sel?"#993C1D":"#aaa",flexShrink:0}}>{sel?"▲":"▼"}</span>
                </div>
                {sel && (
                  <div style={{background:"#FFF8F5",borderBottom:"0.5px solid #F0E0D8",padding:"6px 10px 4px"}}>
                    {mPosts.map(mp => {
                      const isExpMP = expandedMachinePostId === mp.id;
                      return (
                        <div key={mp.id} style={{marginBottom:6,borderRadius:8,background:"#fff",border:"0.5px solid #eee",borderLeft:`3px solid ${isExpMP?"#D85A30":"#F0997B"}`,overflow:"hidden"}}>
                          <div onClick={() => setExpandedMachinePostId(isExpMP ? null : mp.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",cursor:"pointer"}}>
                            <CatBadge cat={mp.cat}/>
                            <span style={{flex:1,fontSize:14,fontWeight:600,color:isExpMP?"#993C1D":"#333",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{mp.title}</span>
                            <span style={{fontSize:13,color:"#D85A30",fontWeight:500,flexShrink:0}}>♥{mp.internal?.likes?.length||0}</span>
                            <span style={{fontSize:11,color:"#aaa",flexShrink:0}}>{isExpMP?"▲":"▼"}</span>
                          </div>
                          {isExpMP && (
                            <div style={{padding:"0 12px 12px",borderTop:"0.5px solid #f0f0f0"}}>
                              <div style={{fontSize:13,color:"#aaa",margin:"8px 0 4px"}}>@{mp.internal?.author||mp.author||"ゲスト"}</div>
                              <div style={{fontSize:15,color:"#444",lineHeight:1.65,overflowWrap:"anywhere",marginBottom:8}}>{mp.body}</div>
                              {mp.internal?.imageUrl && <img src={mp.internal.imageUrl} alt="" loading="lazy" decoding="async" style={{width:"100%",maxHeight:260,objectFit:"contain",borderRadius:8,marginBottom:8,display:"block",background:"#f9f9f9"}}/>}
                              {mp.url && mp.internal?.ogImageUrl && !mp.internal?.imageUrl ? (() => {
                                const isYT = /youtube\.com|youtu\.be/.test(mp.url);
                                return (
                                  <a href={mp.url} target="_blank" rel="noopener noreferrer" style={{display:"block",borderRadius:10,overflow:"hidden",marginBottom:8,textDecoration:"none",border: isYT ? "1.5px solid #ff0000" : "0.5px solid #ddd"}}>
                                    <div style={{position:"relative",height:120,background:"#e8e4dc"}}>
                                      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:28,opacity:0.3}}>{isYT ? "▶" : "🔗"}</span></div>
                                      <img src={mp.internal.ogImageUrl} alt="" loading="lazy" decoding="async" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} onError={e=>{e.target.style.display="none";}}/>
                                      {isYT && <span style={{position:"absolute",top:6,right:6,background:"#ff0000",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:4}}>▶ YouTube</span>}
                                    </div>
                                    <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",background: isYT ? "#fff1f0" : "#f4f3ec",overflow:"hidden"}}>
                                      <span style={{fontSize:12,color: isYT ? "#ff0000" : "#888",flexShrink:0}}>{isYT ? "▶" : "🔗"}</span>
                                      <span style={{fontSize:12,color:"#185FA5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{mp.url}</span>
                                      {isYT && <span style={{fontSize:11,color:"#ff0000",flexShrink:0,fontWeight:600}}>音量注意</span>}
                                    </div>
                                  </a>
                                );
                              })() : mp.url ? (() => {
                                const isYT = /youtube\.com|youtu\.be/.test(mp.url);
                                return (
                                  <a href={mp.url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:6,background: isYT ? "#fff1f0" : "#f4f3ec",borderRadius:8,padding:"6px 10px",marginBottom:8,textDecoration:"none",overflow:"hidden",border: isYT ? "1px solid #ffcccc" : "none"}}>
                                    <span style={{fontSize:13,color: isYT ? "#ff0000" : "#888",flexShrink:0}}>{isYT ? "▶" : "🔗"}</span>
                                    <span style={{fontSize:13,color:"#185FA5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,minWidth:0}}>{mp.url}</span>
                                    {isYT && <span style={{fontSize:11,color:"#ff0000",flexShrink:0,fontWeight:600}}>音量注意</span>}
                                  </a>
                                );
                              })() : null}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {view==="cat" && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,marginBottom:10}}>
            {catDist.map(c => {
              const isExp = expandedCat === c.key;
              return (
                <div key={c.key} onClick={() => setExpandedCat(isExp ? null : c.key)} style={{background:isExp?"#FFF8F5":"#fff",border:`0.5px solid ${isExp?"#F0997B":"#eee"}`,borderRadius:12,padding:"10px 12px",cursor:"pointer"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{fontSize:15,fontWeight:500,color:c.color}}>{c.label}{c.isFun&&<span style={{fontSize:11,color:"#bbb",fontWeight:400,marginLeft:4}}>参考</span>}</span>
                    <span style={{fontSize:20,fontWeight:500,color:"#333"}}>{c.cnt}<span style={{fontSize:14,color:"#aaa",marginLeft:2}}>件</span></span>
                  </div>
                  {!c.isFun && <div style={{height:5,background:"#f0f0f0",borderRadius:3,marginBottom:8,overflow:"hidden"}}><div style={{height:"100%",width:c.pct+"%",background:c.color,borderRadius:3,opacity:.7}}/></div>}
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"#888"}}><span>{c.isFun?"分析対象外":`全体 ${c.pct}%`}</span><span>♥ {c.likes}</span></div>
                  <div style={{marginTop:6,fontSize:12,color:isExp?"#993C1D":"#aaa",textAlign:"right"}}>{isExp?"▲ 閉じる":`▼ ${c.cnt}件を見る`}</div>
                </div>
              );
            })}
          </div>
          {expandedCat && (
            <div style={{background:"#fff",border:"0.5px solid #eee",borderRadius:12,overflow:"hidden"}}>
              {posts.filter(p => p.cat === expandedCat).sort((a,b) => (b.internal?.likes?.length||0)-(a.internal?.likes?.length||0)).map((p,i,arr) => (
                <div key={p.id} onClick={e => { e.stopPropagation(); setSelectedPost(p); }} style={{padding:"10px 14px",borderBottom:i<arr.length-1?"0.5px solid #eee":"none",cursor:"pointer",background:i%2===0?"#fff":"#fafafa"}}>
                  <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
                    <span style={{fontSize:12,color:"#bbb",minWidth:20}}>#{i+1}</span>
                    <CatBadge cat={p.cat}/>
                    <span style={{marginLeft:"auto",fontSize:13,color:"#D85A30",fontWeight:500,flexShrink:0}}>♥ {p.internal?.likes?.length||0}</span>
                  </div>
                  <div style={{fontSize:15,fontWeight:500,color:"#333",overflowWrap:"anywhere",marginBottom:2,paddingLeft:26}}>{p.title}</div>
                  <div style={{fontSize:13,color:"#888",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingLeft:26}}>{p.machine} · {p.body.slice(0,50)}{p.body.length>50?"…":""}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view==="author" && (
        <div style={{background:"#fff",border:"0.5px solid #eee",borderRadius:12,overflow:"hidden"}}>
          {authorRank.map((a,i) => {
            const isExp = expandedAuthor === a.name;
            const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":null;
            return (
              <React.Fragment key={a.name}>
                <div onClick={() => setExpandedAuthor(isExp ? null : a.name)}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:"0.5px solid #eee",cursor:"pointer",background:isExp?"#FFF8F5":i%2===0?"#fff":"#fafafa"}}>
                  <span style={{fontSize:14,fontWeight:600,color:i<3?"#D85A30":"#bbb",minWidth:28,textAlign:"center"}}>{medal||`${i+1}`}</span>
                  <span style={{flex:1,fontSize:15,fontWeight:500,color:"#333",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>@{a.name}</span>
                  <span style={{fontSize:13,color:"#888",whiteSpace:"nowrap"}}>{a.count}件</span>
                  <span style={{fontSize:13,color:"#D85A30",fontWeight:500,whiteSpace:"nowrap",minWidth:36,textAlign:"right"}}>♥ {a.likes}</span>
                  <span style={{fontSize:12,color:isExp?"#D85A30":"#bbb"}}>{isExp?"▲":"▼"}</span>
                </div>
                {isExp && a.top && (
                  <div onClick={() => setSelectedPost(a.top)} style={{padding:"10px 14px 12px",borderBottom:"0.5px solid #eee",background:"#FFF8F5",cursor:"pointer",borderLeft:"3px solid #F0997B"}}>
                    <div style={{fontSize:12,color:"#aaa",marginBottom:4}}>最多いいね投稿</div>
                    <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:4}}>
                      <CatBadge cat={a.top.cat}/>
                      <span style={{marginLeft:"auto",fontSize:13,color:"#D85A30",fontWeight:500}}>♥ {a.top.internal?.likes?.length||0}</span>
                    </div>
                    <div style={{fontSize:15,fontWeight:500,color:"#333",overflowWrap:"anywhere"}}>{a.top.title}</div>
                    <div style={{fontSize:13,color:"#888",marginTop:2}}>{a.top.machine}</div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {view==="browse" && (
        <div>
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",gap:8,marginBottom:6}}>
              <select value={filter.machine} onChange={e => setFilter(f=>({...f,machine:e.target.value}))} style={{flex:1,fontSize:15,padding:"8px 10px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",color:"#333",minWidth:0,width:0}}>
                <option value="">すべての機種</option>
                {machines.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
              </select>
              <select value={filter.cat} onChange={e => setFilter(f=>({...f,cat:e.target.value}))} style={{flex:1,fontSize:15,padding:"8px 10px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",color:"#333",minWidth:0,width:0}}>
                <option value="">すべてのカテゴリ</option>
                <option value="new">新台</option>
                <option value="info">機種情報</option>
                <option value="jissen">実戦</option>
                <option value="hall">業界</option>
                <option value="episode">名機</option>
              </select>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:14,color:"#aaa"}}>{filteredPosts.length}件</span>
              {(filter.machine||filter.cat) && <button onClick={() => setFilter({machine:"",cat:""})} style={{fontSize:14,padding:"5px 12px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",color:"#666",cursor:"pointer"}}>リセット</button>}
            </div>
          </div>
          {filteredPosts.map(p => {
            const iLiked = (p.internal?.likes||[]).indexOf(MY_UID) >= 0;
            const toggleLike = async () => {
              const newLikes = toggleArr(p.internal?.likes||[], MY_UID);
              await updatePost(p.id, { internal: { ...p.internal, likes: newLikes } });
            };
            return (
              <div key={p.id} style={{background:"#fff",border:"0.5px solid #eee",borderRadius:12,padding:"10px 14px",marginBottom:8}}>
                <div style={{display:"flex",gap:5,marginBottom:4,alignItems:"center"}}><CatBadge cat={p.cat}/></div>
                <div style={{fontSize:14,color:"#888",marginBottom:3}}>{p.machine}</div>
                <div style={{fontSize:15,fontWeight:500,color:"#333",marginBottom:3}}>{p.title}</div>
                <div style={{fontSize:14,color:"#666",lineHeight:1.6,marginBottom:8,overflowWrap:"anywhere"}}>{p.body}</div>
                <button onClick={toggleLike} style={{display:"flex",alignItems:"center",gap:3,padding:"5px 10px",border:`0.5px solid ${iLiked?"#F0997B":"#ddd"}`,borderRadius:8,background:iLiked?"#FAECE7":"#f9f9f9",color:iLiked?"#993C1D":"#888",fontSize:14,cursor:"pointer",fontWeight:iLiked?500:400}}>♥ {(p.internal?.likes||[]).length}</button>
              </div>
            );
          })}
        </div>
      )}

      {view==="gap" && (() => {
        const GAP_CATS = ["new","info","jissen","hall","episode"];
        const CAT_SHORT = { new:"新台", info:"機種情報", jissen:"実戦", hall:"業界", episode:"名機" };
        const machineMap = {};
        posts.filter(p => p.cat !== "fun" && p.machine !== "全般").forEach(p => {
          if (!machineMap[p.machine]) machineMap[p.machine] = {};
          machineMap[p.machine][p.cat] = (machineMap[p.machine][p.cat] || 0) + 1;
        });
        const machineList = Object.entries(machineMap)
          .map(([name, cats]) => ({ name, total: Object.values(cats).reduce((a,b)=>a+b,0), cats }))
          .sort((a,b) => b.total - a.total);
        const totalGaps = machineList.reduce((sum,m) => sum + GAP_CATS.filter(k=>!m.cats[k]).length, 0);
        return (
          <div>
            <div style={{fontSize:14,color:"#888",marginBottom:10}}>
              {machineList.length}機種 × {GAP_CATS.length}カテゴリ ／ ギャップ <span style={{color:"#C62828",fontWeight:600}}>{totalGaps}個</span>
            </div>
            <div style={{fontSize:12,color:"#aaa",marginBottom:8,display:"flex",gap:12}}>
              <span><span style={{color:"#C62828",fontWeight:600}}>✕</span> 未収録</span>
              <span><span style={{color:"#E65100",fontWeight:600}}>1</span> 1件のみ</span>
              <span><span style={{color:"#2E7D32",fontWeight:600}}>2+</span> 充足</span>
            </div>
            <div className="scroll-x" style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
              <table style={{borderCollapse:"collapse",fontSize:13,whiteSpace:"nowrap"}}>
                <thead>
                  <tr>
                    <th style={{padding:"6px 10px",background:"#E8ECF0",fontWeight:500,color:"#555",textAlign:"left",position:"sticky",left:0,zIndex:2,borderRight:"0.5px solid #C5C9D4",minWidth:100}}>機種</th>
                    {GAP_CATS.map(k => (
                      <th key={k} style={{padding:"6px 8px",background:"#E8ECF0",fontWeight:500,color:CATS[k].color,textAlign:"center",minWidth:54,borderLeft:"0.5px solid #C5C9D4"}}>{CAT_SHORT[k]}</th>
                    ))}
                    <th style={{padding:"6px 8px",background:"#E8ECF0",fontWeight:500,color:"#555",textAlign:"center",borderLeft:"0.5px solid #C5C9D4"}}>計</th>
                  </tr>
                </thead>
                <tbody>
                  {machineList.map(m => (
                    <tr key={m.name}>
                      <td style={{padding:"5px 10px",background:"#fff",fontWeight:500,color:"#333",position:"sticky",left:0,zIndex:1,borderBottom:"0.5px solid #eee",borderRight:"0.5px solid #C5C9D4",fontSize:13}}>{m.name}</td>
                      {GAP_CATS.map(k => {
                        const cnt = m.cats[k] || 0;
                        const bg = cnt===0?"#FDECEA":cnt===1?"#FFF8E1":"#F0F9F0";
                        const col = cnt===0?"#C62828":cnt===1?"#E65100":"#2E7D32";
                        return (
                          <td key={k} onClick={() => { setFilter({machine:m.name,cat:k}); setView("browse"); }}
                            style={{padding:"5px 8px",textAlign:"center",background:bg,color:col,fontWeight:cnt===0?600:400,cursor:"pointer",borderBottom:"0.5px solid #eee",borderLeft:"0.5px solid #eee"}}>
                            {cnt===0?"✕":cnt}
                          </td>
                        );
                      })}
                      <td style={{padding:"5px 8px",textAlign:"center",background:"#f5f5f5",color:"#555",fontWeight:500,borderBottom:"0.5px solid #eee",borderLeft:"0.5px solid #C5C9D4"}}>{m.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {view==="calendar" && (() => {
        const today = new Date();
        const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
        const calMachines = Object.entries(MACHINE_ANALYSIS)
          .filter(([,v]) => v.releaseDate)
          .map(([name, v]) => {
            const rd = new Date(v.releaseDate);
            const isPast = rd < today;
            const relatedPosts = posts.filter(p => p.machine === name && p.cat === "new");
            const specSnippet = v.spec
              ? v.spec.split(' / ').filter(s => s.includes('純増') || s.includes('コイン単価')).map(s => s.slice(0,22)).join(' / ')
              : '';
            return { name, releaseDate: v.releaseDate, rd, isPast, relatedPosts, specSnippet };
          })
          .filter(m => m.rd >= threeMonthsAgo)
          .sort((a,b) => a.rd - b.rd);
        const firstUpcoming = calMachines.find(m => !m.isPast);
        const byMonth = {};
        calMachines.forEach(m => {
          const key = m.releaseDate.slice(0, 7);
          if (!byMonth[key]) byMonth[key] = [];
          byMonth[key].push(m);
        });
        if (calMachines.length === 0) return <div style={{color:"#aaa",fontSize:14,textAlign:"center",paddingTop:40}}>カレンダーデータなし</div>;
        return (
          <div>
            <div style={{fontSize:13,color:"#aaa",marginBottom:12}}>直近3ヶ月 ／ {calMachines.length}台</div>
            {Object.entries(byMonth).map(([ym, machines]) => {
              const [y, mo] = ym.split('-');
              return (
                <div key={ym} style={{marginBottom:20}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#555",marginBottom:8,padding:"4px 8px",background:"#E8ECF0",borderRadius:6}}>📅 {y}年{parseInt(mo)}月</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {machines.map(m => (
                      <div key={m.name} ref={m === firstUpcoming ? nextCalendarRef : null} style={{
                        background: m.isPast ? "#f9f9f9" : "#FFFDE7",
                        border: `0.5px solid ${m.isPast ? "#eee" : "#F9A825"}`,
                        borderRadius:10, padding:"10px 14px",
                        opacity: m.isPast ? 0.75 : 1,
                      }}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                          <span style={{fontSize:11,color:m.isPast?"#aaa":"#E65100",fontWeight:600,background:m.isPast?"#eee":"#FFF3E0",padding:"2px 6px",borderRadius:4,flexShrink:0}}>
                            {m.releaseDate.slice(5).replace('-','/')} {m.isPast?"導入済":"予定"}
                          </span>
                          <span style={{fontSize:14,fontWeight:600,color:"#333",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</span>
                        </div>
                        {m.specSnippet && <div style={{fontSize:12,color:"#777",marginBottom:m.relatedPosts.length?4:0}}>{m.specSnippet}</div>}
                        {m.relatedPosts.slice(0,2).map((p,i) => (
                          <div key={i} style={{fontSize:12,color:"#185FA5",marginTop:2}}>・{p.title}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

function ResearchTab({ posts, aiEnabled, updatePost }) {
  const [mode, _setMode] = useState(() => sessionStorage.getItem("slokey_researchMode") || "column");
  const setMode = (m) => { sessionStorage.setItem("slokey_researchMode", m); _setMode(m); };
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const [analyzeM, setAnalyzeM] = useState("");
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [proposePolicy, setProposePolicy] = useState({ targets:[], coinUnit:"standard", patterns:[], avoids:[], reference:"", extra:"" });
  const [proposeResult, setProposeResult] = useState(null);
  const [proposeLoading, setProposeLoading] = useState(false);

  useEffect(() => { if(bottomRef.current) bottomRef.current.scrollIntoView({behavior:"smooth"}); }, [messages]);

  const analyzeMachines = useMemo(() => {
    const m = {};
    posts.filter(p => p.cat !== "fun" && p.machine && !p.machine.includes("全般")).forEach(p => { m[p.machine] = (m[p.machine]||0)+1; });
    return Object.entries(m).filter(([,c])=>c>=3).sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name,count}));
  }, [posts]);

  const analyzeMachineStatuses = useMemo(() => {
    return analyzeMachines.map(({name,count}) => {
      const data = lookupAnalysis(name);
      if (!data) return {name,count,status:"unanalyzed"};
      if (count >= data.postCount + 3) return {name,count,status:"stale",stored:data.postCount};
      return {name,count,status:"ok",stored:data.postCount};
    });
  }, [analyzeMachines]);

  function lookupAnalysis(machineName) {
    if (MACHINE_ANALYSIS[machineName]) return MACHINE_ANALYSIS[machineName];
    return Object.values(MACHINE_ANALYSIS).find(v => (v.aliases||[]).includes(machineName)) || null;
  }

  function analyze() {
    if (!analyzeM) return;
    const data = lookupAnalysis(analyzeM);
    if (data) {
      setAnalyzeResult({ ...data, machine: analyzeM });
    } else {
      setAnalyzeResult({ error: "この機種の分析データはまだありません。投稿が蓄積されたら追加予定です。" });
    }
  }

  async function generateProposal() {
    if (proposePolicy.targets.length === 0) return;
    setProposeLoading(true);
    setProposeResult(null);
    try {
      const analysisContext = Object.entries(MACHINE_ANALYSIS).map(([name, data]) => {
        const lines = [`【${name}】`];
        if (data.spec) lines.push(`  スペック: ${data.spec}`);
        if (data.summary) lines.push(`  一言: ${data.summary}`);
        if (data.highlight) lines.push(`  ゲーム性: ${data.highlight}`);
        if (data.pros?.length) lines.push(`  良い点: ${data.pros.slice(0,3).join(" / ")}`);
        if (data.cons?.length) lines.push(`  悪い点: ${data.cons.slice(0,3).join(" / ")}`);
        return lines.join("\n");
      }).join("\n\n");

      const libContext = `【ゲームフロー設計パターン】
${Object.entries(GAME_LIBRARY.gameFlowPatterns).map(([k,v]) => `▶${k}: ${v.description}\n  成功例: ${v.examples.map(e=>e.machine+' - '+e.detail).join(' / ')}\n  強み: ${v.strengths.join('・')}\n  弱み: ${v.weaknesses.join('・')}\n  プレイヤー感情: ${v.playerEmotion}`).join("\n\n")}

【CZ設計パターン】
${Object.entries(GAME_LIBRARY.czDesignPatterns).map(([k,v]) => `▶${k}: ${v.description}\n  例: ${v.examples.map(e=>e.machine+(e.czProb?' ('+e.czProb+')':'')+' - '+(e.evaluation||e.issue||e.detail||'')).join(' / ')}`).join("\n\n")}

【コイン単価帯と客層】
${Object.entries(GAME_LIBRARY.specDesign.coinUnitRanges).map(([k,v]) => `${v.range}: ${v.machines.join('・')} → ${v.targetPlayer}`).join("\n")}

【設定差設計パターン】
${Object.entries(GAME_LIBRARY.settingDifferenceDesign).filter(([k])=>k!=='シンプル判別型の成功例').map(([k,v]) => `▶${k}: ${v.merit} / リスク: ${v.demerit||v.risk||''}`).join("\n")}

【市場の空白（まだ誰もやっていない設計）】
${GAME_LIBRARY.marketGaps.現在市場に存在しない設計.map(g=>`・${g.gap}: ${g.opportunity}`).join("\n")}

【失敗パターン共通点】
${GAME_LIBRARY.marketGaps.失敗した機種の共通パターン.join("\n")}

【ライトユーザーが嫌うこと】
${GAME_LIBRARY.playerPsychology.ライトユーザーが嫌うこと.join(" / ")}

【20代が反応する要素】
${GAME_LIBRARY.playerPsychology["20代が反応する要素"].join(" / ")}

【やめられない設計の原理】
${GAME_LIBRARY.playerPsychology.やめられない設計の原理.map(p=>`・${p.type}: ${p.description} (例: ${p.example})`).join("\n")}

【機種別ゲーム性データ】
${Object.entries(GAME_LIBRARY.machines).map(([name, m]) => `▶${name}: ${m.description} | 単価:${m.coinUnit} 純増:${m.atPureIncrease} 天井:${m.ceiling} | 強み:${m.keyStrengths.join("・")} | 市場:${m.marketResult}`).join("\n\n")}`;

      const machineLibContext = MACHINE_LIBRARY.machines.slice(0, 200).map(m =>
        `${m.name}（${m.maker}/${m.year}/${m.era}）[${m.type}] spec:${m.spec} pattern:${m.designPattern} 教訓:${m.lesson} 感情:${m.playerEmotion} tags:${m.tags.join(",")}`
      ).join("\n");

      const COIN_LABEL = { light:"ライト（〜3.0円）", standard:"スタンダード（3.1〜3.5円）", heavy:"ヘビー（3.6〜4.2円）", superHeavy:"超ヘビー（4.3円以上）" };
      const policyText = [
        `ターゲット層: ${proposePolicy.targets.join("・")}`,
        `コイン単価帯: ${COIN_LABEL[proposePolicy.coinUnit]||proposePolicy.coinUnit}`,
        proposePolicy.patterns.length ? `採用したい設計パターン: ${proposePolicy.patterns.join("・")}` : "",
        proposePolicy.avoids.length ? `避けたい要素: ${proposePolicy.avoids.join("・")}` : "",
        proposePolicy.reference ? `参考にしたい機種・要素: ${proposePolicy.reference}` : "",
        proposePolicy.extra ? `その他・備考: ${proposePolicy.extra}` : "",
      ].filter(Boolean).join("\n");
      const prompt = `あなたはパチスロ・パチンコ機種の企画開発コンサルタントです。以下の4つの情報源をもとに、新機種のゲーム性提案書を作成してください。

---
【1. 既存機種 詳細分析データ（14機種）】
${analysisContext}

---
【2. ゲーム設計ライブラリ（設計パターン・市場空白・プレイヤー心理）】
${libContext}

---
【3. 200機種データベース（機種名・スペック・設計パターン・教訓）】
${machineLibContext}

---
【4. 開発指針】
${policyText}

---
以下の構成でマークダウン形式の提案書を作成してください。200機種データベースを参照して類似機種を幅広く検討し、具体的なデータ（機種名・数値・失敗事例）を引用しながら根拠を示してください。

# 新機種ゲーム性提案書

## 1. 市場の現状と課題
（ライブラリの市場空白・失敗パターンを引用しながら「何が足りないか」を250文字程度で）

## 2. コンセプト
（一言キャッチ＋200文字程度の説明。市場の空白を埋める設計コンセプトを明示）

## 3. ゲームフロー概要
（通常時→CZ→AT→上位ATの流れをテキスト図で。設計パターン名を明示して根拠を示す）

## 4. 推奨スペック
（コイン単価帯・機械割・純増・天井を箇条書きで。ライブラリのスペック傾向データを根拠に）

## 5. 近似機種との比較分析
この提案に最も近い既存機種を3つ選び、以下の軸で比較表を作成してください。

| 比較軸 | 近似機種A | 近似機種B | 近似機種C | 本提案 |
|---|---|---|---|---|
| 設計パターン | | | | |
| コイン単価 | | | | |
| 自力感の強さ | | | | |
| やめにくさ | | | | |
| ターゲット層 | | | | |

表の後に「本提案が上記機種と最も異なる点」を2〜3行で明記してください。

## 6. 差別化ポイント
（市場空白リストを根拠に「なぜ今これが面白いのか」を3〜5点で。各点に「〇〇という既存機種にはなかった△△」という形式で記載）

## 7. 想定プレイヤー体験
（ライブラリのプレイヤー心理を参照し、実際に打った時の感情を300文字程度で）

## 8. リスクと対策
（ライブラリの失敗パターンに照らして懸念点と対策を2〜3点で）

ルール：数値は「目安」として明示する。「〜G以内に〜を実現する」など具体的な数値付きで提案する。比較表は必ず埋める。差別化は「〇〇にはなかった」という形式で根拠を持たせる。`;
      const res = await fetch("/api/claude", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:4096, messages:[{role:"user", content:prompt}] }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(typeof data.error === "string" ? data.error : (data.error.message || JSON.stringify(data.error)));
      const text = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("") || "生成に失敗しました。";
      setProposeResult(text);
    } catch(e) {
      setProposeResult("エラーが発生しました: " + (e.message || "不明"));
    }
    setProposeLoading(false);
  }

  const SUGG = ["社内いいねが多い投稿の共通点を教えて","企画ネタになりそうな思い出エピソードをまとめて","北斗天昇の一番盛り上がる演出は？","バジ絆2のBCが続きやすいゾーンってどこ？"];

  async function send(text) {
    const q = (text||input).trim();
    if (!q) return;
    setInput("");
    const msgs = [...messages, { role:"user", content:q }];
    setMessages(msgs);
    setLoading(true);
    try {
      const lib = JSON.stringify(posts.filter(p => p.cat !== "fun").map(p => ({ id:p.id, cat:p.cat, machine:p.machine, title:p.title, body:p.body, likes:p.internal?.likes?.length||0, quality:p.quality })));
      const system = "あなたはパチスロライブラリ「スロキー」の調査アシスタントです。以下のライブラリデータとパチスロの知識を組み合わせて答えてください。【ライブラリデータ】" + lib + " 回答ルール: 質問に直接答える。ライブラリ内の関連投稿がある場合は文末に「関連投稿ID: [1,2,3]」を含める。ライブラリにない情報は（一般知識）と明記。300文字以内で簡潔に。";
      const res = await fetch("/api/claude", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:600, system, messages:msgs }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(typeof data.error === "string" ? data.error : (data.error.message || JSON.stringify(data.error)));
      const raw = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("") || "関連する情報が見つかりませんでした。";
      const idMatch = raw.match(/関連投稿ID[:：]\s*\[([^\]]+)\]/);
      const ids = idMatch ? idMatch[1].split(",").map(s=>parseInt(s.trim(),10)).filter(n=>!isNaN(n)) : [];
      const clean = raw.replace(/関連投稿ID[:：]\s*\[[^\]]*\]/g,"").trim();
      setMessages(prev => [...prev, { role:"assistant", content:clean, relIds:ids }]);
    } catch(e) { setMessages(prev => [...prev, { role:"assistant", content:"エラーが発生しました: " + (e.message || "不明"), relIds:[] }]); }
    setLoading(false);
  }

  return (
    <div style={{minWidth:0}}>
      <div style={{display:"flex",gap:6,marginBottom:"1.25rem",flexWrap:"wrap"}}>
        {[["column","コラム"],["machine_review","機種評価"],["analyze","機種分析"],["gamedesign","ゲーム性分析"],["ai_chat","💬 チャット"],["ai_propose","✏️ 企画提案"]].map(([k,l]) => {
          const on = mode===k;
          const isInteractive = k==="ai_chat" || k==="ai_propose";
          const sep = isInteractive && k==="ai_chat"
            ? <span key="sep" style={{display:"inline-block",width:1,height:22,background:"#ddd",margin:"0 2px",alignSelf:"center",flexShrink:0}} />
            : null;
          const btn = <button key={k} onClick={() => setMode(k)} style={{padding:"5px 12px",border:`0.5px solid ${on?"#D85A30":isInteractive?"#C5BFF5":"#ddd"}`,borderRadius:8,fontSize:13,background:on?"#FAECE7":isInteractive?"#F5F3FF":"#fff",color:on?"#993C1D":isInteractive?"#6C60C0":"#888",cursor:"pointer",fontWeight:on?500:400,whiteSpace:"nowrap",flexShrink:0,minWidth:56,textAlign:"center"}}>{l}</button>;
          return sep ? [sep, btn] : btn;
        })}
      </div>


      {mode==="chat" && (
        <div>
          {messages.length===0 && (
            <div style={{marginBottom:16}}>
              <div style={{fontSize:14,color:"#888",marginBottom:8}}>ライブラリの実データをもとに回答します</div>
              {SUGG.map((s,i) => <button key={i} onClick={() => send(s)} style={{display:"block",width:"100%",textAlign:"left",padding:"8px 14px",border:"0.5px solid #ddd",borderRadius:8,background:"#fff",color:"#666",fontSize:15,cursor:"pointer",marginBottom:6}}>{s}</button>)}
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {messages.map((m,i) => {
              const isUser = m.role==="user";
              const relPosts = !isUser&&m.relIds?.length>0 ? posts.filter(p=>m.relIds.includes(p.id)) : [];
              return (
                <div key={i} style={{display:"flex",flexDirection:"column",alignItems:isUser?"flex-end":"flex-start"}}>
                  <div style={{maxWidth:"88%",padding:"10px 14px",borderRadius:isUser?"12px 12px 4px 12px":"12px 12px 12px 4px",background:isUser?"#D85A30":"#f0f0f0",color:isUser?"#fff":"#333",fontSize:15,lineHeight:1.65}}>{m.content}</div>
                  {relPosts.length>0 && <div style={{marginTop:8,width:"100%"}}><div style={{fontSize:13,color:"#aaa",marginBottom:6}}>ライブラリ内の関連投稿</div>{relPosts.map(p => <div key={p.id} style={{background:"#FAECE7",border:"0.5px solid #F0997B",borderRadius:12,padding:"10px 14px",marginBottom:6}}><div style={{display:"flex",gap:5,marginBottom:4,alignItems:"center"}}><CatBadge cat={p.cat}/><span style={{fontSize:13,color:"#888"}}>{p.machine}</span><span style={{marginLeft:"auto",fontSize:13,color:"#D85A30",fontWeight:500}}>♥ {p.internal?.likes?.length||0}</span></div><div style={{fontSize:15,fontWeight:500,color:"#333",marginBottom:3}}>{p.title}</div><div style={{fontSize:14,color:"#666",lineHeight:1.6}}>{p.body}</div></div>)}</div>}
                </div>
              );
            })}
            {loading && <div style={{alignSelf:"flex-start"}}><div style={{padding:"10px 14px",borderRadius:12,background:"#f0f0f0",fontSize:15,color:"#aaa"}}>調べています...</div></div>}
            <div ref={bottomRef}/>
          </div>
          {!aiEnabled && <div style={{fontSize:14,color:"#e57373",marginBottom:8,padding:"6px 10px",background:"#fff5f5",borderRadius:8,border:"0.5px solid #e57373"}}>APIキーが未設定のためチャットは利用できません</div>}
          <div style={{display:"flex",gap:8,marginTop:12,alignItems:"flex-end"}}>
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder={aiEnabled?"質問を入力... (Enterで送信)":"APIキーが未設定です"} disabled={!aiEnabled} style={{flex:1,fontSize:16,padding:"10px 12px",border:"0.5px solid #ddd",borderRadius:10,background:aiEnabled?"#f9f9f9":"#f0f0f0",resize:"none",minHeight:46,lineHeight:1.5,color:aiEnabled?"#333":"#aaa"}} rows={1}/>
            <button onClick={() => send()} disabled={!aiEnabled||loading||!input.trim()} style={{padding:"0 18px",background:(!aiEnabled||loading||!input.trim())?"#ccc":"#D85A30",color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:500,cursor:(!aiEnabled||loading||!input.trim())?"not-allowed":"pointer",height:46,whiteSpace:"nowrap",flexShrink:0}}>送信</button>
          </div>
          {messages.length>0 && <button onClick={() => setMessages([])} style={{marginTop:6,background:"none",border:"none",fontSize:14,color:"#aaa",cursor:"pointer",padding:0}}>会話をリセット</button>}
        </div>
      )}

      {mode==="column" && (
        <div>
          <div style={{fontSize:13,color:"#888",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span>スロキー編集部コラム</span>
            <span style={{fontSize:12,color:"#bbb"}}>更新: {EDITORIAL_DATA.updatedAt}</span>
          </div>
          {EDITORIAL_DATA.columns.map(col => (
            <div key={col.id} style={{background:"#fff",border:"0.5px solid #eee",borderRadius:14,marginBottom:16,overflow:"hidden"}}>
              <div style={{padding:"12px 14px",borderBottom:"0.5px solid #f0f0f0"}}>
                <div style={{fontSize:15,fontWeight:700,color:"#333",marginBottom:6,lineHeight:1.4}}>{col.title}</div>
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{fontSize:12,fontWeight:600,color:col.tagColor,background:col.tagBg,borderRadius:6,padding:"2px 8px",whiteSpace:"nowrap"}}>{col.tag}</span>
                  <span style={{fontSize:12,color:"#bbb"}}>{col.author} · {col.date}</span>
                </div>
              </div>
              <div style={{padding:"14px 14px"}}>
                <div style={{fontSize:14,color:"#444",lineHeight:1.85,overflowWrap:"anywhere",whiteSpace:"pre-wrap"}}>{col.body}</div>
              </div>
              <ColumnFeedback columnId={col.id} columnTitle={col.title} />
            </div>
          ))}
        </div>
      )}

      {mode==="machine_review" && (
        <div>
          <div style={{fontSize:13,color:"#888",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span>スロキー編集部の機種評価</span>
            <span style={{fontSize:12,color:"#bbb"}}>更新: {COLUMN_DATA.updatedAt}</span>
          </div>
          {COLUMN_DATA.columns.map(col => (
            <div key={col.id} style={{background:"#fff",border:"0.5px solid #eee",borderRadius:14,marginBottom:12,overflow:"hidden"}}>
              <div style={{padding:"10px 14px",borderBottom:"0.5px solid #f0f0f0",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                <div style={{minWidth:0,flex:1}}>
                  <div style={{fontSize:15,fontWeight:600,color:"#333",marginBottom:4,overflowWrap:"anywhere"}}>{col.name}</div>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                    <span style={{fontSize:12,fontWeight:600,color:col.tagColor,background:col.tagBg,borderRadius:6,padding:"2px 8px",whiteSpace:"nowrap"}}>{col.tag}</span>
                    <span style={{fontSize:12,color:"#aaa"}}>投稿{col.postCount}件</span>
                    {col.releaseDate && <span style={{fontSize:12,color:"#aaa"}}>{col.releaseDate.slice(0,7)}導入</span>}
                  </div>
                </div>
                {(col.longevityMin || col.sisPrevWeeks) && (
                  <div style={{flexShrink:0,textAlign:"center",background:"#F1F8E9",borderRadius:10,padding:"6px 10px",minWidth:70}}>
                    {col.sisPrevWeeks && !col.sisWeeks ? (
                      <>
                        <div style={{fontSize:10,color:"#558B2F",fontWeight:600,marginBottom:2}}>前作SIS実績</div>
                        <div style={{fontSize:18,fontWeight:700,color:"#2E7D32",lineHeight:1}}>{col.sisPrevWeeks}<span style={{fontSize:11}}>週</span></div>
                        <div style={{fontSize:10,color:"#aaa",marginTop:1}}>{col.sisPrevTitle?.replace("Lパチスロ","")?.replace("Lスマスロ","")}</div>
                      </>
                    ) : col.sisWeeks ? (
                      <>
                        <div style={{fontSize:10,color:"#558B2F",fontWeight:600,marginBottom:2}}>SIS稼働</div>
                        <div style={{fontSize:18,fontWeight:700,color:"#2E7D32",lineHeight:1}}>{col.sisWeeks}<span style={{fontSize:11}}>週</span></div>
                      </>
                    ) : col.longevityMin ? (
                      <>
                        <div style={{fontSize:10,color:"#1565C0",fontWeight:600,marginBottom:2}}>稼働予測</div>
                        <div style={{fontSize:14,fontWeight:700,color:"#1565C0",lineHeight:1}}>{col.longevityMin}〜{col.longevityMax}<span style={{fontSize:10}}>週</span></div>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
              <div style={{padding:"12px 14px"}}>
                <div style={{fontSize:14,color:"#444",lineHeight:1.75,overflowWrap:"anywhere"}}>{col.column}</div>
                {col.longevityNote && (
                  <div style={{marginTop:10,fontSize:12,color:"#aaa",borderTop:"0.5px solid #f5f5f5",paddingTop:8}}>📊 {col.longevityNote}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {mode==="analyze" && (
        <div>
          <div style={{fontSize:13,color:"#aaa",marginBottom:10}}>投稿データをもとに手動分析した結果です。「〇〇を分析して」と声をかけると追加できます。</div>
          {(() => {
            const needsAttn = analyzeMachineStatuses.filter(s => s.status!=="ok");
            if (!needsAttn.length) return null;
            return (
              <div style={{marginBottom:14,background:"#fff",border:"0.5px solid #eee",borderRadius:12,overflow:"hidden"}}>
                <div style={{padding:"8px 14px",borderBottom:"0.5px solid #eee",fontSize:13,fontWeight:600,color:"#555"}}>要対応の機種</div>
                {needsAttn.map(s => (
                  <div key={s.name} onClick={() => { setAnalyzeM(s.name); setAnalyzeResult(null); }}
                    style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 14px",borderBottom:"0.5px solid #f5f5f5",cursor:"pointer",background:analyzeM===s.name?"#FAECE7":"#fff"}}>
                    <span style={{fontSize:14,color:"#333",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</span>
                    {s.status==="unanalyzed"
                      ? <span style={{fontSize:12,color:"#777",background:"#F0F0F0",borderRadius:6,padding:"2px 8px",flexShrink:0,marginLeft:8}}>📊 未分析（{s.count}件）</span>
                      : <span style={{fontSize:12,color:"#C55A00",background:"#FFF3E0",borderRadius:6,padding:"2px 8px",flexShrink:0,marginLeft:8}}>⚠️ +{s.count - s.stored}件追加あり</span>
                    }
                  </div>
                ))}
              </div>
            );
          })()}
          <div style={{display:"flex",gap:8,marginBottom:16,alignItems:"center"}}>
            <select value={analyzeM} onChange={e => { setAnalyzeM(e.target.value); setAnalyzeResult(null); }}
              style={{flex:1,fontSize:15,padding:"8px 10px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",color:analyzeM?"#333":"#aaa",minWidth:0}}>
              <option value="">機種を選択（3件以上）</option>
              {analyzeMachineStatuses.map(({name,count,status,stored}) => {
                const prefix = status==="unanalyzed" ? `📊 未分析（${count}件）` : status==="stale" ? `⚠️ +${count-stored}件` : `✓`;
                return <option key={name} value={name}>{prefix} {name}</option>;
              })}
            </select>
            <button onClick={analyze} disabled={!analyzeM}
              style={{padding:"8px 16px",border:"none",borderRadius:10,background:!analyzeM?"#ccc":"#D85A30",color:"#fff",fontSize:15,fontWeight:500,cursor:!analyzeM?"not-allowed":"pointer",whiteSpace:"nowrap",flexShrink:0}}>
              分析する
            </button>
          </div>
          {analyzeResult && !analyzeResult.error && (
            <div style={{background:"#fff",border:"0.5px solid #eee",borderRadius:14,overflow:"hidden"}}>
              <div style={{padding:"12px 16px",borderBottom:"0.5px solid #eee",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{fontWeight:600,fontSize:16,color:"#333"}}>{analyzeResult.machine}</div>
                <div style={{fontSize:13,color:"#aaa"}}>{analyzeResult.postCount}件の投稿から分析 · {analyzeResult.updatedAt}</div>
              </div>
              {analyzeResult.summary && (
                <div style={{padding:"10px 16px",background:"#FAECE7",borderBottom:"0.5px solid #eee",fontSize:14,color:"#993C1D",fontWeight:500}}>{analyzeResult.summary}</div>
              )}
              {analyzeResult.spec && (
                <div style={{padding:"10px 16px",borderBottom:"0.5px solid #eee",background:"#F8F9FA"}}>
                  <div style={{fontSize:12,fontWeight:600,color:"#555",marginBottom:4}}>📋 スペック</div>
                  <div style={{fontSize:13,color:"#444",lineHeight:1.7}}>{analyzeResult.spec.split(" / ").map((s,i,arr) => <span key={i}>{s}{i<arr.length-1 && <span style={{color:"#bbb"}}> / </span>}</span>)}</div>
                </div>
              )}
              {analyzeResult.highlight && (
                <div style={{padding:"12px 16px",borderBottom:"0.5px solid #eee",background:"#FAFAFA"}}>
                  <div style={{fontSize:12,fontWeight:600,color:"#555",marginBottom:6}}>🎰 ゲーム性・特徴</div>
                  <div style={{fontSize:14,color:"#333",lineHeight:1.7}}>{analyzeResult.highlight}</div>
                </div>
              )}
              <div style={{padding:"12px 16px",borderBottom:"0.5px solid #eee"}}>
                <div style={{fontSize:14,fontWeight:600,color:"#2E7D32",marginBottom:8}}>👍 良いところ</div>
                {(analyzeResult.pros||[]).length > 0
                  ? (analyzeResult.pros||[]).map((p,i) => <div key={i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"flex-start"}}><span style={{color:"#2E7D32",fontWeight:700,flexShrink:0}}>・</span><span style={{fontSize:14,color:"#333",lineHeight:1.6}}>{p}</span></div>)
                  : <div style={{fontSize:14,color:"#aaa"}}>該当なし</div>}
              </div>
              <div style={{padding:"12px 16px"}}>
                <div style={{fontSize:14,fontWeight:600,color:"#C62828",marginBottom:8}}>👎 悪いところ</div>
                {(analyzeResult.cons||[]).length > 0
                  ? (analyzeResult.cons||[]).map((c,i) => <div key={i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"flex-start"}}><span style={{color:"#C62828",fontWeight:700,flexShrink:0}}>・</span><span style={{fontSize:14,color:"#333",lineHeight:1.6}}>{c}</span></div>)
                  : <div style={{fontSize:14,color:"#aaa"}}>該当なし</div>}
              </div>
            </div>
          )}
          {analyzeResult?.error && (
            <div style={{fontSize:14,color:"#e57373",padding:"10px 14px",background:"#fff5f5",borderRadius:10,border:"0.5px solid #e57373"}}>エラー: {analyzeResult.error}</div>
          )}
        </div>
      )}

      {mode==="propose" && (
        <div>
          {!aiEnabled && (
            <div style={{fontSize:14,color:"#e57373",marginBottom:12,padding:"8px 12px",background:"#fff5f5",borderRadius:8,border:"0.5px solid #e57373"}}>
              APIキーが未設定のため生成できません。<br/>
              <span style={{color:"#aaa"}}>Vercelの環境変数に ANTHROPIC_API_KEY を設定すると利用できます。</span>
            </div>
          )}
          {(() => {
            const toggle = (key, val) => setProposePolicy(p => ({ ...p, [key]: p[key].includes(val) ? p[key].filter(x=>x!==val) : [...p[key], val] }));
            const chip = (key, val, label) => {
              const on = proposePolicy[key].includes(val);
              return <button key={val} onClick={() => toggle(key, val)} style={{padding:"5px 10px",border:`0.5px solid ${on?"#D85A30":"#ddd"}`,borderRadius:16,fontSize:12,background:on?"#FAECE7":"#f9f9f9",color:on?"#993C1D":"#777",cursor:"pointer",fontWeight:on?600:400,whiteSpace:"nowrap"}}>{label}</button>;
            };
            const radio = (val, label) => {
              const on = proposePolicy.coinUnit === val;
              return <button key={val} onClick={() => setProposePolicy(p=>({...p,coinUnit:val}))} style={{padding:"5px 12px",border:`0.5px solid ${on?"#D85A30":"#ddd"}`,borderRadius:16,fontSize:12,background:on?"#FAECE7":"#f9f9f9",color:on?"#993C1D":"#777",cursor:"pointer",fontWeight:on?600:400}}>{label}</button>;
            };
            const section = (label, children) => (
              <div style={{marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:600,color:"#888",marginBottom:6,letterSpacing:"0.05em"}}>{label}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{children}</div>
              </div>
            );
            return (
              <div style={{marginBottom:16}}>
                {section("① ターゲット層（複数可）", [
                  chip("targets","20代ライト層","20代ライト層"),
                  chip("targets","30〜40代コア層","30〜40代コア層"),
                  chip("targets","設定狙い玄人","設定狙い玄人"),
                  chip("targets","ライト女性層","ライト女性層"),
                  chip("targets","旧世代ファン（40〜50代）","旧世代ファン"),
                ])}
                {section("② コイン単価帯", [
                  radio("light","ライト（〜3.0円）"),
                  radio("standard","スタンダード（3.1〜3.5円）"),
                  radio("heavy","ヘビー（3.6〜4.2円）"),
                  radio("superHeavy","超ヘビー（4.3円+）"),
                ])}
                {section("③ 採用したい設計パターン（複数可）", [
                  chip("patterns","強制ループ型","強制ループ型（虚構推理型）"),
                  chip("patterns","段階育成型","段階育成型（ガンダム型）"),
                  chip("patterns","爆裂一撃型","爆裂一撃型（吉宗型）"),
                  chip("patterns","周期保証型","周期保証型"),
                  chip("patterns","二重継続率型","二重継続率型（バジ絆2型）"),
                  chip("patterns","前兆期待型","前兆期待型（ハーデス型）"),
                  chip("patterns","IP融合型","IPテーマ融合型（Re:ゼロ型）"),
                ])}
                {section("④ 避けたい要素（複数可）", [
                  chip("avoids","自力感・択あて","自力感・択あて"),
                  chip("avoids","デキレ感","デキレ感"),
                  chip("avoids","天井1000G超え","天井1000G超え"),
                  chip("avoids","通常時の煽り過多","通常時の煽り過多"),
                  chip("avoids","設定依存が強すぎる","設定依存が強すぎる"),
                  chip("avoids","コイン単価4円超え","コイン単価4円超え"),
                ])}
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:12,fontWeight:600,color:"#888",marginBottom:4,letterSpacing:"0.05em"}}>⑤ 参考にしたい機種・要素（任意）</div>
                  <textarea value={proposePolicy.reference} onChange={e=>setProposePolicy(p=>({...p,reference:e.target.value}))} placeholder="例: カバネリの自力演出の爽快感を残しつつ、虚構推理のループ設計を組み合わせたい" rows={2} style={{width:"100%",fontSize:16,padding:"8px 10px",border:"0.5px solid #ddd",borderRadius:8,background:"#f9f9f9",resize:"vertical",lineHeight:1.5,color:"#333",boxSizing:"border-box"}}/>
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:"#888",marginBottom:4,letterSpacing:"0.05em"}}>⑥ その他こだわり・備考（任意）</div>
                  <textarea value={proposePolicy.extra} onChange={e=>setProposePolicy(p=>({...p,extra:e.target.value}))} placeholder="例: IPはアニメ系、スマスロ、やめ時がないような設計にしたい" rows={2} style={{width:"100%",fontSize:16,padding:"8px 10px",border:"0.5px solid #ddd",borderRadius:8,background:"#f9f9f9",resize:"vertical",lineHeight:1.5,color:"#333",boxSizing:"border-box"}}/>
                </div>
              </div>
            );
          })()}
          <button
            onClick={generateProposal}
            disabled={!aiEnabled || proposeLoading || proposePolicy.targets.length === 0}
            style={{width:"100%",padding:"12px 0",border:"none",borderRadius:10,background:(!aiEnabled||proposeLoading||proposePolicy.targets.length===0)?"#ccc":"#D85A30",color:"#fff",fontSize:15,fontWeight:600,cursor:(!aiEnabled||proposeLoading||proposePolicy.targets.length===0)?"not-allowed":"pointer",marginBottom:16}}
          >
            {proposeLoading ? "生成中...（30秒ほどかかります）" : "提案書を生成する"}
          </button>
          {proposeResult && (
            <div style={{background:"#fff",border:"0.5px solid #eee",borderRadius:12,padding:"16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:600,color:"#555"}}>生成された提案書</div>
                <button onClick={() => navigator.clipboard.writeText(proposeResult)} style={{padding:"4px 10px",border:"0.5px solid #ddd",borderRadius:6,background:"#f5f5f5",color:"#666",fontSize:13,cursor:"pointer"}}>コピー</button>
              </div>
              <div style={{fontSize:14,lineHeight:1.8,color:"#333",whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>
                {proposeResult.split("\n").map((line, i) => {
                  if (line.startsWith("# ")) return <div key={i} style={{fontSize:18,fontWeight:700,color:"#333",marginTop:8,marginBottom:6}}>{line.slice(2)}</div>;
                  if (line.startsWith("## ")) return <div key={i} style={{fontSize:15,fontWeight:700,color:"#D85A30",marginTop:16,marginBottom:4}}>{line.slice(3)}</div>;
                  if (line.startsWith("- ") || line.startsWith("* ")) return <div key={i} style={{paddingLeft:12,marginBottom:2}}>• {line.slice(2)}</div>;
                  if (line.trim()==="---") return <hr key={i} style={{border:"none",borderTop:"0.5px solid #eee",margin:"8px 0"}}/>;
                  return <div key={i} style={{marginBottom:line===""?6:0}}>{line}</div>;
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {mode==="ai_chat" && <ChatTab />}
      {mode==="ai_propose" && <ProposeTab />}
      {mode==="gamedesign" && <GameDesignTab />}
    </div>
  );
}