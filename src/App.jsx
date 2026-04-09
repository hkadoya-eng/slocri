import { useState, useRef, useEffect, useMemo } from "react";
import { supabase } from "./supabase";

const CATS = {
  bonus:   { label:"演出・ボーナス",    bg:"#FAECE7", color:"#993C1D", border:"#F0997B" },
  spec:    { label:"機種情報・スペック", bg:"#E6F1FB", color:"#185FA5", border:"#85B7EB" },
  quote:   { label:"名言・煽り文句",    bg:"#EAF3DE", color:"#3B6D11", border:"#97C459" },
  memory:  { label:"思い出・エピソード", bg:"#EEEDFE", color:"#3C3489", border:"#AFA9EC" },
  episode: { label:"エピソード",        bg:"#FFF0F5", color:"#A0306A", border:"#F0A0C0" },
  hall:    { label:"ホール・業界",      bg:"#F0F4E8", color:"#4A6B1A", border:"#A0C050" },
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
  "編集部AI", "スロ好き編集マン", "スロクリ編集部", "パチスロ記者", "編集長補佐",
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
const MY_UID = "me";
const MY_NAME = localStorage.getItem("slocri_name") || "ゲスト";

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
  return <span style={{fontSize:11,padding:"2px 8px",borderRadius:6,background:c.bg,color:c.color,border:`0.5px solid ${c.border}`,fontWeight:500,whiteSpace:"nowrap"}}>{c.label}</span>;
}
function SrcBadge({ src }) {
  if (!src || src === "manual" || src === "マニュアル" || src === "手動") return null;
  const c = SRC_COLORS[src] || { bg:"#F1EFE8", color:"#5F5E5A" };
  const lbl = src==="twitter"?"X":src==="youtube"?"YT":src==="wiki"?"W":src==="ちょんぼりすた"?"ちょんぼ":(src==="WebSearch"||src==="ウェブ検索")?"検索":src;
  return <span style={{fontSize:11,padding:"2px 6px",borderRadius:6,background:c.bg,color:c.color,fontWeight:500}}>{lbl}</span>;
}
function Dots({ q }) {
  return <span style={{display:"flex",gap:2}}>{[1,2,3,4,5].map(n => <span key={n} style={{width:5,height:5,borderRadius:"50%",display:"inline-block",background:n<=q?"#D85A30":"var(--color-border-secondary)"}}/>)}</span>;
}

export default function App() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("feed");
  const [toast, setToast] = useState("");
  const nextId = useRef(1000);

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    setLoading(true);
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setPosts(data.map(p => ({
        ...p,
        internal: p.internal || blank(),
        eng: p.eng || {},
      })));
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
  const LABELS = { feed:"フィード", collect:"収集", overview:"俯瞰", research:"リサーチ" };

  return (
    <div style={{padding:"12px",maxWidth:740,margin:"0 auto",fontFamily:"sans-serif",textAlign:"left"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}>
        <div style={{fontSize:20,fontWeight:500}}><span style={{color:"#D85A30"}}>▶</span> スロクリ</div>
        <span style={{fontSize:12,color:"#888"}}>{posts.length}件</span>
      </div>

      {toast && <div style={{background:"#EAF3DE",border:"0.5px solid #97C459",borderRadius:8,padding:"8px 16px",fontSize:13,color:"#3B6D11",fontWeight:500,marginBottom:12,textAlign:"center"}}>{toast}</div>}

      <div style={{display:"flex",gap:4,marginBottom:"1.25rem",borderBottom:"0.5px solid #ddd",paddingBottom:"0.75rem"}}>
        {TABS.map(k => {
          const on = tab === k;
          return <button key={k} onClick={() => setTab(k)} style={{flex:1,padding:"7px 0",border:`0.5px solid ${on?"#D85A30":"#ddd"}`,borderRadius:8,fontSize:13,background:on?"#FAECE7":"#fff",color:on?"#993C1D":"#888",cursor:"pointer",fontWeight:on?500:400,textAlign:"center"}}>{LABELS[k]}</button>;
        })}
      </div>

      {loading && <div style={{textAlign:"center",padding:"2rem",color:"#888"}}>読み込み中...</div>}

      {!loading && tab === "feed"     && <FeedTab     posts={posts} updatePost={updatePost} deletePost={deletePost} addPost={addPost} showToast={showToast} />}
      {!loading && tab === "collect"  && <CollectTab  posts={posts} addPost={addPost} showToast={showToast} />}
      {!loading && tab === "overview" && <OverviewTab posts={posts} />}
      {!loading && tab === "research" && <ResearchTab posts={posts} />}
    </div>
  );
}

function FeedTab({ posts, updatePost, deletePost, addPost, showToast }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("new");
  const [commentOpen, setCommentOpen] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [fMachine, setFMachine] = useState("");
  const [fCat, setFCat] = useState("bonus");
  const [fBody, setFBody] = useState("");
  const [fName, setFName] = useState(MY_NAME);
  const [currentName, setCurrentName] = useState(() => localStorage.getItem("slocri_name") || "ゲスト");
  const [editId, setEditId] = useState(null);
  const [eMachine, setEMachine] = useState("");
  const [eCat, setECat] = useState("bonus");
  const [eBody, setEBody] = useState("");
  const [eUrl, setEUrl] = useState("");
  const [eImage, setEImage] = useState(null);
  const [eImagePreview, setEImagePreview] = useState(null);
  const [eUploading, setEUploading] = useState(false);
  const [fUrl, setFUrl] = useState("");
  const [fImage, setFImage] = useState(null);
  const [fImagePreview, setFImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState(new Set());
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

  function resetForm() { setShowForm(false); setFMachine(""); setFCat("bonus"); setFBody(""); setFUrl(""); setFImage(null); setFImagePreview(null); }

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

  async function submitPost() {
    if (!fMachine.trim() || !fBody.trim()) return;
    const b = fBody.trim();
    const authorName = fName.trim() || "ゲスト";
    if (authorName === "ゲスト") {
      const ok = window.confirm("名前が「ゲスト」のまま投稿すると、あとから編集・削除できません。\nこのまま投稿しますか？");
      if (!ok) return;
    }
    localStorage.setItem("slocri_name", authorName);
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
        cat: fCat, source: "manual", machine: fMachine.trim(),
        title: b.length > 30 ? b.slice(0,30)+"..." : b,
        body: b, url: fUrl.trim(), quality: 3, dupKey: "", author: authorName, eng: {},
        internal: { ...blank(), imageUrl },
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
    const comments = [...(p.internal.comments || []), { uid: MY_UID, text: commentText.trim(), ts: "たった今" }];
    await updatePost(p.id, { internal: { ...p.internal, comments } });
    setCommentText("");
  }
  async function handleDelete(id) {
    if (!window.confirm("削除しますか？")) return;
    await deletePost(id);
  }

  const filtered = posts.filter(p => {
    if (filter !== "all" && p.cat !== filter) return false;
    if (query.trim() && !(p.machine+p.title+p.body).toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }).sort((a,b) => sortBy === "internal" ? (b.internal?.likes?.length||0) - (a.internal?.likes?.length||0) : new Date(b.created_at) - new Date(a.created_at));

  return (
    <div>
      <div style={{marginBottom:"1.25rem"}}>
        <button onClick={() => setShowForm(v => !v)} style={{width:"100%",padding:"11px 0",background:"#D85A30",color:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:500,cursor:"pointer"}}>{showForm ? "− 投稿する" : "+ 投稿する"}</button>
        {showForm && (
          <div style={{background:"#fff",border:"0.5px solid #ddd",borderRadius:12,padding:"12px"}}>
            <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>新規投稿</div>
            <input value={fName} onChange={e => setFName(e.target.value)} placeholder="名前（例: ゲスト）" style={{width:"100%",fontSize:14,padding:"9px 10px",border:"0.5px solid #ddd",borderRadius:8,background:"#f9f9f9",marginBottom:8,boxSizing:"border-box"}} />
            <input value={fMachine} onChange={e => { setFMachine(e.target.value); setMachineSuggestion(null); }} onBlur={e => checkMachineName(e.target.value)} placeholder="機種名（例: バジリスク絆2）" list="machine-candidates" style={{width:"100%",fontSize:14,padding:"9px 10px",border:"0.5px solid #ddd",borderRadius:8,background:"#f9f9f9",marginBottom:machineSuggestion?4:8,boxSizing:"border-box"}} />
            <datalist id="machine-candidates">
              {[...new Map(posts.map(p => [p.machine, (posts.filter(q => q.machine === p.machine).length)])).entries()]
                .sort((a,b) => b[1]-a[1]).map(([name]) => <option key={name} value={name} />)}
            </datalist>
            {machineSuggestion && (
              <div style={{fontSize:12,color:"#666",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                もしかして:
                <button onClick={() => { setFMachine(machineSuggestion); setMachineSuggestion(null); }} style={{fontSize:12,color:"#D85A30",background:"none",border:"none",cursor:"pointer",padding:0,fontWeight:500,textDecoration:"underline"}}>{machineSuggestion}</button>
                <button onClick={() => setMachineSuggestion(null)} style={{fontSize:11,color:"#aaa",background:"none",border:"none",cursor:"pointer",padding:0}}>✕</button>
              </div>
            )}
            <select value={fCat} onChange={e => setFCat(e.target.value)} style={{width:"100%",fontSize:14,padding:"9px 10px",border:"0.5px solid #ddd",borderRadius:8,background:"#f9f9f9",marginBottom:8,boxSizing:"border-box"}}>
              <option value="bonus">演出・ボーナス</option>
              <option value="spec">機種情報・スペック</option>
              <option value="quote">名言・煽り文句</option>
              <option value="memory">思い出・エピソード</option>
            </select>
            <textarea value={fBody} onChange={e => setFBody(e.target.value)} placeholder="演出の感想、名言、思い出など自由に書いてください" style={{width:"100%",fontSize:14,padding:"9px 10px",border:"0.5px solid #ddd",borderRadius:8,background:"#f9f9f9",resize:"vertical",minHeight:88,marginBottom:8,boxSizing:"border-box"}} />
            <input value={fUrl} onChange={e => setFUrl(e.target.value)} placeholder="引用元URL（任意）" style={{width:"100%",fontSize:13,padding:"8px 10px",border:"0.5px solid #ddd",borderRadius:8,background:"#f9f9f9",marginBottom:8,boxSizing:"border-box"}} />
            <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,cursor:"pointer"}}>
              <div style={{padding:"7px 14px",border:"0.5px solid #ddd",borderRadius:8,background:"#f9f9f9",fontSize:13,color:"#555",whiteSpace:"nowrap"}}>📷 画像を選ぶ</div>
              <span style={{fontSize:12,color:"#aaa",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fImage ? fImage.name : "未選択（自動リサイズあり）"}</span>
              <input type="file" accept="image/*" onChange={onImageChange} style={{display:"none"}} />
            </label>
            {fImagePreview && (
              <div style={{position:"relative",marginBottom:10}}>
                <img src={fImagePreview} alt="preview" style={{width:"100%",borderRadius:8,maxHeight:200,objectFit:"cover"}} />
                <button onClick={() => { setFImage(null); setFImagePreview(null); }} style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,0.5)",color:"#fff",border:"none",borderRadius:"50%",width:22,height:22,cursor:"pointer",fontSize:13,lineHeight:1,padding:0}}>×</button>
              </div>
            )}
            <div style={{display:"flex",gap:8}}>
              <button onClick={submitPost} disabled={uploading} style={{flex:1,padding:"9px 0",background:uploading?"#aaa":"#2a9d3f",color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:500,cursor:uploading?"not-allowed":"pointer"}}>{uploading?"アップロード中...":"投稿"}</button>
              <button onClick={resetForm} style={{padding:"9px 16px",background:"#f0f0f0",color:"#666",border:"0.5px solid #ddd",borderRadius:8,fontSize:13,cursor:"pointer"}}>キャンセル</button>
            </div>
          </div>
        )}
      </div>

      <div style={{display:"flex",gap:6,marginBottom:10}}>
        <div style={{position:"relative",flex:1}}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="キーワード検索..." style={{width:"100%",fontSize:14,padding:"8px 30px",border:"0.5px solid #ddd",borderRadius:8,background:"#f9f9f9",boxSizing:"border-box"}} />
          <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"#aaa",pointerEvents:"none"}}>⌕</span>
          {query && <button onClick={() => setQuery("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:14,color:"#aaa",padding:0}}>×</button>}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{fontSize:12,padding:"8px 6px",border:"0.5px solid #ddd",borderRadius:8,background:"#f9f9f9",color:"#666",flexShrink:0}}>
          <option value="new">新着順</option>
          <option value="internal">評価順</option>
        </select>
      </div>

      <div style={{display:"flex",gap:5,marginBottom:"1rem",overflowX:"auto",WebkitOverflowScrolling:"touch",flexWrap:"nowrap",paddingBottom:4,msOverflowStyle:"none",scrollbarWidth:"none"}}>
        {["all","bonus","spec","episode","hall","quote","memory"].map(k => {
          const on = filter === k;
          return <button key={k} onClick={() => setFilter(k)} style={{padding:"4px 12px",border:`0.5px solid ${on?"#D85A30":"#ddd"}`,borderRadius:8,fontSize:12,background:on?"#FAECE7":"#fff",color:on?"#993C1D":"#888",cursor:"pointer",fontWeight:on?500:400,whiteSpace:"nowrap",flexShrink:0}}>{k==="all"?"すべて":CATS[k].label}</button>;
        })}
      </div>

      {filtered.length === 0 && <div style={{textAlign:"center",padding:"2rem",color:"#aaa",fontSize:13}}>投稿がありません</div>}

      {filtered.map(p => {
        const engDefs = ENG_DEFS[p.source] || [];
        const hasEng = engDefs.some(d => fmtNum(p.eng?.[d.key]));
        const iLiked = (p.internal?.likes || []).indexOf(MY_UID) >= 0;
        const iBM = (p.internal?.bookmarks || []).indexOf(MY_UID) >= 0;
        const isOpen = commentOpen === p.id;
        const postAuthor = p.internal?.author || p.author || "ゲスト";
        const isOwn = currentName !== "ゲスト" && postAuthor === currentName;
        const isEditing = editId === p.id;
        return (
          <div key={p.id} style={{background:"#fff",border:`0.5px solid ${isOwn?"#F0997B":"#eee"}`,borderRadius:12,padding:"10px 12px",marginBottom:8}}>
            {isEditing ? (
              <div>
                <select value={eCat} onChange={e => setECat(e.target.value)} style={{width:"100%",fontSize:13,padding:"7px 10px",border:"0.5px solid #ddd",borderRadius:8,background:"#f9f9f9",marginBottom:8,boxSizing:"border-box"}}>
                  <option value="bonus">演出・ボーナス</option>
                  <option value="spec">機種情報・スペック</option>
                  <option value="quote">名言・煽り文句</option>
                  <option value="memory">思い出・エピソード</option>
                </select>
                <input value={eMachine} onChange={e => setEMachine(e.target.value)} placeholder="機種名" style={{width:"100%",fontSize:13,padding:"7px 10px",border:"0.5px solid #ddd",borderRadius:8,background:"#f9f9f9",marginBottom:8,boxSizing:"border-box"}} />
                <textarea value={eBody} onChange={e => setEBody(e.target.value)} style={{width:"100%",fontSize:13,padding:"7px 10px",border:"0.5px solid #ddd",borderRadius:8,background:"#f9f9f9",resize:"vertical",minHeight:80,marginBottom:8,boxSizing:"border-box"}} />
                <input value={eUrl} onChange={e => setEUrl(e.target.value)} placeholder="引用元URL（任意）" style={{width:"100%",fontSize:13,padding:"7px 10px",border:"0.5px solid #ddd",borderRadius:8,background:"#f9f9f9",marginBottom:8,boxSizing:"border-box"}} />
                <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,cursor:"pointer"}}>
                  <div style={{padding:"6px 12px",border:"0.5px solid #ddd",borderRadius:8,background:"#f9f9f9",fontSize:13,color:"#555",whiteSpace:"nowrap"}}>📷 画像を変更</div>
                  <span style={{fontSize:12,color:"#aaa",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{eImage ? eImage.name : "未選択（自動リサイズあり）"}</span>
                  <input type="file" accept="image/*" onChange={onEditImageChange} style={{display:"none"}} />
                </label>
                {eImagePreview && (
                  <div style={{position:"relative",marginBottom:8}}>
                    <img src={eImagePreview} alt="preview" style={{width:"100%",borderRadius:8,maxHeight:200,objectFit:"contain",background:"#f9f9f9"}} />
                    <button onClick={() => { setEImage(null); setEImagePreview(null); }} style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,0.5)",color:"#fff",border:"none",borderRadius:"50%",width:22,height:22,cursor:"pointer",fontSize:13,lineHeight:1,padding:0}}>×</button>
                  </div>
                )}
                <div style={{display:"flex",gap:8}}>
                  <button onClick={() => saveEdit(p)} disabled={eUploading} style={{flex:1,padding:"7px 0",background:eUploading?"#aaa":"#2a9d3f",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:500,cursor:eUploading?"not-allowed":"pointer"}}>{eUploading?"アップロード中...":"保存"}</button>
                  <button onClick={() => setEditId(null)} style={{padding:"7px 14px",background:"#f0f0f0",color:"#666",border:"0.5px solid #ddd",borderRadius:8,fontSize:13,cursor:"pointer"}}>キャンセル</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:6}}>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}><CatBadge cat={p.cat}/><SrcBadge src={p.source}/></div>
                  <Dots q={p.quality}/>
                </div>
                <div style={{fontSize:12,color:"#888",marginBottom:3,display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontWeight:500,color:isOwn?"#D85A30":"#555"}}>@{postAuthor}{isOwn&&<span style={{fontSize:10,marginLeft:3,color:"#D85A30"}}>（自分）</span>}</span>
                  <span>機種: <span style={{color:"#333",fontWeight:500}}>{p.machine}</span></span>
                </div>
                <div style={{fontSize:14,fontWeight:500,color:"#333",marginBottom:4}}>{p.title}</div>
                {(() => {
                  const LIMIT = 100;
                  const isLong = p.body.length > LIMIT;
                  const isExpanded = expandedPosts.has(p.id);
                  const toggle = () => setExpandedPosts(prev => {
                    const s = new Set(prev);
                    s.has(p.id) ? s.delete(p.id) : s.add(p.id);
                    return s;
                  });
                  return (
                    <div style={{marginBottom:(p.internal?.imageUrl||p.url)?6:10}}>
                      <div style={{fontSize:13,color:"#666",lineHeight:1.65}}>{isLong && !isExpanded ? p.body.slice(0, LIMIT) + "…" : p.body}</div>
                      {isLong && <button onClick={toggle} style={{fontSize:12,color:"#D85A30",background:"none",border:"none",padding:"2px 0",cursor:"pointer",fontWeight:500}}>{isExpanded ? "折りたたむ" : "もっと見る"}</button>}
                    </div>
                  );
                })()}
                {p.internal?.imageUrl && (
                  <img src={p.internal.imageUrl} alt="" style={{width:"100%",maxHeight:360,objectFit:"contain",borderRadius:8,marginBottom:6,display:"block",background:"#f9f9f9"}} />
                )}
                {p.url && (
                  <a href={p.url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:6,background:"#f4f3ec",borderRadius:8,padding:"6px 10px",marginBottom:10,textDecoration:"none",overflow:"hidden"}}>
                    <span style={{fontSize:12,color:"#888",flexShrink:0}}>🔗</span>
                    <span style={{fontSize:12,color:"#185FA5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.url}</span>
                  </a>
                )}

                {(hasEng || p.source !== "manual") && (
                  <div style={{background:"#f9f9f9",borderRadius:8,padding:"6px 10px",marginBottom:10,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                    <span style={{fontSize:11,color:"#aaa"}}>外部</span>
                    {engDefs.map(d => { const v=fmtNum(p.eng?.[d.key]); if(!v)return null; return <span key={d.key} style={{fontSize:12,display:"flex",alignItems:"center",gap:3}}><span style={{color:"#aaa"}}>{d.icon}</span><span style={{fontWeight:500,color:"#333"}}>{v}</span><span style={{fontSize:11,color:"#aaa"}}>{d.label}</span></span>; })}
                    {!hasEng && <span style={{fontSize:11,color:"#aaa"}}>数値なし</span>}
                  </div>
                )}

                <div style={{borderTop:"0.5px solid #eee",paddingTop:8,display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                  <button onClick={() => toggleLike(p)} style={{display:"flex",alignItems:"center",gap:3,padding:"5px 10px",border:`0.5px solid ${iLiked?"#F0997B":"#ddd"}`,borderRadius:8,background:iLiked?"#FAECE7":"#f9f9f9",color:iLiked?"#993C1D":"#888",fontSize:12,cursor:"pointer",fontWeight:iLiked?500:400}}>♥ {(p.internal?.likes||[]).length}</button>
                  <button onClick={() => toggleBM(p)} style={{display:"flex",alignItems:"center",gap:3,padding:"5px 10px",border:`0.5px solid ${iBM?"#85B7EB":"#ddd"}`,borderRadius:8,background:iBM?"#E6F1FB":"#f9f9f9",color:iBM?"#185FA5":"#888",fontSize:12,cursor:"pointer"}}>◈ {(p.internal?.bookmarks||[]).length}</button>
                  <button onClick={() => { setCommentOpen(isOpen?null:p.id); setCommentText(""); }} style={{display:"flex",alignItems:"center",gap:3,padding:"5px 10px",border:`0.5px solid ${isOpen?"#AFA9EC":"#ddd"}`,borderRadius:8,background:isOpen?"#EEEDFE":"#f9f9f9",color:isOpen?"#3C3489":"#888",fontSize:12,cursor:"pointer"}}>◎ コメント {(p.internal?.comments||[]).length}</button>
                  {(() => { const isBad=(p.internal?.bads||[]).indexOf(MY_UID)>=0; return <button onClick={() => toggleBad(p)} style={{display:"flex",alignItems:"center",gap:3,padding:"5px 10px",border:`0.5px solid ${isBad?"#e57373":"#ddd"}`,borderRadius:8,background:isBad?"#FFEBEE":"#f9f9f9",color:isBad?"#c62828":"#bbb",fontSize:12,cursor:"pointer",fontWeight:isBad?500:400}}>✕ bad {(p.internal?.bads||[]).length||""}</button>; })()}
                  {isOwn && <>
                    <button onClick={() => startEdit(p)} style={{marginLeft:"auto",background:"none",border:"0.5px solid #ddd",borderRadius:8,fontSize:11,color:"#888",cursor:"pointer",padding:"3px 10px"}}>編集</button>
                    <button onClick={() => handleDelete(p.id)} style={{background:"none",border:"0.5px solid #ddd",borderRadius:8,fontSize:11,color:"#e57373",cursor:"pointer",padding:"3px 10px"}}>削除</button>
                  </>}
                </div>
                {isOpen && (
                  <div style={{marginTop:10}}>
                    {(p.internal?.comments||[]).map((c,i) => (
                      <div key={i} style={{display:"flex",gap:8,marginBottom:8}}>
                        <div style={{width:24,height:24,borderRadius:"50%",background:c.uid===MY_UID?"#FAECE7":"#f0f0f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:c.uid===MY_UID?"#993C1D":"#888",flexShrink:0,fontWeight:500}}>{c.uid===MY_UID?"自":"他"}</div>
                        <div style={{flex:1,background:"#f9f9f9",borderRadius:8,padding:"6px 10px",fontSize:13,color:"#333",lineHeight:1.5}}>{c.text}<span style={{fontSize:11,color:"#aaa",marginLeft:8}}>{c.ts}</span></div>
                      </div>
                    ))}
                    <div style={{display:"flex",gap:6}}>
                      <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => { if(e.key==="Enter"){e.preventDefault();addComment(p);}}} placeholder="コメントを入力… (Enter)" style={{flex:1,fontSize:13,padding:"6px 10px",border:"0.5px solid #ddd",borderRadius:8,background:"#f9f9f9"}} />
                      <button onClick={() => addComment(p)} style={{padding:"6px 14px",background:"#D85A30",color:"#fff",border:"none",borderRadius:8,fontSize:13,cursor:"pointer"}}>送信</button>
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

function CollectTab({ posts, addPost, showToast }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [dupModal, setDupModal] = useState(null);
  const pending = useRef(null);

  const counts = {};
  ["bonus","spec","episode","hall","quote","memory"].forEach(k => { counts[k] = posts.filter(p => p.cat===k).length; });

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
          system: 'パチスロライブラリの収集アシスタントです。実在する機種名・具体的な情報のみ使用。JSON形式のみで返答: {"cat":"bonus|spec|quote|memory","source":"manual","machine":"機種名","title":"30文字以内","body":"100〜150文字の具体的な説明","quality":3,"dupKey":"機種名_キー","eng":{}}',
          messages: [{ role: "user", content: userMsg }]
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(typeof data.error === "string" ? data.error : (data.error.message || JSON.stringify(data.error)));
      const txt = (data.content||[]).filter(b => b.type==="text").map(b => b.text).join("");
      const parsed = JSON.parse(txt.replace(/```json|```/g,"").trim());
      const item = { cat:parsed.cat||"memory", source:parsed.source||"manual", machine:parsed.machine||input.trim(), title:parsed.title||"無題", body:parsed.body||input.slice(0,150), url:"", quality:parsed.quality||3, dupKey:parsed.dupKey||"", eng:parsed.eng||{}, internal:blank() };
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
形式: [{"cat":"bonus|spec|quote|memory","machine":"実在する機種名","title":"30文字以内","body":"100〜150文字の具体的な説明","quality":4,"dupKey":"機種名_キーワード"}]
・catはbonus=演出・ボーナス, spec=スペック・攻略, quote=名言・煽り文句, memory=思い出・エピソード
・実在する機種名を必ず使うこと。架空の機種は禁止。
・bodyは具体的な数字・演出名・セリフを含めてリアリティを出すこと。` + badContext;

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

  function exportJSON() { const b=new Blob([JSON.stringify(posts,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="slocri.json";a.click();showToast("JSONをエクスポートしました"); }
  function exportCSV() { const h=["id","cat","source","machine","title","body","url","quality"];const rows=posts.map(p=>h.map(k=>'"'+String(p[k]||"").replace(/"/g,'""')+'"').join(","));const b=new Blob([[h.join(","),...rows].join("\n")],{type:"text/csv"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="slocri.csv";a.click();showToast("CSVをエクスポートしました"); }

  return (
    <div>
      {dupModal && (
        <div style={{marginBottom:16,background:"#FAEEDA",border:"0.5px solid #EF9F27",borderRadius:12,padding:"1rem"}}>
          <div style={{fontSize:14,fontWeight:500,color:"#633806",marginBottom:10}}>似たコンテンツが {dupModal.dups.length}件 見つかりました</div>
          {dupModal.dups.map(d => <div key={d.id} style={{background:"#fff",border:"0.5px solid #eee",borderRadius:8,padding:"8px 12px",marginBottom:8,fontSize:12}}><div style={{fontWeight:500,color:"#333",marginBottom:2}}>{d.title}</div><div style={{color:"#666"}}>{d.body?.slice(0,60)}...</div></div>)}
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <button onClick={async () => { await addPost(pending.current); setDupModal(null); }} style={{flex:1,padding:"7px 0",background:"#D85A30",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer"}}>それでも追加する</button>
            <button onClick={() => { setDupModal(null); showToast("キャンセルしました"); }} style={{flex:1,padding:"7px 0",background:"#f0f0f0",color:"#666",border:"0.5px solid #ddd",borderRadius:8,fontSize:13,cursor:"pointer"}}>キャンセル</button>
          </div>
        </div>
      )}

      <div style={{marginBottom:"1.25rem"}}>
        <div style={{fontSize:12,color:"#888",marginBottom:6}}>自動収集</div>
        <button disabled title="APIキーが必要です" style={{width:"100%",padding:"10px 0",background:"#e0e0e0",color:"#aaa",border:"none",borderRadius:10,fontSize:13,fontWeight:500,cursor:"not-allowed"}}>ネットを巡回して収集 ↗</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:"1.25rem"}}>
        {["bonus","spec","episode","hall","quote","memory"].map(k => <div key={k} style={{background:"#f9f9f9",borderRadius:8,padding:"8px 10px"}}><div style={{fontSize:22,fontWeight:500,color:"#333"}}>{counts[k]}</div><div style={{fontSize:11,color:"#888",marginTop:2}}>{CATS[k].label}</div></div>)}
      </div>

      <div style={{background:"#fff",border:"0.5px solid #eee",borderRadius:12,padding:"1rem",marginBottom:12}}>
        <div style={{fontSize:12,color:"#888",marginBottom:8}}>URLまたはテキストを貼り付けると、編集部AIが自動分類・要約して登録します</div>
        <textarea value={input} onChange={e => setInput(e.target.value)} style={{width:"100%",fontSize:13,padding:"8px 10px",border:"0.5px solid #ddd",borderRadius:8,background:"#f9f9f9",resize:"vertical",minHeight:72,marginBottom:8,boxSizing:"border-box"}} placeholder="https://twitter.com/... やメモを貼り付け" />
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:12,color:"#3B6D11",fontWeight:500}}>{status}</span>
          <button onClick={collect} disabled={loading} style={{padding:"7px 18px",background:loading?"#ccc":"#D85A30",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:500,cursor:loading?"not-allowed":"pointer"}}>{loading?"解析中...":"編集部AIで収集 ↗"}</button>
        </div>
      </div>
      <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
        <button onClick={exportCSV} style={{fontSize:12,padding:"5px 12px",border:"0.5px solid #ddd",borderRadius:8,background:"#f9f9f9",color:"#666",cursor:"pointer"}}>CSV出力</button>
        <button onClick={exportJSON} style={{fontSize:12,padding:"5px 12px",border:"0.5px solid #ddd",borderRadius:8,background:"#f9f9f9",color:"#666",cursor:"pointer"}}>JSON出力</button>
      </div>
    </div>
  );
}

function OverviewTab({ posts }) {
  const [view, setView] = useState("rank");
  const [rankBy, setRankBy] = useState("likes");
  const [selM, setSelM] = useState(null);
  const [query, setQuery] = useState("");

  const machines = useMemo(() => {
    const m = {};
    posts.forEach(p => {
      if (!m[p.machine]) m[p.machine] = { name:p.machine, count:0, likes:0, cats:{} };
      m[p.machine].count++;
      m[p.machine].likes += (p.internal?.likes?.length||0);
      m[p.machine].cats[p.cat] = (m[p.machine].cats[p.cat]||0)+1;
    });
    return Object.values(m).sort((a,b) => b.likes-a.likes);
  }, [posts]);

  const catDist = useMemo(() => {
    return ["bonus","spec","episode","hall","quote","memory"].map(k => {
      const ps = posts.filter(p => p.cat===k);
      const likes = ps.reduce((s,p) => s+(p.internal?.likes?.length||0), 0);
      const top = ps.slice().sort((a,b) => (b.internal?.likes?.length||0)-(a.internal?.likes?.length||0))[0];
      return { key:k, label:CATS[k].label, bg:CATS[k].bg, color:CATS[k].color, cnt:ps.length, pct:posts.length?Math.round(ps.length/posts.length*100):0, likes, top };
    });
  }, [posts]);

  const ranked = useMemo(() => {
    const q = query.toLowerCase();
    return posts.slice().filter(p => !q||(p.machine+p.title+p.body).toLowerCase().includes(q))
      .sort((a,b) => {
        if (rankBy==="likes") return (b.internal?.likes?.length||0)-(a.internal?.likes?.length||0);
        if (rankBy==="bookmarks") return (b.internal?.bookmarks?.length||0)-(a.internal?.bookmarks?.length||0);
        return (b.quality||0)-(a.quality||0);
      });
  }, [posts, rankBy, query]);

  const th = { fontSize:11, color:"#888", padding:"6px 10px", textAlign:"left", fontWeight:500, borderBottom:"0.5px solid #eee", whiteSpace:"nowrap" };
  const td = { fontSize:13, padding:"7px 10px", color:"#333", borderBottom:"0.5px solid #eee", verticalAlign:"middle" };

  return (
    <div>
      <div className="scroll-x" style={{display:"flex",gap:6,marginBottom:"1.25rem",flexWrap:"nowrap"}}>
        {[["rank","ランキング"],["machine","機種別"],["cat","カテゴリ分布"]].map(([k,l]) => {
          const on = view===k;
          return <button key={k} onClick={() => { setView(k); setSelM(null); setQuery(""); }} style={{padding:"5px 14px",border:`0.5px solid ${on?"#D85A30":"#ddd"}`,borderRadius:8,fontSize:12,background:on?"#FAECE7":"#fff",color:on?"#993C1D":"#888",cursor:"pointer",fontWeight:on?500:400,whiteSpace:"nowrap",flexShrink:0}}>{l}</button>;
        })}
      </div>

      {view==="rank" && (
        <div>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <div style={{position:"relative",flex:1}}>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="絞り込み..." style={{width:"100%",fontSize:13,padding:"6px 28px",border:"0.5px solid #ddd",borderRadius:8,background:"#f9f9f9",boxSizing:"border-box"}} />
              <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"#aaa",pointerEvents:"none"}}>⌕</span>
              {query && <button onClick={() => setQuery("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#aaa",padding:0}}>×</button>}
            </div>
            <select value={rankBy} onChange={e => setRankBy(e.target.value)} style={{fontSize:12,padding:"6px 8px",border:"0.5px solid #ddd",borderRadius:8,background:"#f9f9f9",color:"#666"}}>
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
                {ranked.map((p,i) => (
                  <tr key={p.id} style={{background:i%2===0?"#fff":"#fafafa"}}>
                    <td style={{...td,textAlign:"center",fontWeight:500,fontSize:12,color:i<3?"#D85A30":"#aaa"}}>{i+1}</td>
                    <td style={{...td,maxWidth:0}}><div style={{fontWeight:500,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</div><div style={{fontSize:11,color:"#888",marginTop:1,display:"flex",gap:4}}><SrcBadge src={p.source}/><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.machine}</span></div></td>
                    <td style={td}><CatBadge cat={p.cat}/></td>
                    <td style={{...td,textAlign:"right",fontWeight:500,color:"#D85A30"}}>{p.internal?.likes?.length||0}</td>
                    <td style={{...td,textAlign:"center"}}><Dots q={p.quality||0}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view==="machine" && (
        <div>
          <div className="scroll-x" style={{background:"#fff",border:"0.5px solid #eee",borderRadius:12,marginBottom:12}}>
            <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed",minWidth:340}}>
              <colgroup><col/><col style={{width:40}}/><col style={{width:48}}/><col style={{width:120}}/></colgroup>
              <thead><tr style={{background:"#f9f9f9"}}><th style={th}>機種名</th><th style={{...th,textAlign:"right"}}>件数</th><th style={{...th,textAlign:"right"}}>♥</th><th style={th}>カテゴリ構成</th></tr></thead>
              <tbody>
                {machines.map((m,i) => {
                  const sel = selM===m.name;
                  return <tr key={m.name} onClick={() => setSelM(sel?null:m.name)} style={{background:sel?"#FAECE7":i%2===0?"#fff":"#fafafa",cursor:"pointer"}}>
                    <td style={{...td,fontWeight:sel?500:400,color:sel?"#993C1D":"#333",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:0}}>{m.name}</td>
                    <td style={{...td,textAlign:"right",fontSize:12,color:"#888"}}>{m.count}</td>
                    <td style={{...td,textAlign:"right",fontWeight:500,color:"#D85A30"}}>{m.likes}</td>
                    <td style={td}><div style={{display:"flex",gap:2,flexWrap:"wrap"}}>{Object.entries(m.cats).map(([k,v]) => <span key={k} style={{fontSize:10,padding:"1px 5px",borderRadius:10,background:CATS[k]?.bg,color:CATS[k]?.color,fontWeight:500}}>{CATS[k]?.label.slice(0,3)} {v}</span>)}</div></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          {selM && (
            <div>
              <div style={{fontSize:13,fontWeight:500,color:"#333",marginBottom:8}}>{selM} の投稿一覧</div>
              {posts.filter(p => p.machine===selM).sort((a,b) => (b.internal?.likes?.length||0)-(a.internal?.likes?.length||0)).map(p => (
                <div key={p.id} style={{background:"#fff",border:"0.5px solid #eee",borderRadius:12,padding:"10px 14px",marginBottom:8}}>
                  <div style={{display:"flex",gap:5,marginBottom:4,alignItems:"center"}}><CatBadge cat={p.cat}/><span style={{marginLeft:"auto",fontSize:11,color:"#D85A30",fontWeight:500}}>♥ {p.internal?.likes?.length||0}</span></div>
                  <div style={{fontSize:13,fontWeight:500,color:"#333",marginBottom:3}}>{p.title}</div>
                  <div style={{fontSize:12,color:"#666",lineHeight:1.6}}>{p.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view==="cat" && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
          {catDist.map(c => (
            <div key={c.key} style={{background:"#fff",border:"0.5px solid #eee",borderRadius:12,padding:"10px 12px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:13,fontWeight:500,color:c.color}}>{c.label}</span>
                <span style={{fontSize:20,fontWeight:500,color:"#333"}}>{c.cnt}<span style={{fontSize:12,color:"#aaa",marginLeft:2}}>件</span></span>
              </div>
              <div style={{height:5,background:"#f0f0f0",borderRadius:3,marginBottom:8,overflow:"hidden"}}><div style={{height:"100%",width:c.pct+"%",background:c.color,borderRadius:3,opacity:.7}}/></div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#888",marginBottom:8}}><span>全体 {c.pct}%</span><span>♥ 合計 {c.likes}</span></div>
              {c.top && <div style={{background:c.bg,borderRadius:8,padding:"6px 8px"}}><div style={{fontSize:10,color:c.color,marginBottom:2,fontWeight:500}}>最多いいね</div><div style={{fontSize:12,color:"#333",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.top.title}</div><div style={{fontSize:11,color:"#666",marginTop:1}}>{c.top.machine} · ♥ {c.top.internal?.likes?.length||0}</div></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResearchTab({ posts }) {
  const [mode, setMode] = useState("chat");
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
      const lib = JSON.stringify(posts.map(p => ({ id:p.id, cat:p.cat, machine:p.machine, title:p.title, body:p.body, likes:p.internal?.likes?.length||0, quality:p.quality })));
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
    <div>
      <div style={{display:"flex",gap:6,marginBottom:"1.25rem"}}>
        {[["chat","チャット"],["browse","絞り込み"]].map(([k,l]) => {
          const on = mode===k;
          return <button key={k} onClick={() => setMode(k)} style={{padding:"5px 14px",border:`0.5px solid ${on?"#D85A30":"#ddd"}`,borderRadius:8,fontSize:12,background:on?"#FAECE7":"#fff",color:on?"#993C1D":"#888",cursor:"pointer",fontWeight:on?500:400,whiteSpace:"nowrap"}}>{l}</button>;
        })}
      </div>

      {mode==="chat" && (
        <div>
          {messages.length===0 && (
            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,color:"#888",marginBottom:8}}>ライブラリの実データをもとに回答します</div>
              {SUGG.map((s,i) => <button key={i} onClick={() => send(s)} style={{display:"block",width:"100%",textAlign:"left",padding:"8px 14px",border:"0.5px solid #ddd",borderRadius:8,background:"#fff",color:"#666",fontSize:13,cursor:"pointer",marginBottom:6}}>{s}</button>)}
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {messages.map((m,i) => {
              const isUser = m.role==="user";
              const relPosts = !isUser&&m.relIds?.length>0 ? posts.filter(p=>m.relIds.includes(p.id)) : [];
              return (
                <div key={i} style={{display:"flex",flexDirection:"column",alignItems:isUser?"flex-end":"flex-start"}}>
                  <div style={{maxWidth:"88%",padding:"10px 14px",borderRadius:isUser?"12px 12px 4px 12px":"12px 12px 12px 4px",background:isUser?"#D85A30":"#f0f0f0",color:isUser?"#fff":"#333",fontSize:13,lineHeight:1.65}}>{m.content}</div>
                  {relPosts.length>0 && <div style={{marginTop:8,width:"100%"}}><div style={{fontSize:11,color:"#aaa",marginBottom:6}}>ライブラリ内の関連投稿</div>{relPosts.map(p => <div key={p.id} style={{background:"#FAECE7",border:"0.5px solid #F0997B",borderRadius:12,padding:"10px 14px",marginBottom:6}}><div style={{display:"flex",gap:5,marginBottom:4,alignItems:"center"}}><CatBadge cat={p.cat}/><span style={{fontSize:11,color:"#888"}}>{p.machine}</span><span style={{marginLeft:"auto",fontSize:11,color:"#D85A30",fontWeight:500}}>♥ {p.internal?.likes?.length||0}</span></div><div style={{fontSize:13,fontWeight:500,color:"#333",marginBottom:3}}>{p.title}</div><div style={{fontSize:12,color:"#666",lineHeight:1.6}}>{p.body}</div></div>)}</div>}
                </div>
              );
            })}
            {loading && <div style={{alignSelf:"flex-start"}}><div style={{padding:"10px 14px",borderRadius:12,background:"#f0f0f0",fontSize:13,color:"#aaa"}}>調べています...</div></div>}
            <div ref={bottomRef}/>
          </div>
          <div style={{display:"flex",gap:8,marginTop:12,alignItems:"flex-end"}}>
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="質問を入力... (Enterで送信)" style={{flex:1,fontSize:14,padding:"10px 12px",border:"0.5px solid #ddd",borderRadius:10,background:"#f9f9f9",resize:"none",minHeight:46,lineHeight:1.5}} rows={1}/>
            <button onClick={() => send()} disabled={loading||!input.trim()} style={{padding:"0 18px",background:loading||!input.trim()?"#ccc":"#D85A30",color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:500,cursor:loading||!input.trim()?"not-allowed":"pointer",height:46,whiteSpace:"nowrap",flexShrink:0}}>送信</button>
          </div>
          {messages.length>0 && <button onClick={() => setMessages([])} style={{marginTop:6,background:"none",border:"none",fontSize:12,color:"#aaa",cursor:"pointer",padding:0}}>会話をリセット</button>}
        </div>
      )}

      {mode==="browse" && (
        <div>
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",gap:8,marginBottom:6}}>
              <select value={filter.machine} onChange={e => setFilter(f=>({...f,machine:e.target.value}))} style={{flex:1,fontSize:13,padding:"8px 10px",border:"0.5px solid #ddd",borderRadius:8,background:"#f9f9f9",color:"#333",minWidth:0}}>
                <option value="">すべての機種</option>
                {machines.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={filter.cat} onChange={e => setFilter(f=>({...f,cat:e.target.value}))} style={{flex:1,fontSize:13,padding:"8px 10px",border:"0.5px solid #ddd",borderRadius:8,background:"#f9f9f9",color:"#333",minWidth:0}}>
                <option value="">すべてのカテゴリ</option>
                <option value="bonus">演出・ボーナス</option>
                <option value="spec">機種情報・スペック</option>
                <option value="quote">名言・煽り文句</option>
                <option value="memory">思い出・エピソード</option>
              </select>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:12,color:"#aaa"}}>{filteredPosts.length}件</span>
              {(filter.machine||filter.cat) && <button onClick={() => setFilter({machine:"",cat:""})} style={{fontSize:12,padding:"5px 12px",border:"0.5px solid #ddd",borderRadius:8,background:"#f9f9f9",color:"#666",cursor:"pointer"}}>リセット</button>}
            </div>
          </div>
          {filteredPosts.map(p => (
            <div key={p.id} style={{background:"#fff",border:"0.5px solid #eee",borderRadius:12,padding:"10px 14px",marginBottom:8}}>
              <div style={{display:"flex",gap:5,marginBottom:4,alignItems:"center"}}><CatBadge cat={p.cat}/><SrcBadge src={p.source}/><span style={{marginLeft:"auto",fontSize:11,color:"#D85A30",fontWeight:500}}>♥ {p.internal?.likes?.length||0}</span></div>
              <div style={{fontSize:12,color:"#888",marginBottom:3}}>{p.machine}</div>
              <div style={{fontSize:13,fontWeight:500,color:"#333",marginBottom:3}}>{p.title}</div>
              <div style={{fontSize:12,color:"#666",lineHeight:1.6}}>{p.body}</div>
            </div>
          ))}
          {filteredPosts.length>0&&(filter.machine||filter.cat) && (
            <button onClick={() => { const q=filter.machine?filter.machine+(filter.cat?"の"+(CATS[filter.cat]?.label):"")+"について企画のヒントを教えて":(CATS[filter.cat]?.label)+"カテゴリで人気の投稿の共通点を教えて"; setMode("chat"); setTimeout(()=>send(q),100); }} style={{marginTop:4,width:"100%",padding:"10px 0",border:"0.5px solid #D85A30",borderRadius:8,background:"#FAECE7",color:"#993C1D",fontSize:13,fontWeight:500,cursor:"pointer"}}>
              この絞り込み結果をチャットで深掘り ↗
            </button>
          )}
        </div>
      )}
    </div>
  );
}