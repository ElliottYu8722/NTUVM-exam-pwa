/* 基本狀態 */
const state = {
  questions: [],          // [{id,text,options:{A..D},image?}]
  answers: {},            // {"1":"B", ...} 或 "1":"A/B"
  index: 0,
  user: {},               // {"1":"A", ...}
  mode: "browse",         // "browse" | "quiz" | "review"
  reviewOrder: [],        // 錯題索引清單
  reviewPos: 0,
  remain: 60 * 60,        // 秒
  timerId: null,
  dark: true
};
/* ====== 路徑設定（依你的 repo 結構） ====== */
const CONFIG = {
  // 如果你的資料夾其實叫 dataa，就把 "./data" 改成 "./dataa"
  basePath: "./data",
  dirs: {
    questions: "題目",
    answers:   "答案",
    images:    "圖片",
  }
};

/* 路徑工具：安全拼接（避免多重斜線） */
function pathJoin(...parts){
  return parts
    .filter(Boolean)
    .map((s,i)=> i===0 ? String(s).replace(/\/+$/,'') : String(s).replace(/^\/+/,''))
    .join('/');
}

/* 解析題目 JSON 的 image 欄位：若是相對檔名，補上 data/圖片/ 前綴 */
function resolveImage(src){
  if(!src) return "";
  let s = String(src).trim();

  // 外部網址直接用
  if (/^https?:\/\//i.test(s)) return s;

  // 去掉前綴 "./" 或 "/"，統一路徑
  s = s.replace(/^\.\//, "").replace(/^\/+/, "");

  // 已經帶 data/ 前綴就直接回傳
  if (s.startsWith("data/")) return s;

  // 若是 "圖片/xxx.png"（或原本 JSON 寫成 "./圖片/xxx.png" 被上面去掉了）
  if (s.startsWith("圖片/")) {
    return pathJoin(CONFIG.basePath, s); // -> data/圖片/xxx.png
  }

  // 否則視為單純檔名：補成 data/圖片/檔名
  return pathJoin(CONFIG.basePath, CONFIG.dirs.images, s);
}

/* DOM */
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

const yearSel   = $("#yearSel");
const roundSel  = $("#roundSel");
const subjectSel= $("#subjectSel");

const bSubj = $("#bSubj"), bYear = $("#bYear"), bRound = $("#bRound");
const showAns = $("#showAns");
const btnToggleAns = $("#btnToggleAns");

const qNum = $("#qNum"), qText = $("#qText"), qImg = $("#qImg"), qOpts = $("#qOpts");
const qList = $("#qList");

const prevBtn = $("#prev"), nextBtn = $("#next");
const btnExam = $("#btnExam"), btnSubmit = $("#btnSubmit"), btnClose = $("#btnClose");
const timerBadge = $("#timer"), reviewTag = $("#reviewTag");

const btnRecords = $("#btnRecords"), btnTheme = $("#btnTheme");
function bindTapClick(el, handler){
  if(!el) return;
  const fire = (e)=>{
    try{ e.preventDefault(); e.stopPropagation(); }catch{}
    handler(e);
  };
  el.addEventListener("click",    fire, {passive:false});
  el.addEventListener("touchend", fire, {passive:false});
}
// ====== 測驗用彈窗 HTML（無筆記、無選單）======
const POPUP_HTML = `<!doctype html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<title>測驗模式</title>
<style>
:root{
  --bg:#111; --fg:#fff; --muted:#aaa; --card:#1b1b1b; --border:#2a2a2a; --accent:#2f74ff;
}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Noto Sans TC",Roboto,Arial,sans-serif;background:var(--bg);color:var(--fg);}
.wrap{max-width:980px;margin:0 auto;padding:16px;display:flex;flex-direction:column;gap:12px}
.topbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.badge{padding:6px 10px;border:1px solid var(--border);border-radius:9999px}
.timer{font-weight:700}
.btn{padding:10px 14px;border-radius:9999px;border:1px solid var(--border);background:transparent;color:var(--fg);cursor:pointer}
.btn:hover{border-color:var(--accent);color:var(--accent)}
.card{border:1px solid var(--border);border-radius:16px;background:var(--card);padding:16px}
.qtext{font-size:18px;line-height:1.6}
.qimg{margin-top:10px;max-width:100%;height:auto;border-radius:8px;border:1px solid var(--border)}
.options{margin-top:10px;display:flex;flex-direction:column;gap:8px}
.nav{display:flex;gap:8px;align-items:center;margin-top:14px}
.spacer{flex:1}
.hidden{display:none !important}
.right{display:flex;gap:8px}
.footer{color:var(--muted);font-size:12px;text-align:center;margin-top:8px}
.q-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(60px,1fr));gap:8px}
.q-item{padding:8px 10px;border:1px solid var(--border);border-radius:8px;text-align:center;cursor:pointer}
.q-item.active{background:var(--accent);color:#fff}
@media (max-width: 700px){ .right{width:100%; justify-content:space-between} }
</style>
</head>
<body>
<div class="wrap">
  <div class="topbar">
    <span class="badge" id="bTitle">測驗模式</span>
    <span class="badge timer" id="timer">剩餘 60:00</span>
    <span class="badge hidden" id="reviewTag">回顧模式（僅看錯題）</span>
    <span class="spacer"></span>
    <div class="right">
      <button id="btnSubmit" class="btn">提交測驗</button>
      <button id="btnClose" class="btn">關閉</button>
    </div>
  </div>

  <div class="card">
    <div class="badge" id="qNum" style="margin-bottom:8px">第 1 題</div>
    <div class="qtext" id="qText">載入中…</div>
    <img id="qImg" class="qimg hidden" alt="">
    <div class="options" id="qOpts"></div>
    <div class="nav">
      <button id="prev" class="btn">上一題</button>
      <button id="next" class="btn">下一題</button>
      <span class="spacer"></span>
      <button id="btnJump" class="btn">看題號</button>
    </div>
  </div>

  <div class="card">
    <div class="q-list" id="qList"></div>
  </div>

  <div class="footer">此視窗為獨立測驗介面；關閉後將把紀錄回傳到主頁。</div>
</div>

<script>
(function(){
  // 和主視窗通訊
  window.opener && window.opener.postMessage({type:"QUIZ_READY"}, "*");

  const state = {
    questions: [],
    answers: {},
    user: {},
    index: 0,
    mode: "quiz",     // quiz | review
    reviewOrder: [],
    reviewPos: 0,
    remain: 60*60,
    timerId: null,
  };

  // 工具
  const $ = s=>document.querySelector(s);

  const bTitle = $("#bTitle");
  const timerBadge = $("#timer"), reviewTag = $("#reviewTag");
  const qNum=$("#qNum"), qText=$("#qText"), qImg=$("#qImg"), qOpts=$("#qOpts");
  const qList=$("#qList");
  const prevBtn=$("#prev"), nextBtn=$("#next");
  const btnSubmit=$("#btnSubmit"), btnClose=$("#btnClose"), btnJump=$("#btnJump");

  // 綁定（行動裝置 click/touch 安全器）
  function bindTapClick(el, handler){
    if(!el) return;
    const fire = (e)=>{ try{e.preventDefault();e.stopPropagation();}catch{} handler(e); };
    el.addEventListener("click", fire, {passive:false});
    el.addEventListener("touchend", fire, {passive:false});
  }

  // 收到主頁傳來的題庫資料
  window.addEventListener("message", (e)=>{
    const msg = e.data || {};
    if(msg.type === "QUIZ_DATA"){
      const p = msg.payload || {};
      state.questions = Array.isArray(p.questions)? p.questions : [];
      state.answers   = (p.answers && typeof p.answers==='object')? p.answers : {};
      state.user      = {};
      state.index     = 0;
      state.remain    = Math.max(1, parseInt(p.duration||3600,10));
      bTitle.textContent = p.subj ? \`\${p.subj} 測驗\` : "測驗模式";

      renderList();
      renderQuestion();
      tick(); state.timerId = setInterval(tick, 1000);
    }
  });

  function renderList(){
    qList.innerHTML="";
    state.questions.forEach((q,i)=>{
      const div=document.createElement("div");
      div.className="q-item"+(i===state.index?" active":"");
      div.textContent="第 "+q.id+" 題";
      div.onclick=()=>{ state.index=i; renderQuestion(); highlightList(); };
      qList.appendChild(div);
    });
  }
  function highlightList(){ [...qList.children].forEach((el,i)=> el.classList.toggle("active", i===state.index)); }

  function escapeHTML(s){ return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  function renderQuestion(){
    const q = state.questions[state.index];
    if(!q){ qNum.textContent=""; qText.textContent="無題目"; qOpts.innerHTML=""; qImg.classList.add("hidden"); return; }

    qNum.textContent = "第 "+q.id+" 題";
    qText.innerHTML = escapeHTML(q.text||"");

    if(q.image){
      qImg.src = String(q.image);
      qImg.classList.remove("hidden");
    }else{
      qImg.classList.add("hidden");
      qImg.removeAttribute("src");
    }

    qOpts.innerHTML="";
    const ua = (state.user[String(q.id)]||"").toUpperCase();
    const letters = ["A","B","C","D"];
    const correctSet = new Set(String(state.answers[String(q.id)]||"").toUpperCase().split("/").filter(Boolean));

    letters.forEach(L=>{
      const line=document.createElement("label");
      line.style.display="flex"; line.style.alignItems="center"; line.style.gap="10px";
      const rb=document.createElement("input");
      rb.type="radio"; rb.name="opt"; rb.checked=(ua===L); rb.disabled=(state.mode!=="quiz" && state.mode!=="review");
      rb.onchange=()=>{ state.user[String(q.id)] = L; };
      const span=document.createElement("span");
      span.innerText=\`\${L}. \${q.options?.[L]??""}\`;
      if(state.mode==="review" && correctSet.has(L)){ span.innerText += "（正解）"; span.style.color="#c40000"; }
      line.appendChild(rb); line.appendChild(span); qOpts.appendChild(line);
    });

    highlightList();
  }

  function stepReview(delta){
    if(!state.reviewOrder.length) return;
    state.reviewPos = Math.min(Math.max(0, state.reviewPos+delta), state.reviewOrder.length-1);
    state.index = state.reviewOrder[state.reviewPos];
  }

  function tick(){
    state.remain--; if(state.remain<0) state.remain=0;
    const m = String(Math.floor(state.remain/60)).padStart(2,"0");
    const s = String(state.remain%60).padStart(2,"0");
    timerBadge.textContent = \`剩餘 \${m}:\${s}\`;
    if(state.remain===0){ submitQuiz(); }
  }

  function summarizeChoices(){
    const cnt={A:0,B:0,C:0,D:0,"未答":0};
    state.questions.forEach(q=>{
      const ua=(state.user[String(q.id)]||"").toUpperCase();
      if(cnt[ua]!=null) cnt[ua]++; else cnt["未答"]++;
    });
    return Object.entries(cnt).map(([k,v])=>\`\${k}:\${v}\`).join(",");
  }

  function submitQuiz(){
    if(state.mode!=="quiz"){ window.close(); return; }
    let correct=0, wrong=[];
    state.questions.forEach((q,idx)=>{
      const qid=String(q.id);
      const caRaw=String(state.answers[qid]||"").toUpperCase();
      const set=new Set(caRaw.split("/").filter(Boolean));
      const ua=(state.user[qid]||"").toUpperCase();
      if(set.has("ALL") || set.has(ua)){ correct++; } else { wrong.push({qid,idx,ua,ca:[...set].join("/")}); }
    });
    const total=state.questions.length;
    const score= total? (correct/total*100).toFixed(2) : "0.00";
    // 傳回主頁儲存紀錄
    const row={
      ts: new Date().toLocaleString(),
      subj: bTitle.textContent.replace(/\\s*測驗$/,""),
      year: "", round: "",
      total, correct, score,
      wrongIds: wrong.map(w=>w.qid).join(";") || "無",
      wrongDetail: wrong.map(w=>\`\${w.qid}:\${w.ua||"-"}→\${w.ca||"-"}\`).join(";"),
      summary: summarizeChoices()
    };
    try{ window.opener && window.opener.postMessage({type:"QUIZ_RECORD", row}, "*"); }catch{}

    const goReview = confirm(\`測驗提交！\\n正確：\${correct}/\${total}\\n得分：\${score}\\n錯誤題號：\${row.wrongIds}\\n\\n要進入『僅看錯題』回顧模式嗎？\`);
    if(goReview && wrong.length){
      state.mode="review";
      timerBadge.classList.add("hidden");
      reviewTag.classList.remove("hidden");
      state.reviewOrder = wrong.map(w=>w.idx);
      state.reviewPos = 0;
      state.index = state.reviewOrder[0];
      renderQuestion();
    }else{
      window.close();
    }
  }

  // 綁定
  bindTapClick(prevBtn, ()=>{ if(state.mode==="review"){ stepReview(-1); } else { if(state.index>0) state.index--; } renderQuestion(); });
  bindTapClick(nextBtn, ()=>{ if(state.mode==="review"){ stepReview(1); } else { if(state.index<state.questions.length-1) state.index++; } renderQuestion(); });
  bindTapClick(btnSubmit, submitQuiz);
  bindTapClick(btnClose, ()=> window.close());
  bindTapClick(btnJump, ()=>{
    const v = prompt("輸入要跳轉的題號：");
    if(!v) return;
    const idx = state.questions.findIndex(q=> String(q.id)===String(v.trim()));
    if(idx>=0){ state.index=idx; renderQuestion(); }
    else alert("找不到該題號");
  });

  // iOS 雙擊縮放保護
  document.addEventListener("dblclick",(e)=>e.preventDefault(),{passive:false});
})();
</script>
</body></html>`;
/* 筆記 */
const fontSel = $("#fontSel");
const editor = $("#editor");
const bBold = $("#bBold"), bItalic = $("#bItalic"), bUnder = $("#bUnder");
const bSub = $("#bSub"), bSup = $("#bSup");
const txtColor = $("#txtColor"), hlColor = $("#hlColor"), bHL = $("#bHL");
const bImg = $("#bImg"), imgNote = $("#imgNote");

/* 題庫載入 */
/* 題庫載入（完全移除舊的手動載入元件） */
(function nukeManualLoaders(){
  // 0) 先放一個 CSS 保險絲（即使 JS 還沒跑，也先把它們藏起來）
  const css = document.createElement("style");
  css.textContent = `
    #btnLoadQ, #btnLoadA, #qFile, #aFile { display: none !important; visibility: hidden !important; }
  `;
  document.head.appendChild(css);

  // 1) DOM 完成後再確實 remove（避免腳本先於 DOM 執行）
  function removeNow(){
    ["#btnLoadQ","#btnLoadA","#qFile","#aFile"].forEach(sel=>{
      const el = document.querySelector(sel);
      if (el && el.remove) try{ el.remove(); }catch{}
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", removeNow, {once:true});
  } else {
    removeNow();
  }

  // 2) 若有框架/其他腳本「晚點」動態加回來，再用 MutationObserver 砍掉
  const obs = new MutationObserver(muts=>{
    muts.forEach(m=>{
      m.addedNodes && m.addedNodes.forEach(node=>{
        if(!(node instanceof Element)) return;
        if (["btnLoadQ","btnLoadA","qFile","aFile"].some(id => node.id === id)) {
          try{ node.remove(); }catch{}
        }
        // 頁面某區塊整段被替換時，也掃一遍
        ["#btnLoadQ","#btnLoadA","#qFile","#aFile"].forEach(sel=>{
          const el = node.querySelector?.(sel);
          if (el) try{ el.remove(); }catch{}
        });
      });
    });
  });
  obs.observe(document.documentElement, { childList:true, subtree:true });
})();
/* 小工具 */
const subjectPrefix = s => ({
  "獸醫病理學":"a","獸醫藥理學":"b","獸醫實驗診斷學":"c","獸醫普通疾病學":"d","獸醫傳染病學":"e","獸醫公共衛生學":"f"
}[s] || "x");

function keyForNote(qid){
  return `${subjectSel.value}|${yearSel.value}|${roundSel.value}|${qid}`;
}
function saveNotes(){
  const q = state.questions[state.index];
  if(!q) return;
  state._notes = state._notes || {};
  state._notes[keyForNote(q.id)] = editor.innerHTML;
  localStorage.setItem("notes", JSON.stringify(state._notes));
}
function loadNotes(){
  try{ state._notes = JSON.parse(localStorage.getItem("notes")||"{}"); }catch{ state._notes = {}; }
}
function loadNoteForCurrent(){
  const q = state.questions[state.index];
  if(!q){ editor.innerHTML=""; return; }
  editor.innerHTML = state._notes?.[keyForNote(q.id)] || "";
}



/* 題號列表 */
function renderList(){
  qList.innerHTML = "";
  state.questions.forEach((q,i)=>{
    const div = document.createElement("div");
    div.className = "q-item"+(i===state.index?" active":"");
    div.textContent = `第 ${q.id} 題`;
    div.onclick = ()=>{ saveNotes(); state.index=i; renderQuestion(); highlightList(); };
    qList.appendChild(div);
  });
}
function highlightList(){
  [...qList.children].forEach((el,i)=> el.classList.toggle("active", i===state.index));
}

/* 題目顯示 */
/* 題目顯示（完整覆蓋） */
function renderQuestion(){
  const q = state.questions[state.index];
  if(!q){ 
    qNum.textContent=""; 
    qText.textContent="請先載入題目"; 
    qOpts.innerHTML=""; 
    qImg.classList.add("hidden"); 
    return;
  }

  qNum.textContent = `第 ${q.id} 題`;

  // 題幹＋（可選）顯示答案
  let html = `${escapeHTML(q.text)}`;
  if(showAns.checked && state.answers && state.answers[String(q.id)]){
    const ca = state.answers[String(q.id)];
    html = `<div style="color:#caa">答案：${escapeHTML(ca)}</div>` + html;
  }
  qText.innerHTML = html;

  // 圖片（補上資料夾前綴）
  if(q.image){
    const raw = resolveImage(q.image);
    const bust = (raw.includes("?") ? "&" : "?") + "v=" + Date.now(); // 硬避免舊快取
    qImg.src = raw + bust;
    qImg.classList.remove("hidden");
  }else{
    qImg.classList.add("hidden");
    qImg.removeAttribute("src");
  }

  // 選項
  qOpts.innerHTML="";
  const ua = (state.user[String(q.id)]||"").toUpperCase();
  const letters = ["A","B","C","D"];
  const correctSet = new Set(String(state.answers[String(q.id)]||"").toUpperCase().split("/").filter(Boolean));

  letters.forEach(L=>{
    const line = document.createElement("label");
    line.style.display="flex"; 
    line.style.alignItems="center"; 
    line.style.gap="10px";

    const rb = document.createElement("input");
    rb.type = "radio"; 
    rb.name = "opt";
    rb.disabled = (state.mode!=="quiz" && state.mode!=="review"); // 瀏覽模式不可點
    rb.checked = (ua===L);
    rb.onchange = ()=>{ state.user[String(q.id)] = L; persistAnswer(); };

    const span = document.createElement("span");
    span.innerText = `${L}. ${q.options?.[L]??""}`;

    if(state.mode==="review"){
      if(correctSet.has(L)) { 
        span.innerText += "（正解）"; 
        span.style.color="#c40000"; 
      }
    }

    line.appendChild(rb); 
    line.appendChild(span);
    qOpts.appendChild(line);
  });

  bSubj.textContent = subjectSel.value;
  bYear.textContent = yearSel.value;
  bRound.textContent = roundSel.value;
  highlightList();
  loadNoteForCurrent();
}
/* 逃脫字元 */
function escapeHTML(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/* 作答持久化（localStorage，以科目/年/梯次為命名空間） */
function nsKey(){ 
  const p = subjectPrefix(subjectSel.value);
  const round = roundSel.value==="第一次" ? "1" : "2";
  return `ans|${p}|${yearSel.value}|${round}`;
}
function loadAnswersFromStorage(){
  try{ state.user = JSON.parse(localStorage.getItem(nsKey())||"{}"); }catch{ state.user={}; }
}
function persistAnswer(){
  localStorage.setItem(nsKey(), JSON.stringify(state.user));
}

/* 導航 */
prevBtn.onclick = ()=>{ saveNotes(); if(state.mode==="review"){ stepReview(-1); } else { if(state.index>0) state.index--; } renderQuestion(); };
nextBtn.onclick = ()=>{ saveNotes(); if(state.mode==="review"){ stepReview(1); } else { if(state.index<state.questions.length-1) state.index++; } renderQuestion(); };

function stepReview(delta){
  if(!state.reviewOrder.length) return;
  state.reviewPos = Math.min( Math.max(0, state.reviewPos + delta), state.reviewOrder.length-1 );
  state.index = state.reviewOrder[state.reviewPos];
}

/* 顯示答案切換 */
showAns.onchange = ()=> renderQuestion();
btnToggleAns.onclick = ()=>{ showAns.checked = !showAns.checked; renderQuestion(); };

/* 測驗控制 */
bindTapClick(btnExam,  startQuiz);
bindTapClick(btnSubmit, submitQuiz);
bindTapClick(btnClose,  closeQuiz);

// ====== 取代原本的 startQuiz，並新增 openQuizWindow ======
function startQuiz(){
  if(!state.questions.length || !Object.keys(state.answers).length){
    alert("請先載入題目與答案。");
    return;
  }
  // 測驗一律在獨立視窗進行；把資料丟進去
  openQuizWindow({
    questions: state.questions,
    answers: state.answers,
    subj: subjectSel?.value || "",
    year: yearSel?.value || "",
    round: roundSel?.value || "",
    duration: 60*60  // 秒
  });
}

function openQuizWindow(payload){
  // 開窗（注意：需要使用者點擊才能不被阻擋）
  const w = window.open("", "quizWin", "width=980,height=760,noopener,noreferrer");
  if(!w){
    alert("瀏覽器封鎖了彈出視窗，請允許本站的彈出視窗再試一次。");
    return;
  }
  // 注入 HTML
  w.document.open();
  w.document.write(POPUP_HTML);
  w.document.close();

  // 等彈窗回報 READY 再傳題庫
  function onReady(e){
    if(e.source === w && e.data && e.data.type === "QUIZ_READY"){
      try{ w.postMessage({type:"QUIZ_DATA", payload}, "*"); }catch{}
      window.removeEventListener("message", onReady);
    }
  }
  window.addEventListener("message", onReady);
}
function closeQuiz(){
  if(state.timerId){ clearInterval(state.timerId); state.timerId=null; }
  state.mode="browse"; timerBadge.classList.add("hidden");
  btnSubmit.classList.add("hidden"); btnClose.classList.add("hidden"); reviewTag.classList.add("hidden");
  renderQuestion();
}

function tick(){
  state.remain--; if(state.remain<0){ state.remain=0; }
  const m = String(Math.floor(state.remain/60)).padStart(2,"0");
  const s = String(state.remain%60).padStart(2,"0");
  timerBadge.textContent = `剩餘 ${m}:${s}`;
  if(state.remain===0){ submitQuiz(); }
}

function submitQuiz(){
  if(state.mode!=="quiz"){ closeQuiz(); return; }
  // 計分
  let correct=0, wrong=[];
  state.questions.forEach((q,idx)=>{
    const qid = String(q.id);
    const caRaw = String(state.answers[qid]||"").toUpperCase();
    const set = new Set(caRaw.split("/").filter(Boolean));
    const ua = (state.user[qid]||"").toUpperCase();
    if(set.has("ALL") || set.has(ua)){ correct++; } else { wrong.push({qid, idx, ua, ca:[...set].join("/")}); }
  });
  const total = state.questions.length;
  const score = total ? (correct/total*100).toFixed(2) : "0.00";

  // 寫作答紀錄
  const row = {
    ts: new Date().toLocaleString(),
    subj: subjectSel.value,
    year: yearSel.value,
    round: roundSel.value,
    total, correct, score,
    wrongIds: wrong.map(w=>w.qid).join(";") || "無",
    wrongDetail: wrong.map(w=>`${w.qid}:${w.ua||"-"}→${w.ca||"-"}`).join(";"),
    summary: summarizeChoices()
  };
  appendRecord(row);

  if(state.timerId){ clearInterval(state.timerId); state.timerId=null; }

  const goReview = confirm(
    `測驗提交！\n正確：${correct}/${total}\n得分：${score}\n錯誤題號：${row.wrongIds}\n\n要進入『僅看錯題』回顧模式嗎？`
  );

  if(goReview && wrong.length){
    state.mode="review";
    timerBadge.classList.add("hidden");
    btnSubmit.classList.add("hidden");
    btnClose.classList.remove("hidden");
    state.reviewOrder = wrong.map(w=>w.idx);
    state.reviewPos = 0;
    state.index = state.reviewOrder[0];
    reviewTag.classList.remove("hidden");
    renderQuestion();
  }else{
    closeQuiz();
  }
}

function summarizeChoices(){
  const cnt = {A:0,B:0,C:0,D:0,"未答":0};
  state.questions.forEach(q=>{
    const ua=(state.user[String(q.id)]||"").toUpperCase();
    if(cnt[ua]!=null) cnt[ua]++; else cnt["未答"]++;
  });
  return Object.entries(cnt).map(([k,v])=>`${k}:${v}`).join(",");
}

/* 作答紀錄檢視（不下載、不另開頁） */
bindTapClick(btnRecords, showRecords);

function appendRecord(row){
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem("examRecords") || "[]"); } catch { arr = []; }
  arr.unshift(row); // 最新放前面
  localStorage.setItem("examRecords", JSON.stringify(arr));
}

/* 作答紀錄檢視（不下載、不另開頁） */
bindTapClick(btnRecords, showRecords);

function showRecords(){
  let arr=[];
  try{ arr = JSON.parse(localStorage.getItem("examRecords") || "[]"); }catch{}
  if(!arr.length){
    alert("目前沒有作答紀錄。");
    return;
  }
  openRecordsViewer(arr); // 只顯示，不下載
}

/* 內嵌檢視器（頁內浮層，不下載、不跳頁） */
function openRecordsViewer(arr){
  // 注入樣式（只注入一次）
  if (!document.getElementById("rv-style")) {
    const style = document.createElement("style");
    style.id = "rv-style";
    style.textContent = `
      .rv-mask{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px;}
      .rv-card{width:min(1100px,100%);max-height:90vh;background:var(--card);color:var(--fg);border:1px solid var(--border);border-radius:14px;display:flex;flex-direction:column;overflow:hidden;}
      .rv-head{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid var(--border);}
      .rv-title{font-size:16px;font-weight:700;}
      .rv-spacer{flex:1;}
      .rv-btn{padding:8px 12px;border-radius:9999px;border:1px solid var(--border);background:transparent;color:var(--fg);cursor:pointer;font-size:14px;}
      .rv-btn:hover{border-color:var(--accent);color:var(--accent);}
      .rv-body{overflow:auto;padding:10px 14px 14px;}
      .rv-table{width:100%;border-collapse:collapse;table-layout:fixed;}
      .rv-table th,.rv-table td{border:1px solid var(--border);padding:8px;font-size:14px;vertical-align:top;word-break:break-word;white-space:normal;}
      .rv-table thead th{position:sticky;top:0;background:var(--bg);z-index:1;}
      .rv-table col.c-date{width:140px;}
      .rv-table col.c-subj{width:120px;}
      .rv-table col.c-year{width:70px;}
      .rv-table col.c-round{width:90px;}
      .rv-table col.c-total{width:80px;}
      .rv-table col.c-corr{width:90px;}
      .rv-table col.c-score{width:80px;}
      .rv-table col.c-wids{width:220px;}
      .rv-table col.c-wdet{width:380px;}
      .rv-table col.c-sum{width:140px;}
      @media (max-width: 720px){ .rv-card{max-height:92vh;} .rv-table th,.rv-table td{font-size:13px;} }
    `;
    document.head.appendChild(style);
  }

  const mask  = document.createElement("div");  mask.className  = "rv-mask";
  const card  = document.createElement("div");  card.className  = "rv-card";
  const head  = document.createElement("div");  head.className  = "rv-head";
  const title = document.createElement("div");  title.className = "rv-title";  title.textContent = "作答紀錄";
  const spacer= document.createElement("div");  spacer.className= "rv-spacer";

  const btnClose = document.createElement("button");
  btnClose.className = "rv-btn";
  btnClose.textContent = "關閉";
  btnClose.onclick = ()=> mask.remove();

  head.appendChild(title); head.appendChild(spacer); head.appendChild(btnClose);

  const body  = document.createElement("div");  body.className  = "rv-body";
  const table = document.createElement("table"); table.className = "rv-table";
  table.innerHTML = `
    <colgroup>
      <col class="c-date"><col class="c-subj"><col class="c-year"><col class="c-round">
      <col class="c-total"><col class="c-corr"><col class="c-score">
      <col class="c-wids"><col class="c-wdet"><col class="c-sum">
    </colgroup>
    <thead><tr>
      <th>測驗日期</th><th>科目</th><th>年份</th><th>梯次</th>
      <th>總題數</th><th>正確題數</th><th>得分</th>
      <th>錯誤題號</th><th>錯題詳情</th><th>作答概覽</th>
    </tr></thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");

  arr.forEach(r=>{
    const tr = document.createElement("tr");
    const cells = [r.ts, r.subj, r.year, r.round, r.total, r.correct, r.score, r.wrongIds, r.wrongDetail, r.summary];
    tr.innerHTML = cells.map(c=>`<td>${escapeHTML(String(c ?? ""))}</td>`).join("");
    tbody.appendChild(tr);
  });

  body.appendChild(table);
  card.appendChild(head);
  card.appendChild(body);
  mask.appendChild(card);
  document.body.appendChild(mask);
}

/* 筆記工具 */
fontSel.onchange = ()=> exec("fontSize", sizeToCommand(fontSel.value));
bBold.onclick   = ()=> toggleButton(bBold, ()=>exec("bold"));
bItalic.onclick = ()=> toggleButton(bItalic, ()=>exec("italic"));
bUnder.onclick  = ()=> toggleButton(bUnder, ()=>exec("underline"));
bSub.onclick    = ()=> { bSup.classList.remove("active"); toggleButton(bSub, ()=>exec("subscript")); };
bSup.onclick    = ()=> { bSub.classList.remove("active"); toggleButton(bSup, ()=>exec("superscript")); };
txtColor.onchange = ()=> exec("foreColor", txtColor.value);
bHL.onclick = ()=> { editor.focus(); hilite(hlColor.value); bHL.classList.add("active"); setTimeout(()=>bHL.classList.remove("active"), 300); };
bImg.onclick = ()=> imgNote.click();
imgNote.onchange = async e=>{
  const f = e.target.files?.[0]; if(!f) return;
  const data = await fileToDataURL(f);
  editor.focus();
  document.execCommand("insertImage", false, data);
  saveNotes();
  imgNote.value="";
};

editor.addEventListener("input", debounce(saveNotes, 400));

function exec(cmd, val=null){ editor.focus(); document.execCommand(cmd, false, val); saveNotes(); }
function toggleButton(btn, fn){ const was = btn.classList.contains("active"); editor.focus(); fn(); btn.classList.toggle("active", !was); saveNotes(); }
function sizeToCommand(px){ // 1~7，做個近似
  const n = Math.max(1, Math.min(7, Math.round((parseInt(px,10)-8)/4)));
  return String(n);
}
function hilite(color){
  try{
    document.execCommand("hiliteColor", false, color);
  }catch{
    document.execCommand("backColor", false, color);
  }
  saveNotes();
}
function fileToDataURL(file){
  return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); });
}

/* 皮膚 */
btnTheme.onclick = ()=>{
  state.dark = !document.body.classList.contains("light");
  document.body.classList.toggle("light");
  localStorage.setItem("themeLight", String(document.body.classList.contains("light")));
};
(function initTheme(){
  const light = localStorage.getItem("themeLight")==="true";
  document.body.classList.toggle("light", light);
})();

/* 選單變更 → 嘗試自動載入慣用命名檔案（若存在於同 repo） */
[yearSel, roundSel, subjectSel].forEach(sel=> sel.addEventListener("change", onScopeChange));
/* 選單變更 → 自動載入 data/題目 與 data/答案 */
async function onScopeChange(){
  saveNotes();
  loadAnswersFromStorage();

  const p = subjectPrefix(subjectSel.value);
  const r = (roundSel.value==="第一次") ? "1" : "2";
  const qName = `${p}${yearSel.value}_${r}.json`;
  const aName = `${p}w${yearSel.value}_${r}.json`;

  const qURL = pathJoin(CONFIG.basePath, CONFIG.dirs.questions, qName) + `?v=${Date.now()}`;
  const aURL = pathJoin(CONFIG.basePath, CONFIG.dirs.answers,   aName) + `?v=${Date.now()}`;

  let loadedQ = false, loadedA = false;

  // 題目
  try{
    const qRes = await fetch(qURL, { cache:"no-store" });
    if(qRes.ok){
      const arr = await qRes.json();
      if(Array.isArray(arr)){
        state.questions = arr;
        state.index = 0;
        renderList();
        loadedQ = true;
      }else{
        alert(`題目檔格式錯誤（不是陣列）：${qName}`);
        state.questions = [];
        renderList();
      }
    }
  }catch(e){
    // ignore
  }

  // 答案
  try{
    const aRes = await fetch(aURL, { cache:"no-store" });
    if(aRes.ok){
      const obj = await aRes.json();
      if(obj && typeof obj === "object"){
        state.answers = obj;
        loadedA = true;
      }else{
        alert(`答案檔格式錯誤（不是物件）：${aName}`);
        state.answers = {};
      }
    }
  }catch(e){
    // ignore
  }

  if(!loadedQ){
    toast(`找不到題目檔：${qName}`);
  }
  if(!loadedA){
    toast(`找不到答案檔：${aName}`);
  }

  renderQuestion();
}
/* 自動儲存提示 */
let toastTimer=null;
function toast(msg){
  if(toastTimer){ clearTimeout(toastTimer); }
  const el = document.createElement("div");
  el.textContent = msg;
  Object.assign(el.style, {
    position:"fixed",left:"50%",bottom:"24px",transform:"translateX(-50%)",
    background:"rgba(0,0,0,.75)",color:"#fff",padding:"10px 14px",borderRadius:"9999px",
    zIndex:9999,fontSize:"14px"
  });
  document.body.appendChild(el);
  toastTimer=setTimeout(()=>el.remove(),1000);
}

/* 工具：debounce */
function debounce(fn, ms){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); }; }


/* === 禁止雙擊縮放、觸控縮放、Ctrl + 滑輪縮放（桌機/手機都盡量擋）=== */
(function disableZoom(){
  // 1) 禁止雙擊
  document.addEventListener("dblclick", e=>{
    e.preventDefault();
  }, { passive:false });

  // 2) iOS Safari 的手勢縮放
  ["gesturestart","gesturechange","gestureend"].forEach(ev=>{
    document.addEventListener(ev, e=>{ e.preventDefault(); }, { passive:false });
  });

  // 3) 桌機：Ctrl/⌘ + 滑輪
  window.addEventListener("wheel", e=>{
    if (e.ctrlKey || e.metaKey) e.preventDefault();
  }, { passive:false });

  // 4) 把圖片的雙擊行為關掉（保留點擊）
  function touchFix(){
    document.querySelectorAll("img").forEach(img=>{
      img.style.touchAction = "manipulation";
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", touchFix, {once:true});
  } else {
    touchFix();
  }

  // 5) 加上全域 CSS（避免誤縮放）
  try{
    const css = document.createElement("style");
    css.textContent = `html, body { touch-action: manipulation; }`;
    document.head.appendChild(css);
  }catch{}

  // 6) 動態加入 viewport，避免雙指縮放
  try{
    const meta = document.createElement("meta");
    meta.name = "viewport";
    meta.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no";
    document.head.appendChild(meta);
  }catch{}
})();
/* 初始化 */
/* 初始化（完整覆蓋） */
function init(){
  loadNotes();
  loadAnswersFromStorage();
  renderList();
  // 一進來就依照預設選項嘗試載入 data/題目 與 data/答案
  onScopeChange();
}
init();
// ====== 接收彈窗回傳的作答紀錄，寫入主頁的 localStorage ======
window.addEventListener("message", (e)=>{
  const msg = e.data || {};
  if(msg.type === "QUIZ_RECORD" && msg.row){
    appendRecord(msg.row);     // 用你現成的 appendRecord
    toast("已儲存作答紀錄");
  }
});
