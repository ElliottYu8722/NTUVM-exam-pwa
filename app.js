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
const btnLoadQ = $("#btnLoadQ"), btnLoadA = $("#btnLoadA");
const qFile = $("#qFile"), aFile = $("#aFile");

/* 筆記 */
const fontSel = $("#fontSel");
const editor = $("#editor");
const bBold = $("#bBold"), bItalic = $("#bItalic"), bUnder = $("#bUnder");
const bSub = $("#bSub"), bSup = $("#bSup");
const txtColor = $("#txtColor"), hlColor = $("#hlColor"), bHL = $("#bHL");
const bImg = $("#bImg"), imgNote = $("#imgNote");

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

/* 題庫載入 */
btnLoadQ.onclick = () => qFile.click();
btnLoadA.onclick = () => aFile.click();

qFile.onchange = async e=>{
  const file = e.target.files?.[0];
  if(!file) return;
  const txt = await file.text();
  try {
    const arr = JSON.parse(txt);
    if(!Array.isArray(arr)) throw new Error("題目 JSON 應為陣列");
    state.questions = arr;
    state.index = 0;
    state.user = {};
    renderList(); renderQuestion(); toast("題目已載入 ✅");
  }catch(err){ alert("題目檔格式錯誤：\n"+err.message); }
  qFile.value = "";
};
aFile.onchange = async e=>{
  const file = e.target.files?.[0];
  if(!file) return;
  const txt = await file.text();
  try {
    const obj = JSON.parse(txt);
    state.answers = obj;
    renderQuestion();
    toast("答案已載入 ✅");
  }catch(err){ alert("答案檔格式錯誤：\n"+err.message); }
  aFile.value = "";
};

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
  bRound.textContent = roundSel.value.replace("一次","");

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
btnExam.onclick = startQuiz;
btnSubmit.onclick = submitQuiz;
btnClose.onclick = closeQuiz;

function startQuiz(){
  if(!state.questions.length || !Object.keys(state.answers).length){
    alert("請先載入題目與答案。");
    return;
  }
  state.mode="quiz";
  state.remain = 60*60; // 60 分鐘
  timerBadge.classList.remove("hidden");
  btnSubmit.classList.remove("hidden");
  btnClose.classList.remove("hidden");
  reviewTag.classList.add("hidden");
  tick(); state.timerId = setInterval(tick, 1000);
  renderQuestion();
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

/* 作答紀錄（localStorage: examRecords） */
function appendRecord(row){
  let arr=[]; try{ arr=JSON.parse(localStorage.getItem("examRecords")||"[]"); }catch{}
  arr.push(row);
  localStorage.setItem("examRecords", JSON.stringify(arr));
}
btnRecords.onclick = ()=>{
  let arr=[]; try{ arr=JSON.parse(localStorage.getItem("examRecords")||"[]"); }catch{}
  if(!arr.length){ alert("目前沒有作答紀錄。"); return; }
  const lines = [
    ["測驗日期","科目","年份","梯次","總題數","正確題數","得分","錯誤題號","錯題詳情","作答概覽"].join(",")
  ];
  arr.forEach(r=>{
    lines.push([
      r.ts, r.subj, r.year, r.round, r.total, r.correct, r.score, r.wrongIds, r.wrongDetail, r.summary
    ].map(csvEscape).join(","));
  });
  const csv = lines.join("\n");
  const url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"}));
  const a = document.createElement("a"); a.href=url; a.download="作答紀錄.csv"; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
};
function csvEscape(s){ s=String(s??""); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; }

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
  toastTimer=setTimeout(()=>el.remove(),1800);
}

/* 工具：debounce */
function debounce(fn, ms){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); }; }

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
