/* 基本狀態 */
const state = {
  questions: [],          // [{id,text,options:{A..D},image?}]
  visibleQuestions: [],   // 新增：目前在右側清單顯示的題目
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
// ===== 寵物狀態 =====

// ===== 寵物狀態 =====

const PETS_STORAGE_KEY = 'ntuvm-pets-state';

let petState = {
  dog: {
    species: 'dog',
    name: '',
    bcs: 5,
    hearts: 5,
    coins: 0,
    water: 100,
    lastFedAt: null,
    lastWaterAt: null,
    alive: true,
    status: 'normal',
    bcsDropCount: 0,
    walkDayKey: '',
    walkCount: 0,
    lastWalkAt: null,
    playDayKey: '',
    playCount: 0,
    lastPlayAt: null
  },
  cat: {
    species: 'cat',
    name: '',
    bcs: 5,
    hearts: 5,
    coins: 0,
    water: 100,
    lastFedAt: null,
    lastWaterAt: null,
    alive: true,
    status: 'normal',
    bcsDropCount: 0,
    walkDayKey: '',
    walkCount: 0,
    lastWalkAt: null,
    playDayKey: '',
    playCount: 0,
    lastPlayAt: null
  },
  cow: {
    species: 'cow',
    name: '',
    bcs: 5,
    hearts: 5,
    coins: 0,
    water: 100,
    lastFedAt: null,
    lastWaterAt: null,
    alive: true,
    status: 'normal',
    bcsDropCount: 0,
    walkDayKey: '',
    walkCount: 0,
    lastWalkAt: null,
    playDayKey: '',
    playCount: 0,
    lastPlayAt: null
  }
};

// ===== 我的動物：餵食紀錄 =====
const PET_FEED_RECORDS_KEY = 'ntuvm-pet-feed-records';
let petFeedRecords = [];

function loadPetFeedRecords() {
  try {
    const raw = localStorage.getItem(PET_FEED_RECORDS_KEY);
    petFeedRecords = raw ? JSON.parse(raw) : [];
  } catch {
    petFeedRecords = [];
  }
}

function savePetFeedRecords() {
  try {
    localStorage.setItem(PET_FEED_RECORDS_KEY, JSON.stringify(petFeedRecords));
  } catch (e) {
    console.error('儲存餵食紀錄失敗：', e);
  }
}

function appendPetFeedRecord(rec) {
  petFeedRecords.unshift(rec); // 最新放前面
  // 保留最近 50 筆就好
  if (petFeedRecords.length > 50) {
    petFeedRecords = petFeedRecords.slice(0, 50);
  }
  savePetFeedRecords();
}

function renderPetFeedLog() {
  if (!petPanelCard) return;
  const listEl = document.getElementById('pet-feed-log-list');
  if (!listEl) return;

  const items = petFeedRecords.filter(r => r.petKey === currentPetKey);
  if (!items.length) {
    listEl.textContent = '目前還沒有餵食成功的紀錄。';
    return;
  }

  listEl.innerHTML = '';

  items.slice(0, 5).forEach(rec => {
    const div = document.createElement('div');
    div.className = 'pet-feed-log-item';

    // 這次餵食實際抽到的題目清單
    const qs = Array.isArray(rec.questions) ? rec.questions : [];
    let lines = '';

    if (qs.length) {
      // 新版：每一題顯示「科目 / 年份 / 梯次 / 題號」
      lines = qs.map(q => {
        const subj = q.subj || '';           // 例如「獸醫病理學」，或 subj code
        const year = q.year || '?';
        const round = q.roundLabel || '?';
        const id = q.id != null ? q.id : '?';

        const parts = [];
        if (subj) parts.push(subj);
        if (year) parts.push(`${year} 年`);
        if (round) parts.push(`第 ${round} 次`);
        if (id !== '?') parts.push(`第 ${id} 題`);

        return parts.join(' / ');
      }).join('；');
    } else if (Array.isArray(rec.fromScopes) && rec.fromScopes.length) {
      // 舊紀錄 fallback：比較舊的版本，只有年／次，沒有單題資訊
      lines = rec.fromScopes.map(s => {
        const subj = s.subj || '';
        const year = s.year || '?';
        const round = s.roundLabel || '?';

        const parts = [];
        if (subj) parts.push(subj);
        if (year) parts.push(`${year} 年`);
        if (round) parts.push(`第 ${round} 次`);

        return parts.join(' / ');
      }).join('、');
    } else {
      lines = '題目來源不明';
    }

    div.innerHTML = `<strong>${rec.ts}</strong>：${lines}`;
    listEl.appendChild(div);
  });
}



// dog | cat | cow
let currentPetKey = 'dog';

/** 將載入到的資料安全地 merge 回預設 petState，避免舊資料缺欄位 */
function mergePetState(defaults, loaded) {
  const out = {};
  for (const key of Object.keys(defaults)) {
    const base = defaults[key];
    const fromStorage = (loaded && loaded[key]) || {};
    out[key] = {
      species: fromStorage.species || base.species,
      name: typeof fromStorage.name === 'string' ? fromStorage.name : base.name,
      bcs: Number.isFinite(fromStorage.bcs) ? fromStorage.bcs : base.bcs,
      hearts: Number.isFinite(fromStorage.hearts) ? fromStorage.hearts : base.hearts,
      coins: Number.isFinite(fromStorage.coins) ? fromStorage.coins : 0,
      water: Number.isFinite(fromStorage.water) ? fromStorage.water : base.water,
      lastFedAt: fromStorage.lastFedAt || base.lastFedAt,
      lastWaterAt: fromStorage.lastWaterAt || base.lastWaterAt,
      alive: typeof fromStorage.alive === 'boolean' ? fromStorage.alive : base.alive,
      status: typeof fromStorage.status === 'string' ? fromStorage.status : base.status,
      bcsDropCount: Number.isFinite(fromStorage.bcsDropCount)
        ? fromStorage.bcsDropCount
        : (base.bcsDropCount || 0),
      walkDayKey: typeof fromStorage.walkDayKey === 'string' ? fromStorage.walkDayKey : '',
      walkCount: Number.isFinite(fromStorage.walkCount) ? fromStorage.walkCount : 0,
      lastWalkAt: fromStorage.lastWalkAt || null,
      playDayKey: typeof fromStorage.playDayKey === 'string' ? fromStorage.playDayKey : '',
      playCount: Number.isFinite(fromStorage.playCount) ? fromStorage.playCount : 0,
      lastPlayAt: fromStorage.lastPlayAt || null
    };
  }
  return out;
}


function loadPetsFromStorage() {
  try {
    const raw = localStorage.getItem(PETS_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    petState = mergePetState(petState, parsed);
  } catch (e) {
    console.error('載入寵物狀態失敗：', e);
  }
}

function savePetsToStorage() {
  try {
    localStorage.setItem(PETS_STORAGE_KEY, JSON.stringify(petState));
  } catch (e) {
    console.error('儲存寵物狀態失敗：', e);
  }
}
// ====== 經濟與互動參數 ======
const ECON = {
  BIG_SNACK_COST: 50,
  BIG_SNACK_HEARTS: 100,
  SMALL_SNACK_COST: 20,
  SMALL_SNACK_HEARTS: 30,
  WALK_HEARTS: 5,
  PLAY_HEARTS: 2,
  WALK_INTERVAL_HRS: 12,
  WALK_MAX_PER_DAY: 2,
  PLAY_INTERVAL_HRS: 3,
  PLAY_MAX_PER_DAY: 5
};

// ====== 小工具 ======
function nowTs() { return Date.now(); }
function hoursSince(ts) {
  if (!ts) return Infinity;
  return (nowTs() - new Date(ts).getTime()) / 36e5;
}
function dayKey(ts = nowTs()) {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}
function getPet() { return petState[currentPetKey]; }
function setPet(p) { petState[currentPetKey] = p; savePetsToStorage(); }

// ====== 狀態文字（飽足感） ======
function satietyLabel(p) {
  const h = hoursSince(p.lastFedAt);
  if (!isFinite(h)) return "一般";
  if (h < 6) return "飽足";
  if (h < 12) return "一般";
  if (h < 24) return "飢餓";
  return "超餓";
}

// ====== HUD 渲染 ======
const coinCounterEl = document.getElementById("coinCounter");
const heartCounterEl = document.getElementById("heartCounter");
const btnWalkEl = document.getElementById("btnWalk");
const btnPlayEl = document.getElementById("btnPlay");

function renderTopCounters() {
  const p = getPet();
  if (!p) return;

  if (coinCounterEl) coinCounterEl.textContent = Math.max(0, Math.floor(p.coins || 0));
  if (heartCounterEl) heartCounterEl.textContent = Math.max(0, Math.floor(p.hearts || 0));

  const dk = dayKey();

  if (btnWalkEl) {
    const used = (p.walkDayKey === dk) ? p.walkCount : 0;
    const canByCount = used < ECON.WALK_MAX_PER_DAY;
    const canByTime = hoursSince(p.lastWalkAt) >= ECON.WALK_INTERVAL_HRS;
    btnWalkEl.disabled = !(canByCount && canByTime);
  }

  if (btnPlayEl) {
    const used = (p.playDayKey === dk) ? p.playCount : 0;
    const canByCount = used < ECON.PLAY_MAX_PER_DAY;
    const canByTime = hoursSince(p.lastPlayAt) >= ECON.PLAY_INTERVAL_HRS;
    btnPlayEl.disabled = !(canByCount && canByTime);
  }
}

function addHearts(n) {
  const p = getPet();
  if (!p) return;
  p.hearts = Math.max(0, Math.floor((p.hearts || 0) + n));
  setPet(p);
  renderTopCounters();
}

function addCoins(n) {
  const p = getPet();
  if (!p) return;
  p.coins = Math.max(0, Math.floor((p.coins || 0) + n));
  setPet(p);
  renderTopCounters();
}

// ====== 商店邏輯 ======
const shopMask = document.getElementById("shopMask");
const shopClose = document.getElementById("shopClose");
const shopCoin = document.getElementById("shopCoin");
const shopHeart = document.getElementById("shopHeart");
const shopStatus = document.getElementById("shopStatus");
const buyBigSnack = document.getElementById("buyBigSnack");
const buySmallSnack = document.getElementById("buySmallSnack");
const buyToy = document.getElementById("buyToy");

function openShop() {
  const p = getPet();
  if (!p) return;
  if (shopCoin) shopCoin.textContent = Math.floor(p.coins || 0);
  if (shopHeart) shopHeart.textContent = Math.floor(p.hearts || 0);
  if (shopStatus) {
    const sat = satietyLabel(p);
    const water = Math.max(0, Math.min(100, Math.floor(p.water || 0)));
    shopStatus.textContent = `狀態：${sat}｜水 ${water}%`;
  }
  if (shopMask) shopMask.style.display = "flex";
}

function closeShop() {
  if (shopMask) shopMask.style.display = "none";
}

function tryBuy(cost, onSuccess) {
  const p = getPet();
  if (!p) return;
  if ((p.coins || 0) < cost) {
    alert("寵物幣不足 > <");
    return;
  }
  p.coins -= cost;
  setPet(p);
  if (typeof onSuccess === "function") onSuccess();
  renderTopCounters();
  openShop();
}

if (shopClose) shopClose.addEventListener("click", closeShop);

if (buyBigSnack) buyBigSnack.addEventListener("click", () => {
  tryBuy(ECON.BIG_SNACK_COST, () => {
    addHearts(ECON.BIG_SNACK_HEARTS);
    alert("大零食購買成功，愛心 +100！");
  });
});

if (buySmallSnack) buySmallSnack.addEventListener("click", () => {
  tryBuy(ECON.SMALL_SNACK_COST, () => {
    addHearts(ECON.SMALL_SNACK_HEARTS);
    alert("小零食購買成功，愛心 +30！");
  });
});

if (buyToy) buyToy.addEventListener("click", () => {
  tryBuy(30, () => {
    alert("玩具購買成功，之後可以在小遊戲區讓牠玩～");
  });
});

// ====== 遛狗 / 玩耍 ======
function walkOnce() {
  const p = getPet();
  if (!p) return;
  const dk = dayKey();
  const used = (p.walkDayKey === dk) ? p.walkCount : 0;
  const canByCount = used < ECON.WALK_MAX_PER_DAY;
  const canByTime = hoursSince(p.lastWalkAt) >= ECON.WALK_INTERVAL_HRS;

  if (!canByCount) return alert("今天的遛狗次數已用完！");
  if (!canByTime) return alert("還沒到 12 小時喔～");

  p.walkDayKey = dk;
  p.walkCount = used + 1;
  p.lastWalkAt = new Date().toISOString();
  setPet(p);
  addHearts(ECON.WALK_HEARTS);
}

function playOnce() {
  const p = getPet();
  if (!p) return;
  const dk = dayKey();
  const used = (p.playDayKey === dk) ? p.playCount : 0;
  const canByCount = used < ECON.PLAY_MAX_PER_DAY;
  const canByTime = hoursSince(p.lastPlayAt) >= ECON.PLAY_INTERVAL_HRS;

  if (!canByCount) return alert("今天的玩耍次數已用完！");
  if (!canByTime) return alert("還沒到 3 小時喔～");

  p.playDayKey = dk;
  p.playCount = used + 1;
  p.lastPlayAt = new Date().toISOString();
  setPet(p);
  addHearts(ECON.PLAY_HEARTS);

  // 小遊戲區 3D 模型轉一圈
  try {
    const mv = document.getElementById("petModel");
    if (mv) {
      mv.setAttribute("auto-rotate", "");
      setTimeout(() => mv.removeAttribute("auto-rotate"), 2500);
    }
  } catch {}
}

// 綁定頂部按鈕
const btnOpenShopEl = document.getElementById("btnOpenShop");
if (btnOpenShopEl) btnOpenShopEl.addEventListener("click", openShop);
if (btnWalkEl) btnWalkEl.addEventListener("click", () => { walkOnce(); renderTopCounters(); });
if (btnPlayEl) btnPlayEl.addEventListener("click", () => { playOnce(); renderTopCounters(); });

// 載入寵物狀態並刷新 HUD（如果你在其他地方已經呼叫 loadPetsFromStorage，也沒關係）
try { loadPetsFromStorage(); } catch {}
renderTopCounters();


// ===== 群組管理 =====

// ===== 群組管理（跨科目／跨年度／跨梯次） =====
state.groups = [];
const GROUPS_STORAGE_KEY = 'ntuvm_exam_groups_personal';

// 載入群組資料（localStorage，個人獨立）
function loadGroups() {
  const raw = localStorage.getItem(GROUPS_STORAGE_KEY);
  if (!raw) {
    state.groups = [];
    return;
  }
  try {
    state.groups = JSON.parse(raw) || [];
  } catch (e) {
    console.error('載入群組失敗：', e);
    state.groups = [];
  }
}

// 儲存群組資料
function saveGroups() {
  localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(state.groups));
}

// 新增群組
function addGroup(name) {
  if (!name || !name.trim()) return null;
  const newGroup = {
    id: 'group-' + Date.now(),
    name: name.trim(),
    // 這裡改成存完整身份：subj/year/round/qid
    questions: []
  };
  state.groups.push(newGroup);
  saveGroups();
  renderGroupList();
  return newGroup;
}

// 取得目前卷別 scope
function getCurrentScopeForGroup() {
  const sc = getScopeFromUI(); // {subj, year, round}
  return {
    subj: sc.subj,
    year: sc.year,
    round: sc.round
  };
}

// 在群組裡判斷兩題是不是同一題
function isSameGroupQuestion(a, b) {
  return (
    String(a.subj)  === String(b.subj)  &&
    String(a.year)  === String(b.year)  &&
    String(a.round) === String(b.round) &&
    String(a.qid)   === String(b.qid)
  );
}

// 把題目加入群組（避免重複）
function addQuestionToGroup(questionId, groupId) {
  const group = state.groups.find(g => g.id === groupId);
  if (!group) return;

  const scope = getCurrentScopeForGroup();
  const entry = {
    subj: scope.subj,
    year: scope.year,
    round: scope.round,
    qid: String(questionId)
  };

  // 檢查群組內是否已經有這題（同科目＋年次＋梯次＋題號）
  const exists = group.questions.some(q => isSameGroupQuestion(q, entry));
  if (!exists) {
    group.questions.push(entry);
    saveGroups();
  }
}

// 移除群組裡的某一題
function removeQuestionFromGroup(questionId, groupId) {
  const group = state.groups.find(g => g.id === groupId);
  if (!group) return;

  const scope = getCurrentScopeForGroup();
  const target = {
    subj: scope.subj,
    year: scope.year,
    round: scope.round,
    qid: String(questionId)
  };

  group.questions = group.questions.filter(q => !isSameGroupQuestion(q, target));
  saveGroups();
}

// 刪除整個群組
function deleteGroup(groupId) {
  state.groups = state.groups.filter(g => g.id !== groupId);
  saveGroups();
  renderGroupList();

  // 如果當前正處於這個群組視圖，就切回全部題目
  if (state.currentGroupId === groupId) {
    showAllQuestions();
  }
}


// 點某個群組：右側只顯示該群組內的題目（可以混不同科目／年度／梯次）
function filterQuestionsByGroup(groupId) {
  const group = state.groups.find(g => g.id === groupId);
  if (!group) return;
  document.body.classList.remove('show-left-panel', 'show-right-panel');
  const backdrop = document.querySelector('.drawer-backdrop');
  if (backdrop) backdrop.style.display = 'none';
  state.currentGroupId = groupId;

  // 把群組裡的每一題都包成一個 list item
  // 這裡的 id 只拿來顯示順序（1,2,3…），真正的題目身份在 groupEntry 裡
  const list = group.questions.map((entry, idx) => {
    return {
      id: idx + 1,       // 顯示用編號
      groupEntry: entry // { subj, year, round, qid }
    };
  });

  state.index = 0;
  renderList(list, { renumber: true }); // 題號用 1,2,3… 重新編
  renderQuestion();                     // 會在群組模式裡自動跳卷＋顯示題目
  highlightList();
}



// 回到全部題目（恢復原本卷內順序與題號）
function showAllQuestions() {
  document.body.classList.remove('show-left-panel', 'show-right-panel');
  const backdrop = document.querySelector('.drawer-backdrop');
  if (backdrop) backdrop.style.display = 'none';
  state.currentGroupId = null;
  state.index = 0; // 回到原卷第一題
  if (searchInput) {
    searchInput.value = "";
  }

  renderList(state.questions, { renumber: false });
  renderQuestion();
  highlightList();
  }
  state.visibleQuestions = state.questions;
  renderList(state.questions, { renumber: false });
  renderQuestion();
  highlightList();
}



/* ====== 路徑設定 ====== */
const CONFIG = {
  basePath: "./data",
  dirs: {
    questions: "題目",
    answers:   "答案",
    images:    "圖片",
  }
};

/* ====== 本機儲存鍵 ====== */
const STORAGE = {
  notes:     "notes_v2",
  notesMeta: "notesMeta_v2",
  migrated:  "notes_migrated_to_v2"
};

/* 一次性遷移：第一次載入就把舊 notes/notesMeta 清掉，避免污染 */
(function migrateNotesOnce(){
  if (localStorage.getItem(STORAGE.migrated) === "true") return;

  try { localStorage.removeItem("notes"); } catch {}
  try { localStorage.removeItem("notesMeta"); } catch {}

  // 把可能留下的奇怪 key 格式做個掃描清掉
  try {
    Object.keys(localStorage).forEach(k=>{
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
const toolbar = document.querySelector(".toolbar");
const yearSel   = $("#yearSel");
const roundSel  = $("#roundSel");
const subjectSel= $("#subjectSel");
const searchInput = $("#questionSearch"); // 新增：題目搜尋輸入框

// ===== 我的動物 DOM =====
// ===== 我的動物 DOM / 面板 =====

// 左欄那顆「打開牧場」按鈕
const btnOpenPets = document.getElementById('btn-open-pets');
// 只讓「遊戲入口／牧場」按鈕在 ?dev=8 時出現
(function limitGameEntranceToDev8() {
  try {
    const usp = new URLSearchParams(location.search);
    const isDev8 = usp.get('dev') === '8';

    if (!isDev8) {
      // 隱藏整個區塊（包含標題），避免留下空白
      const petsGroup = document.getElementById('pets-launch-group');
      if (petsGroup) {
        petsGroup.style.display = 'none';
      }
    }
  } catch (e) {
    // 解析網址失敗就當成一般使用者，一樣隱藏
    const petsGroup = document.getElementById('pets-launch-group');
    if (petsGroup) {
      petsGroup.style.display = 'none';
    }
  }
})();

// 牧場面板裡的節點：打開面板時才會被指向
let petPanelMask = null;
let petPanelCard = null;

let petAvatarEl = null;
let petNameEl = null;
let petBCSEl = null;
let petHeartsEl = null;
let petStatusLabelEl = null;

let btnFeedPet = null;
let btnWaterPet = null;
let btnRenamePet = null;
let btnResetPet = null;
let btnAdoptPet = null;
let petWaterEl = null;
// ===== 我的動物：初次設定狀態判斷 =====

function anyPetHasName() {
  return ['dog', 'cat', 'cow'].some(k => {
    const p = petState[k];
    return p && typeof p.name === 'string' && p.name.trim();
  });
}

function isPetNamed(petKey) {
  const p = petState[petKey];
  return !!(p && typeof p.name === 'string' && p.name.trim());
}



const bSubj = $("#bSubj"), bYear = $("#bYear"), bRound = $("#bRound");
const showAns = $("#showAns");
const btnToggleAns = $("#btnToggleAns");

const qNum = $("#qNum"), qText = $("#qText"), qImg = $("#qImg"), qOpts = $("#qOpts");
const qExplain = $("#qExplain");   // 新增：詳解容器
const qList = $("#qList");

const prevBtn = $("#prev"), nextBtn = $("#next");
const btnExam = $("#btnExam"), btnSubmit = $("#btnSubmit"), btnClose = $("#btnClose");
const timerBadge = $("#timer"), reviewTag = $("#reviewTag");

const btnRecords = $("#btnRecords"), btnTheme = $("#btnTheme");
const btnExportNotes = $("#btnExportNotes");  // 作者模式匯出按鈕

// ===== 作者模式：用 ?dev=1 或 localStorage 控制 =====
const AUTHOR_MODE = (()=>{
  try{
    const usp = new URLSearchParams(location.search);   // 讀網址上的 query 參數
    if (usp.get("dev") === "1") return true;            // ?dev=1 時啟用作者模式
    if (localStorage.getItem("authorMode") === "true") return true; // 或 localStorage 開關
    
  }catch{}
  return false;
})();
// ===== 留言管理模式：只在 ?dev=2 時啟用置頂／刪除留言 =====
const COMMENT_ADMIN_MODE = (()=>{
  try {
    const usp = new URLSearchParams(location.search);
    return usp.get("dev") === "9";   // 只有 ?dev=9 才算留言管理模式
  } catch {}
  return false;
})();

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
const bImg = $("#bImg"), imgNote = $("#imgNote");

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
const subjectPrefix = s => {
  if(!s) return "x";
  const str = String(s).trim();
  // 如果已經傳入單字母代碼（a,b,c...），就直接回傳（容錯）
  if (/^[a-f]$/i.test(str)) return str.toLowerCase();

  // 原本的中文對照表
  const map = {
    "獸醫病理學":"a","獸醫藥理學":"b","獸醫實驗診斷學":"c",
    "獸醫普通疾病學":"d","獸醫傳染病學":"e","獸醫公共衛生學":"f"
  };
  return map[str] || "x";
};
// ===== 我的動物：開啟 / 關閉面板 =====

// ===== 我的動物：開啟 / 關閉面板 =====
function openPetPanel() {
  // 如果已經開著就不要重建
  if (document.getElementById('pet-panel-mask')) return;

  // 建立外層遮罩
  const mask = document.createElement('div');
  mask.id = 'pet-panel-mask';
  mask.className = 'pet-panel-mask';

  // 內層卡片
  const card = document.createElement('div');
  card.className = 'pet-panel-card';
  card.innerHTML = `
    <!-- 面板頂部 -->
    <div class="pet-panel-head">
      <div class="pet-panel-title">我的動物 🐾</div>
      <div class="pet-panel-spacer"></div>
      <button type="button" class="pet-panel-close" id="btn-close-pet-panel">✕</button>
    </div>

    <div class="pet-panel-body">
      <!-- 🪙/❤️ 顯示區 + 商店/遛狗/玩耍按鈕 -->
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; flex-wrap:wrap;">
        <div style="flex:1; min-width:120px; padding:8px 12px; border-radius:10px; background:rgba(0,0,0,0.05); font-weight:600;">
          🪙 <span id="pet-panel-coin">0</span>
          &nbsp;&nbsp;❤️ <span id="pet-panel-hearts">0</span>
        </div>
        <button id="pet-btn-shop" class="btn" style="height:32px;">商店</button>
        <button id="pet-btn-walk" class="btn" style="height:32px;">遛狗</button>
        <button id="pet-btn-play" class="btn" style="height:32px;">玩耍</button>
      </div>

      <!-- 切換動物的 tab -->
      <div class="pet-selector">
        <button class="btn pet-tab" data-pet="dog">🐶 狗狗</button>
        <button class="btn pet-tab" data-pet="cat">🐱 貓咪</button>
        <button class="btn pet-tab" data-pet="cow">🐮 乳牛</button>
      </div>

      <!-- 寵物資訊卡片 -->
      <div class="pet-card">
        <div class="pet-avatar"></div>
        <div class="pet-info">
          <div><span id="pet-name">未命名</span></div>
          <div>BCS：<span id="pet-bcs">5</span></div>
          <div>水分：<span id="pet-water">100</span>%</div>
          <div>狀態：<span id="pet-status-label">正常</span></div>
        </div>
      </div>

      <!-- 餵食 / 喝水 / 重新命名 / 重置 -->
      <div class="pet-actions">
        <button id="btn-feed-pet" class="btn">餵食（小遊戲）</button>
        <button id="btn-water-pet" class="btn">給水</button>
        <button id="btn-rename-pet" class="btn">重新命名</button>
        <button id="btn-reset-pet" class="btn" style="display:none;">復活寵物</button>
      </div>

      <!-- 餵食成功記錄（最近 5 筆） -->
      <div class="pet-feed-log">
        <div class="pet-feed-log-title">最近 5 次餵食成功</div>
        <div class="pet-feed-log-list" id="pet-feed-log-list"></div>
      </div>

      <!-- 小遊戲區（草地 + 3D 模型） -->
      <div style="margin-top:16px; border-radius:12px; overflow:hidden; height:280px; background:radial-gradient(circle at 20% 30%, #a8e6a3 0%, #7ddc7a 40%, #5dbf5f 100%); position:relative;">
        <div style="position:absolute; left:12px; top:8px; font-weight:700; color:#0b3d0b; text-shadow:0 1px 0 #fff;">小遊戲區</div>
        <div style="width:100%; height:100%; display:grid; place-items:center;">
          <model-viewer id="pet-model-viewer"
            src="assets/dog.glb"
            alt="Pet 3D Model"
            camera-controls
            auto-rotate
            exposure="1.1"
            environment-image="neutral"
            style="width:100%; height:100%;"
            shadow-intensity="0.7">
          </model-viewer>
        </div>
      </div>
    </div>

    <!-- 商店面板（隱藏在面板內的子彈窗） -->
    <div id="pet-shop-overlay" style="display:none; position:absolute; inset:0; background:rgba(0,0,0,0.6); z-index:10; border-radius:14px; padding:16px; overflow:auto;">
      <div style="background:#fff; color:#111; border-radius:12px; padding:16px; max-width:480px; margin:0 auto;">
        <span style="float:right; cursor:pointer; font-size:20px;" id="pet-shop-close">✕</span>
        <h3 style="margin:0 0 8px 0;">寵物商店</h3>
        <div style="margin-bottom:12px;">
          當前：🪙<span id="shop-coin-display">0</span>
          &nbsp;❤️<span id="shop-heart-display">0</span>
          <br><span id="shop-status-display"></span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div style="border:1px solid #ddd; border-radius:10px; padding:12px;">
            <h4 style="margin:0 0 6px 0;">大零食</h4>
            <div>價格：🪙50</div>
            <div>效果：+100 ❤️</div>
            <button id="shop-buy-big" style="margin-top:8px; width:100%; height:32px; border:none; border-radius:6px; background:#16a34a; color:#fff; cursor:pointer;">購買</button>
          </div>
          <div style="border:1px solid #ddd; border-radius:10px; padding:12px;">
            <h4 style="margin:0 0 6px 0;">小零食</h4>
            <div>價格：🪙20</div>
            <div>效果：+30 ❤️</div>
            <button id="shop-buy-small" style="margin-top:8px; width:100%; height:32px; border:none; border-radius:6px; background:#16a34a; color:#fff; cursor:pointer;">購買</button>
          </div>
          <div style="border:1px solid #ddd; border-radius:10px; padding:12px;">
            <h4 style="margin:0 0 6px 0;">玩具</h4>
            <div>價格：🪙30</div>
            <div>效果：給寵物玩</div>
            <button id="shop-buy-toy" style="margin-top:8px; width:100%; height:32px; border:none; border-radius:6px; background:#16a34a; color:#fff; cursor:pointer;">購買</button>
          </div>
        </div>
      </div>
    </div>
  `;
  mask.appendChild(card);
  document.body.appendChild(mask);

  // ========== 抓取面板內的元素 ==========
  petPanelMask = mask;
  petPanelCard = card;
  petAvatarEl = card.querySelector('.pet-avatar');
  petNameEl = document.getElementById('pet-name');
  petBCSEl = document.getElementById('pet-bcs');
  petHeartsEl = document.getElementById('pet-hearts');
  petStatusLabelEl = document.getElementById('pet-status-label');
  petWaterEl = document.getElementById('pet-water');

  btnFeedPet = document.getElementById('btn-feed-pet');
  btnWaterPet = document.getElementById('btn-water-pet');
  btnRenamePet = document.getElementById('btn-rename-pet');
  btnResetPet = document.getElementById('btn-reset-pet');

  const btnClosePanel = document.getElementById('btn-close-pet-panel');
  if (btnClosePanel) btnClosePanel.addEventListener('click', closePetPanel);
  mask.addEventListener('click', (e) => {
    if (e.target === mask) closePetPanel();
  });

  // ========== 面板內的 🪙/❤️ 顯示元素 ==========
  const petPanelCoinEl = document.getElementById('pet-panel-coin');
  const petPanelHeartsEl = document.getElementById('pet-panel-hearts');

  // ========== 商店元素 ==========
  const shopOverlay = document.getElementById('pet-shop-overlay');
  const shopClose = document.getElementById('pet-shop-close');
  const shopCoinDisplay = document.getElementById('shop-coin-display');
  const shopHeartDisplay = document.getElementById('shop-heart-display');
  const shopStatusDisplay = document.getElementById('shop-status-display');
  const shopBuyBig = document.getElementById('shop-buy-big');
  const shopBuySmall = document.getElementById('shop-buy-small');
  const shopBuyToy = document.getElementById('shop-buy-toy');

  // ========== 遛狗/玩耍按鈕 ==========
  const btnShop = document.getElementById('pet-btn-shop');
  const btnWalk = document.getElementById('pet-btn-walk');
  const btnPlay = document.getElementById('pet-btn-play');

  // ========== 工具函式（放在這裡或外面都可以） ==========
  function getPet() { return petState[currentPetKey]; }
  function setPet(p) { petState[currentPetKey] = p; savePetsToStorage(); }
  function nowTs() { return Date.now(); }
  function hoursSince(ts) {
    if (!ts) return Infinity;
    return (nowTs() - new Date(ts).getTime()) / 36e5;
  }
  function dayKey(ts = nowTs()) {
    const d = new Date(ts);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${dd}`;
  }
  function satietyLabel(p) {
    const h = hoursSince(p.lastFedAt);
    if (!isFinite(h)) return '一般';
    if (h < 6) return '飽足';
    if (h < 12) return '一般';
    if (h < 24) return '飢餓';
    return '超餓';
  }

  // ========== 更新面板內的 🪙/❤️ 顯示 ==========
  function updatePanelCounters() {
    const p = getPet();
    if (!p) return;
    if (petPanelCoinEl) petPanelCoinEl.textContent = Math.max(0, Math.floor(p.coins || 0));
    if (petPanelHeartsEl) petPanelHeartsEl.textContent = Math.max(0, Math.floor(p.hearts || 0));

    // 遛狗/玩耍按鈕狀態
    const dk = dayKey();
    if (btnWalk) {
      const used = (p.walkDayKey === dk) ? p.walkCount : 0;
      const canByCount = used < 2; // 每日 2 次
      const canByTime = hoursSince(p.lastWalkAt) >= 12; // 間隔 12 小時
      btnWalk.disabled = !(canByCount && canByTime);
    }
    if (btnPlay) {
      const used = (p.playDayKey === dk) ? p.playCount : 0;
      const canByCount = used < 5; // 每日 5 次
      const canByTime = hoursSince(p.lastPlayAt) >= 3; // 間隔 3 小時
      btnPlay.disabled = !(canByCount && canByTime);
    }
  }

  function addHearts(n) {
    const p = getPet();
    if (!p) return;
    p.hearts = Math.max(0, Math.floor((p.hearts || 0) + n));
    setPet(p);
    updatePanelCounters();
    renderCurrentPet(); // 同步更新主面板顯示
  }

  function addCoins(n) {
    const p = getPet();
    if (!p) return;
    p.coins = Math.max(0, Math.floor((p.coins || 0) + n));
    setPet(p);
    updatePanelCounters();
  }

  // ========== 商店邏輯 ==========
  function openShop() {
    const p = getPet();
    if (!p) return;
    if (shopCoinDisplay) shopCoinDisplay.textContent = Math.floor(p.coins || 0);
    if (shopHeartDisplay) shopHeartDisplay.textContent = Math.floor(p.hearts || 0);
    if (shopStatusDisplay) {
      const sat = satietyLabel(p);
      const water = Math.max(0, Math.min(100, Math.floor(p.water || 0)));
      shopStatusDisplay.textContent = `狀態：${sat}｜水 ${water}%`;
    }
    if (shopOverlay) shopOverlay.style.display = 'block';
  }
  function closeShop() {
    if (shopOverlay) shopOverlay.style.display = 'none';
  }
  function tryBuy(cost, onSuccess) {
    const p = getPet();
    if (!p) return;
    if ((p.coins || 0) < cost) {
      alert('寵物幣不足 > <');
      return;
    }
    p.coins -= cost;
    setPet(p);
    if (typeof onSuccess === 'function') onSuccess();
    updatePanelCounters();
    openShop(); // 重新刷新商店顯示
  }

  if (shopClose) shopClose.addEventListener('click', closeShop);
  if (shopBuyBig) shopBuyBig.addEventListener('click', () => {
    tryBuy(50, () => {
      addHearts(100);
      alert('大零食購買成功，愛心 +100！');
    });
  });
  if (shopBuySmall) shopBuySmall.addEventListener('click', () => {
    tryBuy(20, () => {
      addHearts(30);
      alert('小零食購買成功，愛心 +30！');
    });
  });
  if (shopBuyToy) shopBuyToy.addEventListener('click', () => {
    tryBuy(30, () => {
      alert('玩具購買成功，之後可以在小遊戲區玩～');
    });
  });

  // ========== 遛狗 / 玩耍 ==========
  function walkOnce() {
    const p = getPet();
    if (!p) return;
    const dk = dayKey();
    const used = (p.walkDayKey === dk) ? p.walkCount : 0;
    const canByCount = used < 2;
    const canByTime = hoursSince(p.lastWalkAt) >= 12;
    if (!canByCount) return alert('今天的遛狗次數已用完！');
    if (!canByTime) return alert('還沒到 12 小時喔～');
    p.walkDayKey = dk;
    p.walkCount = used + 1;
    p.lastWalkAt = new Date().toISOString();
    setPet(p);
    addHearts(5);
  }
  function playOnce() {
    const p = getPet();
    if (!p) return;
    const dk = dayKey();
    const used = (p.playDayKey === dk) ? p.playCount : 0;
    const canByCount = used < 5;
    const canByTime = hoursSince(p.lastPlayAt) >= 3;
    if (!canByCount) return alert('今天的玩耍次數已用完！');
    if (!canByTime) return alert('還沒到 3 小時喔～');
    p.playDayKey = dk;
    p.playCount = used + 1;
    p.lastPlayAt = new Date().toISOString();
    setPet(p);
    addHearts(2);
    // 小遊戲區 3D 模型轉一圈
    try {
      const mv = document.getElementById('pet-model-viewer');
      if (mv) {
        mv.setAttribute('auto-rotate', '');
        setTimeout(() => mv.removeAttribute('auto-rotate'), 2500);
      }
    } catch {}
  }

  if (btnShop) btnShop.addEventListener('click', openShop);
  if (btnWalk) btnWalk.addEventListener('click', () => { walkOnce(); updatePanelCounters(); });
  if (btnPlay) btnPlay.addEventListener('click', () => { playOnce(); updatePanelCounters(); });

  // ========== 綁定原本的面板事件（tab切換/餵食/喝水/重新命名/重置） ==========
  bindPetUIEvents();

  // ========== 判斷初始狀態（如果還沒命名就跳 onboarding，否則顯示寵物） ==========
  if (!anyPetHasName()) {
    showPetOnboarding(currentPetKey);
  } else {
    renderCurrentPet();
    renderPetFeedLog();
    updatePanelCounters(); // ★ 首次打開就刷新面板上的 🪙/❤️
  }
}



function closePetPanel() {
  if (petPanelMask) {
    petPanelMask.remove();
  }
  petPanelMask = null;
  petPanelCard = null;
  petAvatarEl = null;
  petNameEl = null;
  petBCSEl = null;
  petHeartsEl = null;
  petStatusLabelEl = null;
  btnFeedPet = null;
  btnWaterPet = null;
  btnRenamePet = null;
  btnResetPet = null;
  btnAdoptPet = null;  // 新增：一併清掉
  petWaterEl = null;
}


// ===== 我的動物：初次設定引導 =====

function showPetOnboarding(defaultSpecies) {
  if (!petPanelCard) return;
  if (document.getElementById('pet-onboard-mask')) return; // 已經開著就不要重複建

  const mask = document.createElement('div');
  mask.id = 'pet-onboard-mask';
  mask.className = 'pet-onboard-mask';

  const card = document.createElement('div');
  card.className = 'pet-onboard-card';

  card.innerHTML = `
    <div class="pet-onboard-title">第一次來牧場～</div>
    <div class="pet-onboard-text">
      先選一隻要一起準備國考的夥伴，幫牠取個名字，之後才能開始餵食唷。
    </div>

    <div class="pet-onboard-species">
      <button type="button" class="sp-btn" data-species="dog">狗狗</button>
      <button type="button" class="sp-btn" data-species="cat">貓貓</button>
      <button type="button" class="sp-btn" data-species="cow">小牛</button>
    </div>

    <div class="pet-onboard-field">
      <label class="pet-onboard-label" for="pet-onboard-name">名字</label>
      <input id="pet-onboard-name" class="pet-onboard-input" type="text" placeholder="例如：小肉鬆、小黑、阿牛">
    </div>

    <div class="pet-onboard-actions">
      <button type="button" class="pet-onboard-btn" id="pet-onboard-cancel">關閉牧場</button>
      <button type="button" class="pet-onboard-btn primary" id="pet-onboard-confirm">開始養牠</button>
    </div>
  `;

  mask.appendChild(card);
  petPanelCard.appendChild(mask);

  const spButtons = card.querySelectorAll('.sp-btn');
  const nameInput = card.querySelector('#pet-onboard-name');
  const btnCancel = card.querySelector('#pet-onboard-cancel');
  const btnConfirm = card.querySelector('#pet-onboard-confirm');

  let selected = defaultSpecies || 'dog';

  spButtons.forEach(btn => {
    const sp = btn.dataset.species;
    btn.classList.toggle('active', sp === selected);
    btn.addEventListener('click', () => {
      selected = sp;
      spButtons.forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  if (nameInput) {
    nameInput.value = '';
    nameInput.focus();
  }

  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      // 直接關掉整個牧場，保持「沒設定就沒得玩」的感覺
      closePetPanel();
    });
  }

  if (btnConfirm) {
    btnConfirm.addEventListener('click', () => {
      const raw = (nameInput && nameInput.value) || '';
      const trimmed = raw.trim();
      if (!trimmed) {
        alert('先幫牠取一個名字吧～');
        if (nameInput) nameInput.focus();
        return;
      }

      // 設定目前要養哪一隻
      if (!petState[selected]) {
        alert('找不到這個物種的資料，請重整頁面再試一次。');
        return;
      }

      currentPetKey = selected;
      const pet = petState[selected];

      pet.name = trimmed;
      pet.bcs = 5;
      pet.hearts = 5;
      pet.water = 100;
      pet.lastFedAt = Date.now();
      pet.bcsDropCount = 0;
      pet.alive = true;
      pet.status = 'normal';

      savePetsToStorage();

      // 移除引導卡片，更新畫面與 tab 狀態
      const m = document.getElementById('pet-onboard-mask');
      if (m) m.remove();

      bindPetUIEvents(); // 讓 tab active 對到 currentPetKey
      renderCurrentPet();
      
    });
  }
}

// ===== 我的動物：動畫 class mapping =====

function getPetAnimationClass(pet) {
  if (!pet || !pet.species) return '';
  const species = pet.species;
  const status = pet.status || 'normal';

  // 目前所有狀態都先對應到 idle，之後要細分再改這裡
  if (species === 'dog') return 'pet-dog-idle';
  if (species === 'cat') return 'pet-cat-idle';
  if (species === 'cow') return 'pet-cow-idle';
  return '';
}

function updatePetAnimation(petKey) {
  if (!petAvatarEl) return;
  const pet = petState[petKey];
  if (!pet) return;

  // 先把舊的物種 / 狀態 class 拿掉
  petAvatarEl.classList.remove(
    'pet-dog-idle', 'pet-cat-idle', 'pet-cow-idle'
    // 未來有 happy/hungry/sick/dead 再加進來
  );

  const cls = getPetAnimationClass(pet);
  if (cls) petAvatarEl.classList.add(cls);
}

// ===== 我的動物：BCS / 時間機制 =====

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

/**
 * 根據 lastFedAt 與 bcsDropCount，每 12 小時讓 BCS–1。
 * 規則：
 * - 若距離最後餵食 < 12 小時：不扣。
 * - 超過後，每滿 12 小時扣 1 點，最低 0。
 * - BCS=1 → status='sick'，彈出警告。
 * - BCS=0 → alive=false, status='dead'。
 */
const WATER_FULL_MS = 24 * 60 * 60 * 1000;
function updatePetWaterFromTime(petKey) {
  const pet = petState[petKey];
  if (!pet) return;
  if (!pet.alive) return;

  const now = Date.now();

  if (!pet.lastWaterAt) {
    pet.lastWaterAt = now;
    pet.water = 100;
    savePetsToStorage();
    return;
  }

  const elapsed = now - pet.lastWaterAt;
  if (elapsed <= 0) return;

  if (elapsed >= WATER_FULL_MS) {
    pet.water = 0;
    pet.alive = false;
    pet.status = 'dead';
    savePetsToStorage();
    return;
  }

  const remainMs = WATER_FULL_MS - elapsed;
  const percent = Math.round((remainMs / WATER_FULL_MS) * 100);
  pet.water = Math.max(0, Math.min(100, percent));

  savePetsToStorage();
}
function updatePetBCSFromTime(petKey) {
  const pet = petState[petKey];
  if (!pet) return;
  
  const now = Date.now();

  // 第一次進來：把現在當成起點
  if (!pet.lastFedAt) {
    pet.lastFedAt = now;
    pet.bcsDropCount = 0;
    savePetsToStorage();
    return;
  }

  if (!pet.alive) {
    return;
  }

  const elapsedSinceFed = now - pet.lastFedAt;
  if (elapsedSinceFed < TWELVE_HOURS_MS) {
    // 未滿 12 小時，不扣
    return;
  }

  const stepsSinceFed = Math.floor(elapsedSinceFed / TWELVE_HOURS_MS);
  const prevSteps = Number.isFinite(pet.bcsDropCount) ? pet.bcsDropCount : 0;
  const newSteps = stepsSinceFed - prevSteps;

  if (newSteps <= 0) return; // 之前已經扣完了

  pet.bcs = Math.max(0, pet.bcs - newSteps);
  pet.bcsDropCount = stepsSinceFed;

  if (pet.bcs <= 0) {
    pet.bcs = 0;
    pet.alive = false;
    pet.status = 'dead';
  } else if (pet.bcs === 1) {
    pet.status = 'sick';
    // 只在剛掉到 1 的那一次提醒
    alert('BCS 只剩 1：我要生一場 10 萬塊的大病…');
  } else if (pet.status === 'sick' && pet.bcs >= 2) {
    pet.status = 'normal';
  }

  savePetsToStorage();
}

// ===== 我的動物：畫面渲染 =====

function renderCurrentPet() {
  // 沒打開面板就不用畫（狀態一樣會在背景更新）
  if (!petPanelCard) return;

  // 每次渲染前先更新時間造成的 BCS 變化
  updatePetBCSFromTime(currentPetKey);
  updatePetWaterFromTime(currentPetKey);
  const pet = petState[currentPetKey];
  if (!pet || !petAvatarEl) return;

  // 名字
  if (petNameEl) {
    petNameEl.textContent = pet.name && pet.name.trim()
      ? pet.name.trim()
      : '還沒取名';
  }

  // BCS
  if (petBCSEl) {
    petBCSEl.textContent = Number.isFinite(pet.bcs) ? String(pet.bcs) : '-';
  }


  // 狀態文字
  if (petStatusLabelEl) {
    let label = '正常';
    if (!pet.alive) {
      label = '死亡';
    } else {
      switch (pet.status) {
        case 'happy': label = '開心'; break;
        case 'hungry': label = '肚子餓'; break;
        case 'sick': label = '生病'; break;
        default: label = '正常';
      }
    }
    petStatusLabelEl.textContent = label;
  }

  // Avatar 動畫
  updatePetAnimation(currentPetKey);

  // 按鈕啟用 / 停用與「重新養一隻」顯示
  const isDead = !pet.alive;
  if (btnFeedPet) btnFeedPet.disabled = isDead;
  if (btnWaterPet) btnWaterPet.disabled = isDead;
  if (btnRenamePet) btnRenamePet.disabled = isDead;
  if (btnResetPet) {
    btnResetPet.style.display = isDead ? 'inline-flex' : 'none';
  }
}


// ===== 我的動物：事件綁定 =====

// ===== 我的動物：事件綁定（改為面板版） =====

function bindPetUIEvents() {
  if (!petPanelCard) return;

  // 寵物 tab 切換（狗 / 貓 / 牛）
  const tabs = petPanelCard.querySelectorAll('.pet-tab');
  tabs.forEach(btn => {
    const key = btn.dataset.pet;
    btn.classList.toggle('active', key === currentPetKey);

    btn.onclick = () => {
      if (!key || !petState[key]) return;
      currentPetKey = key;

      tabs.forEach(b => {
        b.classList.toggle('active', b === btn);
      });

      renderCurrentPet();
      savePetsToStorage();
    };
  });

  // 餵食、小考、改名、復活與給人領養
  if (btnFeedPet) btnFeedPet.onclick = onFeedPetClick;
  if (btnWaterPet) btnWaterPet.onclick = onWaterPetClick;
  if (btnRenamePet) btnRenamePet.onclick = onRenamePetClick;
  if (btnResetPet) btnResetPet.onclick = onResetPetClick;
  if (btnAdoptPet) btnAdoptPet.onclick = onAdoptPetClick;
}


// ===== 我的動物：餵食／加水／改名／重養 =====
// ===== 我的動物：餵食／加水／改名／重養 =====
// ===== 我的動物：餵食／加水／改名／重養 =====

// 牧場餵食小測驗的本地狀態（不要動到主考試的 state.user）
const petQuizState = {
  active: false,
  petKey: null,
  questions: [],   // 這一輪的題目 [{id,text,options,image,answerSet,scope}, ...]
  user: {},        // { qid: 'A' | 'B' | ... }
  index: 0,
  reviewMode: false,
  submitCount: 0   // 本次餵食測驗已經「實際交卷」幾次
};

// 幫餵食小測驗塞一次 CSS（只會注入一次）
function ensurePetQuizStyle() {
  if (document.getElementById('pet-quiz-style')) return;
  const style = document.createElement('style');
  style.id = 'pet-quiz-style';
  style.textContent = `
  .pet-quiz-mask {
    position: fixed;
    inset: 0;
    z-index: 100010;
    background: rgba(0,0,0,.55);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .pet-quiz-card {
    width: min(720px, 100%);
    max-height: 90vh;
    background: var(--card, #1b1b1b);
    color: var(--fg, #fff);
    border-radius: 14px;
    border: 1px solid var(--border, #333);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .pet-quiz-head {
    padding: 12px 14px;
    border-bottom: 1px solid var(--border, #333);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .pet-quiz-title {
    font-size: 16px;
    font-weight: 700;
  }
  .pet-quiz-sub {
    font-size: 13px;
    color: var(--muted, #aaa);
  }
  .pet-quiz-body {
    padding: 12px 14px 14px;
    overflow: auto;
    flex: 1;
  }
  .pet-quiz-qnum {
    font-size: 14px;
    margin-bottom: 6px;
  }
  .pet-quiz-qtext {
    font-size: 15px;
    line-height: 1.6;
    margin-bottom: 8px;
  }
  .pet-quiz-qimg {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    border: 1px solid var(--border, #333);
    margin-bottom: 8px;
  }
  .pet-quiz-opts {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 8px;
  }
  .pet-quiz-opt-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }
  .pet-quiz-opt-row span {
    flex: 1;
  }
  .pet-quiz-opt-note {
    margin-left: 6px;
    font-size: 12px;
  }
  .pet-quiz-foot {
    padding: 10px 14px 12px;
    border-top: 1px solid var(--border, #333);
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  .pet-quiz-btn {
    padding: 8px 12px;
    border-radius: 9999px;
    border: 1px solid var(--border, #333);
    background: transparent;
    color: var(--fg, #fff);
    font-size: 14px;
    cursor: pointer;
  }
  .pet-quiz-btn-primary {
    background: var(--accent, #2f74ff);
    border-color: var(--accent, #2f74ff);
    color: #fff;
  }
  .pet-quiz-btn-danger {
    border-color: #aa3333;
    color: #ffaaaa;
  }
  .pet-quiz-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
  `;
  document.head.appendChild(style);
}

// 取得所有年份（目前這個科目下拉選單裡出現的年分）
function getAllYearValuesForCurrentSubject() {
  if (!yearSel) return [];
  return Array.from(yearSel.options)
    .map(o => String(o.value || '').trim())
    .filter(v => v);
}

// 建立「跨卷池」的 5 題題目：同科目，但跨所有年份 × 梯次
// 建立「跨科目＋跨年度＋跨梯次」的寵物小考題目
async function buildCrossVolumeQuizQuestions(maxCount) {
  const result = [];

  // 三個下拉元件都必須存在
  if (!subjectSel || !yearSel || !roundSel) return result;

  // 1. 收集所有科目（用 option 的 value，跟你平常切換卷別時一樣）
  const subjects = Array.from(subjectSel.options)
    .map(o => String(o.value || '').trim())
    .filter(Boolean);

  // 2. 收集所有年份
  const years = Array.from(yearSel.options)
    .map(o => String(o.value || '').trim())
    .filter(Boolean);

  // 3. 收集所有梯次（直接用下拉的 value 或文字）
  const rounds = Array.from(roundSel.options)
    .map(o => String(o.value || o.textContent || '').trim())
    .filter(Boolean);

  // 4. 組出所有 (subj, year, round) 的組合
  const scopes = [];
  subjects.forEach(subj => {
    years.forEach(year => {
      rounds.forEach(roundLabel => {
        scopes.push({ subj, year, roundLabel });
      });
    });
  });

  if (!scopes.length) return result;

  // 5. 洗牌，讓出題順序隨機
  for (let i = scopes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [scopes[i], scopes[j]] = [scopes[j], scopes[i]];
  }

  // 6. 記住原本畫面上選的卷別，等一下抽完題要切回來
  const originalScope = {
    subj: subjectSel.value,
    year: yearSel.value,
    round: roundSel.value,
  };

  // 7. 依序走訪每個 scope，切換卷別後從該卷抽一題進來
  for (const s of scopes) {
    if (result.length >= maxCount) break;

    // 切換 UI 下拉
    subjectSel.value = s.subj;
    yearSel.value = s.year;
    roundSel.value = s.roundLabel;

    // 觸發既有的 onScopeChange，實際載入那一卷的題目與答案
    if (typeof onScopeChange === 'function') {
      try {
        await onScopeChange();
      } catch (e) {
        console.error('onScopeChange error in cross-subject quiz', e);
        continue;
      }
    }

    // 從這一卷裡挑一題「有標好答案」的題目
    const pool = state.questions.filter(q => state.answers[String(q.id)]);
    if (!pool.length) continue;

    const picked = pool[Math.floor(Math.random() * pool.length)];
    if (!picked) continue;

    const qid = String(picked.id);
    const caRaw = String(state.answers[qid]).toUpperCase();
    const answerSet = Array.from(
      new Set(
        caRaw
          .split(/[\/,]/)           // ← 這行是關鍵          .map(x => x.trim())
          .filter(Boolean)
      )
    );
    if (!answerSet.length) continue;

    // 存下這題，連同科目／年份／梯次，一起存進 scope
    result.push({
      id: picked.id,
      text: picked.text,
      options: picked.options,
      image: picked.image,
      answerSet,
      scope: {
        subj: s.subj,
        year: s.year,
        roundLabel: s.roundLabel,
      },
    });
  }

  // 8. 抽完題之後，把畫面上的卷別切回原本選的那一卷
  try {
    subjectSel.value = originalScope.subj;
    yearSel.value = originalScope.year;
    roundSel.value = originalScope.round;

    if (typeof onScopeChange === 'function') {
      await onScopeChange();
    }
  } catch (e) {
    console.error('restore scope error after cross-subject quiz', e);
  }

  return result;
}


function openPetQuizOverlay(petKey) {
  ensurePetQuizStyle();

  const old = document.getElementById('pet-quiz-mask');
  if (old) old.remove();

  const mask = document.createElement('div');
  mask.id = 'pet-quiz-mask';
  mask.className = 'pet-quiz-mask';

  const card = document.createElement('div');
  card.className = 'pet-quiz-card';

  card.innerHTML = `
    <div class="pet-quiz-head">
      <div class="pet-quiz-title">餵食</div>
      <div class="pet-quiz-sub">
        隨機抽五題，全對才能餵食！<br>
        目前動物：<span id="pet-quiz-pet-label"></span>
      </div>
    </div>
    <div class="pet-quiz-body">
      <div class="pet-quiz-qnum" id="pet-quiz-qnum"></div>
      <div class="pet-quiz-qtext" id="pet-quiz-qtext"></div>
      <img class="pet-quiz-qimg" id="pet-quiz-qimg" style="display:none;" />
      <div class="pet-quiz-opts" id="pet-quiz-opts"></div>
    </div>
    <div class="pet-quiz-foot">
      <button class="pet-quiz-btn" id="pet-quiz-prev">上一題</button>
      <button class="pet-quiz-btn" id="pet-quiz-next">下一題</button>
      <button class="pet-quiz-btn" id="pet-quiz-reset">重新作答</button>
      <button class="pet-quiz-btn pet-quiz-btn-danger" id="pet-quiz-cancel">放棄餵食</button>
      <button class="pet-quiz-btn pet-quiz-btn-primary" id="pet-quiz-submit">交卷</button>
    </div>
  `;

  mask.appendChild(card);
  document.body.appendChild(mask);

  const btnPrev = document.getElementById('pet-quiz-prev');
  const btnNext = document.getElementById('pet-quiz-next');
  const btnSubmit = document.getElementById('pet-quiz-submit');
  const btnCancel = document.getElementById('pet-quiz-cancel');
  const btnReset = document.getElementById('pet-quiz-reset'); 

  if (btnPrev) btnPrev.onclick = () => stepPetQuiz(-1);
  if (btnNext) btnNext.onclick = () => stepPetQuiz(1);
  if (btnSubmit) btnSubmit.onclick = () => submitPetQuiz();
  if (btnCancel) btnCancel.onclick = () => closePetQuizOverlay(false);
  if (btnReset) btnReset.onclick = () => resetPetQuizAnswers(); 
  
  const labelEl = document.getElementById('pet-quiz-pet-label');
  if (labelEl) {
    const pet = petState[petKey];
    const name = pet?.name && pet.name.trim() ? pet.name.trim() : '';
    let speciesLabel = '動物';
    if (pet?.species === 'dog') speciesLabel = '狗狗';
    else if (pet?.species === 'cat') speciesLabel = '貓貓';
    else if (pet?.species === 'cow') speciesLabel = '小牛';
    labelEl.textContent = name ? `${speciesLabel}（${name}）` : speciesLabel;
  }

  renderPetQuizQuestion();
}

function resetPetQuizAnswers() {
  if (!petQuizState.active) return;
  const ok = window.confirm('要清除這一輪的作答紀錄，重新作答嗎？');
  if (!ok) return;
  petQuizState.user = {};
  petQuizState.reviewMode = false;
  petQuizState.index = 0;
  renderPetQuizQuestion();
}



function closePetQuizOverlay(success) {
  const mask = document.getElementById('pet-quiz-mask');
  if (mask) mask.remove();
  petQuizState.active = false;
  petQuizState.petKey = null;
  petQuizState.questions = [];
  petQuizState.user = {};
  petQuizState.index = 0;
  petQuizState.reviewMode = false;
}

// 顯示目前 index 的那一題
function renderPetQuizQuestion() {
  if (!petQuizState.active || !petQuizState.questions.length) return;

  const q = petQuizState.questions[petQuizState.index];
  if (!q) return;

  const qnumEl = document.getElementById('pet-quiz-qnum');
  const qtextEl = document.getElementById('pet-quiz-qtext');
  const qimgEl = document.getElementById('pet-quiz-qimg');
  const qoptsEl = document.getElementById('pet-quiz-opts');

  if (qnumEl) {
    const meta = q.scope || {};
    const yr = meta.year || '?';
    const rd = meta.roundLabel || '?';
    qnumEl.textContent =
      `第 ${petQuizState.index + 1} / ${petQuizState.questions.length} 題 ` ;
  }
  if (qtextEl) {
    qtextEl.textContent = String(q.text || '');
  }

  if (qimgEl) {
    if (q.image) {
      const raw = resolveImage(q.image);
      const bust = (raw.includes('?') ? '&' : '?') + 'v=' + Date.now();
      qimgEl.src = raw + bust;
      qimgEl.style.display = '';
    } else {
      qimgEl.removeAttribute('src');
      qimgEl.style.display = 'none';
    }
  }

  if (qoptsEl) {
    qoptsEl.innerHTML = '';
    const ua = (petQuizState.user[String(q.id)] || '').toUpperCase();
    const correctSet = new Set(q.answerSet || []);

    const letters = ['A', 'B', 'C', 'D'];
    letters.forEach(L => {
      const row = document.createElement('div');
      row.className = 'pet-quiz-opt-row';

      const rb = document.createElement('input');
      rb.type = 'radio';
      rb.name = 'pet-quiz-opt';
      rb.checked = (ua === L);
      rb.onchange = () => {
        petQuizState.user[String(q.id)] = L;
      };
      row.appendChild(rb);

      const span = document.createElement('span');
      span.textContent = `${L}. ${q.options?.[L] ?? ''}`;
      row.appendChild(span);

      if (petQuizState.reviewMode) {
        const note = document.createElement('span');
        note.className = 'pet-quiz-opt-note';
        let text = '';
        let color = '';

        if (ua === L) {
          text += '你選';
          color = '#6aa0ff';
        }
        if (correctSet.has(L)) {
          text += (text ? ' / ' : '') + '正解';
          color = '#c40000';
        }
        if (text) {
          note.textContent = text;
          note.style.color = color;
          row.appendChild(note);
        }
      }

      qoptsEl.appendChild(row);
    });
  }

  const btnPrev = document.getElementById('pet-quiz-prev');
  const btnNext = document.getElementById('pet-quiz-next');
  if (btnPrev) btnPrev.disabled = (petQuizState.index === 0);
  if (btnNext) btnNext.disabled = (petQuizState.index >= petQuizState.questions.length - 1);
}

function stepPetQuiz(delta) {
  if (!petQuizState.active || !petQuizState.questions.length) return;
  const next = petQuizState.index + delta;
  if (next < 0 || next >= petQuizState.questions.length) return;
  petQuizState.index = next;
  renderPetQuizQuestion();
}

function submitPetQuiz() {
  if (!petQuizState.active || !petQuizState.questions.length) return;

  const wrong = [];
  const unanswered = [];

  petQuizState.questions.forEach(q => {
    const qid = String(q.id);
    const ua = String(petQuizState.user[qid] || "").trim().toUpperCase();

    // 先整理正確答案集合：
    // 1. 若 q.answerSet 已經有值，就優先使用（例如之前預先算好的陣列）
    // 2. 否則就從 state.answers[qid] 重新 parse，一次支援 C/D、C,D 寫法
    let correctLetters = [];

    if (Array.isArray(q.answerSet) && q.answerSet.length) {
      correctLetters = q.answerSet.map(x =>
        String(x).trim().toUpperCase()
      );
    } else {
      const raw = String(state.answers[qid] || "").toUpperCase();
      correctLetters = raw
        .split(/[\/,]/)           // 同時用 / 和 , 當分隔符
        .map(x => x.trim())
        .filter(Boolean);
    }

    const correctSet = new Set(correctLetters);

    if (!ua) {
      // 完全沒作答
      unanswered.push(q);
    } else if (!correctSet.has(ua) && !correctSet.has("ALL")) {
      // 有作答，但不在正確答案集合裡，且也不是「ALL 題皆給分」的特例
      wrong.push({
        q,
        ua,
        ca: Array.from(correctSet).join("/") || "?"
      });
    }
  });

  if (unanswered.length) {
    const ok = window.confirm(
      `還有 ${unanswered.length} 題沒作答，確定要交卷嗎？`
    );
    if (!ok) return;
  }

  // 到這裡表示這一次「真的」交卷了
  petQuizState.submitCount = (petQuizState.submitCount || 0) + 1;

  // 全部答對 → 餵食成功
  if (!wrong.length && !unanswered.length) {
    const key = petQuizState.petKey;
    const now = new Date();

    const scopes = petQuizState.questions.map(q => q.scope || {});
    appendPetFeedRecord({
      ts: now.toLocaleString(),
      petKey: key,
      petName: petState[key]?.name || "",
      questionCount: petQuizState.questions.length,
      fromScopes: scopes,
      questions: petQuizState.questions.map(q => ({
        id: q.id,
        subj: q.scope?.subj,
        year: q.scope?.year,
        roundLabel: q.scope?.roundLabel
      }))
    });
    renderPetFeedLog();

    // ★ 依照 submitCount 發寵物幣：第 1 輪 10 個、第 2 輪 5 個、第 3 輪以後 0 個
    const n = petQuizState.submitCount;
    let reward = 0;
    if (n === 1) reward = 10;
    else if (n === 2) reward = 5;
    else reward = 0;

    if (reward > 0 && typeof addCoins === "function") {
      addCoins(reward);
      alert(`餵食成功！本輪全部答對，獎勵 🪙${reward} 寵物幣！`);
    } else {
      alert("餵食成功！");
    }

    closePetQuizOverlay(true);
    if (key) onPetFedSuccess(key);
    return;
  }

  // 還有錯題 → 進入檢討模式
  petQuizState.reviewMode = true;
  renderPetQuizQuestion();
  alert("有幾題錯了，先改完再送出一次喔。");
}





// ★ 之後「真正的 5 題跨卷測驗」入口（現在已經是跨卷版）
async function startPetQuiz(petKey) {
  const pet = petState[petKey];
  if (!pet) return;
  // 沒有名字就不准餵，強制拉回牧場做初次設定
  if (!isPetNamed(petKey)) {
    alert('先幫這隻動物取個名字，再來餵食喔！');

    // 沒開牧場就打開
    if (!petPanelCard) {
      openPetPanel();
    }
    // 開啟引導卡片，預設選目前這一隻
    showPetOnboarding(petKey);
    return;
  }

  // 確認這隻還活著
  updatePetBCSFromTime(petKey);
  if (!pet.alive) {
    alert('這隻動物已經死亡，請先按「重新養一隻」。');
    renderCurrentPet();
    return;
  }

  // 至少要載過一卷，確保 onScopeChange 可運作 [attached_file:3]
  if (!yearSel || !roundSel || !subjectSel) {
    alert('目前頁面還沒準備好題庫選單，請先載入任意一卷題目。');
    return;
  }

  const qs = await buildCrossVolumeQuizQuestions(5);
  if (!qs.length) {
    alert('目前找不到可用來出題的題目（可能是答案檔沒載入成功，或題庫是空的）。');
    return;
  }

  petQuizState.active = true;
  petQuizState.petKey = petKey;
  petQuizState.questions = qs;
  petQuizState.user = {};
  petQuizState.index = 0;
  petQuizState.reviewMode = false;
  petQuizState.submitCount = 0;
  openPetQuizOverlay(petKey);
}
// 判斷餵食小考某一題是否作對：答案集裡只要有選到一個就算對
function isPetQuizAnswerCorrect(q, userChoice) {
  if (!userChoice) return false;
  const uc = String(userChoice).trim().toUpperCase();

  let set = null;

  // 優先用出題時算好的 answerSet
  if (Array.isArray(q.answerSet) && q.answerSet.length) {
    set = q.answerSet.map(x => String(x).trim().toUpperCase());
  } else {
    // 保險：萬一沒有 answerSet，就從 state.answers 重新解析一次
    const raw = String(state.answers[String(q.id)] || '').toUpperCase();
    set = raw
      .split(/[\/,]/)
      .map(x => x.trim())
      .filter(Boolean);
  }

  return set.includes(uc);
}

// 餵食成功後要做的事情（之前版本的邏輯保留）
function onPetFedSuccess(petKey) {
  const pet = petState[petKey];
  if (!pet) return;
  if (!pet.alive) return;

  updatePetBCSFromTime(petKey);
  if (!pet.alive) {
    renderCurrentPet();
    return;
  }

  const BCS_MAX = 9;
  const HEARTS_MAX = 10;

  pet.bcs = Math.min(BCS_MAX, (Number(pet.bcs) || 0) + 1);
  pet.hearts = Math.min(HEARTS_MAX, (Number(pet.hearts) || 0) + 1);
  pet.lastFedAt = Date.now();
  pet.bcsDropCount = 0;
  pet.status = 'happy';

  savePetsToStorage();
  renderCurrentPet();

  setTimeout(() => {
    const p2 = petState[petKey];
    if (!p2 || !p2.alive) return;
    if (p2.status === 'happy') {
      p2.status = 'normal';
      savePetsToStorage();
      renderCurrentPet();
    }
  }, 3000);
}

// 餵食按鈕：現在改成真正進入「跨卷池」小測驗
function onFeedPetClick() {
  const key = currentPetKey;
  const pet = petState[key];
  if (!pet) return;

  startPetQuiz(key);
}

// 加水：直接把 water 補滿 100，死亡時則禁止
function onWaterPetClick() {
  const key = currentPetKey;
  const pet = petState[key];
  if (!pet) return;

  updatePetBCSFromTime(key);
  if (!petState[key].alive) {
    alert('這隻動物已經死亡，無法再加水，請先重新養一隻。');
    renderCurrentPet();
    return;
  }

  pet.lastWaterAt = Date.now(); // 🆕
  savePetsToStorage();
  renderCurrentPet();
}

// 改名字：死亡時就不讓改，只能重養
function onRenamePetClick() {
  const key = currentPetKey;
  const pet = petState[key];
  if (!pet) return;

  updatePetBCSFromTime(key);
  if (!petState[key].alive) {
    alert('這隻動物已經死亡，如果要繼續玩，請先按「重新養一隻」。');
    renderCurrentPet();
    return;
  }

  const name = window.prompt('幫這隻動物取個名字吧：', pet.name || '');
  if (name == null) return;
  const trimmed = name.trim();
  pet.name = trimmed;
  savePetsToStorage();
  renderCurrentPet();
}

// 重新養一隻：把這一隻的狀態重置（名字保留）
function onResetPetClick() {
  const key = currentPetKey;
  const pet = petState[key];
  if (!pet) return;

  const ok = window.confirm('確定要重新養一隻嗎？\\n這會重置 BCS、愛心與水量。');
  if (!ok) return;

  pet.bcs = 5;
  pet.hearts = 5;
  pet.water = 100;
  pet.lastWaterAt = Date.now(); // 🆕
  pet.lastFedAt = Date.now();
  pet.bcsDropCount = 0;
  pet.alive = true;
  pet.status = 'normal';
  // 想要連名字一起重置的話，把下一行打開
  // pet.name = '';

  savePetsToStorage();
  renderCurrentPet();
}
function onAdoptPetClick() {
  const key = currentPetKey;
  const pet = petState[key];
  if (!pet) return;

  const ok = window.confirm(
    '確定要把這隻動物給人領養嗎？\n這個物種的名字、狀態與餵食紀錄都會被清除喔！'
  );
  if (!ok) return;

  // 1. 把這隻寵物重設成初始狀態（但保留 species）
  pet.name = '';
  pet.bcs = 5;
  pet.hearts = 5;
  pet.water = 100;
  pet.lastFedAt = null;
  pet.lastWaterAt = null;
  pet.bcsDropCount = 0;
  pet.alive = true;
  pet.status = 'normal';

  // 2. 清除這隻寵物的餵食紀錄
  petFeedRecords = petFeedRecords.filter(r => r.petKey !== key);
  savePetFeedRecords();

  // 3. 存回 localStorage 並更新畫面
  savePetsToStorage();
  renderCurrentPet();
  renderPetFeedLog();
}



// ==== 留言區 DOM ==== //
const commentsSection  = document.getElementById('comments-section');
const commentsList     = document.getElementById('comments-list');
const commentsCountEl  = document.getElementById('comments-count');
const commentForm      = document.getElementById('comment-form');
const commentNameInput = document.getElementById('comment-nickname');
const commentTextInput = document.getElementById('comment-text');


// 優先取 selected option 的 text，若無則 fallback 回 value
function getSubjectLabel(){
  try{
    if (!subjectSel) return "unknown";
    const idx = subjectSel.selectedIndex;
    if (idx != null && idx >= 0 && subjectSel.options && subjectSel.options[idx]) {
      const t = String(subjectSel.options[idx].text || subjectSel.options[idx].label || subjectSel.options[idx].value || subjectSel.value).trim();
      return t || String(subjectSel.value || "unknown");
    }
    return String(subjectSel.value || "unknown");
  }catch(e){
    return String(subjectSel?.value || "unknown");
  }
}

function sanitizeSubjectName(name){
  if(!name) return "unknown";
  // 1) trim 空白、空白轉底線
  // 2) 允許 Unicode 文字與數字（\p{L}\p{N}），以及底線與破折號
  //    需使用 u 修飾符，並用 g 全域取代
  try{
    const s = String(name).trim().replace(/\s+/g, "_");
    const cleaned = s.replace(/[^\p{L}\p{N}_\-]/gu, "");
    const out = cleaned.substring(0, 60);
    return out || "unknown";
  }catch(e){
    // 若瀏覽器不支援 \p{L}（舊環境），回退到更寬鬆的保留中文方式：
    const fallback = String(name).trim().replace(/\s+/g, "_").replace(/[^\w\-一-龥\u3400-\u4DBF]/g, "");
    return (fallback.substring(0,60) || "unknown");
  }
}

// 取得穩定且唯一的科目代碼（優先用 <option data-sid> 或 value）
function getSubjectId(){
  try{
    const idx = subjectSel?.selectedIndex ?? -1;
    const opt = (idx >= 0) ? subjectSel.options[idx] : null;
    // 建議在 HTML <option> 放 data-sid="a/b/c..." 或正式代碼
    const sid = (opt?.dataset?.sid || opt?.value || "").trim();
    if (sid) return sanitizeSubjectName(sid.toLowerCase());
  }catch{}

  // 回退 1：用顯示文字走對照表（a/b/c...）
  try{
    const label = getSubjectLabel();
    const code = subjectPrefix(label); // a/b/c...
    if (code && code !== "x") return code;
  }catch{}

  // 回退 2：清洗顯示文字當代碼
  try{
    const fallback = sanitizeSubjectName(getSubjectLabel());
    if (fallback) return fallback;
  }catch{}

  return "unknown";
}

// 規格化梯次代碼，避免「第一次」「第1次」等異名造成不同鍵
function getRoundCode(){
  const v = String(roundSel?.value || "").trim();
  if (/^第?\s*一\s*次$/.test(v) || /^(第一次|第1次|1)$/.test(v)) return "1";
  if (/^第?\s*二\s*次$/.test(v) || /^(第二次|第2次|2)$/.test(v)) return "2";
  // 其他字樣保底為 "0"
  return "0";
}
function getScopeFromUI(){
  return {
    subj: getSubjectId(),                 // 唯一科目代碼（先前已實作）
    year: String(yearSel?.value || "0"),  // 年次
    round: getRoundCode()                 // 梯次代碼 1/2/0
  };
}
// 筆記鍵名：綁定 科目＋年次＋梯次＋題號，避免跨卷/跨科碰撞
function keyForNote(qid, scope){
  const sc = scope || getScopeFromUI();
  return `note|${sc.subj}|${sc.year}|r${sc.round}|q${qid}`;
}

// 產生目前這一題對應到留言用的 key
function getCurrentCommentKey() {
  // 群組模式：優先用群組 entry，完全不理會卷內 index
  if (state.currentGroupId && state.visibleQuestions[state.index]?.groupEntry) {
    const entry = state.visibleQuestions[state.index].groupEntry;
    return `${entry.subj}_${entry.year}_${entry.round}_${entry.qid}`;
  }

  const q = state.questions[state.index];
  if (!q) return null;
  const scope = getScopeFromUI(); 
  // 用科目 + 年度 + 梯次 + 題號 當成同一題的 key
  return `${scope.subj}_${scope.year}_${scope.round}_${q.id}`;
}


function saveNotes(scope){
  const q = state.questions[state.index];
  if(!q) return;

  const k = keyForNote(q.id, scope);
  state._notes = state._notes || {};
  state._notes[k] = editor.innerHTML;

  state._notesMeta = state._notesMeta || {};
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

function defaultNoteHTML(q){
  // 不再自動灌入題目詳解，筆記一律只留空白給使用者
  return `<div class="user-note"></div>`;
}

// 很輕量就好，追蹤詳解是否變更
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

  if(state._notes[k] == null){
    // 第一次看到這題 → 用詳解做為預設筆記內容（可編輯）
    state._notes[k] = defaultNoteHTML(q);
    state._notesMeta[k] = { seedHash: curHash, userTouched: false };
    localStorage.setItem(STORAGE.notes, JSON.stringify(state._notes));
    localStorage.setItem(STORAGE.notesMeta, JSON.stringify(state._notesMeta));
    return;
  }

  // 同步到最新版詳解
  if(meta.seedHash !== curHash && meta.userTouched !== true){
    state._notes[k] = defaultNoteHTML(q);
    meta.seedHash = curHash;
    state._notesMeta[k] = meta;
    localStorage.setItem(STORAGE.notes, JSON.stringify(state._notes));
    localStorage.setItem(STORAGE.notesMeta, JSON.stringify(state._notesMeta));
  }
}


function loadNoteForCurrent() {
  let q = null;

  if (state.currentGroupId && state.visibleQuestions[state.index]?.groupEntry) {
    // 群組模式：用 entry.qid 去目前這卷找題目
    const entry = state.visibleQuestions[state.index].groupEntry;
    q = state.questions.find(qq => String(qq.id) === String(entry.qid));
  } else {
    // 一般模式：沿用原本邏輯
    q = state.questions[state.index];
  }

  if (!q) {
    editor.innerHTML = "";
    return;
  }

  ensureNoteSeeded(q);
  const k = keyForNote(q.id);  // 會用目前下拉選單的科目/年/梯次做命名空間
  editor.innerHTML = state._notes?.[k] || "";
}


// 題號列表
function renderList(list, options = {}) {
  const renumber = !!options.renumber;

  // 有給 list 就用 list，否則用整卷題目
  state.visibleQuestions = list || state.questions;

  qList.innerHTML = '';

  state.visibleQuestions.forEach((q, idxInVisible) => {
    const div = document.createElement('div');
    div.className = 'q-item' + (idxInVisible === state.index ? ' active' : '');
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'space-between';
    div.style.gap = '8px';

    const label = document.createElement('span');
    const displayNum = renumber ? (idxInVisible + 1) : q.id;
    label.textContent = `第 ${displayNum} 題`;
    label.style.flex = '1';
    label.onclick = () => {
      saveNotes();
      state.index = idxInVisible;
      renderQuestion();
      highlightList();
    };
    div.appendChild(label);

    const currentGroupId = state.currentGroupId;

    const btn = document.createElement('button');
    btn.style.minWidth = '32px';
    btn.style.height = '28px';
    btn.style.borderRadius = '9999px';
    btn.style.border = '1px solid var(--border)';
    btn.style.background = 'var(--pill)';
    btn.style.color = 'var(--fg)';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '16px';

    if (!currentGroupId) {
      // 全部題目模式：顯示「+」→ 開對話框選群組
      btn.textContent = '+';
      btn.title = '加入群組';
      btn.onclick = (e) => {
        e.stopPropagation();
        openAddToGroupDialog(q.id); // 這時 q 是本卷的一題
      };
    } else {
      // 群組模式：用 groupEntry 決定從哪個卷、哪一題移除
      const entry = q.groupEntry; // { subj, year, round, qid }
      if (!entry) {
        // 理論上不會進來，保險起見
        btn.textContent = '-';
        btn.disabled = true;
      } else {
        btn.textContent = '-';
        btn.title = '從此群組移除';
        btn.onclick = (e) => {
          e.stopPropagation();
          const group = state.groups.find(g => g.id === currentGroupId);
          if (!group) return;
          const ok = confirm(
            `確定要將「第 ${displayNum} 題」從群組「${group.name}」移除嗎？`
          );
          if (!ok) return;
          removeQuestionFromGroupByEntry(entry, currentGroupId);
          filterQuestionsByGroup(currentGroupId); // 刪完重畫群組清單
        };
      }
    }

    div.appendChild(btn);
    qList.appendChild(div);
  });
}

// 即時搜尋題目：依關鍵字過濾題目並重畫列表
function applyQuestionSearch(keyword) {
  const kw = (keyword || "").trim().toLowerCase();

  // 沒打字：顯示目前卷內全部題目
  if (!kw) {
    state.currentGroupId = null;   // 離開群組模式
    state.index = 0;
    renderList(state.questions, { renumber: false });
    renderQuestion();
    highlightList();
    return;
  }

  // 有關鍵字：從題幹、選項、詳解裡面找
  state.currentGroupId = null;     // 搜尋時一律不用群組模式

  const filtered = state.questions.filter(q => {
    const texts = [];

    if (q.text) texts.push(q.text);
    if (q.options) {
      for (const key in q.options) {
        if (q.options[key]) texts.push(q.options[key]);
      }
    }
    if (q.explanation) {
      texts.push(q.explanation);
    }

    return texts.some(t =>
      String(t).toLowerCase().includes(kw)
    );
  });

  state.index = 0;
  renderList(filtered, { renumber: false });
  renderQuestion();
  highlightList();
}


// 從 Firestore 載入目前題目的留言
async function loadCommentsForCurrentQuestion() {
  if (!window.db || !commentsList) return;

  const key = getCurrentCommentKey();
  if (!key) {
    commentsList.innerHTML = '';
    if (commentsCountEl) commentsCountEl.textContent = '';
    return;
  }

  commentsList.textContent = '載入中…';

  try {
    const snap = await window.db.collection('comments')
      .where('key', '==', key)
      .orderBy('pinned', 'desc')        // 先看 pinned，true 會排最上面
      .orderBy('createdAt', 'desc')     // 同一群再依時間新到舊
      .limit(50)
      .get();

    commentsList.innerHTML = '';
    if (commentsCountEl) {
      commentsCountEl.textContent = `共 ${snap.size} 則留言`;
    }

    if (!snap.size) {
      commentsList.textContent = '目前還沒有留言，成為第一個留言的人吧！';
      return;
    }
    snap.forEach(doc => {
      const c = doc.data();
      const row = document.createElement('div');
      row.style.marginBottom = '6px';
      row.style.fontSize = '14px';
    
      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.gap = '8px';
    
      const nameSpan = document.createElement('span');
      nameSpan.style.fontWeight = '600';
      nameSpan.textContent = c.nickname || '匿名';
    
      const timeSpan = document.createElement('span');
      timeSpan.style.fontSize = '11px';
      timeSpan.style.color = 'var(--muted)';
      timeSpan.textContent = c.createdAt && c.createdAt.toDate
        ? c.createdAt.toDate().toLocaleString()
        : '';
    
      header.appendChild(nameSpan);
      header.appendChild(timeSpan);
      // 如果這則留言有被置頂，就顯示一個小 badge
      if (c.pinned) {
        const pinnedBadge = document.createElement('span');
        pinnedBadge.textContent = '置頂留言';
        pinnedBadge.style.fontSize = '11px';
        pinnedBadge.style.marginLeft = '6px';
        pinnedBadge.style.padding = '2px 6px';
        pinnedBadge.style.borderRadius = '9999px';
        pinnedBadge.style.border = '1px solid var(--accent)';
        pinnedBadge.style.color = 'var(--accent)';
        // 如果加背景色：
        // pinnedBadge.style.background = 'rgba(47,116,255,0.12)';
        header.appendChild(pinnedBadge);
      }
      // 只有作者模式才看到置頂按鈕
      if (COMMENT_ADMIN_MODE) {
        const pinBtn = document.createElement('button');
        pinBtn.textContent = c.pinned ? '取消置頂' : '置頂';
        pinBtn.style.marginLeft = 'auto';
        pinBtn.style.fontSize = '11px';
        pinBtn.style.borderRadius = '9999px';
        pinBtn.style.border = '1px solid var(--border)';
        pinBtn.style.background = c.pinned ? 'var(--accent)' : 'transparent';
        pinBtn.style.color = c.pinned ? '#fff' : 'var(--fg)';
        pinBtn.style.cursor = 'pointer';
        pinBtn.onclick = async () => {
          try {
            await window.db.collection('comments').doc(doc.id).update({
              pinned: !c.pinned,
              pinnedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            loadCommentsForCurrentQuestion(); // 重新載入，讓排序更新
          } catch (e) {
            console.error('toggle pin error', e);
            alert('更新置頂狀態失敗');
          }
        };
        header.appendChild(pinBtn);
        // 刪除留言按鈕（只有 ?dev=1 / 作者模式才會看到）
        const delBtn = document.createElement('button');
        delBtn.textContent = '刪除';
        delBtn.style.marginLeft = '6px';
        delBtn.style.fontSize = '11px';
        delBtn.style.borderRadius = '9999px';
        delBtn.style.border = '1px solid var(--border)';
        delBtn.style.background = 'transparent';
        delBtn.style.color = 'var(--muted)';
        delBtn.style.cursor = 'pointer';
        delBtn.onclick = async () => {
          if (!confirm('確定要刪除這則留言嗎？')) return;
          try {
            await window.db.collection('comments').doc(doc.id).delete();
            await loadCommentsForCurrentQuestion();
          } catch (e) {
            console.error('delete comment error', e);
            alert('刪除失敗，請稍後再試');
          }
        };
        header.appendChild(delBtn);
      }
    
      const body = document.createElement('div');
      // 這裡可以用原本的 escapeHTML + 換行處理
      body.innerHTML = escapeHTML(c.text || '').replace(/\n/g, '<br>');
    
      row.appendChild(header);
      row.appendChild(body);
      commentsList.appendChild(row);
    });
    
  } catch (err) {
    console.error('loadCommentsForCurrentQuestion error', err);
    commentsList.textContent = '載入留言失敗，稍後再試。';
    if (commentsCountEl) commentsCountEl.textContent = '';
  }
}


// 表單送出：寫入一筆新的留言
if (commentForm) {
  // 預先帶入上次使用的暱稱（如果有）
  const savedNick = localStorage.getItem('commentNickname');
  if (savedNick) {
    commentNameInput.value = savedNick;
  }

  commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!window.db) return;

    const key = getCurrentCommentKey();
    const nicknameRaw = (commentNameInput.value || '').trim();
    const textRaw = (commentTextInput.value || '').trim();

    // 暱稱：空白就當「匿名」
    const nickname = nicknameRaw || '匿名';

    // 文字：若全部都是空白字元就直接擋
    if (!key || !textRaw.replace(/\s/g, '')) return;

    const btn = commentForm.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    try {
      // 記住暱稱，之後自動帶入
      localStorage.setItem('commentNickname', nickname);

      await window.db.collection('comments').add({
        key,
        nickname,
        text: textRaw,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(), // 用 serverTimestamp 當時間
        pinned: false,
        pinnedAt: null,
      });

      // 清除文字欄位，保留暱稱
      commentTextInput.value = '';

      // 送出後重新載入留言
      await loadCommentsForCurrentQuestion();
    } catch (err) {
      console.error('submit comment error', err);
      alert('送出留言失敗，請稍後再試');
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}



function removeQuestionFromGroupByEntry(entry, groupId) {
  const group = state.groups.find(g => g.id === groupId);
  if (!group) return;
  group.questions = group.questions.filter(q => !isSameGroupQuestion(q, entry));
  saveGroups();
}






function highlightList(){
  [...qList.children].forEach((el,i)=> el.classList.toggle("active", i===state.index));
}

async function renderQuestionInGroupMode() {
  const item = state.visibleQuestions[state.index];
  if (!item || !item.groupEntry) {
    qNum.textContent = '';
    qText.textContent = '這個群組目前沒有題目';
    qOpts.innerHTML = '';
    qImg.classList.add('hidden');
    return;
  }

  const entry = item.groupEntry; // { subj, year, round, qid }

  // 1. 如果現在畫面的科目/年/梯次跟 entry 不同，就切過去並載入題庫
  const scope = getScopeFromUI(); // { subj, year, round }
  const needChange =
    String(scope.subj)  !== String(entry.subj)  ||
    String(scope.year)  !== String(entry.year)  ||
    String(scope.round) !== String(entry.round);

  if (needChange) {
    // 設定下拉選單
    subjectSel.value = entry.subj;
    yearSel.value = entry.year;
    // 依原本的 roundSel 設定，這裡用「第一次／第二次」
    roundSel.value = (String(entry.round) === '1') ? '第一次' : '第二次';

    // 等待 onScopeChange 把該卷的 state.questions / state.answers 載好
    await onScopeChange();
  }

  // 3. 以下直接複用原本 renderQuestion 裡顯示題目的邏輯，
  const q = state.questions.find(qq => String(qq.id) === String(entry.qid));
  if (!q) {
    qNum.textContent = '';
    qText.textContent = `找不到這一題（題號 ${entry.qid}）`;
    qOpts.innerHTML = '';
    qImg.classList.add('hidden');
    return;
  }
  //    只是「不要再從 list[state.index] 取題」，改用這裡的 q。

  qNum.textContent = `第 ${q.id} 題`;

  let html = escapeHTML(q.text);
  if (showAns.checked && state.answers && state.answers[String(q.id)]) {
    const ca = state.answers[String(q.id)];
    html = `答案：${escapeHTML(ca)}<br>` + html;
  }
  qText.innerHTML = html;

  if (q.image) {
    const raw = resolveImage(q.image);
    const bust = (raw.includes('?') ? '&' : '?') + 'v=' + Date.now();
    qImg.src = raw + bust;
    qImg.classList.remove('hidden');
  } else {
    qImg.classList.add('hidden');
    qImg.removeAttribute('src');
  }

  // 選項
  qOpts.innerHTML = '';
  const ua = (state.user[String(q.id)] || '').toUpperCase();
  const letters = ['A', 'B', 'C', 'D'];
  const correctSet = new Set(
    String(state.answers[String(q.id)] || '')
      .toUpperCase()
      .split(/[\/,]/)
      .filter(Boolean)
  );
  const showRadio = (state.mode === 'quiz' || state.mode === 'review');

  letters.forEach(L => {
    const line = document.createElement('div');
    line.style.display = 'flex';
    line.style.alignItems = 'center';
    line.style.gap = '10px';

    if (showRadio) {
      const rb = document.createElement('input');
      rb.type = 'radio';
      rb.name = 'opt';
      rb.disabled = (state.mode === 'review');
      rb.checked = (ua === L);
      rb.onchange = () => {
        state.user[String(q.id)] = L;
        persistAnswer();
      };
      line.appendChild(rb);
    }

    const span = document.createElement('span');
    span.innerText = `${L}. ${q.options?.[L] ?? ''}`;

    if (state.mode === 'review') {
      if (ua === L) {
        span.innerText += '（你選）';
        span.style.color = '#6aa0ff';
      }
      if (correctSet.has(L)) {
        span.innerText += '（正解）';
        span.style.color = '#c40000';
      }
    }

    line.appendChild(span);
    qOpts.appendChild(line);
  });

  // 底下科目／年／梯次標籤
  bSubj.textContent = getSubjectLabel();
  bYear.textContent = yearSel.value;
  bRound.textContent = roundSel.value;

  highlightList();
  loadNoteForCurrent();
  loadCommentsForCurrentQuestion();  
  if (qExplain) {
    const hasExp = !!q.explanation;
    if (hasExp) {
      qExplain.classList.remove('hidden');
      qExplain.innerHTML = '詳解：' + String(q.explanation);
    } else {
      qExplain.classList.add('hidden');
      qExplain.innerHTML = '';
    }
  }
}

/* 題目顯示（完整覆蓋） */
async function renderQuestion() {
  // 🔥 群組模式：走專屬流程
  if (state.currentGroupId) {
    await renderQuestionInGroupMode();
    return;
  }
  const list = (state.visibleQuestions && state.visibleQuestions.length)
    ? state.visibleQuestions
    : state.questions;
  const q = list[state.index];

  if (!q) {
    qNum.textContent = '';
    qText.textContent = '請先載入題目';
    qOpts.innerHTML = '';
    qImg.classList.add('hidden');
    return;
  }

  // 群組模式且題目帶有完整身份資訊，切換科目/年/梯次
  if (state.currentGroupId && q.groupEntry) {
    const entry = q.groupEntry;

    // 暫存舊的選單值，防止強迫整個頁面跳動（也可選擇不還原）
    const oldSubj = subjectSel.value;
    const oldYear = yearSel.value;
    const oldRound = roundSel.value;

    // 設定選單到正確科目、年、梯次
    subjectSel.value = entry.subj;
    yearSel.value = entry.year;
    roundSel.value = (entry.round === '1') ? '第一次' : '第二次';

    // 觸發測驗範圍變更（載入題庫陣列等）
    onScopeChange();

    // 還原選單（可視需求改成不還原，避免閃爍）
    subjectSel.value = oldSubj;
    yearSel.value = oldYear;
    roundSel.value = oldRound;
  }

  qNum.textContent = `第 ${q.id} 題`;

  // 題幹與答案顯示邏輯（保持原本不動）
  let html = escapeHTML(q.text);
  if (showAns.checked && state.answers && state.answers[String(q.id)]) {
    const ca = state.answers[String(q.id)];
    html = `答案：${escapeHTML(ca)}<br>` + html;
  }
  qText.innerHTML = html;

  if (q.image) {
    const raw = resolveImage(q.image);
    const bust = (raw.includes('?') ? '&' : '?') + 'v=' + Date.now();
    qImg.src = raw + bust;
    qImg.classList.remove('hidden');
  } else {
    qImg.classList.add('hidden');
    qImg.removeAttribute('src');
  }

  // 選項渲染（保持原本不動）
  qOpts.innerHTML = '';
  const ua = (state.user[String(q.id)] || '').toUpperCase();
  const letters = ['A', 'B', 'C', 'D'];
  const correctSet = new Set(String(state.answers[String(q.id)] || '').toUpperCase().split('/').filter(Boolean));
  const showRadio = (state.mode === 'quiz' || state.mode === 'review');

  letters.forEach(L => {
    const line = document.createElement('div');
    line.style.display = 'flex';
    line.style.alignItems = 'center';
    line.style.gap = '10px';

    if (showRadio) {
      const rb = document.createElement('input');
      rb.type = 'radio';
      rb.name = 'opt';
      rb.disabled = (state.mode === 'review');
      rb.checked = (ua === L);
      rb.onchange = () => {
        state.user[String(q.id)] = L;
        persistAnswer();
      };
      line.appendChild(rb);
    }

    const span = document.createElement('span');
    span.innerText = `${L}. ${q.options?.[L] ?? ''}`;

    if (state.mode === 'review') {
      if (ua === L) {
        span.innerText += '（你選）';
        span.style.color = '#6aa0ff';
      }
      if (correctSet.has(L)) {
        span.innerText += '（正解）';
        span.style.color = '#c40000';
      }
    }

    line.appendChild(span);
    qOpts.appendChild(line);
  });

  bSubj.textContent = getSubjectLabel();
  bYear.textContent = yearSel.value;
  bRound.textContent = roundSel.value;

  highlightList();
  loadNoteForCurrent();
  loadCommentsForCurrentQuestion();
  
  if (qExplain) {
    const hasExp = !!q.explanation;
    if (hasExp) {
      qExplain.classList.remove('hidden');
      qExplain.innerHTML = '詳解<br>' + String(q.explanation);
    } else {
      qExplain.classList.add('hidden');
      qExplain.innerHTML = '';
    }
  }
  // 🔥 回顧模式顯示結束按鈕
  if (state.mode === 'review') {
    // 找到下一題按鈕
    const exitBtn = document.getElementById("btnExitReview");
    if (!exitBtn) {
      const btn = document.createElement("button");
      btn.id = "btnExitReview";
      btn.textContent = "結束回顧";
      btn.style.padding = "6px 12px";
      btn.style.borderRadius = "9999px";
      btn.style.marginLeft = "10px"; // 跟下一題隔開
      btn.style.border = "1px solid var(--border)";
      btn.style.background = "transparent";
      btn.style.color = "var(--accent)";
      btn.style.cursor = "pointer";
      btn.style.fontSize = "14px";
      btn.onclick = () => {
        state.mode = "browse";
        state.reviewOrder = [];
        state.reviewPos = 0;
        document.getElementById("reviewTag")?.classList.add("hidden");
        btn.remove();
        renderQuestion();
      };
      // 插在下一題按鈕旁
      nextBtn.parentNode.insertBefore(btn, nextBtn.nextSibling);
    }
  } else {
    // 離開 review mode 就移除按鈕
    document.getElementById("btnExitReview")?.remove();
  }
}
function addExitReviewBtn() {
  let existBtn = document.getElementById("btnExitReview");
  if (existBtn) return; // 避免重複新增

  const btn = document.createElement("button");
  btn.id = "btnExitReview";
  btn.textContent = "結束回顧";
  btn.style.padding = "6px 12px";
  btn.style.borderRadius = "9999px";
  btn.style.border = "1px solid var(--border)";
  btn.style.background = "transparent";
  btn.style.color = "var(--accent)";
  btn.style.cursor = "pointer";
  btn.style.fontSize = "14px";
  btn.style.position = "fixed";
  btn.style.top = "16px";
  btn.style.right = "16px";
  btn.onclick = () => {
    state.mode = "browse"; // 恢復正常模式
    state.reviewOrder = [];
    state.reviewPos = 0;
    document.getElementById("reviewTag")?.classList.add("hidden");
    document.getElementById("btnExitReview")?.remove();
    renderQuestion();
  };

  document.body.appendChild(btn);
}


/* 逃脫字元 */
function escapeHTML(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/* 作答持久化（localStorage，以科目/年/梯次為命名空間） */
function nsKey(){ 
  const subjSafe = sanitizeSubjectName(subjectSel.value || "");
  const round = (roundSel.value === "第一次") ? "1" : "2";
  const year = String(yearSel.value || "0");
  return `ans|${subjSafe}|${year}|r${round}`;
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

// 綁定搜尋輸入框：打字就即時搜尋
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    applyQuestionSearch(e.target.value);
  });
}


/* 導航 */
prevBtn.onclick = () => {
  saveNotes();
  if (state.mode === "review") {
    stepReview(-1);
  } else {
    const list = state.visibleQuestions && state.visibleQuestions.length
      ? state.visibleQuestions
      : state.questions;
    if (state.index > 0) state.index--;
    else state.index = 0;
  }
  renderQuestion();
  highlightList();
};

nextBtn.onclick = () => {
  saveNotes();
  if (state.mode === "review") {
    stepReview(1);
  } else {
    const list = state.visibleQuestions && state.visibleQuestions.length
      ? state.visibleQuestions
      : state.questions;
    if (state.index < list.length - 1) state.index++;
    else state.index = list.length - 1;
  }
  renderQuestion();
  highlightList();
};

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

/* ========= 全螢幕測驗模式（覆蓋主頁，新增「測驗準備」頁） ========= */
function enterFullscreenQuiz(){
  if(!state.questions.length || !Object.keys(state.answers).length){
    alert("請先載入題目與答案。");
    return;
  }

  // 先鎖住 body 捲動，之後關閉再還原
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  const mask = document.createElement("div");
  mask.id = "fsQuizMask";
  mask.style.cssText = `
    position:fixed; inset:0; z-index:100002;
    background:var(--bg,#111);
    display:flex; flex-direction:column;
  `;

  // 一次性注入樣式（包含測驗頁 + 測驗準備卡片）
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

      /* ===== 測驗準備遮罩卡片 ===== */
      .fs-start-overlay{
        position:fixed; inset:0; z-index:100002;
        display:flex; align-items:center; justify-content:center;
        background:rgba(0,0,0,.65);
      }
      .fs-start-card{
        min-width:280px; max-width:420px;
        background:var(--card,#1b1b1b);
        border-radius:16px;
        border:1px solid var(--border,#2a2a2a);
        padding:20px 18px;
        box-shadow:0 18px 45px rgba(0,0,0,.4);
      }
      .fs-start-title{
        font-size:18px; font-weight:600; margin-bottom:12px;
      }
      .fs-start-row{
        font-size:15px; margin:4px 0;
      }
      .fs-start-row .value{
        font-weight:600;
      }
      .fs-start-actions{
        margin-top:16px;
        display:flex; justify-content:flex-end; gap:10px;
      }
      .fs-btn-primary{
        background:var(--accent,#2f74ff);
        color:#fff;
      }
    `;
    document.head.appendChild(css);
  }

  // 先把完整測驗畫面 + 準備卡片都畫出來（準備卡片會蓋在最上面）
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

    <!-- 測驗準備卡片：一進來先看到這個 -->
    <div id="fsStartOverlay" class="fs-start-overlay">
      <div class="fs-start-card">
        <div class="fs-start-title">測驗準備</div>
        <div class="fs-start-row">科目：<span class="value" id="fsStartSubj"></span></div>
        <div class="fs-start-row">年份：<span class="value" id="fsStartYear"></span></div>
        <div class="fs-start-row">梯次：<span class="value" id="fsStartRound"></span></div>
        <div class="fs-start-row">作答時間：<span class="value">60 分鐘</span></div>
        <div class="fs-start-actions">
          <button id="fsStartCancel" class="fs-btn">取消</button>
          <button id="fsStartBtn" class="fs-btn fs-btn-primary">進入作答</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(mask);

  // 測驗本體用到的節點
  const fs = {
    mask,
    fsSubj: document.getElementById("fsSubj"),
    fsYear: document.getElementById("fsYear"),
    fsRound: document.getElementById("fsRound"),
    fsTimer: document.getElementById("fsTimer"),
    fsReviewTag: document.getElementById("fsReviewTag"),
    fsQNum: document.getElementById("fsQNum"),
    fsQText: document.getElementById("fsQText"),
    fsQImg: document.getElementById("fsQImg"),
    fsQOpts: document.getElementById("fsQOpts"),
    fsPrev: document.getElementById("fsPrev"),
    fsNext: document.getElementById("fsNext"),
    fsSubmit: document.getElementById("fsSubmit"),
    fsClose: document.getElementById("fsClose")
  };

  // 「測驗準備」卡片節點
  const fsStartOverlay = document.getElementById("fsStartOverlay");
  const fsStartSubj    = document.getElementById("fsStartSubj");
  const fsStartYear    = document.getElementById("fsStartYear");
  const fsStartRound   = document.getElementById("fsStartRound");
  const fsStartBtn     = document.getElementById("fsStartBtn");
  const fsStartCancel  = document.getElementById("fsStartCancel");

  // 卷別資訊填入（上方列 + 準備卡片共用）
  const subjLabel = getSubjectLabel(); // 前面已經寫好的工具函式
  if (fs.fsSubj)  fs.fsSubj.textContent  = subjLabel;
  if (fs.fsYear)  fs.fsYear.textContent  = yearSel.value;
  if (fs.fsRound) fs.fsRound.textContent = roundSel.value;

  if (fsStartSubj)  fsStartSubj.textContent  = subjLabel;
  if (fsStartYear)  fsStartYear.textContent  = yearSel.value;
  if (fsStartRound) fsStartRound.textContent = roundSel.value;

  // 測驗狀態（全都先建立好，但「不啟動計時」）
  const qs = {
    mode: "quiz",
    index: 0,
    reviewOrder: [],
    reviewPos: 0,
    remain: 60*60,
    timerId: null
  };

  // 導覽 / 提交 / 關閉：邏輯維持原本
  bindTapClick(fs.fsPrev,  ()=> { if(qs.mode==="review"){ stepReview(-1); } else { if(qs.index>0) qs.index--; } renderFS(); });
  bindTapClick(fs.fsNext,  ()=> { if(qs.mode==="review"){ stepReview( 1); } else { if(qs.index<state.questions.length-1) qs.index++; } renderFS(); });
  bindTapClick(fs.fsSubmit, ()=> submitFS());
  bindTapClick(fs.fsClose,  ()=> closeFS());

  // ✅「進入作答」：這個時候才清除舊作答 + 啟動計時
  if (fsStartBtn){
    bindTapClick(fsStartBtn, ()=>{
      // 1) 清除目前科目/年/梯次的舊作答
      resetUserAnswersForCurrentScope();

      // 2) 重設倒數時間
      qs.mode   = "quiz";
      qs.index  = 0;
      qs.reviewOrder = [];
      qs.reviewPos   = 0;
      qs.remain = 60*60;

      // 3) 先渲染第一題，再開始計時
      renderFS();
      tickFS();
      qs.timerId = setInterval(tickFS, 1000);

      // 4) 把「測驗準備」卡片藏起來
      fsStartOverlay?.classList.add("fs-hidden");
    });
  }

  // ❌「取消」：關掉整個全螢幕，回到原本頁面，完全不影響原本作答
  if (fsStartCancel){
    bindTapClick(fsStartCancel, ()=>{
      if(qs.timerId){ clearInterval(qs.timerId); qs.timerId = null; }
      try{ document.body.removeChild(mask); }catch{}
      document.body.style.overflow = prevOverflow || "";
      state.mode = "browse";
      renderQuestion();
    });
  }

  // 一開始只畫題目內容（不動計時，顯示用）
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
    fs.fsQText.innerHTML  = escapeHTML(q.text);

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
          span.style.color = "#6aa0ff";
        }
        if (correctSet.has(L)) {
          span.innerText += "（正解）";
          span.style.color = "#c40000";
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
  function submitFS() {
    let correct = 0;
    const wrong = [];
  
    state.questions.forEach((q, idx) => {
      const qid = String(q.id);
      const caRaw = String(state.answers[qid] || "").toUpperCase();
      const set = new Set(
        caRaw
          .split(/[\/,]/)
          .map(s => s.trim())
          .filter(Boolean)
      );
      const ua = String(state.user[qid] || "").toUpperCase();
  
      if (set.has("ALL") || set.has(ua)) {
        correct++;
      } else {
        wrong.push({
          qid,
          idx,
          ua,
          ca: Array.from(set).join("/")
        });
      }
    });
  
    const total = state.questions.length;
    const score = total ? ((correct / total) * 100).toFixed(2) : "0.00";
  
    const row = {
      ts: new Date().toLocaleString(),
      subj: getSubjectLabel(),
      year: yearSel ? yearSel.value : "",
      round: roundSel ? roundSel.value : "",
      total,
      correct,
      score,
      wrongIds: wrong.map(w => w.qid).join(","),
      wrongDetail: wrong.map(w => `${w.qid}:${w.ua || "-"}→${w.ca || "-"}`).join("、"),
      summary: summarizeChoices()
    };
  
    appendRecord(row);
  
    if (qs.timerId) {
      clearInterval(qs.timerId);
      qs.timerId = null;
    }
  
    const goReview = window.confirm(
      `本卷得分：${score} 分（${correct}/${total}）\n是否只看本次錯題？`
    );
  
    if (goReview && wrong.length) {
      qs.mode = "review";
      fs.fsTimer.classList.add("fs-hidden");
      fs.fsSubmit.classList.add("fs-hidden");
      qs.reviewOrder = wrong.map(w => w.idx);
      qs.reviewPos = 0;
      qs.index = qs.reviewOrder[0];
      renderFS();
    } else {
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

  //  一開始就清除「當前科目/年/梯次」舊作答，避免帶入上一輪
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

function submitQuiz() {
  // 不是測驗模式就直接關閉
  if (state.mode !== "quiz") {
    closeQuiz();
    return;
  }

  let correct = 0;
  const wrong = [];

  state.questions.forEach((q, idx) => {
    const qid = String(q.id);
    const caRaw = String(state.answers[qid] || "").toUpperCase();

    // 支援 "A/B" 或 "A,B" 這兩種格式
    const set = new Set(
      caRaw
        .split(/[\/,]/)
        .map(s => s.trim())
        .filter(Boolean)
    );

    const ua = String(state.user[qid] || "").toUpperCase();

    // 規則：
    // - 若答案包含 "ALL"（全部皆是），就代表任何選項都算對
    // - 或者只要有一個選項在 set 裡，就算答對
    if (set.has("ALL") || set.has(ua)) {
      correct++;
    } else {
      wrong.push({
        qid,
        idx,
        ua,
        ca: Array.from(set).join("/")
      });
    }
  });

  const total = state.questions.length;
  const score = total ? ((correct / total) * 100).toFixed(2) : "0.00";

  const row = {
    ts: new Date().toLocaleString(),
    subj: subjectSel ? subjectSel.value : "",
    year: yearSel ? yearSel.value : "",
    round: roundSel ? roundSel.value : "",
    total,
    correct,
    score,
    wrongIds: wrong.map(w => w.qid).join(","),
    wrongDetail: wrong.map(w => `${w.qid}:${w.ua || "-"}→${w.ca || "-"}`).join("、"),
    summary: summarizeChoices()
  };

  appendRecord(row);

  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }

  const goReview = window.confirm(
    `本卷得分：${score} 分（${correct}/${total}）\n是否只看本次錯題？`
  );

  if (goReview && wrong.length) {
    state.mode = "review";
    timerBadge.classList.add("hidden");
    btnSubmit.classList.add("hidden");
    btnClose.classList.remove("hidden");
    state.reviewOrder = wrong.map(w => w.idx);
    state.reviewPos = 0;
    state.index = state.reviewOrder[0];
    reviewTag.classList.remove("hidden");
    renderQuestion();
  } else {
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
      .rv-mask{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:100002;padding:16px;}
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
      <col class="c-wids"><col class="c-wdet"><col class="c-sum"><col class="c-op">
    </colgroup>
    <thead><tr>
      <th>測驗日期</th><th>科目</th><th>年份</th><th>梯次</th>
      <th>總題數</th><th>正確題數</th><th>得分</th>
      <th>錯誤題號</th><th>錯題詳情</th><th>作答概覽</th><th>操作</th>
    </tr></thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");
  
  arr.forEach((r, idx) => {
    const tr = document.createElement("tr");
  
    const cells = [
      r.ts,
      r.subj,
      r.year,
      r.round,
      r.total,
      r.correct,
      r.score,
      r.wrongIds,
      r.wrongDetail,
      r.summary
    ];
  
    // 先建立前 10 欄
    tr.innerHTML = cells
      .map(c => `<td>${escapeHTML(String(c ?? ""))}</td>`)
      .join("");
    

    
    // 🆕 第 11 欄：操作（刪除按鈕）
    const tdOp = document.createElement("td");
    const btnReview = document.createElement("button");
    btnReview.textContent = "回顧錯題";
    btnReview.style.padding = "4px 8px";
    btnReview.style.borderRadius = "9999px";
    btnReview.style.border = "1px solid var(--border)";
    btnReview.style.background = "transparent";
    btnReview.style.color = "var(--accent)";
    btnReview.style.cursor = "pointer";
    btnReview.style.fontSize = "12px";
    btnReview.onclick = () => {
      reviewRecordWrong(arr[idx]);
    };
    tdOp.appendChild(btnReview);
    const btnDel = document.createElement("button");
    btnDel.textContent = "刪除";
    btnDel.style.padding = "4px 8px";
    btnDel.style.borderRadius = "9999px";
    btnDel.style.border = "1px solid var(--border)";
    btnDel.style.background = "transparent";
    btnDel.style.color = "var(--fg)";
    btnDel.style.cursor = "pointer";
    btnDel.style.fontSize = "12px";
    
    btnDel.onclick = () => {
    const ok = confirm(
      `確定要刪除這筆作答紀錄嗎？\n\n` +
      `科目：${r.subj}\n` +
      `年份：${r.year}\n` +
      `梯次：${r.round}\n` +
      `日期：${r.ts}`
    );
    if (!ok) return;
  
    // 重新根據目前表格位置算 index
    const rows = Array.from(tbody.children);
    const index = rows.indexOf(tr);
    if (index === -1) return;
  
    arr.splice(index, 1);
    try {
      localStorage.setItem("examRecords", JSON.stringify(arr));
    } catch (e) {
      console.error("save examRecords error", e);
      alert("刪除失敗，請稍後再試");
      return;
    }
  
    tr.remove();
  };
  
    tdOp.appendChild(btnDel);
    tr.appendChild(tdOp);
    tbody.appendChild(tr);
  });


  body.appendChild(table);
  card.appendChild(head);
  card.appendChild(body);
  mask.appendChild(card);
  document.body.appendChild(mask);
}
function reviewRecordWrong(record) {
  // 建立錯題回顧試題資料
  state.mode = "review";
  state.reviewOrder = [];
  state.reviewPos = 0;
  // 錯題資訊格式要跟 row.wrongIds 一致
  if (record && record.wrongIds) {
    let wrongIds = record.wrongIds.split(",");
    state.reviewOrder = wrongIds.map(id =>
      state.questions.findIndex(q => String(q.id) === id)
    ).filter(idx => idx >= 0);
    state.reviewPos = 0;
    if(state.reviewOrder.length > 0){
      state.index = state.reviewOrder[0];
      document.getElementById("reviewTag")?.classList.remove("hidden");
      renderQuestion();
    } else {
      alert("沒有錯題可以回顧！");
    }
  } else {
    alert("這筆紀錄沒有紀錄錯題資訊。");
  }
  // 🔥 自動關閉作答紀錄視窗
  const mask = document.getElementById("rv-mask") || document.getElementById("records-mask");
  if (mask) mask.remove();
}

// ===== 匯出目前這一卷的詳解（作者模式專用） =====
function exportNotesForCurrentScope(){
  // 先確保當前題目的筆記有存進去
  saveNotes();

  // 保險再讀一次 notes
  loadNotes();

  const scope = state.scope || getScopeFromUI();

  // 產生陣列：每題 { id, explanation: "<html...>" }
  const arr = state.questions.map(q=>{
    const k = keyForNote(q.id, scope);           // 此題在 notes 裡的 key[web:48]
    const html = (state._notes && state._notes[k]) || "";
    return {
      id: q.id,
      explanation: html
    };
  });

  // 也做一份「題號 → explanation」物件，方便貼回 JSON
  const byId = {};
  arr.forEach(row=>{
    byId[row.id] = row.explanation;
  });

  console.log("=== 本卷詳解（陣列格式）===");
  console.log(JSON.stringify(arr, null, 2));     // 給逐題對照用[web:58]

  //console.log("=== 本卷詳解（以題號為 key 的物件）===");
  //console.log(JSON.stringify(byId, null, 2));    // 方便直接貼進題目檔[web:58]

  toast("已在 console 輸出詳解 JSON");
}

// 作者模式才綁定按鈕
if (AUTHOR_MODE && btnExportNotes){
  bindTapClick(btnExportNotes, exportNotesForCurrentScope);
}
// 讓點工具列時，不會把選取從 editor 拿走（避免一點按鈕就失去 selection）
if (toolbar){
  toolbar.addEventListener("mousedown", e=>{
    const t = e.target;

    // 如果點到的是下拉選單或檔案選擇，就讓瀏覽器照正常流程跑
    if (t.closest("select") || t.closest("input[type='file']")) {
      return;
    }

    // 其他（像粗體、斜體按鈕）才用 preventDefault，避免把焦點從 editor 拿走
    e.preventDefault();
  });
}

/* 筆記工具 */
// 字級 / 基本文字樣式
fontSel.onchange = ()=> exec("fontSize", sizeToCommand(fontSel.value));
bBold.onclick   = ()=> toggleButton(bBold,   ()=>exec("bold"));
bItalic.onclick = ()=> toggleButton(bItalic, ()=>exec("italic"));
bUnder.onclick  = ()=> toggleButton(bUnder,  ()=>exec("underline"));
bSub.onclick    = ()=> { 
  bSup.classList.remove("active"); 
  toggleButton(bSub, ()=>exec("subscript")); 
};
bSup.onclick    = ()=> { 
  bSub.classList.remove("active"); 
  toggleButton(bSup, ()=>exec("superscript")); 
};

// ===== 顏色工具小函式 =====
function normalizeColor(c){
  try{
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.fillStyle = c || "";
    return ctx.fillStyle.toLowerCase();   // 例如 "rgb(255, 245, 157)"
  }catch{
    return String(c||"").toLowerCase();
  }
}

// 目前字體顏色（selection 開頭）
function currentForeColor(){
  try{
    const val = document.queryCommandValue("foreColor");
    return normalizeColor(val || "");
  }catch{
    return "";
  }
}

// 目前螢光筆顏色（背景色）
function currentHilite(){
  try{
    let val = document.queryCommandValue("hiliteColor");
    if (!val || val === "transparent"){
      val = document.queryCommandValue("backColor");
    }
    return normalizeColor(val || "");
  }catch{
    return "";
  }
}

// 把目前選取套上螢光筆顏色
function hilite(color){
  editor.focus();
  try{
    if (document.queryCommandSupported("hiliteColor")){
      document.execCommand("hiliteColor", false, color);
    }else{
      document.execCommand("backColor", false, color);
    }
  }catch{}
  saveNotes();
}

// 清掉螢光筆
function clearHiliteSelection(){
  editor.focus();
  try{
    if (document.queryCommandSupported("hiliteColor")){
      document.execCommand("hiliteColor", false, "transparent");
    }else{
      document.execCommand("backColor", false, "transparent");
    }
  }catch{}
  saveNotes();
}

// ===== 重新實作：字體顏色 / 螢光筆色盤（不依賴 input[type=color]） =====
const bFontColor       = $("#bFontColor");
const fontColorPalette = $("#fontColorPalette");
const bHL              = $("#bHL");
const hlPalette        = $("#hlPalette");

// 小工具：切換色盤顯示
function togglePalette(palette, btn){
  if (!palette || !btn) return;
  const isShown = !palette.classList.contains("hidden");

  // 先關掉兩個色盤，避免重疊
  fontColorPalette?.classList.add("hidden");
  hlPalette?.classList.add("hidden");

  if (!isShown){
    const rect = btn.getBoundingClientRect();
    palette.style.top  = (rect.bottom + window.scrollY + 4) + "px";
    palette.style.left = (rect.left   + window.scrollX) + "px";
    palette.classList.remove("hidden");
  }
}

// ===== 字體顏色：打開 / 關閉色盤 ＋ toggle 邏輯 =====
const DEFAULT_TEXT_COLOR = "#ffffff";

if (bFontColor && fontColorPalette){
  // 整顆按鈕（包含箭頭）都用 bindTapClick，比較照顧觸控
  bindTapClick(bFontColor, e=>{
    togglePalette(fontColorPalette, bFontColor);
  });

  fontColorPalette.addEventListener("click", e=>{
    const btn = e.target.closest("button[data-color]");
    if (!btn) return;

    const pick = btn.dataset.color || DEFAULT_TEXT_COLOR;

    editor.focus();

    const cur  = currentForeColor();
    const want = normalizeColor(pick);

    // 如果目前就是這個顏色 → 再按一次就還原成預設白色
    const finalColor = (cur && cur === want)
      ? DEFAULT_TEXT_COLOR
      : pick;

    exec("foreColor", finalColor);
    bFontColor.style.color = finalColor;
    fontColorPalette.classList.add("hidden");
  });
}

// ===== 螢光筆：打開 / 關閉色盤 ＋ toggle 邏輯 =====
const DEFAULT_HL_COLOR = "#fff59d";
if (bHL && hlPalette){
  bindTapClick(bHL, e=>{
    togglePalette(hlPalette, bHL);
  });

  hlPalette.addEventListener("click", e=>{
    const btn = e.target.closest("button[data-color]");
    if (!btn) return;

    const pick = btn.dataset.color || DEFAULT_HL_COLOR;

    editor.focus();

    // 用按鈕自己的背景色當「目前選色狀態」，不要再相信 execCommand 回傳值
    const btnColorNorm   = normalizeColor(pick);
    const currentBtnNorm = normalizeColor(bHL.style.backgroundColor || "");

    const isSame = (currentBtnNorm && currentBtnNorm === btnColorNorm);

    if (isSame){
      // 同一個顏色 → 視為「關掉螢光筆」
      clearHiliteSelection();
      bHL.style.backgroundColor = "";
    } else {
      // 不同顏色 → 套用新的螢光筆顏色
      hilite(pick);
      bHL.style.backgroundColor = pick;
    }

    hlPalette.classList.add("hidden");
    saveNotes();
  });

}

// 點到外面就關閉色盤
document.addEventListener("click", e=>{
  if (!fontColorPalette?.contains(e.target) && e.target !== bFontColor){
    fontColorPalette?.classList.add("hidden");
  }
  if (!hlPalette?.contains(e.target) && e.target !== bHL){
    hlPalette?.classList.add("hidden");
  }
});






// 圖片筆記維持不變
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

// 顏色字串正規化（把 #fff、rgb(...) 等轉成統一格式）
function normalizeColor(c){
  try{
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.fillStyle = c || "";
    return ctx.fillStyle.toLowerCase(); // 例如 "rgb(255, 245, 157)"
  }catch{ return String(c||"").toLowerCase(); }
}

// 目前選取區塊的螢光筆顏色（可能是 hiliteColor 或 backColor）
function currentHilite(){
  try{
    let val = document.queryCommandValue("hiliteColor");
    if (!val || val === "transparent") {
      val = document.queryCommandValue("backColor");
    }
    return normalizeColor(val || "");
  }catch{
    return "";
  }
}

// 把目前選取套上螢光筆顏色
function hilite(color){
  editor.focus();
  try{
    if (document.queryCommandSupported("hiliteColor")) {
      document.execCommand("hiliteColor", false, color);
    } else {
      document.execCommand("backColor", false, color);
    }
  }catch{}
  saveNotes();
}

// 清掉選取上的螢光色（盡量只清背景色）
function clearHiliteSelection(){
  editor.focus();
  try{
    if (document.queryCommandSupported("hiliteColor")) {
      document.execCommand("hiliteColor", false, "transparent");
    } else {
      document.execCommand("backColor", false, "transparent");
    }
  }catch{}
  saveNotes();
}


// 目前選取的字體顏色（用來判斷要不要 toggle 回預設白色）
function currentForeColor(){
  try{
    const val = document.queryCommandValue("foreColor"); // 可能是 rgb(...) 或 #xxxxxx
    return normalizeColor(val || "");
  }catch{
    return "";
  }
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
/* 主題系統 */

const themeSel = document.getElementById('themeSel');

// 所有可選主題（字串要跟 <option value="..."> 一樣）
const THEMES = ['dark', 'light', 'sky', 'ocean', 'forest', 'yolk', 'cosmos'];

function applyTheme(name, opts = {}) {
  const save = opts.save !== false;

  // 把所有主題 class 先拿掉
  document.body.classList.remove(
    'light',
    'theme-sky',
    'theme-ocean',
    'theme-forest',
    'theme-yolk',
    'theme-cosmos'
  );

  // 根據名稱決定要加哪一個 class
  switch (name) {
    case 'light':
      document.body.classList.add('light');
      break;
    case 'sky':
      document.body.classList.add('theme-sky');
      break;
    case 'ocean':
      document.body.classList.add('theme-ocean');
      break;
    case 'forest':
      document.body.classList.add('theme-forest');
      break;
    case 'yolk':
      document.body.classList.add('theme-yolk');
      break;
    case 'cosmos':
      document.body.classList.add('theme-cosmos');
      break;
    // 'dark' 就是走 :root 預設，不加任何主題 class
  }

  if (save) {
    localStorage.setItem('themeName', name);
  }
  if (themeSel && themeSel.value !== name) {
    themeSel.value = name;
  }
}

// 下拉選單改變時，套用主題
if (themeSel) {
  themeSel.addEventListener('change', () => {
    const v = themeSel.value;
    if (THEMES.includes(v)) {
      applyTheme(v);
    }
  });
}

// 初始化主題（預設暗色）
(function initTheme() {
  const saved = localStorage.getItem('themeName');
  const initial = THEMES.includes(saved) ? saved : 'dark';
  applyTheme(initial, { save: false });
})();


/* 選單變更 → 嘗試自動載入慣用命名檔案（若存在於同 repo） */
[yearSel, roundSel, subjectSel].forEach(sel=> sel.addEventListener("change", onScopeChange));
/* 選單變更 → 自動載入 data/題目 與 data/答案 */
/* --- debug friendly onScopeChange --- */
async function onScopeChange(){
  // 1) 在切換前，用舊範圍快照保存當前題筆記，避免用新鍵覆蓋舊內容
  const oldScope = state.scope || getScopeFromUI();
  saveNotes(oldScope);

  // 2) 以新範圍讀取作答紀錄
  loadAnswersFromStorage();

  // 3) 以下維持原本載入題目/答案的流程（依新 select 值）
  const p = subjectPrefix(subjectSel.value);
  const r = (roundSel.value === "第一次") ? "1" : "2";
  const qName = `${p}${yearSel.value}_${r}.json`;
  const aName = `${p}w${yearSel.value}_${r}.json`;

  const qURL = pathJoin(CONFIG.basePath, CONFIG.dirs.questions, qName) + `?v=${Date.now()}`;
  const aURL = pathJoin(CONFIG.basePath, CONFIG.dirs.answers,   aName) + `?v=${Date.now()}`;

  console.groupCollapsed("[onScopeChange] 嘗試載入題庫");
  console.log("subjectSel.value =", subjectSel.value);
  console.log("subjectPrefix ->", p);
  console.log("qName =", qName, "aName =", aName);
  console.log("qURL =", qURL);
  console.log("aURL =", aURL);
  console.log("CONFIG.basePath =", CONFIG.basePath, "CONFIG.dirs =", CONFIG.dirs);
  console.groupEnd();

  let loadedQ = false, loadedA = false;

  try{
    const qRes = await fetch(qURL, { cache:"no-store" });
    console.log("[fetch] qRes", qRes);
    if(qRes.ok){
      const ctype = qRes.headers.get("content-type") || "";
      console.log("[fetch] q content-type =", ctype);
      const arr = await qRes.json();
      if(Array.isArray(arr)){
        state.questions = arr;

        // 🔥 只有「非群組模式」才把 index 歸零＋重畫整卷清單
        if (!state.currentGroupId) {
          state.index = 0;
          // 👉 換卷時順便清空搜尋關鍵字
          if (searchInput) searchInput.value = "";

          renderList();
        }

        loadedQ = true;
        console.log("[onScopeChange] 題目載入成功，題數:", arr.length);
      }else{
        console.error("[onScopeChange] 題目檔格式錯誤（不是陣列）", qName, arr);
        alert(`題目檔格式錯誤（不是陣列）：${qName}`);
        state.questions = [];

        if (!state.currentGroupId) {
          state.index = 0;
          renderList();
        }
      }
    } else {
      console.warn("[onScopeChange] fetch qRes not ok:", qRes.status, qRes.statusText);
    }
  }catch(e){
    console.error("[onScopeChange] fetch 題目發生錯誤:", e);
  }

  try{
    const aRes = await fetch(aURL, { cache:"no-store" });
    console.log("[fetch] aRes", aRes);
    if(aRes.ok){
      const ctype = aRes.headers.get("content-type") || "";
      console.log("[fetch] a content-type =", ctype);
      const obj = await aRes.json();
      if(obj && typeof obj === "object"){
        state.answers = obj;
        loadedA = true;
        console.log("[onScopeChange] 答案載入成功，條目數:", Object.keys(obj).length);
      }else{
        console.error("[onScopeChange] 答案檔格式錯誤（不是物件）", aName, obj);
        alert(`答案檔格式錯誤（不是物件）：${aName}`);
        state.answers = {};
      }
    } else {
      console.warn("[onScopeChange] fetch aRes not ok:", aRes.status, aRes.statusText);
    }
  }catch(e){
    console.error("[onScopeChange] fetch 答案發生錯誤:", e);
  }

  if(!loadedQ){
    toast(`找不到題目檔：${qName}（看 console 有更詳細錯誤）`);
  }
  if(!loadedA){
    toast(`找不到答案檔：${aName}（看 console 有更詳細錯誤）`);
  }

  // 4) 切換完成後，更新「現行範圍快照」為新 scope，之後渲染時會用新鍵讀取筆記
  state.scope = getScopeFromUI();

  // 一樣：只有非群組模式才在這裡主動畫題目
  if (!state.currentGroupId) {
    renderQuestion();
  }
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

// 渲染左側群組列表
// 渲染左側群組列表（每個群組有「名稱」＋「-」刪除）
function renderGroupList() {
  const groupListEl = document.getElementById("group-list");
  if (!groupListEl) return;
  groupListEl.innerHTML = "";

  state.groups.forEach(group => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.gap = "6px";
    row.style.marginBottom = "4px";

    const li = document.createElement("button");
    li.textContent = group.name;
    li.dataset.groupId = group.id;
    li.style.flex = "1";
    li.style.borderRadius = "9999px";
    li.style.border = "1px solid var(--border)";
    li.style.background = "var(--pill)";
    li.style.color = "var(--fg)";
    li.style.cursor = "pointer";
    li.style.padding = "6px 10px";
    li.style.textAlign = "left";
    li.onclick = () => {
      filterQuestionsByGroup(group.id);
    };

    const delBtn = document.createElement("button");
    delBtn.textContent = "-";
    delBtn.title = "刪除此群組";
    delBtn.style.minWidth = "28px";
    delBtn.style.height = "28px";
    delBtn.style.borderRadius = "9999px";
    delBtn.style.border = "1px solid var(--border)";
    delBtn.style.background = "transparent";
    delBtn.style.color = "var(--muted)";
    delBtn.style.cursor = "pointer";
    delBtn.style.fontSize = "16px";

    delBtn.onclick = (e) => {
      e.stopPropagation();
      const ok = confirm(`確定要刪除群組「${group.name}」嗎？`);
      if (!ok) return;
      deleteGroup(group.id);
      // 若目前正好在這個群組檢視，把畫面切回全部題目
      if (state.currentGroupId === group.id) {
        state.currentGroupId = null;
        renderList(state.questions);
      }
    };

    row.appendChild(li);
    row.appendChild(delBtn);
    groupListEl.appendChild(row);
  });
}


// 綁定按鈕事件（新增群組、顯示全部題目）
function bindGroupUIEvents() {
  const addGroupBtn = document.getElementById("add-group-btn");
  if (addGroupBtn) {
    addGroupBtn.onclick = () => {
      const name = prompt("請輸入群組名稱：");
      if (name && name.trim()) {
        addGroup(name.trim());
      }
    };
  }
  const showAllBtn = document.getElementById("show-all-questions-btn");
  if (showAllBtn) {
    showAllBtn.onclick = () => {
      showAllQuestions();
    };
  }
}

// 打開加入群組選擇對話框（簡單版用 prompt 選群組）
function openAddToGroupDialog(questionId) {
  if (!state.groups.length) {
    const create = confirm('目前沒有群組，要先新增一個嗎？');
    if (!create) return;
    const name = prompt('請輸入群組名稱：');
    if (!name) return;
    const g = addGroup(name.trim());
    if (g) {
      addQuestionToGroup(questionId, g.id);
      alert(`已加入群組「${g.name}」`);
      renderGroupList();
      renderList();
    }
    return;
  }

  // 建立一個簡單的浮層列表
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    background: "rgba(0,0,0,.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100002
  });

  const card = document.createElement("div");
  Object.assign(card.style, {
    minWidth: "260px",
    maxWidth: "320px",
    background: "var(--card)",
    color: "var(--fg)",
    borderRadius: "14px",
    border: "1px solid var(--border)",
    padding: "16px",
    boxShadow: "0 18px 45px rgba(0,0,0,.4)"
  });

  const title = document.createElement("div");
  title.textContent = "選擇要加入的群組";
  title.style.fontWeight = "600";
  title.style.marginBottom = "10px";
  card.appendChild(title);

  const list = document.createElement("div");
  state.groups.forEach(g => {
    const btn = document.createElement("button");
    btn.textContent = g.name;
    Object.assign(btn.style, {
      width: "100%",
      padding: "8px 10px",
      marginBottom: "6px",
      borderRadius: "9999px",
      border: "1px solid var(--border)",
      background: "var(--pill)",
      color: "var(--fg)",
      cursor: "pointer",
      textAlign: "left"
    });
    btn.onclick = () => {
      addQuestionToGroup(questionId, g.id);
      alert(`已加入群組「${g.name}」`);
      document.body.removeChild(overlay);
      renderGroupList();
      renderList();
    };
    list.appendChild(btn);
  });
  card.appendChild(list);

  const actions = document.createElement("div");
  actions.style.marginTop = "8px";
  actions.style.display = "flex";
  actions.style.justifyContent = "flex-end";
  actions.style.gap = "8px";

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "取消";
  Object.assign(cancelBtn.style, {
    padding: "6px 10px",
    borderRadius: "9999px",
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--fg)",
    cursor: "pointer"
  });
  cancelBtn.onclick = () => {
    document.body.removeChild(overlay);
  };

  const newBtn = document.createElement("button");
  newBtn.textContent = "新增群組";
  Object.assign(newBtn.style, {
    padding: "6px 10px",
    borderRadius: "9999px",
    border: "1px solid var(--border)",
    background: "var(--accent)",
    color: "#fff",
    cursor: "pointer"
  });
  newBtn.onclick = () => {
    const name = prompt("請輸入新的群組名稱：");
    if (!name) return;
    const g = addGroup(name.trim());
    if (g) {
      addQuestionToGroup(questionId, g.id);
      alert(`已加入群組「${g.name}」`);
      document.body.removeChild(overlay);
      renderGroupList();
      renderList();
    }
  };

  actions.appendChild(cancelBtn);
  actions.appendChild(newBtn);
  card.appendChild(actions);

  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

// 判斷現在是否為「手機寬度」（768px 以下）
function isPhoneWidth() {
  return window.matchMedia('(max-width: 768px)').matches;
}

function setupMobileDrawers() {
  const btnLeft = document.getElementById('btnOpenLeft');
  const btnRight = document.getElementById('btnOpenRight');
  if (!btnLeft && !btnRight) return;

  // 共用的背景遮罩
  const backdrop = document.createElement('div');
  backdrop.className = 'drawer-backdrop';   // 🔸加這行
  backdrop.style.position = 'fixed';
  backdrop.style.inset = '0';
  backdrop.style.background = 'rgba(0,0,0,.45)';
  backdrop.style.zIndex = '100000';
  backdrop.style.display = 'none';
  document.body.appendChild(backdrop);

  function closeAll() {
    document.body.classList.remove('show-left-panel', 'show-right-panel');
    backdrop.style.display = 'none';
  }

  function openLeft() {
    document.body.classList.add('show-left-panel');
    document.body.classList.remove('show-right-panel');
    backdrop.style.display = 'block';
  }

  function openRight() {
    document.body.classList.add('show-right-panel');
    document.body.classList.remove('show-left-panel');
    backdrop.style.display = 'block';
  }

  btnLeft?.addEventListener('click', e => {
    e.preventDefault();
    if (document.body.classList.contains('show-left-panel')) {
      closeAll();
    } else {
      openLeft();
    }
  });

  btnRight?.addEventListener('click', e => {
    e.preventDefault();
    if (document.body.classList.contains('show-right-panel')) {
      closeAll();
    } else {
      openRight();
    }
  });

  backdrop.addEventListener('click', closeAll);
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAll();
  });
// === 手機左右滑手勢：關閉側邊欄 ===
  let touchStartX = 0;
  let touchStartY = 0;
  let trackingSwipe = false;
  let swipeMode = null; // 'left-open' | 'right-open' | 'left-edge' | 'right-edge'
  
  function isDrawerTouchMode() {
    const w = window.innerWidth;
    const h = window.innerHeight || 1;
    const portrait = h >= w;              // 直立
    return (w <= 768) || (portrait && w <= 1024);        // 手機 + 直立平板
  }

  function handleTouchStart(e) {
    if (!isDrawerTouchMode()) return;

    const t = e.touches && e.touches[0];
    if (!t) return;

    const w = window.innerWidth;
    const x = t.clientX;
    const y = t.clientY;
    const edgeZone = 24; // 距離左右 24px 內算邊緣（可微調）

    const leftOpen = document.body.classList.contains('show-left-panel');
    const rightOpen = document.body.classList.contains('show-right-panel');

    // 已經有側欄開著：只負責「關閉」的滑動
    if (leftOpen || rightOpen) {
      swipeMode = leftOpen ? 'left-open' : 'right-open';
      touchStartX = x;
      touchStartY = y;
      trackingSwipe = true;
      return;
    }

    // 沒有側欄開著：只有從左右邊緣起手才啟動「打開」手勢
    if (x <= edgeZone) {
      swipeMode = 'left-edge';
    } else if (w - x <= edgeZone) {
      swipeMode = 'right-edge';
    } else {
      swipeMode = null;
      trackingSwipe = false;
      return;
    }

    touchStartX = x;
    touchStartY = y;
    trackingSwipe = true;
  }

  function handleTouchEnd(e) {
    if (!trackingSwipe || !swipeMode) return;
    trackingSwipe = false;
    if (!isDrawerTouchMode()) return;

    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;

    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;

    // 垂直位移太大或水平太短，就當作一般捲動
    if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy) * 1.2) return;

    switch (swipeMode) {
      case 'left-open':
        // 左欄已開 → 往左滑關閉
        if (dx < -40) closeAll();
        break;
      case 'right-open':
        // 右欄已開 → 往右滑關閉
        if (dx > 40) closeAll();
        break;
      case 'left-edge':
        // 從左邊緣起手 → 往右滑打開左欄
        if (dx > 40) openLeft();
        break;
      case 'right-edge':
        // 從右邊緣起手 → 往左滑打開右欄
        if (dx < -40) openRight();
        break;
    }
  }

  // 掛在整個文件上，確保在側欄或 backdrop 上滑都抓得到
  document.addEventListener('touchstart', handleTouchStart, { passive: true });
  document.addEventListener('touchend', handleTouchEnd, { passive: true });
}



/* 初始化 */
function init() {
  loadNotes();
  loadAnswersFromStorage();
  loadGroups();        // 新增：載入群組資料
  renderGroupList();   // 新增：渲染群組列表
  bindGroupUIEvents(); // 新增：綁定按鈕事件

  renderList();
  state.scope = getScopeFromUI();
  onScopeChange();

  if (AUTHOR_MODE && btnExportNotes) {
    btnExportNotes.classList.remove("hidden");
  }
  setupMobileDrawers();
}
document.addEventListener("DOMContentLoaded", init);
// ====== 接收彈窗回傳的作答紀錄，寫入主頁的 localStorage ======
window.addEventListener("message", (e)=>{
  const msg = e.data || {};
  if(msg.type === "QUIZ_RECORD" && msg.row){
    appendRecord(msg.row);     // 用現成的 appendRecord
    toast("已儲存作答紀錄");
  }
});

// ===== 我的動物：初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  try {
    loadPetsFromStorage();
    loadPetFeedRecords();
  } catch (e) {
    console.error('初始化寵物狀態失敗：', e);
  }

  // 進來時先對三隻都跑一次時間更新（即使沒打開牧場視窗也會掉 BCS）
  ['dog', 'cat', 'cow'].forEach(k => {
    if (petState[k]) updatePetBCSFromTime(k);
  });

  if (!petState[currentPetKey]) {
    currentPetKey = 'dog';
  }

  // 左欄「打開牧場」按鈕
  if (btnOpenPets) {
    btnOpenPets.addEventListener('click', () => {
      openPetPanel();
    });
  }
});



