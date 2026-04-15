import React, { useState, useRef, useEffect, useMemo } from "react";
import { supabase } from "./supabase";

const CATS = {
  aimH:    { label:"お店狙い目",   bg:"#FFF8E1", color:"#E65100", border:"#FFB74D" },
  memory:  { label:"勝＆負エピ",  bg:"#EEEDFE", color:"#3C3489", border:"#AFA9EC" },
  spec:    { label:"機種情報",     bg:"#E6F1FB", color:"#185FA5", border:"#85B7EB" },
  hall:    { label:"業界情報",     bg:"#F0F4E8", color:"#4A6B1A", border:"#A0C050" },
  episode: { label:"昔の機種",     bg:"#FFF0F5", color:"#A0306A", border:"#F0A0C0" },
  quote:   { label:"版権ネタ",     bg:"#EAF3DE", color:"#3B6D11", border:"#97C459" },
  bonus:   { label:"演出・表現",   bg:"#FAECE7", color:"#993C1D", border:"#F0997B" },
  fun:     { label:"その他雑談",   bg:"#F3EFF9", color:"#6B3FA0", border:"#C4A8E8" },
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
  aimH:    "どの台を狙った？根拠は？",
  memory:  "どんな展開だった？",
  spec:    "天井・ゾーン・設定判別のポイントなど",
  hall:    "ホール・メーカー・業界の話題",
  episode: "その機種の思い出・特徴など",
  quote:   "原作・キャラ・楽曲などについて",
  bonus:   "演出の法則・好きなシーンなど",
  fun:     "なんでも",
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

export default function App() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("feed");
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

  function goToFeedWithFilter(cat) { setFeedFilter(cat); setTab("feed"); }
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

  const TABS = ["feed","collect","overview","research"];
  const LABELS = { feed:"投稿", collect:"追加", overview:"まとめ", research:"リサーチ" };

  return (
    <div style={{padding:"16px",maxWidth:740,width:"100%",boxSizing:"border-box",margin:"0 auto",fontFamily:"sans-serif",textAlign:"left",overflowX:"hidden",background:"#E8ECF0",minHeight:"100svh"}}>
      {pullIndicator > 0 && (
        <div style={{position:"fixed",top:0,left:0,right:0,zIndex:300,display:"flex",justifyContent:"center",alignItems:"center",gap:6,padding:"10px 0",background:"#E8ECF0",boxShadow:"0 2px 8px rgba(0,0,0,0.08)",fontSize:13,color:pullIndicator>=55?"#2a9d3f":"#aaa",transition:"color 0.15s"}}>
          <span style={{display:"inline-block",transform:`rotate(${pullIndicator>=55?180:0}deg)`,transition:"transform 0.2s"}}>↓</span>
          {pullIndicator >= 55 ? "放して更新" : "引いて更新"}
        </div>
      )}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.6rem"}}>
        <Logo size={56}/>
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
          <span style={{fontSize:12,color:"#D85A30",background:"#E8ECF0",boxShadow:"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF",borderRadius:20,padding:"5px 14px",fontWeight:600,letterSpacing:"0.2px"}}>{posts.length}件</span>
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
          {/* 区切り */}
          <div style={{height:"0.5px",background:"#C5C9D4",margin:"6px 0"}}/>
          {/* 通知管理アコーディオン */}
          <button onClick={() => setShowNotifDetail(v => !v)}
            style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF",fontSize:14,color:"#555",cursor:"pointer",textAlign:"left",width:"100%"}}>
            <span>⚙</span><span style={{flex:1}}>通知管理（管理者）</span><span style={{fontSize:12,color:"#bbb"}}>{showNotifDetail?"▲":"▼"}</span>
          </button>
          {showNotifDetail && (
            <div style={{padding:"8px 4px 4px",display:"flex",flexDirection:"column",gap:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:13,color:"#555",flex:1}}>通知配信</span>
                <button onClick={async () => {
                  const next = !notifSettings.enabled;
                  await supabase.from("notification_settings").update({ enabled: next, updated_at: new Date().toISOString() }).eq("id", 1);
                  setNotifSettings(s => ({ ...s, enabled: next }));
                  showToast(next ? "通知配信をONにしました" : "通知配信をOFFにしました");
                }} style={{padding:"4px 14px",border:"none",borderRadius:20,fontSize:13,fontWeight:600,cursor:"pointer",background:notifSettings.enabled?"#2a9d3f":"#E8ECF0",color:notifSettings.enabled?"#fff":"#999",boxShadow:notifSettings.enabled?"none":"inset 2px 2px 5px #C5C9D4, inset -2px -2px 5px #FFFFFF"}}>
                  {notifSettings.enabled ? "ON" : "OFF"}
                </button>
                <select value={notifSettings.notify_threshold ?? 3} onChange={e => setNotifSettings(s => ({ ...s, notify_threshold: Number(e.target.value) }))}
                  style={{fontSize:13,padding:"4px 6px",border:"none",borderRadius:8,background:"#E8ECF0",boxShadow:"inset 2px 2px 4px #C5C9D4, inset -2px -2px 4px #FFFFFF",color:"#555"}}>
                  {[1,2,3,5,10].map(n => <option key={n} value={n}>{n}件ごと</option>)}
                </select>
                <span style={{fontSize:12,color:"#aaa",whiteSpace:"nowrap"}}>{notifSettings.pending_count ?? 0}件</span>
                <button onClick={async () => {
                  await supabase.from("notification_settings").update({ pending_count: 0, updated_at: new Date().toISOString() }).eq("id", 1);
                  setNotifSettings(s => ({ ...s, pending_count: 0 }));
                  showToast("リセットしました");
                }} style={{fontSize:12,padding:"4px 8px",border:"none",borderRadius:8,background:"#E8ECF0",boxShadow:"2px 2px 4px #C5C9D4, -2px -2px 4px #FFFFFF",color:"#999",cursor:"pointer",whiteSpace:"nowrap"}}>リセット</button>
              </div>
              <div style={{display:"flex",gap:6}}>
                <input value={notifSettings.maintenance_message} onChange={e => setNotifSettings(s => ({ ...s, maintenance_message: e.target.value }))}
                  placeholder="メンテナンスメッセージ（空欄で非表示）"
                  style={{flex:1,fontSize:13,padding:"7px 10px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF"}}/>
                <button onClick={async () => {
                  await supabase.from("notification_settings").update({ maintenance_message: notifSettings.maintenance_message, notify_threshold: notifSettings.notify_threshold ?? 3, updated_at: new Date().toISOString() }).eq("id", 1);
                  showToast("保存しました");
                }} style={{padding:"7px 12px",background:"#D85A30",color:"#fff",border:"none",borderRadius:10,fontSize:13,cursor:"pointer"}}>保存</button>
              </div>
            </div>
          )}
        </div>
      )}

      {toast && <div style={{background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",borderRadius:12,padding:"10px 16px",fontSize:15,color:"#3B6D11",fontWeight:500,marginBottom:10,textAlign:"center"}}>{toast}</div>}

      <div style={{display:"flex",gap:4,marginBottom:"0.8rem",background:"#E8ECF0",boxShadow:"5px 5px 10px #C5C9D4, -5px -5px 10px #FFFFFF",borderRadius:14,padding:5}}>
        {TABS.map(k => {
          const on = tab === k;
          return <button key={k} onClick={() => setTab(k)} style={{flex:1,padding:"9px 0",border:"none",borderRadius:10,fontSize:15,background:on?"#E0E4E8":"#E8ECF0",color:on?"#D85A30":"#888",cursor:"pointer",fontWeight:on?700:500,textAlign:"center",boxShadow:on?"inset 4px 4px 8px #B8BCC8, inset -2px -2px 5px #FFFFFF":"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF",transition:"all 0.18s"}}>{LABELS[k]}</button>;
        })}
      </div>

      {loading && <div style={{textAlign:"center",padding:"2rem",color:"#888"}}>読み込み中...</div>}

      {!loading && tab === "feed"     && <FeedTab     posts={posts} updatePost={updatePost} deletePost={deletePost} addPost={addPost} showToast={showToast} initialFilter={feedFilter} onFilterChange={setFeedFilter} directPost={directPost} onDirectPostClear={() => setDirectPost(null)} />}
      {!loading && tab === "collect"  && <CollectTab  posts={posts} addPost={addPost} showToast={showToast} aiEnabled={aiEnabled} onCatClick={goToFeedWithFilter} loadPosts={loadPosts} />}
      {!loading && tab === "overview" && <OverviewTab posts={posts} updatePost={updatePost} />}
      {!loading && tab === "research" && <ResearchTab posts={posts} aiEnabled={aiEnabled} updatePost={updatePost} />}
    </div>
  );
}

function FeedTab({ posts, updatePost, deletePost, addPost, showToast, initialFilter = "all", onFilterChange, directPost, onDirectPostClear }) {
  const [filter, setFilter] = useState(initialFilter);
  const CAT_KEYS = ["aimH","memory","spec","hall","episode","quote","bonus","fun"];
  const [showCats, setShowCats] = useState(() => CAT_KEYS.includes(initialFilter));
  function updateFilter(v) { setFilter(v); onFilterChange?.(v); if (!CAT_KEYS.includes(v)) setShowCats(false); }
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("new");
  const [commentOpen, setCommentOpen] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [fMachine, setFMachine] = useState("");
  const [fCat, setFCat] = useState("spec");
  const [fBody, setFBody] = useState("");
  const [fName, setFName] = useState(MY_NAME);
  const [currentName, setCurrentName] = useState(() => localStorage.getItem("slotkey_name") || "ゲスト");
  const [editId, setEditId] = useState(null);
  const [eMachine, setEMachine] = useState("");
  const [eCat, setECat] = useState("bonus");
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
  const [replyTo, setReplyTo] = useState(null); // {postId, idx}
  const [replyText, setReplyText] = useState("");
  const [favMachines, setFavMachines] = useState(() => JSON.parse(localStorage.getItem("slotkey_favs") || "[]"));
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

  function toggleFavMachine(machine) {
    setFavMachines(prev => {
      const next = prev.includes(machine) ? prev.filter(m => m !== machine) : [...prev, machine];
      localStorage.setItem("slotkey_favs", JSON.stringify(next));
      return next;
    });
  }
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

  function resetForm() { setShowForm(false); setFMachine(""); setFCat("bonus"); setFBody(""); setFUrl(""); setFOgImage(""); setFShopName(""); setFImage(null); setFImagePreview(null); }

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
        internal: { ...blank(), imageUrl, ogImageUrl: fImage ? "" : fOgImage, shopName: fCat === "aimH" ? fShopName.trim() : "" },
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
    if (filter === "saved") return (p.internal?.bookmarks||[]).indexOf(MY_UID) >= 0;
    if (filter === "fav") return favMachines.includes(p.machine);
    if (filter === "img") return !!(p.internal?.imageUrl || p.internal?.ogImageUrl);
    if (filter !== "all" && p.cat !== filter) return false;
    if (filter === "aimH" && shopFilter && p.internal?.shopName !== shopFilter) return false;
    if (query.trim() && !(p.machine+p.title+p.body).toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }).sort((a,b) => sortBy === "internal" ? (b.internal?.likes?.length||0) - (a.internal?.likes?.length||0) : new Date(b.created_at) - new Date(a.created_at));

  return (
    <div style={{minWidth:0}}>
      {fullscreenImg && (
        <div onClick={() => setFullscreenImg(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out"}}>
          <img src={fullscreenImg} alt="" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}} onClick={e => e.stopPropagation()} />
          <button onClick={() => setFullscreenImg(null)} style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,0.15)",border:"none",borderRadius:"50%",width:36,height:36,fontSize:20,color:"#fff",cursor:"pointer",lineHeight:1}}>×</button>
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
            <div style={row}><span style={lbl}>カテゴリ</span><select value={fCat} onChange={e=>setFCat(e.target.value)} style={{...inp,color:CATS[fCat]?.color||"#555",fontWeight:700,background:CATS[fCat]?.bg||"#E8ECF0",boxShadow:`inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF, inset 0 0 0 2px ${CATS[fCat]?.border||"#ddd"}`,fontSize:15}}><option value="aimH">お店狙い目</option><option value="memory">勝＆負エピ</option><option value="spec">機種情報</option><option value="hall">業界情報</option><option value="episode">昔の機種</option><option value="quote">版権ネタ</option><option value="bonus">演出・表現</option><option value="fun">その他雑談</option></select></div>
            <div style={row}><span style={lbl}>URL</span><div style={{flex:1,display:"flex",gap:6,alignItems:"center"}}><input value={fUrl} onChange={e=>{setFUrl(e.target.value);if(!e.target.value.trim())setFOgImage("");}} placeholder="引用元URL（任意）" style={{...inp,flex:1,fontSize:15,minWidth:0}}/>{fUrl.trim()&&<button type="button" onClick={fetchBodyFromUrl} disabled={fBodyFetching} style={{padding:"8px 10px",border:"none",borderRadius:10,background:fBodyFetching?"#ddd":"#E8ECF0",boxShadow:fBodyFetching?"none":"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF",fontSize:13,color:fBodyFetching?"#aaa":"#555",cursor:fBodyFetching?"default":"pointer",whiteSpace:"nowrap",flexShrink:0}}>{fBodyFetching?"取得中…":"本文取得"}</button>}</div></div>
            {fOgImage&&!fImage&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,paddingLeft:60}}><img src={fOgImage} alt="OGP" style={{width:80,height:52,objectFit:"cover",borderRadius:6,flexShrink:0,background:"#ddd"}} onError={e=>{e.target.style.display="none";}}/><span style={{fontSize:12,color:"#aaa"}}>URLのサムネイル</span><button onClick={()=>setFOgImage("")} style={{marginLeft:"auto",background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:16,padding:"0 4px",lineHeight:1}}>×</button></div>}
            <div style={{...row,alignItems:"flex-start"}}><span style={{...lbl,paddingTop:10}}>本文<br/><span style={{fontSize:11,color:"#bbb",fontWeight:400}}>任意</span></span><textarea value={fBody} onChange={e=>setFBody(e.target.value)} placeholder={fBodyFetching?"取得中...":(TEMPLATES[fCat]||"URLから自動取得、または手動入力")} disabled={fBodyFetching} style={{...inp,resize:"vertical",minHeight:88,opacity:fBodyFetching?0.6:1}}/></div>
            {!fBody.trim()&&<div style={{fontSize:12,color:"#aaa",marginTop:-4,marginBottom:6,paddingLeft:60}}>画像やURLがあれば本文なしでそのまま投稿できます</div>}
            {fCat==="aimH" && <div style={row}><span style={lbl}>店舗名</span><input value={fShopName} onChange={e=>setFShopName(e.target.value)} placeholder="例: ○○店（任意）" style={inp}/></div>}
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
            ["saved","🔖 保存済み","#185FA5"],
            ["fav",`★ 注目台${favMachines.length>0?" ("+favMachines.length+")":""}`, "#E8B000"],
            ["img","🖼 画像","#6B3FA0"],
          ].map(([k,label,activeColor]) => {
            const on = filter === k;
            return <button key={k} onClick={() => updateFilter(k)} style={{padding:"6px 9px",border:"none",borderRadius:10,fontSize:13,background:"#E8ECF0",color:on?activeColor:"#999",cursor:"pointer",fontWeight:on?700:400,whiteSpace:"nowrap",flexShrink:0,boxShadow:on?`inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF`:"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF",transition:"all 0.15s"}}>{label}</button>;
          })}
          {(() => { const on = CAT_KEYS.includes(filter); return <button onClick={() => setShowCats(v => !v)} style={{padding:"6px 9px",border:"none",borderRadius:10,fontSize:13,background:"#E8ECF0",color:on?"#D85A30":showCats?"#555":"#999",cursor:"pointer",fontWeight:on||showCats?700:400,whiteSpace:"nowrap",flexShrink:0,boxShadow:on||showCats?`inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF`:"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF",transition:"all 0.15s"}}>カテゴリ {showCats?"▲":"▼"}</button>; })()}
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

      {filter === "aimH" && (() => {
        const shops = [...new Set(posts.filter(p => p.cat==="aimH" && p.internal?.shopName).map(p => p.internal.shopName))];
        if (!shops.length) return null;
        return (
          <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:13,color:"#aaa",flexShrink:0}}>店舗:</span>
            {["", ...shops].map(s => (
              <button key={s||"all"} onClick={() => setShopFilter(s)} style={{padding:"4px 12px",border:"none",borderRadius:16,fontSize:13,background:"#E8ECF0",color:shopFilter===s?"#E65100":"#999",fontWeight:shopFilter===s?600:400,cursor:"pointer",boxShadow:shopFilter===s?"inset 2px 2px 4px #C5C9D4, inset -2px -2px 4px #FFFFFF":"2px 2px 4px #C5C9D4, -2px -2px 4px #FFFFFF",whiteSpace:"nowrap"}}>
                {s||"すべて"}
              </button>
            ))}
          </div>
        );
      })()}
      {filtered.length === 0 && <div style={{textAlign:"center",padding:"2rem",color:"#aaa",fontSize:15}}>投稿がありません</div>}

      {filter === "img" && filtered.length > 0 && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:12}}>
          {filtered.map(p => (
            <div key={p.id} onClick={() => setExpandedPosts(prev => ({...prev, [p.id]: !prev[p.id]}))} style={{borderRadius:12,overflow:"hidden",background:"#E8ECF0",boxShadow:"3px 3px 8px #C5C9D4, -3px -3px 8px #FFFFFF",cursor:"pointer",position:"relative"}}>
              <img src={p.internal.imageUrl || p.internal.ogImageUrl} alt="" style={{width:"100%",aspectRatio:"1",objectFit:"cover",display:"block"}}/>
              <div style={{padding:"6px 8px"}}>
                <div style={{display:"flex",gap:4,alignItems:"center",marginBottom:3}}><CatBadge cat={p.cat}/></div>
                <div style={{fontSize:13,fontWeight:500,color:"#333",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</div>
                <div style={{fontSize:12,color:"#aaa",marginTop:2}}>{p.machine}</div>
              </div>
              {expandedPosts[p.id] && (
                <div onClick={e => e.stopPropagation()} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:10,borderRadius:12}}>
                  <div style={{fontSize:13,color:"#fff",fontWeight:500,marginBottom:4,overflowWrap:"anywhere"}}>{p.title}</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.8)",lineHeight:1.5,marginBottom:8,display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{p.body}</div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={() => toggleLike(p)} style={{flex:1,padding:"5px 0",border:"none",borderRadius:8,background:(p.internal?.likes||[]).indexOf(MY_UID)>=0?"#D85A30":"rgba(255,255,255,0.2)",color:"#fff",fontSize:13,cursor:"pointer"}}>♥ {(p.internal?.likes||[]).length}</button>
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?post=${p.id}`); showToast("リンクをコピーしました"); }} style={{padding:"5px 10px",border:"none",borderRadius:8,background:"rgba(255,255,255,0.2)",color:"#fff",fontSize:13,cursor:"pointer"}}>🔗</button>
                    <button onClick={() => setFullscreenImg(p.internal.imageUrl || p.internal.ogImageUrl)} style={{padding:"5px 10px",border:"none",borderRadius:8,background:"rgba(255,255,255,0.2)",color:"#fff",fontSize:13,cursor:"pointer"}}>⛶</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {filter !== "img" && filtered.map(p => {
        const engDefs = ENG_DEFS[p.source] || [];
        const hasEng = engDefs.some(d => fmtNum(p.eng?.[d.key]));
        const iLiked = (p.internal?.likes || []).indexOf(MY_UID) >= 0;
        const iBM = (p.internal?.bookmarks || []).indexOf(MY_UID) >= 0;
        const isOpen = commentOpen === p.id;
        const postAuthor = p.internal?.author || p.author || "ゲスト";
        const isOwn = currentName !== "ゲスト" && postAuthor === currentName;
        const isEditing = editId === p.id;
        return (
          <div key={p.id} id={`post-${p.id}`} style={{background:"#E8ECF0",border:"none",boxShadow:isOwn?"5px 5px 10px #C5C9D4, -5px -5px 10px #FFFFFF, inset 0 0 0 2px #F0997B":"5px 5px 10px #C5C9D4, -5px -5px 10px #FFFFFF",borderRadius:16,padding:"14px",marginBottom:12,overflow:"hidden",minWidth:0}}>
            {isEditing ? (
              <div>
                <select value={eCat} onChange={e => setECat(e.target.value)} style={{width:"100%",fontSize:15,padding:"7px 10px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",marginBottom:8,boxSizing:"border-box"}}>
                  <option value="aimH">お店狙い目</option>
                  <option value="memory">勝＆負エピ</option>
                  <option value="spec">機種情報</option>
                  <option value="hall">業界情報</option>
                  <option value="episode">昔の機種</option>
                  <option value="quote">版権ネタ</option>
                  <option value="bonus">演出・表現</option>
                </select>
                <input value={eMachine} onChange={e => setEMachine(e.target.value)} placeholder="機種名" style={{width:"100%",fontSize:15,padding:"7px 10px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",marginBottom:8,boxSizing:"border-box"}} />
                <textarea value={eBody} onChange={e => setEBody(e.target.value)} style={{width:"100%",fontSize:15,padding:"7px 10px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",resize:"vertical",minHeight:80,marginBottom:8,boxSizing:"border-box"}} />
                <input value={eUrl} onChange={e => setEUrl(e.target.value)} placeholder="引用元URL（任意）" style={{width:"100%",fontSize:15,padding:"7px 10px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",marginBottom:8,boxSizing:"border-box"}} />
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
                  {p.cat==="aimH" && p.internal?.shopName && <span style={{fontSize:12,padding:"1px 7px",borderRadius:10,background:"#FFF8E1",color:"#E65100",fontWeight:500,whiteSpace:"nowrap",flexShrink:0}}>🏪 {p.internal.shopName}</span>}
                  <span style={{fontSize:12,color:"#bbb",whiteSpace:"nowrap",flexShrink:0,marginLeft:"auto"}}>{relativeTime(p.created_at)}</span>
                </div>
                <div style={{fontSize:16,fontWeight:500,color:"#333",marginBottom:4,overflowWrap:"anywhere"}}>{p.title}</div>
                {(function CollapseBody() {
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
                  <img src={p.internal.imageUrl} alt="" onClick={() => setFullscreenImg(p.internal.imageUrl)} style={{width:"100%",maxHeight:360,objectFit:"contain",borderRadius:8,marginBottom:6,display:"block",background:"#f9f9f9",cursor:"zoom-in"}} />
                )}
                {p.url && p.internal?.ogImageUrl && !p.internal?.imageUrl ? (
                  <a href={p.url} target="_blank" rel="noopener noreferrer" style={{display:"block",borderRadius:10,overflow:"hidden",marginBottom:10,textDecoration:"none",border:"0.5px solid #ddd"}}>
                    <div style={{position:"relative",height:160,background:"#e8e4dc",flexShrink:0}}>
                      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <span style={{fontSize:36,opacity:0.3}}>🔗</span>
                      </div>
                      <img src={p.internal.ogImageUrl} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",display:"block"}} onError={e=>{e.target.style.display="none";}}/>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",background:"#f4f3ec",overflow:"hidden"}}>
                      <span style={{fontSize:13,color:"#888",flexShrink:0}}>🔗</span>
                      <span style={{fontSize:13,color:"#185FA5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{p.url}</span>
                    </div>
                  </a>
                ) : p.url ? (
                  <a href={p.url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:6,background:"#f4f3ec",borderRadius:8,padding:"6px 10px",marginBottom:10,textDecoration:"none",overflow:"hidden",minWidth:0}}>
                    <span style={{fontSize:14,color:"#888",flexShrink:0}}>🔗</span>
                    <span style={{fontSize:14,color:"#185FA5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0,flex:1}}>{p.url}</span>
                  </a>
                ) : null}

                {(hasEng || p.source !== "manual") && (
                  <div style={{background:"#E8ECF0",borderRadius:10,boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",padding:"6px 10px",marginBottom:10,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                    <span style={{fontSize:13,color:"#aaa"}}>外部</span>
                    {engDefs.map(d => { const v=fmtNum(p.eng?.[d.key]); if(!v)return null; return <span key={d.key} style={{fontSize:14,display:"flex",alignItems:"center",gap:3}}><span style={{color:"#aaa"}}>{d.icon}</span><span style={{fontWeight:500,color:"#333"}}>{v}</span><span style={{fontSize:13,color:"#aaa"}}>{d.label}</span></span>; })}
                    {!hasEng && <span style={{fontSize:13,color:"#aaa"}}>数値なし</span>}
                  </div>
                )}

                <div style={{paddingTop:10,marginTop:8,borderTop:"1px solid rgba(197,201,212,0.4)",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <button onClick={() => toggleLike(p)} style={{display:"flex",alignItems:"center",gap:3,padding:"5px 9px",border:"none",borderRadius:20,background:"#E8ECF0",color:iLiked?"#D85A30":"#999",fontSize:13,cursor:"pointer",fontWeight:iLiked?600:400,whiteSpace:"nowrap",boxShadow:iLiked?"inset 2px 2px 5px #C5C9D4, inset -2px -2px 5px #FFFFFF":"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF"}}><span>♥</span><span>いいね</span><span style={{fontSize:12}}>{(p.internal?.likes||[]).length}</span></button>
                  <button onClick={() => { setCommentOpen(isOpen?null:p.id); setCommentText(""); }} style={{display:"flex",alignItems:"center",gap:3,padding:"5px 9px",border:"none",borderRadius:20,background:"#E8ECF0",color:isOpen?"#3C3489":"#999",fontSize:13,cursor:"pointer",fontWeight:isOpen?600:400,whiteSpace:"nowrap",boxShadow:isOpen?"inset 2px 2px 5px #C5C9D4, inset -2px -2px 5px #FFFFFF":"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF"}}><span>💬</span><span style={{fontSize:12}}>{(p.internal?.comments||[]).length}</span></button>
                  <button onClick={() => toggleBM(p)} title="保存" style={{padding:"5px 9px",border:"none",borderRadius:20,background:"#E8ECF0",color:iBM?"#185FA5":"#999",fontSize:16,cursor:"pointer",lineHeight:1,boxShadow:iBM?"inset 2px 2px 5px #C5C9D4, inset -2px -2px 5px #FFFFFF":"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF"}}>🔖</button>
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
                            <input value={replyText} onChange={e=>setReplyText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addReply(p,i);}}} placeholder="返信を入力… (Enter)" style={{flex:1,fontSize:14,padding:"5px 8px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF"}} autoFocus />
                            <button onClick={()=>addReply(p,i)} style={{padding:"5px 12px",background:"#D85A30",color:"#fff",border:"none",borderRadius:8,fontSize:14,cursor:"pointer"}}>送信</button>
                          </div>
                        )}
                      </div>
                    ))}
                    <div style={{display:"flex",gap:6}}>
                      <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => { if(e.key==="Enter"){e.preventDefault();addComment(p);}}} placeholder="コメントを入力… (Enter)" style={{flex:1,fontSize:15,padding:"6px 10px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF"}} />
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

function CollectTab({ posts, addPost, showToast, aiEnabled, onCatClick, loadPosts }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [dupModal, setDupModal] = useState(null);
  const [csvPreview, setCsvPreview] = useState(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const csvRef = useRef(null);
  const pending = useRef(null);

  function parseCsv(text) {
    const lines = text.trim().split("\n").filter(l => l.trim());
    if (lines.length < 2) return null;
    const headers = lines[0].split(",").map(h => h.trim());
    const required = ["cat","machine","title","body"];
    if (!required.every(r => headers.includes(r))) return null;
    return lines.slice(1).map(line => {
      // CSVのカンマ区切りを正しく処理（ダブルクォート考慮）
      const vals = [];
      let cur = "", inQ = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') { inQ = !inQ; }
        else if (line[i] === ',' && !inQ) { vals.push(cur.trim()); cur = ""; }
        else cur += line[i];
      }
      vals.push(cur.trim());
      const row = {};
      headers.forEach((h, i) => { row[h] = vals[i] || ""; });
      return row;
    });
  }

  function onCsvFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCsv(ev.target.result);
      if (!rows) { showToast("CSVフォーマットが正しくありません"); return; }
      const dupKeys = new Set(posts.map(p => p.dup_key).filter(Boolean));
      const preview = rows.map(r => ({ ...r, _dup: r.dup_key && dupKeys.has(r.dup_key) }));
      setCsvPreview(preview);
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  async function importCsv() {
    if (!csvPreview) return;
    setCsvImporting(true);
    const rows = csvPreview.filter(r => !r._dup);
    const records = rows.map(r => ({
      cat: r.cat || "spec", source: r.source || "WebSearch",
      machine: r.machine || "全般", title: r.title, body: r.body,
      url: r.url || "", quality: Number(r.quality) || 3,
      dup_key: r.dup_key || "", author: r.author || "編集部AI", eng: {},
      internal: { likes:[], bookmarks:[], bads:[], comments:[], author: r.author || "編集部AI", imageUrl:"", shopName:"" },
    }));
    const { error } = await supabase.from("posts").insert(records);
    setCsvImporting(false);
    setCsvPreview(null);
    if (error) { showToast("インポートに失敗しました"); return; }
    showToast(`${records.length}件インポート完了`);
    loadPosts();
  }

  const counts = {};
  ["aimH","memory","spec","hall","episode","quote","bonus","fun"].forEach(k => { counts[k] = posts.filter(p => p.cat===k).length; });

  function isDup(candidate) {
    return posts.some(p => candidate.dupKey && p.dup_key && candidate.dupKey === p.dup_key);
  }

  async function collect() {
    if (!input.trim()) return;
    setLoading(true); setStatus("編集部AIが解析中...");
    const isShort = input.trim().length < 30;
    const userMsg = isShort
      ? `「${input.trim()}」というパチスロ機種について、ファンが興味を持つ情報（演出・スペック・名言・思い出など）を1件生成してください。`
      : `以下のテキストを解析して1件の投稿データにまとめてください。\n\n${input}`;
    try {
      const res = await fetch("/api/claude", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 600,
          system: 'パチスロライブラリの収集アシスタントです。実在する機種名・具体的な情報のみ使用。JSON形式のみで返答: {"cat":"bonus|spec|quote|memory","source":"manual","machine":"機種名","title":"30文字以内","body":"20〜40文字の短文。2ch風の書き方（〜らしいぞ、〜って話題、思ったより〜だった、これ知ってた？など）と、リンクを押したくなる一言をバランスよく混ぜる。煽りすぎず自然なテンションで。","quality":3,"dupKey":"機種名_キー","eng":{}}',
          messages: [{ role: "user", content: userMsg }]
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(typeof data.error === "string" ? data.error : (data.error.message || JSON.stringify(data.error)));
      const txt = (data.content||[]).filter(b => b.type==="text").map(b => b.text).join("");
      const parsed = JSON.parse(txt.replace(/```json|```/g,"").trim());
      const item = { cat:parsed.cat||"memory", source:parsed.source||"manual", machine:parsed.machine||input.trim(), title:parsed.title||"無題", body:parsed.body||input.slice(0,150), url:"", quality:parsed.quality||3, dupKey:parsed.dupKey||"", eng:parsed.eng||{}, author:randomAuthor(), internal:blank() };
      setStatus("");
      if (isDup(item)) { pending.current=item; setDupModal({ item, dups:posts.filter(p=>p.dup_key===item.dupKey) }); setInput(""); }
      else { await addPost(item); setInput(""); }
    } catch(e) { setStatus("エラー: " + (e.message || "不明")); setTimeout(() => setStatus(""), 4000); }
    setLoading(false);
  }

async function autoCollect() {
    setAutoLoading(true);
    setStatus("ネットを巡回中...");
    const theme = AUTO_THEMES[Math.floor(Math.random() * AUTO_THEMES.length)];

    // badが付いた投稿から「避けるべき傾向」を抽出
    const badPosts = posts.filter(p => (p.internal?.bads?.length || 0) > 0);
    const badContext = badPosts.length > 0
      ? `\n\n【避けるべきコンテンツ（編集部がbad評価した投稿の傾向）】\n` +
        badPosts.map(p => `- 機種「${p.machine}」カテゴリ「${p.cat}」: "${p.title}"`).join("\n") +
        `\n上記に類似した内容・機種・表現は収集しないこと。`
      : "";

    try {
      const systemPrompt =
        `あなたはパチスロ業界の専門家です。実在するパチスロ・パチンコ機種の演出・スペック・名言・エピソードについて豊富な知識を持っています。
指定テーマで、パチスロファンが「面白い・懐かしい・役立つ」と感じる情報を厳選して3件生成し、必ずJSON配列のみを返してください。他のテキストは一切不要です。
形式: [{"cat":"bonus|spec|quote|memory","machine":"実在する機種名","title":"30文字以内","body":"60〜100文字の具体的な説明","quality":3,"dupKey":"機種名_キーワード"}]
・qualityは情報の有力さ: 3=具体的な数字・固有名詞・確実な情報, 2=ある程度具体的, 1=一般的・曖昧な情報
・catはbonus=演出・ボーナス, spec=スペック・攻略, quote=名言・煽り文句, memory=思い出・エピソード
・実在する機種名を必ず使うこと。架空の機種は禁止。
・bodyは20〜40文字の短文。2ch風（〜らしいぞ、〜って話題、思ったより〜だった、これ知ってた？など）とリンクを押したくなる一言をバランスよく混ぜる。煽りすぎず自然なテンションで。説明しすぎない。` + badContext;

      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2000,
          system: systemPrompt,
          messages: [{ role: "user", content: "「" + theme + "」をテーマに、パチスロファンが喜ぶ情報を3件生成してJSON配列で返してください。" }]
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(typeof data.error === "string" ? data.error : (data.error.message || JSON.stringify(data.error)));

      const allText = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
      const jsonMatch = allText.match(/\[[\s\S]*?\]/);
      if (!jsonMatch) throw new Error("JSONが見つかりませんでした: " + allText.slice(0, 200));
      const items = JSON.parse(jsonMatch[0]);

      let added = 0;
      for (const p of items) {
        const item = {
          cat: p.cat || "memory",
          source: "AI生成",
          machine: p.machine || "不明",
          title: p.title || "無題",
          body: p.body || "",
          url: "",
          quality: p.quality || 3,
          dupKey: p.dupKey || "",
          author: randomAuthor(),
          eng: p.eng || {},
          internal: blank(),
        };
        if (!isDup(item)) {
          await addPost(item);
          added++;
        }
      }
      setStatus("");
      showToast(added > 0 ? added + "件を自動収集しました！" : "新しいコンテンツは見つかりませんでした");
    } catch (e) {
      console.error("autoCollect error:", e);
      setStatus("エラー: " + (e.message || "不明なエラー"));
      setTimeout(() => setStatus(""), 5000);
    }
    setAutoLoading(false);
  }

  function exportJSON() { const b=new Blob([JSON.stringify(posts,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="slotkey.json";a.click();showToast("JSONをエクスポートしました"); }
  function exportCSV() { const h=["id","cat","source","machine","title","body","url","quality"];const rows=posts.map(p=>h.map(k=>'"'+String(p[k]||"").replace(/"/g,'""')+'"').join(","));const b=new Blob([[h.join(","),...rows].join("\n")],{type:"text/csv"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="slotkey.csv";a.click();showToast("CSVをエクスポートしました"); }

  return (
    <div>
      {dupModal && (
        <div style={{marginBottom:16,background:"#FAEEDA",border:"0.5px solid #EF9F27",borderRadius:12,padding:"1rem"}}>
          <div style={{fontSize:16,fontWeight:500,color:"#633806",marginBottom:10}}>似たコンテンツが {dupModal.dups.length}件 見つかりました</div>
          {dupModal.dups.map(d => <div key={d.id} style={{background:"#fff",border:"0.5px solid #eee",borderRadius:8,padding:"8px 12px",marginBottom:8,fontSize:14}}><div style={{fontWeight:500,color:"#333",marginBottom:2}}>{d.title}</div><div style={{color:"#666"}}>{d.body?.slice(0,60)}...</div></div>)}
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <button onClick={async () => { await addPost(pending.current); setDupModal(null); }} style={{flex:1,padding:"7px 0",background:"#D85A30",color:"#fff",border:"none",borderRadius:8,fontSize:15,fontWeight:500,cursor:"pointer"}}>それでも追加する</button>
            <button onClick={() => { setDupModal(null); showToast("キャンセルしました"); }} style={{flex:1,padding:"7px 0",background:"#f0f0f0",color:"#666",border:"0.5px solid #ddd",borderRadius:8,fontSize:15,cursor:"pointer"}}>キャンセル</button>
          </div>
        </div>
      )}

      <div style={{marginBottom:"1.25rem"}}>
        <div style={{fontSize:14,color:"#888",marginBottom:6}}>自動収集</div>
        <button onClick={autoCollect} disabled={!aiEnabled||autoLoading} title={!aiEnabled?"APIキーが未設定です":""} style={{width:"100%",padding:"10px 0",background:(!aiEnabled||autoLoading)?"#e0e0e0":"#185FA5",color:(!aiEnabled||autoLoading)?"#aaa":"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:500,cursor:(!aiEnabled||autoLoading)?"not-allowed":"pointer"}}>{autoLoading?"ネットを巡回中...":"ネットを巡回して収集 ↗"}</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:"1.25rem"}}>
        {["aimH","memory","spec","hall","episode","quote","bonus","fun"].map(k => (
          <div key={k} onClick={() => onCatClick?.(k)} style={{background:"#E8ECF0",borderRadius:10,boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",padding:"8px 10px",cursor:"pointer",border:`0.5px solid ${CATS[k].border}`,transition:"background 0.1s"}}
            onMouseEnter={e=>e.currentTarget.style.background=CATS[k].bg}
            onMouseLeave={e=>e.currentTarget.style.background="#f9f9f9"}>
            <div style={{fontSize:22,fontWeight:500,color:"#333"}}>{counts[k]}</div>
            <div style={{fontSize:13,color:CATS[k].color,marginTop:2,fontWeight:500}}>{CATS[k].label}</div>
          </div>
        ))}
      </div>

      <div style={{background:"#fff",border:"0.5px solid #eee",borderRadius:12,padding:"1rem",marginBottom:12}}>
        <div style={{fontSize:14,color:"#888",marginBottom:8}}>機種名・テキストを入力すると編集部AIが自動分類・要約して登録します</div>
        <textarea value={input} onChange={e => setInput(e.target.value)} style={{width:"100%",fontSize:15,padding:"8px 10px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",resize:"vertical",minHeight:72,marginBottom:8,boxSizing:"border-box"}} placeholder="機種名やメモを入力" />
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:14,color:"#3B6D11",fontWeight:500}}>{status}</span>
          <button onClick={collect} disabled={!aiEnabled||loading} title={!aiEnabled?"APIキーが未設定です":""} style={{padding:"7px 18px",background:(!aiEnabled||loading)?"#ccc":"#D85A30",color:"#fff",border:"none",borderRadius:8,fontSize:15,fontWeight:500,cursor:(!aiEnabled||loading)?"not-allowed":"pointer"}}>{loading?"解析中...":"編集部AIで収集 ↗"}</button>
        </div>
      </div>
      <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
        <input ref={csvRef} type="file" accept=".csv" style={{display:"none"}} onChange={onCsvFile}/>
        <button onClick={() => csvRef.current?.click()} style={{fontSize:14,padding:"5px 12px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",color:"#185FA5",cursor:"pointer",fontWeight:500}}>CSVインポート</button>
        <button onClick={exportCSV} style={{fontSize:14,padding:"5px 12px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",color:"#666",cursor:"pointer"}}>CSV出力</button>
        <button onClick={exportJSON} style={{fontSize:14,padding:"5px 12px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",color:"#666",cursor:"pointer"}}>JSON出力</button>
      </div>

      {csvPreview && (
        <div onClick={() => setCsvPreview(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={e => e.stopPropagation()} style={{background:"#E8ECF0",borderRadius:"16px 16px 0 0",padding:16,width:"100%",maxWidth:740,maxHeight:"80vh",overflowY:"auto",boxSizing:"border-box"}}>
            <div style={{fontSize:15,fontWeight:600,marginBottom:10,color:"#333"}}>CSVインポート確認</div>
            {(() => {
              const newRows = csvPreview.filter(r => !r._dup);
              const dupRows = csvPreview.filter(r => r._dup);
              return <>
                <div style={{fontSize:13,color:"#888",marginBottom:10}}>
                  <span style={{color:"#3B6D11",fontWeight:500}}>新規 {newRows.length}件</span>
                  {dupRows.length > 0 && <span style={{color:"#aaa",marginLeft:8}}>重複スキップ {dupRows.length}件</span>}
                </div>
                <div style={{background:"#fff",borderRadius:10,overflow:"hidden",marginBottom:12}}>
                  {csvPreview.map((r, i) => (
                    <div key={i} style={{padding:"8px 12px",borderBottom:"0.5px solid #f0f0f0",opacity:r._dup?0.4:1,display:"flex",gap:8,alignItems:"center"}}>
                      {r._dup && <span style={{fontSize:11,color:"#aaa",flexShrink:0}}>重複</span>}
                      <CatBadge cat={r.cat}/>
                      <span style={{fontSize:13,color:"#555",flexShrink:0}}>{r.machine}</span>
                      <span style={{fontSize:13,color:"#333",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</span>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={() => setCsvPreview(null)} style={{flex:1,padding:"10px 0",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"3px 3px 6px #C5C9D4, -3px -3px 6px #FFFFFF",fontSize:15,color:"#888",cursor:"pointer"}}>キャンセル</button>
                  <button onClick={importCsv} disabled={csvImporting||newRows.length===0} style={{flex:2,padding:"10px 0",border:"none",borderRadius:10,background:newRows.length===0?"#ccc":"#185FA5",color:"#fff",fontSize:15,fontWeight:600,cursor:newRows.length===0?"not-allowed":"pointer"}}>
                    {csvImporting ? "インポート中..." : `${newRows.length}件をインポート`}
                  </button>
                </div>
              </>;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewTab({ posts, updatePost }) {
  const [view, setView] = useState("rank");
  const [rankBy, setRankBy] = useState("likes");
  const [selM, setSelM] = useState(null);
  const [query, setQuery] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [postList, setPostList] = useState([]);
  const postIdx = postList.findIndex(p => p.id === selectedPost?.id);
  const hasPrev = postIdx > 0;
  const hasNext = postIdx < postList.length - 1 && postList.length > 1;
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
    const analysisPosts = posts.filter(p => p.cat !== "fun");
    const base = analysisPosts.length;
    const main = ["aimH","memory","spec","hall","episode","quote","bonus"].map(k => {
      const ps = analysisPosts.filter(p => p.cat===k);
      const likes = ps.reduce((s,p) => s+(p.internal?.likes?.length||0), 0);
      const top = ps.slice().sort((a,b) => (b.internal?.likes?.length||0)-(a.internal?.likes?.length||0))[0];
      return { key:k, label:CATS[k].label, bg:CATS[k].bg, color:CATS[k].color, cnt:ps.length, pct:base?Math.round(ps.length/base*100):0, likes, top, isFun:false };
    });
    const funPs = posts.filter(p => p.cat==="fun");
    const funLikes = funPs.reduce((s,p) => s+(p.internal?.likes?.length||0), 0);
    const funTop = funPs.slice().sort((a,b) => (b.internal?.likes?.length||0)-(a.internal?.likes?.length||0))[0];
    return [...main, { key:"fun", label:CATS.fun.label, bg:CATS.fun.bg, color:CATS.fun.color, cnt:funPs.length, pct:null, likes:funLikes, top:funTop, isFun:true }];
  }, [posts]);

  const ranked = useMemo(() => {
    const q = query.toLowerCase();
    return posts.slice().filter(p => p.cat !== "fun" && (!q||(p.machine+p.title+p.body).toLowerCase().includes(q)))
      .sort((a,b) => {
        if (rankBy==="likes") return (b.internal?.likes?.length||0)-(a.internal?.likes?.length||0);
        if (rankBy==="bookmarks") return (b.internal?.bookmarks?.length||0)-(a.internal?.bookmarks?.length||0);
        return (b.quality||0)-(a.quality||0);
      });
  }, [posts, rankBy, query]);

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
          <div onClick={e => e.stopPropagation()} style={{background:"#fff",borderRadius:"16px 16px 0 0",padding:"16px",width:"100%",maxWidth:740,maxHeight:"80vh",overflowY:"auto",boxSizing:"border-box"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,gap:6}}>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center",flex:1,minWidth:0}}>
                <CatBadge cat={selectedPost.cat}/>
                {AUTO_AUTHORS.includes(selectedPost.internal?.author||selectedPost.author) ? <QualityBadge q={selectedPost.quality || 1}/> : null}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                {postList.length > 1 && <span style={{fontSize:13,color:"#aaa"}}>{postIdx+1}/{postList.length}</span>}
                {hasPrev && <button onClick={() => setSelectedPost(postList[postIdx-1])} style={{background:"#E8ECF0",border:"none",borderRadius:8,padding:"4px 10px",fontSize:16,cursor:"pointer",color:"#555",boxShadow:"2px 2px 4px #C5C9D4,-2px -2px 4px #FFFFFF"}}>‹</button>}
                {hasNext && <button onClick={() => setSelectedPost(postList[postIdx+1])} style={{background:"#E8ECF0",border:"none",borderRadius:8,padding:"4px 10px",fontSize:16,cursor:"pointer",color:"#555",boxShadow:"2px 2px 4px #C5C9D4,-2px -2px 4px #FFFFFF"}}>›</button>}
                <button onClick={() => setSelectedPost(null)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#aaa",padding:"0 4px",lineHeight:1}}>×</button>
              </div>
            </div>
            <div style={{fontSize:14,color:"#888",marginBottom:4,display:"flex",gap:8,flexWrap:"wrap"}}>
              <span style={{fontWeight:500,color:"#555"}}>@{selectedPost.internal?.author||selectedPost.author||"ゲスト"}</span>
              <span>機種: <span style={{color:"#333",fontWeight:500}}>{selectedPost.machine}</span></span>
            </div>
            <div style={{fontSize:16,fontWeight:500,color:"#333",marginBottom:6,overflowWrap:"anywhere"}}>{selectedPost.title}</div>
            <div style={{fontSize:15,color:"#666",lineHeight:1.65,marginBottom:8,overflowWrap:"anywhere"}}>{selectedPost.body}</div>
            {selectedPost.internal?.imageUrl && (
              <img src={selectedPost.internal.imageUrl} alt="" style={{width:"100%",maxHeight:300,objectFit:"contain",borderRadius:8,marginBottom:8,display:"block",background:"#f9f9f9"}} />
            )}
            {selectedPost.url && (
              <a href={selectedPost.url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:6,background:"#f4f3ec",borderRadius:8,padding:"6px 10px",textDecoration:"none",overflow:"hidden",marginBottom:8}}>
                <span style={{fontSize:14,color:"#888",flexShrink:0}}>🔗</span>
                <span style={{fontSize:14,color:"#185FA5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,minWidth:0}}>{selectedPost.url}</span>
              </a>
            )}
            {AUTO_AUTHORS.includes(selectedPost.internal?.author||selectedPost.author) && (
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                <span style={{fontSize:13,color:"#aaa"}}>情報LV:</span>
                {[[3,"Lv.1"],[4,"Lv.2"],[5,"Lv.3"]].map(([q,l]) => {
                  const on = (selectedPost.quality||3) === q;
                  return <button key={q} onClick={() => { updatePost(selectedPost.id, { quality: q }); setSelectedPost(p => ({...p, quality: q})); }} style={{padding:"3px 10px",border:"none",borderRadius:8,fontSize:13,fontWeight:on?600:400,background:on?"#D85A30":"#f0f0f0",color:on?"#fff":"#aaa",cursor:"pointer"}}>{l}</button>;
                })}
              </div>
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
        </div>
      )}
      <div className="scroll-x" style={{display:"flex",gap:6,marginBottom:"1.25rem",flexWrap:"nowrap"}}>
        {[["rank","ランキング"],["machine","機種別"],["cat","カテゴリ分布"],["author","投稿者"]].map(([k,l]) => {
          const on = view===k;
          return <button key={k} onClick={() => { setView(k); setSelM(null); setQuery(""); }} style={{padding:"5px 14px",border:`0.5px solid ${on?"#D85A30":"#ddd"}`,borderRadius:8,fontSize:14,background:on?"#FAECE7":"#fff",color:on?"#993C1D":"#888",cursor:"pointer",fontWeight:on?500:400,whiteSpace:"nowrap",flexShrink:0}}>{l}</button>;
        })}
      </div>

      {view==="rank" && (
        <div>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <div style={{position:"relative",flex:1}}>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="絞り込み..." style={{width:"100%",fontSize:15,padding:"6px 28px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",boxSizing:"border-box"}} />
              <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:15,color:"#aaa",pointerEvents:"none"}}>⌕</span>
              {query && <button onClick={() => setQuery("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:15,color:"#aaa",padding:0}}>×</button>}
            </div>
            <select value={rankBy} onChange={e => setRankBy(e.target.value)} style={{fontSize:14,padding:"6px 8px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",color:"#666"}}>
              <option value="likes">社内いいね順</option>
              <option value="bookmarks">ブックマーク順</option>
              <option value="quality">品質スコア順</option>
            </select>
          </div>
          <div className="scroll-x" style={{background:"#fff",border:"0.5px solid #eee",borderRadius:12}}>
            <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed",minWidth:360}}>
              <colgroup><col style={{width:30}}/><col/><col style={{width:96}}/><col style={{width:36}}/><col style={{width:42}}/></colgroup>
              <thead><tr style={{background:"#f9f9f9"}}><th style={{...th,textAlign:"center"}}>#</th><th style={th}>タイトル・機種</th><th style={th}>カテゴリ</th><th style={{...th,textAlign:"right"}}>♥</th><th style={{...th,textAlign:"center"}}>品質</th></tr></thead>
              <tbody>
                {ranked.map((p,i) => {
                  const isExp = expandedRankId === p.id;
                  return (
                    <React.Fragment key={p.id}>
                      <tr onClick={() => setExpandedRankId(isExp ? null : p.id)} style={{background:isExp?"#FFF8F5":i%2===0?"#fff":"#fafafa",cursor:"pointer"}}>
                        <td style={{...td,textAlign:"center",fontWeight:500,fontSize:14,color:i<3?"#D85A30":"#aaa"}}>{i+1}</td>
                        <td style={{...td,maxWidth:0}}><div style={{fontWeight:500,fontSize:15,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</div><div style={{fontSize:13,color:"#888",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.machine}</div></td>
                        <td style={td}><CatBadge cat={p.cat}/></td>
                        <td style={{...td,textAlign:"right",fontWeight:500,color:"#D85A30"}}>{p.internal?.likes?.length||0}</td>
                        <td style={{...td,textAlign:"center",color:isExp?"#D85A30":"#aaa",fontSize:12}}>{isExp?"▲":"▼"}</td>
                      </tr>
                      {isExp && (
                        <tr>
                          <td colSpan={5} style={{padding:"12px 14px",background:"#FFF8F5",borderBottom:"0.5px solid #F0997B"}}>
                            <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center",marginBottom:6}}>
                              <CatBadge cat={p.cat}/>
                              {AUTO_AUTHORS.includes(p.internal?.author||p.author) ? <QualityBadge q={p.quality || 1}/> : null}
                            </div>
                            <div style={{fontSize:13,color:"#aaa",marginBottom:4}}>@{p.internal?.author||p.author||"ゲスト"} · {p.machine}</div>
                            <div style={{fontSize:15,color:"#333",lineHeight:1.65,marginBottom:6,overflowWrap:"anywhere"}}>{p.body}</div>
                            {p.internal?.imageUrl && <img src={p.internal.imageUrl} alt="" style={{width:"100%",maxHeight:260,objectFit:"contain",borderRadius:8,marginBottom:6,display:"block",background:"#f9f9f9"}}/>}
                            {p.url && (
                              <a href={p.url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:6,background:"#f4f3ec",borderRadius:8,padding:"6px 10px",textDecoration:"none"}}>
                                <span style={{fontSize:13,color:"#888",flexShrink:0}}>🔗</span>
                                <span style={{fontSize:13,color:"#185FA5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,minWidth:0}}>{p.url}</span>
                              </a>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                  <div style={{background:"#FFF8F5",borderBottom:"0.5px solid #F0E0D8",padding:"10px 10px 4px"}}>
                    {mPosts.map(mp => (
                      <div key={mp.id} onClick={() => { setPostList(mPosts); setSelectedPost(mp); }} style={{background:"#fff",borderRadius:10,padding:"10px 14px",marginBottom:8,cursor:"pointer",border:"0.5px solid #eee",borderLeft:"3px solid #F0997B"}}>
                        <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:4}}>
                          <CatBadge cat={mp.cat}/>
                          <span style={{marginLeft:"auto",fontSize:13,color:"#D85A30",fontWeight:500,flexShrink:0}}>♥ {mp.internal?.likes?.length||0}</span>
                        </div>
                        <div style={{fontSize:15,fontWeight:500,color:"#333",overflowWrap:"anywhere",marginBottom:2}}>{mp.title}</div>
                        <div style={{fontSize:13,color:"#888",overflowWrap:"anywhere"}}>{mp.body.slice(0,80)}{mp.body.length>80?"…":""}</div>
                      </div>
                    ))}
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
    </div>
  );
}

function ResearchTab({ posts, aiEnabled, updatePost }) {
  const [mode, setMode] = useState("browse");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ machine:"", cat:"" });
  const bottomRef = useRef(null);

  useEffect(() => { if(bottomRef.current) bottomRef.current.scrollIntoView({behavior:"smooth"}); }, [messages]);

  const machines = useMemo(() => { const seen={},r=[]; posts.forEach(p=>{if(!seen[p.machine]){seen[p.machine]=true;r.push(p.machine);}}); return r; }, [posts]);
  const filteredPosts = posts.filter(p => (!filter.machine||p.machine===filter.machine)&&(!filter.cat||p.cat===filter.cat)).sort((a,b) => (b.internal?.likes?.length||0)-(a.internal?.likes?.length||0));

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
      const system = "あなたはパチスロライブラリ「スロクリ」の調査アシスタントです。以下のライブラリデータとパチスロの知識を組み合わせて答えてください。【ライブラリデータ】" + lib + " 回答ルール: 質問に直接答える。ライブラリ内の関連投稿がある場合は文末に「関連投稿ID: [1,2,3]」を含める。ライブラリにない情報は（一般知識）と明記。300文字以内で簡潔に。";
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
      <div style={{display:"flex",gap:6,marginBottom:"1.25rem"}}>
        {[["browse","絞り込み"],["chat","チャット"]].map(([k,l]) => {
          const on = mode===k;
          return <button key={k} onClick={() => setMode(k)} style={{padding:"5px 14px",border:`0.5px solid ${on?"#D85A30":"#ddd"}`,borderRadius:8,fontSize:14,background:on?"#FAECE7":"#fff",color:on?"#993C1D":"#888",cursor:"pointer",fontWeight:on?500:400,whiteSpace:"nowrap"}}>{l}</button>;
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

      {mode==="browse" && (
        <div>
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",gap:8,marginBottom:6}}>
              <select value={filter.machine} onChange={e => setFilter(f=>({...f,machine:e.target.value}))} style={{flex:1,fontSize:15,padding:"8px 10px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",color:"#333",minWidth:0,width:0}}>
                <option value="">すべての機種</option>
                {machines.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={filter.cat} onChange={e => setFilter(f=>({...f,cat:e.target.value}))} style={{flex:1,fontSize:15,padding:"8px 10px",border:"none",borderRadius:10,background:"#E8ECF0",boxShadow:"inset 3px 3px 6px #C5C9D4, inset -3px -3px 6px #FFFFFF",color:"#333",minWidth:0,width:0}}>
                <option value="">すべてのカテゴリ</option>
                <option value="aimH">お店狙い目</option>
                <option value="memory">勝＆負エピ</option>
                <option value="spec">機種情報</option>
                <option value="hall">業界情報</option>
                <option value="episode">昔の機種</option>
                <option value="quote">版権ネタ</option>
                <option value="bonus">演出・表現</option>
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
          {filteredPosts.length>0&&(filter.machine||filter.cat) && (
            <button onClick={() => { const q=filter.machine?filter.machine+(filter.cat?"の"+(CATS[filter.cat]?.label):"")+"について企画のヒントを教えて":(CATS[filter.cat]?.label)+"カテゴリで人気の投稿の共通点を教えて"; setMode("chat"); setTimeout(()=>send(q),100); }} style={{marginTop:4,width:"100%",padding:"10px 0",border:"0.5px solid #D85A30",borderRadius:8,background:"#FAECE7",color:"#993C1D",fontSize:15,fontWeight:500,cursor:"pointer"}}>
              この絞り込み結果をチャットで深掘り ↗
            </button>
          )}
        </div>
      )}
    </div>
  );
}