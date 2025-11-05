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

/* ====== 本機儲存鍵（升級到 V2，完全避開舊資料） ====== */
const STORAGE = {
  notes:     "notes_v2",
  notesMeta: "notesMeta_v2",
  migrated:  "notes_migrated_to_v2"
};

/* 一次性遷移：第一次載入就把舊 notes/notesMeta 清掉，避免「所有第1題都一樣」的污染 */
(function migrateNotesOnce(){
  if (localStorage.getItem(STORAGE.migrated) === "true") return;

  try { localStorage.removeItem("notes"); } catch {}
  try { localStorage.removeItem("notesMeta"); } catch {}

  try {
    Object.keys(localStorage).forEach(k=>{
      // 跳過新版本要保留的 key
      if (k === STORAGE.notes || k === STORAGE.notesMeta || k === STORAGE.migrated) return;

      // 只清除舊版或測試時遺留的 notes 類鍵名
      if (/^(note|notes?)(_.*)?$/i.test(k)) {
        try { localStorage.removeItem(k); } catch {}
      }
    });
  } catch {}

  localStorage.setItem(STORAGE.migrated, "true");
})();
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

function getSelVal(sel, def=""){
  return sel && typeof sel.value === "string" ? sel.value : def;
}

function keyForNote(qid){
  const p = subjectPrefix(getSelVal(subjectSel));
  const r = getSelVal(roundSel) === "第一次" ? "1" : "2";
  return `${p}${getSelVal(yearSel)}_${r}|${qid}`;
}
function saveNotes(){
  const q = state.questions[state.index];
  if(!q) return;

  const k = keyForNote(q.id);
  state._notes     = state._notes     || {};
  state._notesMeta = state._notesMeta || {};

  // 只抓 userNote 的內容；若找不到就退而求其次抓整個 editor（避免例外）
  const userDiv = editor.querySelector("#userNote");
  const userHTML = userDiv ? userDiv.innerHTML : editor.innerHTML;

  state._notes[k] = userHTML;

  // 使用者動過 → 標記（之後即便你改了詳解，我們也不會動到使用者筆記）
  const meta = state._notesMeta[k] || {};
  meta.userTouched = true;
  state._notesMeta[k] = meta;

  localStorage.setItem(STORAGE.notes, JSON.stringify(state._notes));
  localStorage.setItem(STORAGE.notesMeta, JSON.stringify(state._notesMeta));
}
function loadNotes(){
  try{ state._notes = JSON.parse(localStorage.getItem(STORAGE.notes)||"{}"); }catch{ state._notes = {}; }
  try{ state._notesMeta = JSON.parse(localStorage.getItem(STORAGE.notesMeta)||"{}"); }catch{ state._notesMeta = {}; }
}

function defaultNoteHTML(){
  return ""; // 只存使用者自己的筆記 HTML
}

/* 很輕量的雜湊（可留著做版本追蹤用） */
function hashStr(s){
  s = String(s||"");
  let h = 5381;
  for(let i=0;i<s.length;i++) h = ((h<<5)+h) + s.charCodeAt(i);
  return String(h >>> 0);
}

function ensureNoteSeeded(q){
  const k = keyForNote(q.id);
  state._notes     = state._notes     || {};
  state._notesMeta = state._notesMeta || {};

  const meta = state._notesMeta[k] || {};
  const curHash = hashStr(q.explanation || "");

  if (state._notes[k] == null) {
    state._notes[k] = defaultNoteHTML(); // 空字串
  }
  // 紀錄目前詳解的雜湊（之後你要比對是否有更新可以用，但不覆蓋筆記）
  meta.seedHash = curHash;
  state._notesMeta[k] = meta;

  localStorage.setItem(STORAGE.notes, JSON.stringify(state._notes));
  localStorage.setItem(STORAGE.notesMeta, JSON.stringify(state._notesMeta));
}


function loadNoteForCurrent(){
  const q = state.questions[state.index];
  if(!q){ editor.innerHTML=""; return; }

  ensureNoteSeeded(q); // 只確保鍵存在，不會寫入詳解到筆記

  const k = keyForNote(q.id);
  const userHTML = state._notes?.[k] || "";

  const explainHTML = q.explanation
    ? `
      <div id="explainBlock" class="explain-block" contenteditable="false"
           style="color:#aaa; font-style:italic; border-bottom:1px solid #444; margin-bottom:8px; padding-bottom:6px;">
        <b>詳解：</b> ${escapeHTML(q.explanation)}
      </div>
    `
    : "";

  editor.innerHTML = `
    ${explainHTML}
    <div id="userNote" class="user-note" contenteditable="true">${userHTML}</div>
  `;

  // ✅ 不再自動 focus、不再自動把游標推到最後
  // 如果你日後真的想要恢復自動聚焦，可改成：
  // if (localStorage.getItem("focusNoteOnLoad") === "true") { ...把下面那段聚焦程式放回來... }
}


function highlightList(){
  [...qList.children].forEach((el,i)=> el.classList.toggle("active", i===state.index));
}

/* 題目顯示 */
/* 題目顯示（完整覆蓋） */
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

  // 題幹 +（可選）顯示答案
  let html = `${escapeHTML(q.text)}`;
  if(showAns.checked && state.answers && state.answers[String(q.id)]){
    const ca = state.answers[String(q.id)];
    html = `<div style="color:#caa">答案：${escapeHTML(ca)}</div>` + html;
  }
  qText.innerHTML = html;

  // 圖片（補上資料夾前綴）
  if(q.image){
    const raw  = resolveImage(q.image);
    const bust = (raw.includes("?") ? "&" : "?") + "v=" + Date.now();
    qImg.src = raw + bust;
    qImg.classList.remove("hidden");
  }else{
    qImg.classList.add("hidden");
    qImg.removeAttribute("src");
  }

  // 選項
  qOpts.innerHTML = "";
  const ua = (state.user[String(q.id)]||"").toUpperCase();
  const letters = ["A","B","C","D"];
  const correctSet = new Set(String(state.answers[String(q.id)]||"").toUpperCase().split("/").filter(Boolean));

  // 👉 browse：純文字；quiz/review：顯示圓圈（radio）
  const showRadio = (state.mode==="quiz" || state.mode==="review");

  letters.forEach(L=>{
    const line = document.createElement("div");
    line.style.display="flex";
    line.style.alignItems="center";
    line.style.gap="10px";

    if (showRadio){
      const rb = document.createElement("input");
      rb.type = "radio";
      rb.name = "opt";
      rb.disabled = (state.mode==="review");   // 回顧不可再改
      rb.checked  = (ua===L);
      rb.onchange = ()=>{ state.user[String(q.id)] = L; persistAnswer(); };
      line.appendChild(rb);
    }

    const span = document.createElement("span");
    span.innerText = `${L}. ${q.options?.[L]??""}`;

    if(state.mode==="review"){
      if (ua === L) {
        span.innerText += "（你選）";
        span.style.color = "#6aa0ff";
      }
      if (correctSet.has(L)) {
        span.innerText += "（正解）";
        span.style.color = "#c40000";
      }
    }

    line.appendChild(span);
    qOpts.appendChild(line);
  });

  if (bSubj)  bSubj.textContent  = getSelVal(subjectSel);
  if (bYear)  bYear.textContent  = getSelVal(yearSel);
  if (bRound) bRound.textContent = getSelVal(roundSel);
  highlightList();
  loadNoteForCurrent();
}
/* 逃脫字元 */
function escapeHTML(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/* 作答持久化（localStorage，以科目/年/梯次為命名空間） */
function nsKey(){ 
  const p = subjectPrefix(getSelVal(subjectSel));
  const round = getSelVal(roundSel) === "第一次" ? "1" : "2";
  return `ans|${p}|${getSelVal(yearSel)}|${round}`;
}
function loadAnswersFromStorage(){
  try{ state.user = JSON.parse(localStorage.getItem(nsKey())||"{}"); }catch{ state.user={}; }
}

function resetUserAnswersForCurrentScope(){
  try { localStorage.removeItem(nsKey()); } catch {}
  state.user = {};
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
/* 顯示答案：只留左側核取方塊；把舊的切換按鈕拔掉 */
showAns.onchange = ()=> renderQuestion();

(function killToggleAns(){
  try{
    const t = document.getElementById("btnToggleAns");
    if (t) t.remove();
    // 雙保險：即使其他模板又塞回來也隱藏
    const css = document.createElement("style");
    css.textContent = `#btnToggleAns{display:none !important;}`;
    document.head.appendChild(css);
  }catch{}
})();

/* 測驗控制 */
bindTapClick(btnExam, enterFullscreenQuiz);
/* ========= 全螢幕測驗模式（覆蓋主頁，無彈窗） ========= */
/* ========= 全螢幕測驗模式（無「顯示答案」功能） ========= */
function enterFullscreenQuiz(){
  if(!state.questions.length || !Object.keys(state.answers).length){
    alert("請先載入題目與答案。");
    return;
  }
  resetUserAnswersForCurrentScope();

  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  const mask = document.createElement("div");
  mask.id = "fsQuizMask";
  mask.style.cssText = `
    position:fixed; inset:0; z-index:99999; 
    background:var(--bg,#111);
    display:flex; flex-direction:column;
  `;

  if(!document.getElementById("fs-quiz-style")){
    const css = document.createElement("style");
    css.id = "fs-quiz-style";
    css.textContent = `
      .fs-topbar{
        display:flex; align-items:center; gap:10px;
        padding:12px 14px; border-bottom:1px solid var(--border,#2a2a2a);
        background:var(--card,#1b1b1b);
      }
      .fs-badge{
        padding:6px 10px; border:1px solid var(--border,#2a2a2a);
        border-radius:9999px; background:transparent; color:var(--fg,#fff); font-size:14px;
      }
      .fs-spacer{ flex:1; }
      .fs-btn{
        padding:10px 14px; border-radius:9999px; border:1px solid var(--border,#2a2a2a);
        background:transparent; color:var(--fg,#fff); cursor:pointer; font-size:16px;
      }
      .fs-btn:hover{ border-color:var(--accent,#2f74ff); color:var(--accent,#2f74ff); }
      .fs-main{ 
        flex:1; display:flex; flex-direction:column; gap:12px; 
        padding:16px; overflow:auto;
      }
      .fs-card{
        border:1px solid var(--border,#2a2a2a); border-radius:16px; padding:16px; background:var(--card,#1b1b1b);
      }
      .fs-qtext{ font-size:18px; line-height:1.6; }
      .fs-qimg{ margin-top:10px; max-width:100%; height:auto; border-radius:8px; border:1px solid var(--border,#2a2a2a); }
      .fs-opts{ margin-top:10px; display:flex; flex-direction:column; gap:8px; }
      .fs-nav{ display:flex; gap:8px; align-items:center; margin-top:14px; }
      .fs-hidden{ display:none !important; }
    `;
    document.head.appendChild(css);
  }

  mask.innerHTML = `
    <div class="fs-topbar">
      <span class="fs-badge">科目：<span id="fsSubj"></span></span>
      <span class="fs-badge">年份：<span id="fsYear"></span></span>
      <span class="fs-badge">梯次：<span id="fsRound"></span></span>
      <span class="fs-badge" id="fsTimer">剩餘 60:00</span>
      <span class="fs-badge fs-hidden" id="fsReviewTag">回顧模式（僅看錯題）</span>
      <span class="fs-spacer"></span>
      <button id="fsSubmit" class="fs-btn">提交測驗</button>
      <button id="fsClose"  class="fs-btn">關閉</button>
    </div>

    <div class="fs-main">
      <div class="fs-card">
        <div id="fsQNum" class="fs-badge" style="margin-bottom:8px">第 1 題</div>
        <div id="fsQText" class="fs-qtext"></div>
        <img id="fsQImg" class="fs-qimg fs-hidden" alt="">
        <div id="fsQOpts" class="fs-opts"></div>
        <div class="fs-nav">
          <button id="fsPrev" class="fs-btn">上一題</button>
          <button id="fsNext" class="fs-btn">下一題</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(mask);

  const fs = {
    mask,
    fsSubj: $("#fsSubj"), fsYear: $("#fsYear"), fsRound: $("#fsRound"),
    fsTimer: $("#fsTimer"), fsReviewTag: $("#fsReviewTag"),
    fsQNum: $("#fsQNum"), fsQText: $("#fsQText"), fsQImg: $("#fsQImg"), fsQOpts: $("#fsQOpts"),
    fsPrev: $("#fsPrev"), fsNext: $("#fsNext"),
    fsSubmit: $("#fsSubmit"), fsClose: $("#fsClose")
  };

  const qs = {
    mode: "quiz",
    index: 0,
    reviewOrder: [],
    reviewPos: 0,
    remain: 60*60,
    timerId: null
  };

  fs.fsSubj.textContent  = subjectSel.value;
  fs.fsYear.textContent  = yearSel.value;
  fs.fsRound.textContent = roundSel.value;

  bindTapClick(fs.fsPrev,  ()=> { if(qs.mode==="review"){ stepReview(-1); } else { if(qs.index>0) qs.index--; } renderFS(); });
  bindTapClick(fs.fsNext,  ()=> { if(qs.mode==="review"){ stepReview( 1); } else { if(qs.index<state.questions.length-1) qs.index++; } renderFS(); });
  bindTapClick(fs.fsSubmit, ()=> submitFS());
  bindTapClick(fs.fsClose,  ()=> closeFS());

  tickFS(); qs.timerId = setInterval(tickFS, 1000);
  renderFS();

  function renderFS(){
    const q = state.questions[qs.index];
    if(!q){
      fs.fsQNum.textContent = "";
      fs.fsQText.textContent = "題目載入失敗";
      fs.fsQOpts.innerHTML = "";
      fs.fsQImg.classList.add("fs-hidden");
      return;
    }

    fs.fsQNum.textContent = `第 ${q.id} 題`;
    fs.fsQText.innerHTML = escapeHTML(q.text);

    if(q.image){
      const raw = resolveImage(q.image);
      const bust = (raw.includes("?") ? "&" : "?") + "v=" + Date.now();
      fs.fsQImg.src = raw + bust;
      fs.fsQImg.classList.remove("fs-hidden");
    }else{
      fs.fsQImg.classList.add("fs-hidden");
      fs.fsQImg.removeAttribute("src");
    }

    fs.fsQOpts.innerHTML = "";
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
      rb.name = "fs-opt";
      rb.disabled = (qs.mode==="review");
      rb.checked = (ua===L);
      rb.onchange = ()=>{ state.user[String(q.id)] = L; persistAnswer(); };

      const span = document.createElement("span");
      span.innerText = `${L}. ${q.options?.[L]??""}`;

      if(qs.mode==="review"){
        if (ua === L) {
          span.innerText += "（你選）";
          span.style.color = "#6aa0ff";  // 你選的答案藍色
        }
        if (correctSet.has(L)) {
          span.innerText += "（正解）";
          span.style.color = "#c40000";  // 正解紅色
        }
      }

      line.appendChild(rb);
      line.appendChild(span);
      fs.fsQOpts.appendChild(line);
    });

    fs.fsReviewTag.classList.toggle("fs-hidden", qs.mode!=="review");
  }

  function stepReview(delta){
    if(!qs.reviewOrder.length) return;
    qs.reviewPos = Math.min(Math.max(0, qs.reviewPos + delta), qs.reviewOrder.length-1);
    qs.index = qs.reviewOrder[qs.reviewPos];
  }

  function tickFS(){
    qs.remain--; if(qs.remain<0) qs.remain=0;
    const m = String(Math.floor(qs.remain/60)).padStart(2,"0");
    const s = String(qs.remain%60).padStart(2,"0");
    fs.fsTimer.textContent = `剩餘 ${m}:${s}`;
    if(qs.remain===0){ submitFS(); }
  }

  function submitFS(){
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

    if(qs.timerId){ clearInterval(qs.timerId); qs.timerId=null; }

    const goReview = confirm(
      `測驗提交！\n正確：${correct}/${total}\n得分：${score}\n錯誤題號：${row.wrongIds}\n\n要進入『僅看錯題』回顧模式嗎？`
    );

    if(goReview && wrong.length){
      qs.mode="review";
      fs.fsTimer.classList.add("fs-hidden");
      qs.reviewOrder = wrong.map(w=>w.idx);
      qs.reviewPos = 0;
      qs.index = qs.reviewOrder[0];
      renderFS();
    }else{
      closeFS();
    }
  }

  function closeFS(){
    if(qs.timerId){ clearInterval(qs.timerId); qs.timerId=null; }
    try{ document.body.removeChild(mask); }catch{}
    document.body.style.overflow = prevOverflow || "";
    state.mode="browse";
    renderQuestion();
  }
}
bindTapClick(btnSubmit, submitQuiz);
bindTapClick(btnClose,  closeQuiz);

// ====== 取代原本的 startQuiz，並新增 openQuizWindow ======
function startQuiz(){
  if(!state.questions.length || !Object.keys(state.answers).length){
    alert("請先載入題目與答案。");
    return;
  }

  // ✅ 一開始就清除「當前科目/年/梯次」舊作答，避免帶入上一輪
  resetUserAnswersForCurrentScope();

  state.mode="quiz";
  state.remain = 60*60; // 60 分鐘
  timerBadge.classList.remove("hidden");
  btnSubmit.classList.remove("hidden");
  btnClose.classList.remove("hidden");
  reviewTag.classList.add("hidden");
  tick(); 
  state.timerId = setInterval(tick, 1000);

  renderQuestion();
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
bindTapClick(btnRecords, showRecords);
function appendRecord(row){
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem("examRecords") || "[]"); } catch { arr = []; }
  arr.unshift(row); // 最新放前面
  localStorage.setItem("examRecords", JSON.stringify(arr));
}



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
  if (document.getElementById("rv-mask")) return;

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

  const mask  = document.createElement("div");  mask.className  = "rv-mask"; mask.id = "rv-mask";
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
function isInsideEditor(el){
  return !!(el && editor && (el === editor || editor.contains(el)));
}
/* 筆記工具 */
fontSel.onchange = ()=> exec("fontSize", sizeToCommand(fontSel.value));
bBold.onclick   = ()=> toggleButton(bBold, ()=>exec("bold"));
bItalic.onclick = ()=> toggleButton(bItalic, ()=>exec("italic"));
bUnder.onclick  = ()=> toggleButton(bUnder, ()=>exec("underline"));
bSub.onclick    = ()=> { bSup.classList.remove("active"); toggleButton(bSub, ()=>exec("subscript")); };
bSup.onclick    = ()=> { bSub.classList.remove("active"); toggleButton(bSup, ()=>exec("superscript")); };
txtColor.onchange = ()=> exec("foreColor", txtColor.value);
bHL.onclick = ()=>{
  editor.focus();

  const want = normalizeColor(hlColor.value);
  const cur  = normalizeColor(currentHilite() || "");

  // 第二次按：如果目前選取的標記色 == 想要的顏色 → 取消標記
  if (cur && cur === want){
    clearHiliteSelection();
  } else {
    hilite(hlColor.value);
  }

  bHL.classList.add("active");
  setTimeout(()=>bHL.classList.remove("active"), 250);
  saveNotes();
};
bImg.onclick = ()=> imgNote.click();
imgNote.onchange = async e=>{
  const f = e.target.files?.[0]; if(!f) return;
  const data = await fileToDataURL(f);
  editor.focus();
  document.execCommand("insertImage", false, data);
  saveNotes();
  imgNote.value="";
};

if (editor) {
  editor.addEventListener("input", debounce(saveNotes, 400));
} else {
  document.addEventListener("DOMContentLoaded", () => {
    const ed = document.querySelector("#editor");
    if (ed) ed.addEventListener("input", debounce(saveNotes, 400));
  }, { once:true });
}

function exec(cmd, val=null){
  const area = (editor && editor.querySelector("#userNote")) || editor;
  if (!area) return;

  // 如果目前焦點「不在」筆記區，代表你是從工具列發指令
  // 這時才主動把焦點放到筆記欄的末端，避免亂飛來飛去
  if (!isInsideEditor(document.activeElement)) {
    try {
      area.focus();
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(area);
      range.collapse(false); // 游標到最後
      sel.removeAllRanges();
      sel.addRange(range);
    } catch {}
  }

  document.execCommand(cmd, false, val);
  saveNotes();
}
function toggleButton(btn, fn){ const was = btn.classList.contains("active"); editor.focus(); fn(); btn.classList.toggle("active", !was); saveNotes(); }
function sizeToCommand(px){ // 1~7，做個近似
  const n = Math.max(1, Math.min(7, Math.round((parseInt(px,10)-8)/4)));
  return String(n);
}

// 顏色字串正規化（把 #fff、rgb(...) 等轉成統一格式）
function normalizeColor(c){
  try{
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.fillStyle = c || "";
    return ctx.fillStyle.toLowerCase(); // 例如 "rgb(255, 245, 157)"
  }catch{ return String(c||"").toLowerCase(); }
}

// 取目前選取區塊的標記色（不同瀏覽器可能回 hiliteColor 或 backColor）
function currentHilite(){
  try{
    return (document.queryCommandValue("hiliteColor") ||
            document.queryCommandValue("backColor")  || "").toLowerCase();
  }catch{ return ""; }
}

// 只清除選取區塊的背景色（盡量避免影響粗體/斜體）
function clearHiliteSelection(){
  // 先嘗試設成透明/初始值（各瀏覽器取其一會成功）
  try{ document.execCommand("hiliteColor", false, "transparent"); }catch{}
  try{ document.execCommand("backColor",  false, "transparent"); }catch{}

  try{ document.execCommand("hiliteColor", false, "initial"); }catch{}
  try{ document.execCommand("backColor",  false, "initial"); }catch{}
}


function hilite(color){
  // 用 CSS 模式提高 Safari / iOS 相容性
  try{ document.execCommand("styleWithCSS", false, true); }catch{}

  // 先試標準的 hiliteColor，不行再用 backColor
  try{
    document.execCommand("hiliteColor", false, color);
  }catch{
    try{ document.execCommand("backColor", false, color); }catch{}
  }

  // 還原
  try{ document.execCommand("styleWithCSS", false, false); }catch{}
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

  const p = subjectPrefix(getSelVal(subjectSel));
  const r = (getSelVal(roundSel) === "第一次") ? "1" : "2";
  const qName = `${p}${getSelVal(yearSel)}_${r}.json`;
  const aName = `${p}w${getSelVal(yearSel)}_${r}.json`;

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
/* 初始化（完整覆蓋） */
function init(){
  loadNotes();
  loadAnswersFromStorage();
  renderList();
  // 一進來就依照預設選項嘗試載入 data/題目 與 data/答案
  onScopeChange();
}
// 確保 DOM 都在再啟動
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
// ====== 接收彈窗回傳的作答紀錄，寫入主頁的 localStorage ======
window.addEventListener("message", (e)=>{
  const msg = e.data || {};
  if(msg.type === "QUIZ_RECORD" && msg.row){
    appendRecord(msg.row);     // 用你現成的 appendRecord
    toast("已儲存作答紀錄");
  }
});
