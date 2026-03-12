/* 基本狀態 */
const state = {
  questions: [],          // [{id,text,options:{A..D},image?}]
  flashcards: {
    folders: [], // { id, name, parentId, type: 'folder'|'topic', items: [] }
    cards: {} // { cardId: { id, folderId, front, back } }
  },
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
  isGlobalSearchMode = false;   // 回到一般模式
  state.currentGroupId = null;
  state.index = 0; // 回到原卷第一題
  state.visibleQuestions = state.questions;
  if (searchInput) {
    searchInput.value = "";
  }

  renderList(state.questions, { renumber: false });
  renderQuestion();
  highlightList();
}

//  state.visibleQuestions = state.questions;
//  renderList(state.questions, { renumber: false });
//  renderQuestion();
//  highlightList();
//}



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
// ===== 筆記內容：IndexedDB 主存（localStorage 只讀不寫，確保不爆也不覆蓋）=====
// ===== 筆記內容：IndexedDB 主存（localStorage 只讀不寫，確保不爆也不覆蓋）=====

const NOTES_DB = {
  name: "ntuvm-notes-db",
  version: 1,
  storeNotes: "notes",
  storeMeta: "meta",
};

// 相容舊變數名（你後面有些地方會用到）
const NOTESDB = NOTES_DB;

let __notesDbPromise = null;

function openNotesDB() {
  if (__notesDbPromise) return __notesDbPromise;

  __notesDbPromise = new Promise((resolve, reject) => {
    try {
      if (!("indexedDB" in window)) {
        reject(new Error("此瀏覽器不支援 IndexedDB"));
        return;
      }

      const req = indexedDB.open(NOTES_DB.name, NOTES_DB.version);

      req.onupgradeneeded = () => {
        const db = req.result;

        if (!db.objectStoreNames.contains(NOTES_DB.storeNotes)) {
          db.createObjectStore(NOTES_DB.storeNotes, { keyPath: "k" });
        }

        if (!db.objectStoreNames.contains(NOTES_DB.storeMeta)) {
          db.createObjectStore(NOTES_DB.storeMeta, { keyPath: "k" });
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("openNotesDB failed"));
    } catch (e) {
      reject(e);
    }
  });

  return __notesDbPromise;
}

function idbRangeStartsWith(prefix) {
  try {
    return IDBKeyRange.bound(String(prefix), String(prefix) + "\uffff");
  } catch {
    return null;
  }
}

// ===== Notes: HTML =====
async function idbGetNoteHtml(k) {
  const db = await openNotesDB();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(NOTES_DB.storeNotes, "readonly");
    const store = tx.objectStore(NOTES_DB.storeNotes);
    const req = store.get(String(k));
    req.onsuccess = () => resolve(req.result ? String(req.result.html ?? "") : null);
    req.onerror = () => reject(req.error || new Error("idbGetNoteHtml failed"));
  });
}

async function idbPutNoteHtml(k, html) {
  const db = await openNotesDB();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(NOTES_DB.storeNotes, "readwrite");
    const store = tx.objectStore(NOTES_DB.storeNotes);

    store.put({
      k: String(k),
      html: String(html ?? ""),
      updatedAt: Date.now(),
    });

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error || new Error("idbPutNoteHtml failed"));
    tx.onabort = () => reject(tx.error || new Error("idbPutNoteHtml aborted"));
  });
}

// ===== Notes: Meta =====
async function idbGetNoteMeta(k) {
  const db = await openNotesDB();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(NOTES_DB.storeMeta, "readonly");
    const store = tx.objectStore(NOTES_DB.storeMeta);
    const req = store.get(String(k));
    req.onsuccess = () => resolve(req.result ? (req.result.meta ?? null) : null);
    req.onerror = () => reject(req.error || new Error("idbGetNoteMeta failed"));
  });
}

async function idbPutNoteMeta(k, metaObj) {
  const db = await openNotesDB();
  const safeMeta = metaObj && typeof metaObj === "object" ? metaObj : {};
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(NOTES_DB.storeMeta, "readwrite");
    const store = tx.objectStore(NOTES_DB.storeMeta);

    store.put({
      k: String(k),
      meta: safeMeta,
      updatedAt: Date.now(),
    });

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error || new Error("idbPutNoteMeta failed"));
    tx.onabort = () => reject(tx.error || new Error("idbPutNoteMeta aborted"));
  });
}

// ===== Query helpers =====
async function idbGetNotesMapByPrefix(prefix) {
  const db = await openNotesDB();
  const out = {};
  const p = String(prefix ?? "");
  const range = idbRangeStartsWith(p);

  return await new Promise((resolve, reject) => {
    const tx = db.transaction(NOTES_DB.storeNotes, "readonly");
    const store = tx.objectStore(NOTES_DB.storeNotes);
    const req = range ? store.openCursor(range) : store.openCursor();

    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return resolve(out);

      const key = String(cursor.key || "");
      if (!key.startsWith(p)) {
        cursor.continue();
        return;
      }

      out[key] = String(cursor.value?.html ?? "");
      cursor.continue();
    };

    req.onerror = () => reject(req.error || new Error("idbGetNotesMapByPrefix failed"));
  });
}

async function idbDumpAllNotes() {
  const db = await openNotesDB();
  const out = {};

  return await new Promise((resolve, reject) => {
    const tx = db.transaction(NOTES_DB.storeNotes, "readonly");
    const store = tx.objectStore(NOTES_DB.storeNotes);
    const req = store.openCursor();

    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return resolve(out);

      const key = String(cursor.key || "");
      const val = cursor.value;
      out[key] = val ? String(val.html ?? "") : "";
      cursor.continue();
    };

    req.onerror = () => reject(req.error || new Error("idbDumpAllNotes failed"));
  });
}

async function idbDumpAllMeta() {
  const db = await openNotesDB();
  const out = {};

  return await new Promise((resolve, reject) => {
    const tx = db.transaction(NOTES_DB.storeMeta, "readonly");
    const store = tx.objectStore(NOTES_DB.storeMeta);
    const req = store.openCursor();

    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return resolve(out);

      const key = String(cursor.key || "");
      const val = cursor.value;
      out[key] = val ? (val.meta ?? {}) : {};
      cursor.continue();
    };

    req.onerror = () => reject(req.error || new Error("idbDumpAllMeta failed"));
  });
}

// ---- legacy localStorage（只讀）----
let legacyLoaded = false;
let legacyNotesObj = {};
let legacyMetaObj = {};
// 相容舊版備份程式會用到的別名（buildNotesRecordsBackupPayload 會讀這兩個）
// 只要有宣告，就不會再出現 "__legacyNotesObj is not defined"
let __legacyNotesObj;
let __legacyMetaObj;

function loadLegacyOnce() {
  if (legacyLoaded) return;
  legacyLoaded = true;

  let rawNotes = null;
  let rawMeta = null;

  try { rawNotes = localStorage.getItem(STORAGE.notes); } catch {}
  try { rawMeta = localStorage.getItem(STORAGE.notesMeta); } catch {}

  try { legacyNotesObj = rawNotes ? (JSON.parse(rawNotes) || {}) : {}; } catch { legacyNotesObj = {}; }
  try { legacyMetaObj = rawMeta ? (JSON.parse(rawMeta) || {}) : {}; } catch { legacyMetaObj = {}; }
}
// 兼容舊版本呼叫：有些地方可能會叫 __loadLegacyOnce()
// 兼容舊版本呼叫：有些地方可能會叫 __loadLegacyOnce()
function __loadLegacyOnce() {
  loadLegacyOnce();
  __legacyNotesObj = legacyNotesObj;
  __legacyMetaObj = legacyMetaObj;
}


function isEffectivelyEmptyNoteHtml(html) {
  const s = String(html ?? "").trim();
  if (!s) return true;

  // 把「預設骨架」也當成空白（避免用骨架覆蓋真筆記）
  try {
    const skeleton = String(defaultNoteHTML({})).trim();
    if (s.replace(/\s+/g, "") === skeleton.replace(/\s+/g, "")) return true;
  } catch {}

  return false;
}

// ===== 你後面會用到的三個 helper（名稱要對）=====

async function getStoredNoteHtmlNoWrite(k) {
  // 1) IDB
  try {
    const v = await idbGetNoteHtml(k);
    if (typeof v === "string" && v.trim().length) return v;
  } catch {}

  // 2) legacy localStorage（只讀）
  loadLegacyOnce();
  const legacy = legacyNotesObj && Object.prototype.hasOwnProperty.call(legacyNotesObj, k) ? legacyNotesObj[k] : null;
  if (typeof legacy === "string" && legacy.trim().length) return legacy;

  return "";
}

async function getStoredNoteMetaNoWrite(k) {
  // 1) IDB
  try {
    const v = await idbGetNoteMeta(k);
    if (v && typeof v === "object") return v;
  } catch {}

  // 2) legacy localStorage（只讀）
  loadLegacyOnce();
  const legacy = legacyMetaObj && Object.prototype.hasOwnProperty.call(legacyMetaObj, k) ? legacyMetaObj[k] : null;
  if (legacy && typeof legacy === "object") return legacy;

  return null;
}

async function copyLegacyToIdbIfMissing(k) {
  // 如果 IDB 已有，就不動
  try {
    const cur = await idbGetNoteHtml(k);
    if (typeof cur === "string" && cur.trim().length) return;
  } catch {}

  // 沒有才從 legacy 讀，讀到才寫進 IDB（只 copy，不改 legacy）
  loadLegacyOnce();

  const legacyHtml = legacyNotesObj && Object.prototype.hasOwnProperty.call(legacyNotesObj, k) ? legacyNotesObj[k] : null;
  if (typeof legacyHtml === "string" && legacyHtml.trim().length) {
    try { await idbPutNoteHtml(k, legacyHtml); } catch {}
  }

  const legacyMeta = legacyMetaObj && Object.prototype.hasOwnProperty.call(legacyMetaObj, k) ? legacyMetaObj[k] : null;
  if (legacyMeta && typeof legacyMeta === "object") {
    try { await idbPutNoteMeta(k, legacyMeta); } catch {}
  }
}

/* 一次性遷移：第一次載入就把舊 notes/notesMeta 清掉，避免污染 */
;(function migrateNotesOnce() {
  // 安全遷移：只「複製」舊資料到 v2，絕對不刪任何筆記
  try {
    if (localStorage.getItem(STORAGE.migrated) === "true") return;
  } catch (e) {
    return;
  }

  let v2NotesRaw = null, v2MetaRaw = null;
  let legacyNotesRaw = null, legacyMetaRaw = null;

  try {
    v2NotesRaw = localStorage.getItem(STORAGE.notes); // notes_v2
    v2MetaRaw = localStorage.getItem(STORAGE.notesMeta); // notesMeta_v2
    legacyNotesRaw = localStorage.getItem("notes"); // 舊版 key
    legacyMetaRaw = localStorage.getItem("notesMeta"); // 舊版 key
  } catch (e) {}

  const hasV2Notes = !!(v2NotesRaw && v2NotesRaw.trim().length);
  const hasV2Meta = !!(v2MetaRaw && v2MetaRaw.trim().length);

  try {
    if (!hasV2Notes && legacyNotesRaw && legacyNotesRaw.trim().length) {
      localStorage.setItem(STORAGE.notes, legacyNotesRaw);
    }
    if (!hasV2Meta && legacyMetaRaw && legacyMetaRaw.trim().length) {
      localStorage.setItem(STORAGE.notesMeta, legacyMetaRaw);
    }
  } catch (e) {}

  try {
    localStorage.setItem(STORAGE.migrated, "true");
  } catch (e) {}
})();



/* 一次性遷移：第一次載入就把舊 notes/notesMeta 清掉，避免污染 */
;(function migrateNotesOnce() {
  // 安全遷移：只「複製」舊資料到 v2，絕對不刪任何筆記
  try {
    if (localStorage.getItem(STORAGE.migrated) === "true") return;
  } catch (e) {
    return;
  }

  let v2NotesRaw = null, v2MetaRaw = null;
  let legacyNotesRaw = null, legacyMetaRaw = null;

  try {
    v2NotesRaw = localStorage.getItem(STORAGE.notes);       // notesv2
    v2MetaRaw  = localStorage.getItem(STORAGE.notesMeta);   // notesMetav2
    legacyNotesRaw = localStorage.getItem("notes");         // 舊版 key
    legacyMetaRaw  = localStorage.getItem("notesMeta");     // 舊版 key
  } catch (e) {}

  const hasV2Notes = !!(v2NotesRaw && v2NotesRaw.trim().length);
  const hasV2Meta  = !!(v2MetaRaw  && v2MetaRaw.trim().length);

  try {
    if (!hasV2Notes && legacyNotesRaw && legacyNotesRaw.trim().length) {
      localStorage.setItem(STORAGE.notes, legacyNotesRaw);
    }
    if (!hasV2Meta && legacyMetaRaw && legacyMetaRaw.trim().length) {
      localStorage.setItem(STORAGE.notesMeta, legacyMetaRaw);
    }
  } catch (e) {}

  try {
    localStorage.setItem(STORAGE.migrated, "true");
  } catch (e) {}
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
// 根據目前題目資料，把所有圖片渲染到 #question-images 容器
// 根據目前題目資料，把「第二張以後的圖片」渲染到 #question-images
// 🔁 讓一般測驗模式也能顯示多張圖片
function renderQuestionImagesFromState(qFromParam) {
  if (!questionImagesContainer) return;

  // 一律先清空，確保舊圖片不殘留
  questionImagesContainer.innerHTML = "";

  // 如果有從外面傳進來的題目，就直接用
  let q = qFromParam;

  // 沒有傳進來的話，才回退用目前的 list + state.index
  if (!q) {
    const list = (state.visibleQuestions && state.visibleQuestions.length)
      ? state.visibleQuestions
      : state.questions;

    if (!list || !list.length) return;

    const idx = Math.min(Math.max(state.index, 0), list.length - 1);
    q = list[idx];
  }

  if (!q) return;

  const images = Array.isArray(q.images) ? q.images : null;

  // 沒有 images 或只有一張，就不在多圖區塊畫東西
  if (!images || images.length <= 1) {
    return;
  }

  // 第一張交給主圖 qImg，這裡只畫第 2 張之後
  const extraImages = images.slice(1);

  extraImages.forEach(src => {
    const url = resolveImage(src);
    if (!url) return;
    const img = document.createElement("img");
    img.src = url;
    img.alt = q.text ? String(q.text).slice(0, 40) : "question image";
    questionImagesContainer.appendChild(img);
  });
}


/* DOM */
/* DOM */
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);
const toolbar = document.querySelector(".toolbar");
const yearSel = $("#yearSel");
const roundSel = $("#roundSel");
const subjectSel = $("#subjectSel");
const searchInput = $("#questionSearch"); // 新增：題目搜尋輸入框
const questionImagesContainer = document.getElementById("question-images");
const searchCache = {}; // key: `${subj}|${year}|${roundLabel}` -> 該卷題目陣列

// ★ 新增：110 年（含）之後沒有第二次 → 自動鎖定「第一次」，並隱藏「第二次」
function updateRoundOptionsByYear() {
  if (!yearSel || !roundSel) return;

  const yearNum = Number(yearSel.value);
  const options = Array.from(roundSel.options || []);

  // 找出「第二次」那個選項（兼容 value 寫 2 或文字寫 第二次）
  const secondOpt = options.find(o => {
    const text = (o.textContent || "").trim();
    const val = (o.value || "").trim();
    return text === "第二次" || text === "第二"
      || val === "第二次" || val === "第二" || val === "2";
  });

  if (!secondOpt) return;

  if (Number.isFinite(yearNum) && yearNum >= 110) {
    // 110 年（含）以後：隱藏＆停用第二次
    secondOpt.disabled = true;
    secondOpt.style.display = "none";

    // 如果現在剛好選在第二次，就自動切回第一個可用的選項
    if (roundSel.value === secondOpt.value) {
      const firstOpt = options.find(o => !o.disabled);
      if (firstOpt) {
        roundSel.value = firstOpt.value;
      }
    }
  } else {
    // 109 年（含）以前：恢復顯示第二次
    secondOpt.disabled = false;
    secondOpt.style.display = "";
  }
}

// 綁定年份變更事件 ＋ 載入頁面時先跑一次
if (yearSel) {
  yearSel.addEventListener("change", updateRoundOptionsByYear);
  updateRoundOptionsByYear();
}




let isGlobalSearchMode = false;     // 是否正在顯示搜尋結果列表
let globalSearchResults = [];       // [{subj, year, roundLabel, qid}, ...]
let globalSearchIndex = -1;         // 目前在搜尋結果中的第幾筆（0-based）

// 依「科目 / 年份 / 梯次」載入題目（給搜尋用），會做快取
// 依「科目 / 年份 /梯次」載入題目（給搜尋用），會做快取
async function loadQuestionsForScope(subj, year, roundLabel) {
  if (!subj || !year || !roundLabel) return [];

  // 🔒 110 年（含）之後沒有第二次，直接略過，避免 404
  const yearNum = Number(year);
  if (roundLabel === "第二次" && Number.isFinite(yearNum) && yearNum >= 110) {
    return [];
  }

  const cacheKey = `${subj}|${year}|${roundLabel}`;
  if (searchCache[cacheKey]) {
    return searchCache[cacheKey];
  }

  const p = subjectPrefix(subj);
  const r = (roundLabel === "第一次") ? "1" : "2";
  const qName = `${p}${year}_${r}.json`;
  const qURL = pathJoin(CONFIG.basePath, CONFIG.dirs.questions, qName);

  try {
    const res = await fetch(qURL, { cache: "force-cache" });
    if (!res.ok) {
      console.warn("[search] 無法載入題目檔：", qName, res.status);
      searchCache[cacheKey] = [];
      return [];
    }

    const arr = await res.json();
    if (!Array.isArray(arr)) {
      console.warn("[search] 題目檔格式不是陣列：", qName);
      searchCache[cacheKey] = [];
      return [];
    }

    // 確保每題都有 id
    const withId = arr.map((q, idx) => ({
      ...q,
      id: q.id != null ? q.id : idx + 1
    }));

    searchCache[cacheKey] = withId;
    return withId;
  } catch (e) {
    console.error("[search] 載入題目檔錯誤：", qName, e);
    searchCache[cacheKey] = [];
    return [];
  }
}


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
const qExplainWrap = $("#qExplainWrap");
const qList = $("#qList");

// 把搜尋結果畫到右側列表（不影響原本 renderList）
// 全卷搜尋結果列表（含「+」加入群組按鈕）
function renderGlobalSearchList(results) {
  if (!qList) return;

  isGlobalSearchMode = true;
  qList.innerHTML = "";

  // 沒有結果的情況
  if (!results.length) {
    const empty = document.createElement("div");
    empty.className = "q-item";
    empty.textContent = "找不到符合關鍵字的題目。";
    qList.appendChild(empty);
    return;
  }

  results.forEach((hit, idx) => {
    const item = document.createElement("div");
    item.className = "q-item";

    // 讓整個 item 排成「左文字 / 右按鈕」
    item.style.display = "flex";
    item.style.alignItems = "center";
    item.style.justifyContent = "space-between";
    item.style.gap = "8px";

    // 左邊 label：科目 / 年 / 次 / 題號
    const label = document.createElement("span");
    label.style.flex = "1";

    const subjLabel = hit.subj || "";
    const yearLabel = hit.year || "";
    const roundLabel = hit.roundLabel || "";
    const idLabel = hit.qid != null ? String(hit.qid) : "";

    const parts = [];
    if (subjLabel) parts.push(subjLabel);
    if (yearLabel) parts.push(yearLabel);
    if (roundLabel) parts.push(roundLabel);
    if (idLabel) parts.push(idLabel);

    label.textContent = parts.join(" / ");

    // 點整列（或左邊文字）＝跳到該題
    item.addEventListener("click", async () => {
      // 更新 active 樣式
      const children = Array.from(qList.children);
      children.forEach(el => el.classList.remove("active"));
      item.classList.add("active");
      globalSearchIndex = idx;

      if (typeof jumpToSearchHit === "function") {
        try {
          await jumpToSearchHit(hit);
        } catch (e) {
          console.error("jumpToSearchHit failed in search list", e);
        }
      }
    });

    item.appendChild(label);

    // 右邊「+」按鈕：加入群組
    const btn = document.createElement("button");
    btn.textContent = "+";
    btn.title = "加入群組";

    // 跟 renderList 裡右邊那顆按鈕用相同風格
    btn.style.minWidth = "32px";
    btn.style.height = "28px";
    btn.style.borderRadius = "9999px";
    btn.style.border = "1px solid var(--border)";
    btn.style.background = "var(--pill)";
    btn.style.color = "var(--fg)";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "16px";
    btn.style.flexShrink = "0";

    btn.addEventListener("click", async (e) => {
      e.stopPropagation(); // 不要觸發外層 item 的 click

      // 先確保 scope / 題目切到這個 hit
      if (typeof jumpToSearchHit === "function") {
        try {
          await jumpToSearchHit(hit);
        } catch (err) {
          console.error("jumpToSearchHit failed before openAddToGroupDialog", err);
        }
      }

      const qid = hit.qid != null ? String(hit.qid) : null;
      if (!qid) return;

      if (typeof openAddToGroupDialog === "function") {
        openAddToGroupDialog(qid);
      }
    });

    item.appendChild(btn);

    // 初始 active 樣式：第一筆
    if (idx === globalSearchIndex) {
      item.classList.add("active");
    }

    qList.appendChild(item);
  });
}



// 點搜尋結果：自動切卷並跳到那一題
async function jumpToSearchHit(hit) {
  if (!hit) return;

  let needChangeScope = false;

  if (subjectSel && subjectSel.value !== hit.subj) {
    subjectSel.value = hit.subj;
    needChangeScope = true;
  }
  if (yearSel && yearSel.value !== hit.year) {
    yearSel.value = hit.year;
    needChangeScope = true;
  }
  if (roundSel && roundSel.value !== hit.roundLabel) {
    roundSel.value = hit.roundLabel;
    needChangeScope = true;
  }

  // 差別在這裡：告訴 onScopeChange「現在是搜尋跳題」，暫時不要改右邊
  if (needChangeScope && typeof onScopeChange === "function") {
    isJumpingFromSearch = true;
    await onScopeChange();
    isJumpingFromSearch = false;
  }

  // 在目前卷裡找到那一題
  const targetId = Number(hit.qid);
  const idx = state.questions.findIndex(q => Number(q.id) === targetId);
  if (idx >= 0) {
    state.index = idx;
    renderQuestion();
    // 不呼叫 highlightList()，讓右邊保持搜尋結果
  }
}

// 是否正在從「搜尋結果」跳題，用來抑制 onScopeChange 裡的 renderList()
let isJumpingFromSearch = false;
// 主要搜尋邏輯：搜尋目前「科目」所有年度＋梯次
// 🔍 跨科目＋跨年份＋跨梯次 全域搜尋
// 🔍 跨科目＋跨年份＋跨梯次 全域搜尋
// 全卷搜尋（優化版：併發載入所有 scope 再集中比對）
async function searchAcrossVolumes(keyword, opts = null) {
  const kw = String(keyword || "").trim().toLowerCase();

  // 空字串就回到一般模式
  if (!kw) {
    isGlobalSearchMode = false;
    globalSearchResults = [];
    globalSearchIndex = -1;
    if (typeof showAllQuestions === "function") {
      showAllQuestions();
    }
    return;
  }

  // 安全檢查：下拉選單還沒準備好就直接跳出
  if (!subjectSel || !yearSel || !roundSel) return;

  // 蒐集所有科目 / 年份 / 梯次
  const subjects = Array.from(subjectSel.options || [])
    .map(o => String(o.value || "").trim())
    .filter(Boolean);

  let years = [];
  if (opts && Array.isArray(opts.years) && opts.years.length > 0) {
    years = opts.years;
  } else {
    years = Array.from(yearSel.options || [])
      .map(o => String(o.value || "").trim())
      .filter(Boolean);
  }

  const rounds = Array.from(roundSel.options || [])
    .map(o => {
      const txt = (o.textContent || o.value || "").trim();
      return txt;
    })
    .filter(Boolean);

  // 列出所有 scope 組合
  const scopes = [];
  for (const subj of subjects) {
    for (const year of years) {
      for (const roundLabel of rounds) {
        scopes.push({ subj, year, roundLabel });
      }
    }
  }

  if (!scopes.length) return;

  // 一次併發載入所有 scope 的題目
  const results = await Promise.all(
    scopes.map(async (s) => {
      const qs = await loadQuestionsForScope(s.subj, s.year, s.roundLabel);
      return { scope: s, qs };
    })
  );

  const hits = [];

  // 只搜尋：題幹 + 選項，不搜尋詳解 explanation
  results.forEach(({ scope, qs }) => {
    if (!qs || !qs.length) return;

    qs.forEach((q) => {
      const matchedText =
        q.text && String(q.text).toLowerCase().includes(kw);

      let matchedOption = false;
      if (!matchedText && q.options && typeof q.options === "object") {
        for (const val of Object.values(q.options)) {
          if (String(val || "").toLowerCase().includes(kw)) {
            matchedOption = true;
            break;
          }
        }
      }

      if (matchedText || matchedOption) {
        hits.push({
          subj: scope.subj,
          year: scope.year,
          roundLabel: scope.roundLabel,
          qid: q.id != null ? q.id : null
        });
      }
    });
  });

  // 更新全域搜尋狀態與列表
  isGlobalSearchMode = true;
  globalSearchResults = hits;
  globalSearchIndex = hits.length ? 0 : -1;
  renderGlobalSearchList(hits);

  // 自動跳到第一筆結果
  if (hits.length && typeof jumpToSearchHit === "function") {
    try {
      await jumpToSearchHit(hits[0]);
    } catch (e) {
      console.error("auto jump to first search result failed", e);
    }
  }
}







// 綁定輸入框：停止打字 400ms 後觸發跨卷搜尋（避免每個字都大量 fetch）
let globalSearchTimer = null;

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const value = e.target.value || "";
    if (globalSearchTimer) clearTimeout(globalSearchTimer);
    globalSearchTimer = setTimeout(() => {
      searchAcrossVolumes(value);
    }, 700);
  });
}

const prevBtn = $("#prev"), nextBtn = $("#next");
const btnExam = $("#btnExam"), btnSubmit = $("#btnSubmit"), btnClose = $("#btnClose");
const timerBadge = $("#timer"), reviewTag = $("#reviewTag");

const btnRecords = $("#btnRecords"), btnTheme = $("#btnTheme");
const btnExportNotes = $("#btnExportNotes");  // 作者模式匯出按鈕
const btnRandomQuiz = $("#btnRandomQuiz");
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
    return usp.get("dev") === "666666NTUVMAUTHORISGOD666666";   // 只有 ?dev=9 才算留言管理模式
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
// ===== 筆記下方：儲存空間狀態列（usage/quota/persistent + 備份）=====
function ensureNotesStorageStatusStyle() {
  if (document.getElementById("notes-storage-status-style")) return;
  const s = document.createElement("style");
  s.id = "notes-storage-status-style";
  s.textContent = `
    #notes-storage-status {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-top: 8px;
      padding: 8px 10px;
      border: 1px solid var(--border, #333);
      border-radius: 12px;
      background: rgba(255,255,255,0.03);
      color: var(--fg, #fff);
      font-size: 12px;
      line-height: 1.2;
      flex-wrap: wrap;
    }
    #notes-storage-status .nss-left {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
      min-width: 220px;
    }
    #notes-storage-status .nss-dot {
      width: 8px;
      height: 8px;
      border-radius: 9999px;
      background: var(--muted, #aaa);
      flex: 0 0 auto;
    }
    #notes-storage-status .nss-text {
      color: var(--muted, #aaa);
      white-space: nowrap;
    }
    #notes-storage-status .nss-text strong {
      color: var(--fg, #fff);
      font-weight: 700;
    }
    #notes-storage-status .nss-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      flex: 0 0 auto;
    }
    #notes-storage-status .nss-btn {
      padding: 6px 10px;
      border-radius: 9999px;
      border: 1px solid var(--border, #444);
      background: transparent;
      color: var(--fg, #fff);
      cursor: pointer;
      font-size: 12px;
      white-space: nowrap;
    }
    #notes-storage-status .nss-btn:hover {
      border-color: var(--accent, #2f74ff);
      color: var(--accent, #2f74ff);
    }
    #notes-storage-status .nss-btn.primary {
      border-color: var(--accent, #2f74ff);
      color: var(--accent, #2f74ff);
      background: rgba(47,116,255,0.10);
    }
  `;
  document.head.appendChild(s);
}

function formatBytes(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) return "未知";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = x;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const digits = i === 0 ? 0 : (i <= 2 ? 1 : 2);
  return `${v.toFixed(digits)}${units[i]}`;
}

async function getNotesImageCount() {
  try {
    if (typeof openNotesImgDB !== "function") return null;
    const db = await openNotesImgDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(NOTESIMGDB.store, "readonly");
      const store = tx.objectStore(NOTESIMGDB.store);
      const req = store.count();
      req.onsuccess = () => resolve(Number.isFinite(req.result) ? req.result : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

function ensureNotesStorageStatusBar() {
  ensureNotesStorageStatusStyle();
  if (!editor || !editor.parentNode) return;

  let bar = document.getElementById("notes-storage-status");
  if (bar) return;

  bar = document.createElement("div");
  bar.id = "notes-storage-status";

  const left = document.createElement("div");
  left.className = "nss-left";

  const dot = document.createElement("span");
  dot.className = "nss-dot";
  dot.id = "nss-dot";

  const text = document.createElement("span");
  text.className = "nss-text";
  text.id = "nss-text";
  text.textContent = "容量：讀取中…";

  left.appendChild(dot);
  left.appendChild(text);

  const actions = document.createElement("div");
  actions.className = "nss-actions";

  const btnPersist = document.createElement("button");
  btnPersist.className = "nss-btn primary";
  btnPersist.id = "nss-btn-persist";
  btnPersist.textContent = "申請持久化";
  btnPersist.onclick = async () => {
    try {
      if (navigator.storage && navigator.storage.persist) {
        await navigator.storage.persist();
      } else {
        alert("此瀏覽器不支援持久化儲存 API");
      }
    } catch (e) {}
    await updateNotesStorageStatus(true);
  };

  const btnBackup = document.createElement("button");
  btnBackup.className = "nss-btn";
  btnBackup.id = "nss-btn-backup";
  btnBackup.textContent = "立刻備份";
  btnBackup.onclick = async () => {
    try {
      if (typeof buildNotesRecordsBackupPayload !== "function" || typeof downloadJsonObject !== "function") {
        alert("備份功能未就緒（找不到 buildNotesRecordsBackupPayload / downloadJsonObject）");
        return;
      }
      const payload = await buildNotesRecordsBackupPayload();
      const ts = new Date();
      const y = ts.getFullYear();
      const m = String(ts.getMonth() + 1).padStart(2, "0");
      const d = String(ts.getDate()).padStart(2, "0");
      const hh = String(ts.getHours()).padStart(2, "0");
      const mm = String(ts.getMinutes()).padStart(2, "0");
      downloadJsonObject(payload, `ntuvm-notes-records-${y}${m}${d}-${hh}${mm}.json`);
    } catch (e) {
      alert("備份失敗：請看 console");
      console.error(e);
    }
  };


  actions.appendChild(btnPersist);
  actions.appendChild(btnBackup);

  bar.appendChild(left);
  bar.appendChild(actions);

  // 插在 editor 正下方
  editor.parentNode.insertBefore(bar, editor.nextSibling);
}

async function updateNotesStorageStatus(force = false) {
  try {
    ensureNotesStorageStatusBar();
    const textEl = document.getElementById("nss-text");
    const dotEl = document.getElementById("nss-dot");
    const btnPersist = document.getElementById("nss-btn-persist");
    if (!textEl || !dotEl) return;

    if (!navigator.storage || !navigator.storage.estimate) {
      textEl.textContent = "容量：此瀏覽器不支援 estimate()";
      dotEl.style.background = "var(--muted, #aaa)";
      if (btnPersist) btnPersist.disabled = true;
      return;
    }

    const est = await navigator.storage.estimate();
    const usage = Number(est && est.usage);
    const quota = Number(est && est.quota);

    let pct = null;
    if (Number.isFinite(usage) && Number.isFinite(quota) && quota > 0) pct = usage / quota;

    let persisted = null;
    if (navigator.storage && navigator.storage.persisted) {
      try { persisted = await navigator.storage.persisted(); } catch {}
    }

    const imgCount = await getNotesImageCount();

    const parts = [];
    if (Number.isFinite(usage) && Number.isFinite(quota) && quota > 0) {
      parts.push(`已用 <strong>${formatBytes(usage)}</strong> / ${formatBytes(quota)} (${Math.round(pct * 100)}%)`);
    } else if (Number.isFinite(usage)) {
      parts.push(`已用 <strong>${formatBytes(usage)}</strong>`);
    } else {
      parts.push("容量：未知");
    }

    if (Number.isFinite(imgCount)) parts.push(`圖片 ${imgCount}`);
    if (persisted === true) parts.push("持久化：是");
    else if (persisted === false) parts.push("持久化：否");

    textEl.innerHTML = parts.join("｜");

    // 顏色燈號：>85% 紅、>70% 黃、其它灰/藍
    if (pct != null) {
      if (pct >= 0.85) dotEl.style.background = "#c40000";
      else if (pct >= 0.70) dotEl.style.background = "#ffb020";
      else dotEl.style.background = "var(--accent, #2f74ff)";
    } else {
      dotEl.style.background = "var(--muted, #aaa)";
    }

    if (btnPersist) {
      // 已持久化就關掉按鈕（避免一直按）
      btnPersist.disabled = (persisted === true);
      btnPersist.textContent = (persisted === true) ? "已持久化" : "申請持久化";
    }

    // 防止你不小心重複綁 interval
    if (!window.__nssIntervalId) {
      window.__nssIntervalId = setInterval(() => {
        updateNotesStorageStatus(false);
      }, 30000);
    }
  } catch (e) {
    // 靜默失敗，避免干擾使用者
  }
}

// 初始化（只要 editor 存在就能掛）
try {
  ensureNotesStorageStatusBar();
  updateNotesStorageStatus(true);
} catch {}


// ===== 筆記：取得目前正在看的題目（含群組模式）=====
function getCurrentNoteContext() {
  // 回傳 { q, scope } ; scope = {subj, year, round}
  try {
    if (state.currentGroupId) {
      const item = state.visibleQuestions?.[state.index];
      const entry = item && item.groupEntry;
      if (entry) {
        const q = (state.questions || []).find(qq => String(qq.id) === String(entry.qid)) || null;
        const scope = {
          subj: String(entry.subj || ''),
          year: String(entry.year || ''),
          round: String(entry.round || '')
        };
        return { q, scope };
      }
    }
  } catch {}

  const list = (state.visibleQuestions && state.visibleQuestions.length) ? state.visibleQuestions : state.questions;
  const q = (list && list.length) ? list[state.index] : null;
  const sc = getScopeFromUI();
  return { q, scope: { subj: sc.subj, year: sc.year, round: sc.round } };
}

function ensureNotesImageStyle() {
  if (document.getElementById('notes-img-style')) return;

  const style = document.createElement('style');
  style.id = 'notes-img-style';
  style.textContent = `
    /* 筆記欄圖片：不要超過編輯器寬度（不強迫放大） */
    #editor img {
      max-width: 100% !important;
      height: auto !important;
    }

    /* 只有「用按鈕插入」的圖片：排版更穩（不影響你原本筆記裡舊圖的顯示型態） */
    #editor img.note-img {
      display: block;
      margin: 8px 0;
    }
  `;
  document.head.appendChild(style);
}

// 進頁面就先套用一次，包含已存在於筆記中的圖片也會一起生效
ensureNotesImageStyle();


const bBold = $("#bBold"), bItalic = $("#bItalic"), bUnder = $("#bUnder");
const bSub = $("#bSub"), bSup = $("#bSup");
const bImg = $("#bImg"), imgNote = $("#imgNote");
// ===== 筆記圖片：改存 IndexedDB（避免 localStorage 爆掉） =====
const NOTES_IMG_DB = {
  name: "ntuvm-notes-images-db",
  version: 1,
  store: "images"
};
const NOTESIMGDB = NOTES_IMG_DB; // 相容舊命名（別刪）

let __notesImgDbPromise = null;

function openNotesImgDB() {
  if (__notesImgDbPromise) return __notesImgDbPromise;
  __notesImgDbPromise = new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(NOTES_IMG_DB.name, NOTES_IMG_DB.version);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(NOTES_IMG_DB.store)) {
          db.createObjectStore(NOTES_IMG_DB.store, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("IndexedDB 開啟失敗"));
    } catch (e) {
      reject(e);
    }
  });
  return __notesImgDbPromise;
}

function makeNotesImgId() {
  return "nimg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
}

async function idbPutNoteImageBlob(blob, meta = {}) {
  const db = await openNotesImgDB();
  const id = makeNotesImgId();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(NOTES_IMG_DB.store, "readwrite");
    const store = tx.objectStore(NOTES_IMG_DB.store);
    store.put({
      id,
      blob,
      type: blob?.type || meta.type || "application/octet-stream",
      createdAt: Date.now(),
      meta
    });
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error || new Error("IndexedDB 寫入失敗"));
    tx.onabort = () => reject(tx.error || new Error("IndexedDB 寫入中止"));
  });
}

async function idbPutNoteImageBlobWithId(id, blob, meta = {}) {
  const db = await openNotesImgDB();
  const safeMeta = (meta && typeof meta === "object") ? meta : {};
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(NOTESIMGDB.store, "readwrite");
    const store = tx.objectStore(NOTESIMGDB.store);
    store.put({
      id: String(id),
      blob,
      type: blob?.type || safeMeta.type || "application/octet-stream",
      createdAt: safeMeta.createdAt || Date.now(),
      meta: safeMeta
    });
    tx.oncomplete = () => resolve(String(id));
    tx.onerror = () => reject(tx.error || new Error("idbPutNoteImageBlobWithId failed"));
    tx.onabort = () => reject(tx.error || new Error("idbPutNoteImageBlobWithId aborted"));
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("FileReader error"));
      reader.readAsDataURL(blob);
    } catch (e) {
      reject(e);
    }
  });
}

async function dumpAllNoteImagesForBackup() {
  try {
    const db = await openNotesImgDB();
    const out = {};
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(NOTESIMGDB.store, "readonly");
      const store = tx.objectStore(NOTESIMGDB.store);
      const req = store.openCursor();
      const tasks = [];

      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          Promise.all(tasks).then(() => resolve(out)).catch(reject);
          return;
        }
        const val = cursor.value;
        if (val && val.blob && val.id) {
          const id = String(val.id);
          const rec = {
            meta: val.meta || {},
            type: val.type || (val.blob.type || "application/octet-stream"),
            createdAt: val.createdAt || Date.now(),
            dataUrl: null
          };
          const p = blobToDataUrl(val.blob).then((url) => {
            rec.dataUrl = url;
            out[id] = rec;
          }).catch(() => {});
          tasks.push(p);
        }
        cursor.continue();
      };

      req.onerror = () => reject(req.error || new Error("dumpAllNoteImagesForBackup failed"));
    });
  } catch (e) {
    console.warn("dumpAllNoteImagesForBackup error:", e);
    return {};
  }
}

async function restoreNoteImagesFromBackup(imagesMap) {
  if (!imagesMap || typeof imagesMap !== "object") return;
  const ids = Object.keys(imagesMap);
  for (const id of ids) {
    const rec = imagesMap[id];
    if (!rec || !rec.dataUrl) continue;
    let blob = null;
    try {
      const resp = await fetch(rec.dataUrl);
      blob = await resp.blob();
    } catch {
      continue;
    }
    const meta = (rec.meta && typeof rec.meta === "object") ? rec.meta : {};
    meta.type = rec.type || meta.type || blob.type;
    meta.createdAt = rec.createdAt || meta.createdAt || Date.now();
    try {
      await idbPutNoteImageBlobWithId(id, blob, meta);
    } catch (e) {
      console.warn("restoreNoteImagesFromBackup failed for", id, e);
    }
  }
}


async function idbGetNoteImageBlob(id) {
  const db = await openNotesImgDB();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(NOTES_IMG_DB.store, "readonly");
    const store = tx.objectStore(NOTES_IMG_DB.store);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result ? req.result.blob : null);
    req.onerror = () => reject(req.error || new Error("IndexedDB 讀取失敗"));
  });
}

// 存檔前把 <img data-nimg-id="..."> 轉成穩定 src：idbimg<id>
function editorHtmlWithStableImgRefs(rootEl) {
  if (!rootEl) return "";
  const clone = rootEl.cloneNode(true);
  clone.querySelectorAll("img").forEach(img => {
    const id = img.dataset?.nimgId ? String(img.dataset.nimgId) : "";
    if (id) img.setAttribute("src", "idbimg" + id);
  });
  return clone.innerHTML;
}

// 載入筆記後，把 src=idbimg<id> 的圖片 hydrate 成 objectURL 顯示
async function hydrateIdbImagesInEditor(rootEl) {
  if (!rootEl) return;
  const imgs = Array.from(rootEl.querySelectorAll("img"));
  for (const img of imgs) {
    const rawSrc = String(img.getAttribute("src") || "");
    if (!rawSrc.startsWith("idbimg")) continue;

    const id = rawSrc.slice("idbimg".length);
    if (!id) continue;

    img.dataset.nimgId = id;
    try {
      const blob = await idbGetNoteImageBlob(id);
      if (!blob) continue;
      const url = URL.createObjectURL(blob);
      img.setAttribute("src", url);
      img.dataset.objectUrl = url;
    } catch (e) {
      console.warn("hydrateIdbImagesInEditor failed:", e);
    }
  }
}

// 切題/重載前清掉舊 objectURL，避免記憶體越吃越多
function cleanupHydratedBlobUrls(rootEl) {
  if (!rootEl) return;
  rootEl.querySelectorAll("img[data-object-url]").forEach(img => {
    const url = img.dataset.objectUrl;
    if (url && String(url).startsWith("blob:")) {
      try { URL.revokeObjectURL(url); } catch (e) {}
    }
    try { delete img.dataset.objectUrl; } catch (e) {}
  });
}

async function insertNoteImageFromFile(file) {
  if (!file) return;

  // 保底：確保 CSS 已注入
  ensureNotesImageStyle();

  const id = await idbPutNoteImageBlob(file, {
    from: "file",
    name: file.name,
    size: file.size,
    type: file.type
  });

  const objectUrl = URL.createObjectURL(file);

  // 重點：max-width 100%（不要超過），不是 width 100%（強制滿版）
  const html = `<img class="note-img" src="${objectUrl}"
    data-nimg-id="${id}" data-object-url="${objectUrl}"
    alt="note image" loading="lazy"
    style="max-width:100%;height:auto;" />`;

  editor.focus();
  document.execCommand("insertHTML", false, html);

  try { await updateNotesStorageStatus(false); } catch {}
}

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
    //alert('BCS 只剩 1：我要生一場 10 萬塊的大病…');
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
  .pet-quiz-qimgs {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .pet-quiz-qimgs img {
    flex: 0 0 calc(50% - 8px);
    max-width: calc(50% - 8px);
    height: auto;
    border-radius: 4px;
    border: 1px solid var(--border, #333);
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

  /* 每一個選項是一行，內容全部靠左就好 */
  .pet-quiz-opt-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    justify-content: flex-start; /* 🔸避免被撐到兩邊 */
  }

  /* 選項文字：不要再用 flex:1 撐滿 */
  .pet-quiz-opt-text {
    /* 不設 flex，維持預設 inline 大小就好 */
  }

  /* 右側「你選 / 正解」小標籤，緊貼在文字右邊 */
  .pet-quiz-opt-note {
    margin-left: 8px;
    font-size: 12px;
    white-space: nowrap;
    /* 不用特別設 flex，讓它跟在文字後面 */
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

// 🔒 110 年（含）以後沒有「第二次」，這裡會自動略過那些組合，避免 404
// 跨科別／跨年度／跨梯次隨機抽題
// maxCount：要抽幾題
// opts.subjects：可選，只從這些科目（subjectSel 的 value）裡抽；不傳就是全部科目
async function buildCrossVolumeQuizQuestions(maxCount, opts) {
  const result = [];
  if (!subjectSel || !yearSel || !roundSel) return result;

  // 如果有傳入 opts.subjects，就先整理成 Set 方便比對
  const selectedSet = (opts && Array.isArray(opts.subjects) && opts.subjects.length)
    ? new Set(
        opts.subjects
          .map(v => String(v || "").trim())
          .filter(Boolean)
      )
    : null;

  // 1. 把所有科目 / 年度 / 梯次的「選項值」抓出來
  const allSubjects = Array.from(subjectSel.options || [])
    .map(o => String(o.value).trim())
    .filter(Boolean);

  // 若有指定科目，就只保留那些科別；沒有就全部用
  const subjects = allSubjects.filter(s => !selectedSet || selectedSet.has(s));

  let years = [];
  if (opts && Array.isArray(opts.years) && opts.years.length > 0) {
      years = opts.years;
  } else {
      years = Array.from(yearSel.options)
          .map(o => String(o.value || "").trim())
          .filter(Boolean);
  }
  
  const rounds = Array.from(roundSel.options || [])
    .map(o => {
      const text = (o.textContent || "").trim();
      const val = (o.value || "").trim();
      return text || val; // 例如「第一次」「第二次」
    })
    .filter(Boolean);

  // 2. 組合出所有要嘗試的 scope（但會跳過 110+ 年的「第二次」）
  const scopes = [];
  for (const subj of subjects) {
    for (const year of years) {
      const yearNum = Number(year);
      for (const raw of rounds) {
        const roundLabel = String(raw).trim();
        const isSecond =
          roundLabel === "第二次" ||
          roundLabel === "第二" ||
          roundLabel === "2";

        // 🔒 110 年（含）以後沒有第二次 → 直接略過這種組合
        if (Number.isFinite(yearNum) && yearNum >= 110 && isSecond) {
          continue;
        }

        scopes.push({ subj, year, roundLabel });
      }
    }
  }

  if (!scopes.length) return result;

  // 3. 打亂 scopes 順序，讓抽題比較隨機
  for (let i = scopes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [scopes[i], scopes[j]] = [scopes[j], scopes[i]];
  }

  // 4. 記下現在原本選到的卷別，抽題完要切回來
  const originalScope = {
    subj: subjectSel.value,
    year: yearSel.value,
    round: roundSel.value,
  };

  // 5. 走遍所有 scope，把「有答案的題目」全部塞進大池 allCandidates
  //    但：每卷只收最多 perScopeLimit 題，且當大池夠大時就提前停止
  const allCandidates = [];
  const perScopeLimit = Math.max(5, Math.ceil(maxCount / 2)); // 每卷上限
  const targetPoolSize = maxCount * 3; // 大池目標大小：最多抓到 3 倍再停
  let done = false;

  for (const s of scopes) {
    if (done) break;

    // 切到該科目 / 年度 / 梯次
    subjectSel.value = s.subj;
    yearSel.value = s.year;
    roundSel.value = s.roundLabel;

    try {
      if (typeof onScopeChange === "function") {
        await onScopeChange(); // 這裡會去載入題目 + 答案檔
      }
    } catch (e) {
      console.error("onScopeChange error in cross-subject quiz:", e);
      continue;
    }

    // 這一卷裡所有「有答案的題目」
    const pool = (state.questions || []).filter(q => {
      const key = String(q.id);
      return Object.prototype.hasOwnProperty.call(state.answers || {}, key);
    });

    if (!pool.length) continue;

    // 先洗牌這一卷的題目，避免永遠只抓前面幾題
    const local = pool.slice();
    for (let i = local.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [local[i], local[j]] = [local[j], local[i]];
    }

    const take = Math.min(perScopeLimit, local.length);
    for (let i = 0; i < take; i++) {
      const q = local[i];
      const qid = String(q.id);
      const caRaw = String(state.answers[qid] || "").toUpperCase();
      const answerSet = Array.from(
        new Set(
          caRaw
            .split(",")
            .map(x => x.trim())
            .filter(Boolean)
        )
      );
      if (!answerSet.length) continue;

      // 把多張圖一起帶進來
      const images = Array.isArray(q.images)
        ? q.images
        : (q.image ? [q.image] : []);

      allCandidates.push({
        id: q.id,
        text: q.text,
        options: q.options,
        image: q.image,
        images,
        answerSet,
        scope: {
          subj: s.subj,
          year: s.year,
          roundLabel: s.roundLabel,
        },
      });

      if (allCandidates.length >= targetPoolSize) {
        done = true;
        break;
      }
    }
  }

  // 6. 抽題完成後，把畫面切回原本那一卷
  try {
    subjectSel.value = originalScope.subj;
    yearSel.value = originalScope.year;
    roundSel.value = originalScope.round;
    if (typeof onScopeChange === "function") {
      await onScopeChange();
    }
  } catch (e) {
    console.error("restore scope error after cross-subject quiz:", e);
  }

  // 7. 沒有可用題目就直接回傳空陣列
  if (!allCandidates.length) {
    return result;
  }

  // 8. 把所有候選題目洗牌，再抽 maxCount 題
  for (let i = allCandidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allCandidates[i], allCandidates[j]] = [allCandidates[j], allCandidates[i]];
  }

  const pickCount = Math.min(maxCount, allCandidates.length);
  for (let i = 0; i < pickCount; i++) {
    result.push(allCandidates[i]);
  }

  return result;
}

// 🔹 單一科目（本科目）跨卷抽題：只用目前選到的科目，從所有卷組成大題庫再亂數抽題
async function buildSingleSubjectQuizQuestions(maxCount, opts) {
  const result = [];
  if (!subjectSel || !yearSel || !roundSel) return result;

  // 目前選到的科目（本科目）
  const currentSubj = String(subjectSel.value || "").trim();
  if (!currentSubj) return result;

  // 1. 只用「目前科目」，年度 / 梯次則跟著選單全部跑
  const subjects = [currentSubj];
  let years = [];
  if (opts && Array.isArray(opts.years) && opts.years.length > 0) {
  years = opts.years;
  } else {
  years = Array.from(yearSel.options)
  .map(o => String(o.value || "").trim())
  .filter(Boolean);
  }

  const rounds = Array.from(roundSel.options || [])
    .map(o => {
      const text = (o.textContent || "").trim();
      const val = (o.value || "").trim();
      return text || val; // 例如「第一次」「第二次」
    })
    .filter(Boolean);

  // 2. 組合出所有要嘗試的 scope（但會跳過 110+ 年的「第二次」）
  const scopes = [];
  for (const subj of subjects) {
    for (const year of years) {
      const yearNum = Number(year);
      for (const raw of rounds) {
        const roundLabel = String(raw).trim();
        const isSecond =
          roundLabel === "第二次" ||
          roundLabel === "第二" ||
          roundLabel === "2";

        if (Number.isFinite(yearNum) && yearNum >= 110 && isSecond) {
          continue;
        }

        scopes.push({ subj, year, roundLabel });
      }
    }
  }

  if (!scopes.length) return result;

  // 3. 打亂 scopes 順序
  for (let i = scopes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [scopes[i], scopes[j]] = [scopes[j], scopes[i]];
  }

  // 4. 記下現在原本選到的卷別，抽題完要切回來
  const originalScope = {
    subj: subjectSel.value,
    year: yearSel.value,
    round: roundSel.value,
  };

  // 5. 走遍所有「本科目」的 scope，把題目統一丟進大池 allCandidates
  const allCandidates = [];
  const perScopeLimit = Math.max(5, Math.ceil(maxCount / 2));
  const targetPoolSize = maxCount * 3;
  let done = false;

  for (const s of scopes) {
    if (done) break;

    subjectSel.value = s.subj;
    yearSel.value = s.year;
    roundSel.value = s.roundLabel;

    try {
      if (typeof onScopeChange === "function") {
        await onScopeChange();
      }
    } catch (e) {
      console.error("onScopeChange error in single-subject quiz:", e);
      continue;
    }

    const pool = (state.questions || []).filter(q => {
      const key = String(q.id);
      return Object.prototype.hasOwnProperty.call(state.answers || {}, key);
    });

    if (!pool.length) continue;

    const local = pool.slice();
    for (let i = local.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [local[i], local[j]] = [local[j], local[i]];
    }

    const take = Math.min(perScopeLimit, local.length);
    for (let i = 0; i < take; i++) {
      const q = local[i];
      const qid = String(q.id);
      const caRaw = String(state.answers[qid] || "").toUpperCase();
      const answerSet = Array.from(
        new Set(
          caRaw
            .split(",")
            .map(x => x.trim())
            .filter(Boolean)
        )
      );
      if (!answerSet.length) continue;
      // ★ 新增：把多張圖一起帶進來
      const images = Array.isArray(q.images)
        ? q.images
        : (q.image ? [q.image] : []);
      allCandidates.push({
        id: q.id,
        text: q.text,
        options: q.options,
        image: q.image,
        images,           // ★ 新增：多圖陣列
        answerSet,
        scope: {
          subj: s.subj,
          year: s.year,
          roundLabel: s.roundLabel,
        },
      });

      if (allCandidates.length >= targetPoolSize) {
        done = true;
        break;
      }
    }
  }

  // 6. 抽題完成後，把畫面切回原本那一卷
  try {
    subjectSel.value = originalScope.subj;
    yearSel.value = originalScope.year;
    roundSel.value = originalScope.round;
    if (typeof onScopeChange === "function") {
      await onScopeChange();
    }
  } catch (e) {
    console.error("restore scope error after single-subject quiz:", e);
  }

  // 7. 沒有可用題目就直接回傳空陣列
  if (!allCandidates.length) {
    return result;
  }

  // 8. 把所有候選題目洗牌，再抽 maxCount 題
  for (let i = allCandidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allCandidates[i], allCandidates[j]] = [allCandidates[j], allCandidates[i]];
  }

  const pickCount = Math.min(maxCount, allCandidates.length);
  for (let i = 0; i < pickCount; i++) {
    result.push(allCandidates[i]);
  }

  return result;
}


// 隨機測驗直接沿用寵物小考的樣式
function ensureRandomQuizStyle() {
  if (typeof ensurePetQuizStyle === 'function') {
    ensurePetQuizStyle();
  }
}

function openRandomQuizOverlay(qs, options) {
  if (!Array.isArray(qs) || !qs.length) {
    alert('目前沒有可用的隨機題目。');
    return;
  }

  // 一樣先確保樣式注入（沿用 pet-quiz 樣式）
  ensureRandomQuizStyle();

  const old = document.getElementById('random-quiz-mask');
  if (old) old.remove();

  const mask = document.createElement('div');
  mask.id = 'random-quiz-mask';
  mask.className = 'pet-quiz-mask';

  mask.innerHTML = `
    <div class="pet-quiz-card">
      <div class="pet-quiz-head">
        <div class="pet-quiz-title">隨機測驗</div>
        <div class="pet-quiz-sub">
          共 <span id="rq-total">${qs.length}</span> 題
        </div>
      </div>
      <div class="pet-quiz-body">
        <div id="rq-qnum"  class="pet-quiz-qnum"></div>
        <div id="rq-qtext" class="pet-quiz-qtext"></div>
        <img  id="rq-qimg" class="pet-quiz-qimg" style="display:none;" alt="">
        <div id="rq-qimgs" class="pet-quiz-qimgs"></div>
        <div id="rq-opts"  class="pet-quiz-opts"></div>
      </div>
      <div class="pet-quiz-foot">
        <button id="rq-prev"   class="pet-quiz-btn">上一題</button>
        <button id="rq-next"   class="pet-quiz-btn">下一題</button>
        <button id="rq-submit" class="pet-quiz-btn pet-quiz-btn-primary">交卷並看成績</button>
        <button id="rq-close"  class="pet-quiz-btn">關閉</button>
      </div>
    </div>
  `;

  document.body.appendChild(mask);

  const elQNum  = document.getElementById('rq-qnum');
  const elQText = document.getElementById('rq-qtext');
  const elQImg  = document.getElementById('rq-qimg');
  const elQImgs = document.getElementById('rq-qimgs');
  const elOpts  = document.getElementById('rq-opts');
  const btnPrev = document.getElementById('rq-prev');
  const btnNext = document.getElementById('rq-next');
  const btnSubmit = document.getElementById('rq-submit');
  const btnClose  = document.getElementById('rq-close');

  let index = 0;
  const user = {};      // key: index -> 'A' | 'B'...
  const opts = options || {};
  let reviewMode = !!opts.startInReviewMode; // 若外面要求一開始就檢討模式

  // 如果有從外面傳進來的初始作答，就先放進 user
  if (opts.initialUser) {
    if (Array.isArray(opts.initialUser)) {
      opts.initialUser.forEach((val, i) => {
        if (!val) return;
        user[i] = String(val).trim().toUpperCase();
      });
    } else if (typeof opts.initialUser === 'object') {
      Object.keys(opts.initialUser).forEach(k => {
        const idx = Number(k);
        if (!Number.isFinite(idx) || idx < 0 || idx >= qs.length) return;
        const v = opts.initialUser[k];
        if (!v) return;
        user[idx] = String(v).trim().toUpperCase();
      });
    }
  }

  // 共同工具：把這一題的正確答案整理成 Set，例如 { 'A', 'B' }
  function getAnswerSet(q) {
    const set = new Set();
    if (!q) return set;

    // 1) 優先用 q.answerSet（隨機測驗預先塞好的）
    if (Array.isArray(q.answerSet) && q.answerSet.length) {
      q.answerSet.forEach(x => {
        const raw = String(x).toUpperCase();
        // 支援 "A/B" 或 "A,B" 這兩種分隔
        raw.split(/[\/,]/)
          .map(t => t.trim())
          .filter(Boolean)
          .forEach(ch => set.add(ch));
      });
    } else if (window.state && state.answers && q.id != null) {
      // 2) 保險：如果沒有 answerSet，就直接從全域 state.answers 解析一次
      const key = String(q.id);
      const raw = String(state.answers[key] || '').toUpperCase();
      raw.split(/[\/,]/)
        .map(t => t.trim())
        .filter(Boolean)
        .forEach(ch => set.add(ch));
    }

    return set;
  }

  function render() {
    const q = qs[index];
    if (!q) return;

    const src = q.scope
      ? `（${q.scope.year || ''}年 ${q.scope.roundLabel || ''} ${q.scope.subj || ''} ）`
      : '';
    elQNum.textContent = `第 ${index + 1} / ${qs.length} 題 ${src}`;

    elQText.innerHTML = (q.text || '');

    if (q.image) {
      const raw = resolveImage(q.image);
      elQImg.src = raw;
      elQImg.style.display = '';
    } else {
      elQImg.removeAttribute('src');
      elQImg.style.display = 'none';
    }

    // 額外圖片：顯示在 rq-qimgs 容器（第二張之後）
    if (elQImgs) {
      elQImgs.innerHTML = '';
      const imgs = Array.isArray(q.images) ? q.images : [];

      if (imgs.length > 1) {
        imgs.slice(1).forEach(src => {
          const url = resolveImage(src);
          if (!url) return;
          const imgEl = document.createElement('img');
          imgEl.src = url;
          imgEl.alt = (q.text || '').slice(0, 40);
          elQImgs.appendChild(imgEl);
        });
      }
    }

    elOpts.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];
    const current = (user[index] || '').toUpperCase();
    const ansSet = getAnswerSet(q);

    letters.forEach(L => {
      const text = q.options && q.options[L] ? q.options[L] : '';
      if (!text) return;

      const row = document.createElement('div');
      row.className = 'pet-quiz-opt-row';

      const rb = document.createElement('input');
      rb.type = 'radio';
      rb.name = 'rq-opt';
      rb.value = L;
      rb.checked = (current === L);
      rb.disabled = reviewMode; // 檢討模式中不能改選
      rb.onchange = () => {
        if (reviewMode) return;
        user[index] = L;
      };

      const span = document.createElement('span');
      span.className = 'pet-quiz-opt-text';
      span.textContent = `${L}. ${text}`;
      row.appendChild(rb);
      row.appendChild(span);

      // 🔸 檢討模式：標示你選 & 正解
      if (reviewMode) {
        const note = document.createElement('span');
        note.className = 'pet-quiz-opt-note';

        const isUser = (current === L);
        const isCorrect = ansSet.has(L) || ansSet.has('ALL');

        let labelParts = [];
        if (isUser)   labelParts.push('你選');
        if (isCorrect) labelParts.push('正解');

        if (labelParts.length) {
          note.textContent = labelParts.join(' / ');

          if (isUser && isCorrect) {
            // ✅ 你有選，而且選對：你選 / 正解 → 藍字
            note.style.color = '#2f74ff';
            span.style.fontWeight = '600';
          } else if (!isUser && isCorrect) {
            // ✅ 正解但你沒選到：只顯示「正解」→ 紅字
            note.style.color = '#c40000';
            span.style.fontWeight = '600';
          } else if (isUser) {
            // ❌ 你選了但不是正解：只顯示「你選」→ 藍字
            note.style.color = '#2f74ff';
          }

          row.appendChild(note);
        }
      }

      elOpts.appendChild(row);
    });

    btnPrev.disabled = (index === 0);
    btnNext.disabled = (index === qs.length - 1);

    // 🔸 檢討模式時，把主按鈕文字改成「重新作答」
    btnSubmit.textContent = reviewMode ? '重新作答' : '交卷並看成績';
  }

  function closeOverlay() {
    try { mask.remove(); } catch {}
  }

  function doSubmitOnce() {
    // 第一次交卷：算分＋寫入隨機測驗紀錄，再進入檢討模式
    let correct = 0;
    const total = qs.length;
    const detail = [];

    qs.forEach((q, i) => {
      const ua = String(user[i] || '').toUpperCase();
      const set = getAnswerSet(q);

      // 判斷對錯：
      // - 一般情況：ua 在正確集合裡 → 對
      // - 特殊：如果答案有寫 'ALL'，代表任一選項都接受，但空白不算對
      const isCorrect =
        !!ua && (set.has(ua) || set.has('ALL'));

      if (isCorrect) correct++;

      // 顯示用的正解字串：優先用原始答案檔，沒有再用 set 組回去
      let correctAnsStr = '';
      if (window.state && state.answers && q.id != null) {
        const key = String(q.id);
        correctAnsStr = String(state.answers[key] || '').toUpperCase();
      }
      if (!correctAnsStr) {
        correctAnsStr = Array.from(set).join('/');
      }

      detail.push({
        subj: q.scope?.subj || '',
        year: q.scope?.year || '',
        roundLabel: q.scope?.roundLabel || '',
        id: q.id,
        userAns: ua || '',
        correctAns: correctAnsStr || ''
      });
    });

    const score = total ? ((correct / total) * 100).toFixed(2) : '0.00';

    // 🔸寫入隨機測驗紀錄
    try {
      const now = new Date();
      const ts = now.toLocaleString('zh-TW', { hour12: false });

      const record = {
        ts,
        count: total,
        correctCount: correct,
        questions: detail
      };

      randomQuizRecords.unshift(record);
      if (randomQuizRecords.length > 50) {
        randomQuizRecords = randomQuizRecords.slice(0, 50);
      }
      saveRandomQuizRecords();
    } catch (e) {
      console.error('寫入隨機測驗紀錄失敗：', e);
    }

    alert(`分數：${score} 分（${correct}/${total}）`);

    reviewMode = true;
    index = 0;
    render();
  }

  function resetAnswers() {
    const ok = window.confirm('清除前一次作答，再答一次');
    if (!ok) return;
    Object.keys(user).forEach(k => { delete user[k]; });
    index = 0;
    reviewMode = false;
    render();
  }

  btnPrev.onclick = () => {
    if (index > 0) {
      index--;
      render();
    }
  };
  btnNext.onclick = () => {
    if (index < qs.length - 1) {
      index++;
      render();
    }
  };

  // 🔸 同一顆按鈕：沒檢討時→交卷，檢討中→重新作答
  btnSubmit.onclick = () => {
    if (!reviewMode) {
      doSubmitOnce();
    } else {
      resetAnswers();
    }
  };

  btnClose.onclick  = closeOverlay;

  mask.addEventListener('click', e => {
    if (e.target === mask) {
      // 點背景目前不關
    }
  });

  render();
}


// ===== 隨機測驗：跨卷抽題＋自己的作答紀錄 =====

// 專門給隨機測驗紀錄用的 localStorage key
const RANDOM_QUIZ_RECORDS_KEY = 'ntuvm-random-quiz-records';

// [{ ts, count, correctCount, questions:[{subj,year,roundLabel,id,userAns,correctAns}] }]
let randomQuizRecords = [];

/** 載入隨機測驗紀錄 */
function loadRandomQuizRecords() {
  try {
    const raw = localStorage.getItem(RANDOM_QUIZ_RECORDS_KEY);
    randomQuizRecords = raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('載入隨機測驗紀錄失敗：', e);
    randomQuizRecords = [];
  }
}

/** 儲存隨機測驗紀錄 */
function saveRandomQuizRecords() {
  try {
    localStorage.setItem(RANDOM_QUIZ_RECORDS_KEY, JSON.stringify(randomQuizRecords));
  } catch (e) {
    console.error('儲存隨機測驗紀錄失敗：', e);
  }
}

/**
 * 從一筆隨機測驗紀錄重建當時的題目內容，並打開回顧用的 overlay
 * 會依 rec.questions 的順序顯示題目，並帶入當時的 userAns。
 */
async function openRandomQuizFromRecord(rec) {
  // 顯示載入中遮罩（特別給回顧用）
  showRandomQuizLoading('隨機測驗紀錄載入中，請稍候…');

  try {
    if (!rec || !Array.isArray(rec.questions) || !rec.questions.length) {
      alert('這筆紀錄沒有詳細題目資料，無法回顧。');
      return;
    }

    const scopeCache = {}; // key: `${subj}|${year}|${roundLabel}` -> 該卷所有題目
    const rebuilt = [];

    for (const item of rec.questions) {
      const subj = item.subj || '';
      const year = item.year || '';
      const roundLabel = item.roundLabel || '';
      const qid = item.id;

      if (!subj || !year || !roundLabel || qid == null) continue;

      const key = `${subj}|${year}|${roundLabel}`;
      if (!scopeCache[key]) {
        try {
          scopeCache[key] = await loadQuestionsForScope(subj, year, roundLabel);
        } catch (e) {
          console.error('loadQuestionsForScope failed in openRandomQuizFromRecord:', e);
          scopeCache[key] = [];
        }
      }

      const qsInScope = scopeCache[key] || [];
      if (!qsInScope.length) continue;

      const full = qsInScope.find(q => String(q.id) === String(qid));
      if (!full) continue;

      // 用當時紀錄下來的 correctAns 來算 answerSet（避免後來改答案檔影響回顧）
      const caRaw = String(item.correctAns || '').toUpperCase();
      const answerSet = Array.from(new Set(
        caRaw.split(/[\/,]/).map(s => s.trim()).filter(Boolean)
      ));

      rebuilt.push({
        id: full.id,
        text: full.text,
        options: full.options,
        image: full.image,
        images: Array.isArray(full.images)
          ? full.images
          : (full.image ? [full.image] : []),
        answerSet,
        scope: {
          subj,
          year,
          roundLabel,
        },
      });
    }

    if (!rebuilt.length) {
      alert('找不到這筆紀錄對應的題目，可能題庫已刪除或改版。');
      return;
    }

    // 依照當時的作答順序，整理出初始 userAns 陣列（index 對應 rec.questions 順序）
    const initialUser = rec.questions.map(q =>
      String(q.userAns || '').trim().toUpperCase()
    );

    // 直接開隨機測驗 overlay，從檢討模式開始
    openRandomQuizOverlay(rebuilt, {
      startInReviewMode: true,
      initialUser,
    });
  } catch (e) {
    console.error('openRandomQuizFromRecord 失敗：', e);
    alert('載入這筆隨機測驗紀錄時發生錯誤，請稍後再試。');
  } finally {
    // 不論成功或失敗，都關掉載入中遮罩
    hideRandomQuizLoading();
  }
}


// 單次隨機測驗的狀態（純測驗，不牽涉寵物）
const randomQuizState = {
  active: false,
  questions: [],   // [{ id, text, options, image, answerSet, scope:{subj,year,roundLabel} }]
  user: {},        // { qid: 'A', ... }
  index: 0,
  reviewMode: false,
  submitCount: 0
};

/** 共用 pet-quiz 的 CSS */
function ensureRandomQuizStyle() {
  if (typeof ensurePetQuizStyle === 'function') {
    ensurePetQuizStyle(); // 這個函式在寵物小測驗那邊已經有定義
  }
}

/** 關閉隨機測驗本體 overlay */
function closeRandomQuizOverlay() {
  const mask = document.getElementById('random-quiz-mask');
  if (mask) mask.remove();
  randomQuizState.active = false;
}

/** 顯示「隨機測驗作答紀錄」列表（可刪除單筆 & 回顧） */
function openRandomQuizRecordsOverlay() {
  loadRandomQuizRecords();

  const old = document.getElementById('random-quiz-records-mask');
  if (old) old.remove();

  const mask = document.createElement('div');
  mask.id = 'random-quiz-records-mask';
  mask.style.position = 'fixed';
  mask.style.inset = '0';
  mask.style.zIndex = '100011';
  mask.style.background = 'rgba(0,0,0,0.5)';
  mask.style.display = 'flex';
  mask.style.alignItems = 'center';
  mask.style.justifyContent = 'center';
  mask.style.padding = '16px';

  const card = document.createElement('div');
  card.style.background = 'var(--card, #1b1b1b)';
  card.style.color = 'var(--fg, #fff)';
  card.style.borderRadius = '14px';
  card.style.border = '1px solid var(--border, #333)';
  card.style.maxWidth = '720px';
  card.style.width = '100%';
  card.style.maxHeight = '90vh';
  card.style.padding = '16px';
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.gap = '8px';
  card.style.overflow = 'auto';

  const head = document.createElement('div');
  head.style.display = 'flex';
  head.style.justifyContent = 'space-between';
  head.style.alignItems = 'center';
  head.style.gap = '8px';

  const title = document.createElement('div');
  title.textContent = '隨機測驗作答紀錄';
  title.style.fontSize = '16px';
  title.style.fontWeight = '700';

  const headRight = document.createElement('div');
  headRight.style.display = 'flex';
  headRight.style.gap = '6px';

  // 關閉按鈕
  const btnClose = document.createElement('button');
  btnClose.textContent = '關閉';
  btnClose.style.borderRadius = '9999px';
  btnClose.style.border = '1px solid var(--border, #444)';
  btnClose.style.background = 'transparent';
  btnClose.style.color = 'var(--fg, #fff)';
  btnClose.style.padding = '4px 10px';
  btnClose.style.cursor = 'pointer';
  btnClose.style.fontSize = '13px';
  btnClose.onclick = () => mask.remove();

  // 清空全部紀錄
  const btnClearAll = document.createElement('button');
  btnClearAll.textContent = '全部清除';
  btnClearAll.style.borderRadius = '9999px';
  btnClearAll.style.border = '1px solid var(--border, #444)';
  btnClearAll.style.background = 'transparent';
  btnClearAll.style.color = 'var(--muted, #aaa)';
  btnClearAll.style.padding = '4px 10px';
  btnClearAll.style.cursor = 'pointer';
  btnClearAll.style.fontSize = '13px';

  btnClearAll.onclick = () => {
    if (!randomQuizRecords.length) return;
    const ok = window.confirm('確定要刪除所有隨機測驗紀錄嗎？這個動作無法復原。');
    if (!ok) return;
    randomQuizRecords = [];
    saveRandomQuizRecords();
    mask.remove();
  };

  headRight.appendChild(btnClearAll);
  headRight.appendChild(btnClose);

  head.appendChild(title);
  head.appendChild(headRight);

  const body = document.createElement('div');
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.gap = '8px';
  body.style.fontSize = '14px';

  if (!randomQuizRecords.length) {
    const empty = document.createElement('div');
    empty.textContent = '目前還沒有隨機測驗紀錄。';
    body.appendChild(empty);
  } else {
    randomQuizRecords.forEach((rec, idx) => {
      const box = document.createElement('div');
      box.style.border = '1px solid var(--border, #333)';
      box.style.borderRadius = '10px';
      box.style.padding = '8px 10px';
      box.style.background = 'rgba(255,255,255,0.02)';
      box.style.display = 'flex';
      box.style.flexDirection = 'column';
      box.style.gap = '4px';

      // 每一筆紀錄自己的頭（時間 + 成績 + 回顧 + 刪除）
      const headLine = document.createElement('div');
      headLine.style.display = 'flex';
      headLine.style.justifyContent = 'space-between';
      headLine.style.alignItems = 'center';
      headLine.style.gap = '6px';

      const left = document.createElement('span');
      left.textContent = rec.ts || '';

      const middle = document.createElement('span');
      middle.textContent = `${rec.correctCount}/${rec.count} 題正確`;
      middle.style.flex = '0 0 auto';

      const btnReview = document.createElement('button');
      btnReview.textContent = '回顧';
      btnReview.style.borderRadius = '9999px';
      btnReview.style.border = '1px solid var(--border, #444)';
      btnReview.style.background = 'transparent';
      btnReview.style.color = 'var(--accent, #2f74ff)';
      btnReview.style.padding = '2px 8px';
      btnReview.style.cursor = 'pointer';
      btnReview.style.fontSize = '12px';
      btnReview.style.flex = '0 0 auto';
      btnReview.onclick = () => {
        try { mask.remove(); } catch {}
        openRandomQuizFromRecord(rec);
      };

      const btnDel = document.createElement('button');
      btnDel.textContent = '刪除這筆';
      btnDel.style.borderRadius = '9999px';
      btnDel.style.border = '1px solid var(--border, #444)';
      btnDel.style.background = 'transparent';
      btnDel.style.color = 'var(--muted, #aaa)';
      btnDel.style.padding = '2px 8px';
      btnDel.style.cursor = 'pointer';
      btnDel.style.fontSize = '12px';
      btnDel.style.flex = '0 0 auto';

      btnDel.onclick = () => {
        const ok = window.confirm('確定要刪除這筆隨機測驗紀錄嗎？');
        if (!ok) return;
        randomQuizRecords.splice(idx, 1);
        saveRandomQuizRecords();
        mask.remove();
        openRandomQuizRecordsOverlay();
      };

      headLine.appendChild(left);
      headLine.appendChild(middle);
      headLine.appendChild(btnReview);
      headLine.appendChild(btnDel);

      box.appendChild(headLine);

      // 題目明細
      if (Array.isArray(rec.questions) && rec.questions.length) {
        rec.questions.forEach(q => {
          const line = document.createElement('div');
          line.style.fontSize = '13px';
          line.style.color = 'var(--muted, #aaa)';

          const parts = [];
          if (q.subj) parts.push(q.subj);
          if (q.year) parts.push(`${q.year} 年`);
          if (q.roundLabel) parts.push(` ${q.roundLabel} `);
          if (q.id != null) parts.push(`第 ${q.id} 題`);
          const src = parts.join('  ') || '來源未知';

          const ua = q.userAns || '-';
          const ca = q.correctAns || '-';

          line.textContent = `${src}｜作答：${ua}｜正解：${ca}`;
          box.appendChild(line);
        });
      }

      body.appendChild(box);
    });
  }

  card.appendChild(head);
  card.appendChild(body);
  mask.appendChild(card);
  document.body.appendChild(mask);

  mask.addEventListener('click', e => {
    if (e.target === mask) mask.remove();
  });
}


// 共用：隨機測驗載入中遮罩
function showRandomQuizLoading(message) {
  // 若已經有就不要重複建立
  if (document.getElementById('random-quiz-loading-mask')) return;

  const mask = document.createElement('div');
  mask.id = 'random-quiz-loading-mask';
  mask.style.position = 'fixed';
  mask.style.inset = '0';
  mask.style.zIndex = '100020';
  mask.style.background = 'rgba(0,0,0,0.6)';
  mask.style.display = 'flex';
  mask.style.alignItems = 'center';
  mask.style.justifyContent = 'center';
  mask.style.padding = '16px';

  const box = document.createElement('div');
  box.style.background = 'var(--card, #1b1b1b)';
  box.style.color = 'var(--fg, #fff)';
  box.style.borderRadius = '12px';
  box.style.border = '1px solid var(--border, #333)';
  box.style.padding = '16px 20px';
  box.style.fontSize = '14px';
  box.style.display = 'flex';
  box.style.alignItems = 'center';
  box.style.gap = '8px';

  const dot = document.createElement('span');
  dot.textContent = '●';
  dot.style.color = 'var(--accent, #2f74ff)';
  dot.style.fontSize = '18px';

  const text = document.createElement('span');
  text.textContent = message || '隨機題目載入中，請稍候…';

  box.appendChild(dot);
  box.appendChild(text);
  mask.appendChild(box);
  document.body.appendChild(mask);
}

function hideRandomQuizLoading() {
  const mask = document.getElementById('random-quiz-loading-mask');
  if (mask) {
    try { mask.remove(); } catch {}
  }
}
// 新增：跨科別隨機測驗時，先讓使用者勾要抽的科目（可複選）
function openRandomQuizCrossSubjectOverlay(questionCount, preselectedYears) {
  // 如果之前有殘留就先砍掉
  const old = document.getElementById('random-quiz-cross-mask');
  if (old) {
    try { old.remove(); } catch {}
  }

  const mask = document.createElement('div');
  mask.id = 'random-quiz-cross-mask';
  mask.style.position = 'fixed';
  mask.style.inset = '0';
  mask.style.zIndex = '100015';
  mask.style.background = 'rgba(0, 0, 0, 0.6)';
  mask.style.display = 'flex';
  mask.style.alignItems = 'center';
  mask.style.justifyContent = 'center';
  mask.style.padding = '16px';

  const card = document.createElement('div');
  card.style.background = 'var(--card, #1b1b1b)';
  card.style.color = 'var(--fg, #fff)';
  card.style.borderRadius = '14px';
  card.style.border = '1px solid var(--border, #333)';
  card.style.maxWidth = '420px';
  card.style.width = '100%';
  card.style.padding = '16px';
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.gap = '10px';

  const title = document.createElement('div');
  title.textContent = '請勾選要抽題的科目';
  title.style.fontSize = '16px';
  title.style.fontWeight = '700';

  const hint = document.createElement('div');
  hint.textContent = '例如：病理 + 藥理 + 普通疾病等，至少勾選一個科目。';
  hint.style.fontSize = '13px';
  hint.style.color = 'var(--muted, #aaa)';

  const list = document.createElement('div');
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = '6px';
  list.style.maxHeight = '55vh';
  list.style.overflow = 'auto';
  list.style.marginTop = '4px';
  list.style.marginBottom = '4px';

  // 從 subjectSel 的選項自動抓所有科目，做成勾選清單
  if (subjectSel) {
    const seen = new Set();
    Array.from(subjectSel.options || []).forEach(opt => {
      const value = String(opt.value || '').trim();
      if (!value || seen.has(value)) return;
      seen.add(value);

      const labelText = (opt.textContent || opt.label || value).trim() || value;

      const row = document.createElement('label');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '8px';
      row.style.fontSize = '14px';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = value;
      cb.checked = true; // 預設全部勾選

      const span = document.createElement('span');
      span.textContent = labelText;

      row.appendChild(cb);
      row.appendChild(span);
      list.appendChild(row);
    });
  }

  const rowButtons = document.createElement('div');
  rowButtons.style.display = 'flex';
  rowButtons.style.justifyContent = 'flex-end';
  rowButtons.style.gap = '8px';
  rowButtons.style.marginTop = '8px';

  const btnCancel = document.createElement('button');
  btnCancel.textContent = '取消';
  btnCancel.style.padding = '6px 12px';
  btnCancel.style.borderRadius = '9999px';
  btnCancel.style.border = '1px solid var(--border, #444)';
  btnCancel.style.background = 'transparent';
  btnCancel.style.color = 'var(--fg, #fff)';
  btnCancel.style.cursor = 'pointer';
  btnCancel.style.fontSize = '14px';
  btnCancel.onclick = () => {
    try { mask.remove(); } catch {}
  };

  const btnOk = document.createElement('button');
  btnOk.textContent = '開始隨機測驗';
  btnOk.style.padding = '6px 12px';
  btnOk.style.borderRadius = '9999px';
  btnOk.style.border = '1px solid var(--accent, #2f74ff)';
  btnOk.style.background = 'var(--accent, #2f74ff)';
  btnOk.style.color = '#fff';
  btnOk.style.cursor = 'pointer';
  btnOk.style.fontSize = '14px';

  btnOk.onclick = async () => {
    const checked = Array.from(
      list.querySelectorAll('input[type="checkbox"]:checked')
    ).map(cb => String(cb.value || '').trim())
     .filter(Boolean);

    if (!checked.length) {
      alert('請至少勾選一個科目');
      return;
    }
    const checkedYears = Array.from(new Set(
      (Array.isArray(preselectedYears) ? preselectedYears : getAllYearValuesForCurrentSubject())
        .map(v => String(v || '').trim())
        .filter(Boolean)
    ));

    if (!checkedYears.length) {
      alert('請至少選擇一個年份！');
      return;
    }
    
    try { mask.remove(); } catch {}

    // 這裡才真正去抽題
    showRandomQuizLoading('隨機抽題中，請稍候…');
    try {
      const qs = await buildCrossVolumeQuizQuestions(questionCount, { 
                subjects: checked,
                years: checkedYears // 傳入我們選好的年份
      });
      if (!qs || !qs.length) {
        alert('找不到符合條件的題目 QQ');
        return;
      }
      openRandomQuizOverlay(qs);
    } catch (e) {
      console.error('cross-subject random quiz failed', e);
      alert('抽題時發生錯誤 QQ');
    } finally {
      hideRandomQuizLoading();
    }
  };

  rowButtons.appendChild(btnCancel);
  rowButtons.appendChild(btnOk);

  card.appendChild(title);
  card.appendChild(hint);
  card.appendChild(list);

  card.appendChild(rowButtons);

  mask.appendChild(card);
  document.body.appendChild(mask);

  // 點遮罩空白處也可以關閉
  mask.addEventListener('click', (e) => {
    if (e.target === mask) {
      try { mask.remove(); } catch {}
    }
  });
}


/** 打開「隨機測驗準備視窗」：直接選 5 / 10 / 15 / 20 題，或看紀錄 */
function openRandomQuizPrepOverlay() {
  ensureRandomQuizStyle();
  loadRandomQuizRecords();

  const old = document.getElementById('random-quiz-prep-mask');
  if (old) old.remove();

  const mask = document.createElement('div');
  mask.id = 'random-quiz-prep-mask';
  mask.style.position = 'fixed';
  mask.style.inset = '0';
  mask.style.zIndex = '100010';
  mask.style.background = 'rgba(0,0,0,0.5)';
  mask.style.display = 'flex';
  mask.style.alignItems = 'center';
  mask.style.justifyContent = 'center';
  mask.style.padding = '16px';

  const card = document.createElement('div');
  card.style.background = 'var(--card, #1b1b1b)';
  card.style.color = 'var(--fg, #fff)';
  card.style.borderRadius = '14px';
  card.style.border = '1px solid var(--border, #333)';
  card.style.maxWidth = '420px';
  card.style.width = '100%';
  card.style.padding = '16px';
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.gap = '12px';

  // 🔹 目前抽題模式：subject = 本科目（預設） / cross = 跨科別
  let currentScopeMode = 'subject';

  // 🔹 本科目 / 跨科別 按鈕列（第一行）
  const rowScope = document.createElement('div');
  rowScope.style.display = 'flex';
  rowScope.style.gap = '8px';

  const btnSubject = document.createElement('button');
  btnSubject.textContent = '本科目';
  btnSubject.style.flex = '1';
  btnSubject.style.minWidth = '0';
  btnSubject.style.padding = '8px 0';
  btnSubject.style.borderRadius = '9999px';
  btnSubject.style.border = '1px solid var(--border, #444)';
  btnSubject.style.cursor = 'pointer';
  btnSubject.style.fontSize = '14px';

  const btnCross = document.createElement('button');
  btnCross.textContent = '跨科別';
  btnCross.style.flex = '1';
  btnCross.style.minWidth = '0';
  btnCross.style.padding = '8px 0';
  btnCross.style.borderRadius = '9999px';
  btnCross.style.border = '1px solid var(--border, #444)';
  btnCross.style.cursor = 'pointer';
  btnCross.style.fontSize = '14px';

  // 共用：依 currentScopeMode 更新兩顆按鈕樣式
  function refreshScopeButtons() {
    if (currentScopeMode === 'subject') {
      // 本科目選中
      btnSubject.style.background = 'var(--accent, #2f74ff)';
      btnSubject.style.color = '#fff';
      btnSubject.style.borderColor = 'var(--accent, #2f74ff)';

      btnCross.style.background = 'transparent';
      btnCross.style.color = 'var(--fg, #fff)';
      btnCross.style.borderColor = 'var(--border, #444)';
    } else {
      // 跨科別選中
      btnCross.style.background = 'var(--accent, #2f74ff)';
      btnCross.style.color = '#fff';
      btnCross.style.borderColor = 'var(--accent, #2f74ff)';

      btnSubject.style.background = 'transparent';
      btnSubject.style.color = 'var(--fg, #fff)';
      btnSubject.style.borderColor = 'var(--border, #444)';
    }
  }

  btnSubject.onclick = () => {
    currentScopeMode = 'subject';
    refreshScopeButtons();
  };
  btnCross.onclick = () => {
    currentScopeMode = 'cross';
    refreshScopeButtons();
  };

  // 預設：本科目模式
  currentScopeMode = 'subject';
  refreshScopeButtons();

  rowScope.appendChild(btnSubject);
  rowScope.appendChild(btnCross);
  const yearConfigRow = document.createElement("div");
  yearConfigRow.style.display = "flex";
  yearConfigRow.style.alignItems = "center";
  yearConfigRow.style.gap = "8px";
  yearConfigRow.style.marginBottom = "8px";

  // 2. 建立「選擇年份」切換按鈕
  const btnToggleYear = document.createElement("button");
  btnToggleYear.textContent = "選擇年份 (預設全部)";
  btnToggleYear.className = "pet-quiz-btn"; // 使用現有的樣式 class
  btnToggleYear.style.fontSize = "13px";
  btnToggleYear.style.padding = "4px 10px";

  // 3. 建立年份勾選清單的容器 (預設隱藏)
  const yearListContainer = document.createElement("div");
  yearListContainer.style.display = "none"; // 預設摺疊
  yearListContainer.style.flexWrap = "wrap";
  yearListContainer.style.gap = "8px";
  yearListContainer.style.padding = "8px";
  yearListContainer.style.border = "1px solid var(--border)";
  yearListContainer.style.borderRadius = "8px";
  yearListContainer.style.marginTop = "4px";
  yearListContainer.style.maxHeight = "150px";
  yearListContainer.style.overflowY = "auto";

  // 4. 取得目前所有的年份選項並產生 Checkbox
  const allYearOpts = Array.from(yearSel.options)
  .map(o => String(o.value || "").trim())
  .filter(Boolean);

  allYearOpts.forEach(y => {
  const label = document.createElement("label");
  label.style.display = "flex";
  label.style.alignItems = "center";
  label.style.gap = "4px";
  label.style.fontSize = "13px";
  label.style.cursor = "pointer";
  label.style.marginRight = "8px";

  const chk = document.createElement("input");
  chk.type = "checkbox";
  chk.value = y;
  chk.checked = true; // 預設全選

  // 綁定事件：如果有人取消勾選，按鈕文字就變「自訂年份」
  chk.addEventListener('change', () => {
  const checkedCount = yearListContainer.querySelectorAll('input:checked').length;
  if (checkedCount === 0) {
  btnToggleYear.textContent = "請至少選一個年份";
  btnToggleYear.style.color = "#ff6b6b";
  } else if (checkedCount === allYearOpts.length) {
  btnToggleYear.textContent = "選擇年份 (預設全部)";
  btnToggleYear.style.color = "";
  } else {
  btnToggleYear.textContent = `已選 ${checkedCount} 個年份`;
  btnToggleYear.style.color = "var(--accent)";
  }
  });

  label.appendChild(chk);
  label.appendChild(document.createTextNode(y + "年"));
  yearListContainer.appendChild(label);
  });

  // 5. 按鈕點擊事件：切換顯示/隱藏
  btnToggleYear.onclick = () => {
  if (yearListContainer.style.display === "none") {
  yearListContainer.style.display = "flex";
  } else {
  yearListContainer.style.display = "none";
  }
  };

  // 全選/全不選的小工具 (可選)
  const btnToggleAllYears = document.createElement("button");
  btnToggleAllYears.textContent = "全選/全取消";
  btnToggleAllYears.style.fontSize = "12px";
  btnToggleAllYears.style.marginLeft = "auto";
  btnToggleAllYears.style.background = "transparent";
  btnToggleAllYears.style.border = "none";
  btnToggleAllYears.style.color = "var(--muted)";
  btnToggleAllYears.style.cursor = "pointer";
  btnToggleAllYears.onclick = () => {
  const inputs = yearListContainer.querySelectorAll("input");
  const allChecked = Array.from(inputs).every(i => i.checked);
  inputs.forEach(i => {
  i.checked = !allChecked;
  // 觸發 change 事件以更新按鈕文字
  i.dispatchEvent(new Event('change'));
  });
  };
  yearListContainer.prepend(btnToggleAllYears); // 把全選按鈕放在最前面
  yearConfigRow.appendChild(btnToggleYear);

  const title = document.createElement('div');
  title.textContent = '選擇題數';
  title.style.fontWeight = '700';
  title.style.fontSize = '16px';

  const row1 = document.createElement('div');
  row1.style.display = 'flex';
  row1.style.flexWrap = 'wrap';
  row1.style.gap = '8px';

  const counts = [5, 10, 15, 20];


  const makeCountBtn = (n) => {
    const btn = document.createElement('button');
    btn.textContent = String(n);
    btn.style.flex = '1';
    btn.style.minWidth = '0';
    btn.style.padding = '8px 0';
    btn.style.borderRadius = '9999px';
    btn.style.border = '1px solid var(--border, #444)';
    btn.style.background = 'var(--pill, #222)';
    btn.style.color = 'var(--fg, #fff)';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '14px';

    btn.onclick = async () => {
      // 關掉準備視窗本身
      try { mask.remove(); } catch {}
      const checkedYears = Array.from(yearListContainer.querySelectorAll('input:checked'))
      .map(cb => String(cb.value || "").trim())
      .filter(Boolean);

      if (!checkedYears.length) {
      alert("請至少選擇一個年份！");
      return;
      }
      // 🔹跨科別模式：先開「科目複選」視窗，由那邊再去抽題
      if (currentScopeMode === 'cross') {
        openRandomQuizCrossSubjectOverlay(n, checkedYears);
        return;
      }

      // 🔹單科模式：維持原本流程，直接抽題
      showRandomQuizLoading('隨機抽題中，請稍候…');
      try {
        const qs = await buildSingleSubjectQuizQuestions(n, { years: checkedYears });
        if (!qs || !qs.length) {
          alert('找不到任何可用題目 QQ');
          return;
        }
        openRandomQuizOverlay(qs);
      } catch (e) {
        console.error('random quiz prep failed', e);
        alert('抽題時發生錯誤 QQ');
      } finally {
        hideRandomQuizLoading();
      }
    };

    return btn;
  };

  counts.forEach(n => row1.appendChild(makeCountBtn(n)));

  const row2 = document.createElement('div');
  row2.style.display = 'flex';
  row2.style.marginTop = '4px';

  const btnRecords2 = document.createElement('button');
  btnRecords2.textContent = '隨機測驗作答紀錄';
  btnRecords2.style.flex = '1';
  btnRecords2.style.padding = '8px 0';
  btnRecords2.style.borderRadius = '9999px';
  btnRecords2.style.border = '1px solid var(--border, #444)';
  btnRecords2.style.background = 'transparent';
  btnRecords2.style.color = 'var(--accent, #2f74ff)';
  btnRecords2.style.cursor = 'pointer';
  btnRecords2.style.fontSize = '14px';
  btnRecords2.onclick = () => {
    mask.remove();
    openRandomQuizRecordsOverlay();
  };

  const row3 = document.createElement('div');
  row3.style.display = 'flex';
  row3.style.justifyContent = 'flex-end';

  const btnCancel = document.createElement('button');
  btnCancel.textContent = '關閉';
  btnCancel.style.padding = '6px 12px';
  btnCancel.style.borderRadius = '9999px';
  btnCancel.style.border = '1px solid var(--border, #444)';
  btnCancel.style.background = 'transparent';
  btnCancel.style.color = 'var(--fg, #fff)';
  btnCancel.style.cursor = 'pointer';
  btnCancel.style.fontSize = '14px';
  btnCancel.onclick = () => mask.remove();

  row2.appendChild(btnRecords2);
  row3.appendChild(btnCancel);

  card.appendChild(title);
  card.appendChild(rowScope);
  card.appendChild(row1);
  card.appendChild(yearConfigRow);
  card.appendChild(yearListContainer);
  card.appendChild(row2);
  card.appendChild(row3);
  mask.appendChild(card);
  document.body.appendChild(mask);

  mask.addEventListener('click', e => {
    if (e.target === mask) mask.remove();
  });
}


// 載入隨機測驗紀錄（初始化）
try {
  loadRandomQuizRecords();
} catch (e) {
  console.error('初始化隨機測驗紀錄失敗：', e);
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
      <div class="pet-quiz-qimgs" id="pet-quiz-qimgs"></div>
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
  const qimgsEl = document.getElementById('pet-quiz-qimgs'); // ★ 新增：多圖容器

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
  // 額外圖片：顯示在 pet-quiz-qimgs 容器（第二張之後）
  if (qimgsEl) {
    qimgsEl.innerHTML = '';

    const imgs = Array.isArray(q.images) ? q.images : [];

    // 只有多於一張時才畫第二張之後，第一張交給 qimgEl
    if (imgs.length > 1) {
      imgs.slice(1).forEach(src => {
        const url = resolveImage(src);
        if (!url) return;
        const img = document.createElement('img');
        img.src = url;
        img.alt = (q.text || '').slice(0, 40);
        qimgsEl.appendChild(img);
      });
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

async function saveNotes(scopeOverride) {
  try {
    if (!editor) return;

    const ctx = getCurrentNoteContext();
    const q = ctx.q;
    if (!q) return;

    const scope = scopeOverride || ctx.scope;
    const k = keyForNote(q.id, scope);

    const newHtml = editorHtmlWithStableImgRefs(editor);
    const prevHtml = (state.notes && typeof state.notes[k] === "string") ? state.notes[k] : "";

    if (String(newHtml).trim() === String(prevHtml).trim()) return;

    if (!state.notes || typeof state.notes !== "object") state.notes = {};
    if (!state.notesMeta || typeof state.notesMeta !== "object") state.notesMeta = {};

    state.notes[k] = newHtml;

    const prevMeta = (state.notesMeta[k] && typeof state.notesMeta[k] === "object") ? state.notesMeta[k] : {};
    const meta = { ...prevMeta, userTouched: true, updatedAt: Date.now() };
    state.notesMeta[k] = meta;

    if (typeof openNotesDB === "function" && typeof NOTESDB === "object") {
      const db = await openNotesDB();

      await new Promise((resolve, reject) => {
        const tx = db.transaction([NOTESDB.storeNotes, NOTESDB.storeMeta], "readwrite");
        const sNotes = tx.objectStore(NOTESDB.storeNotes);
        const sMeta = tx.objectStore(NOTESDB.storeMeta);

        sNotes.put({
          k: String(k),
          html: String(newHtml ?? ""),
          updatedAt: Date.now()
        });

        sMeta.put({
          k: String(k),
          meta,
          updatedAt: Date.now()
        });

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error || new Error("saveNotes IDB tx error"));
        tx.onabort = () => reject(tx.error || new Error("saveNotes IDB tx abort"));
      });
    }

    if (typeof updateNotesStorageStatus === "function") updateNotesStorageStatus(false);
  } catch (e) {
    console.error("saveNotes failed:", e);
  }
}

function loadNotes() {
  // 只初始化 state.notes，不再讀寫 localStorage notes_v2（避免 quota 爆）
  // 舊資料會由 loadNoteForCurrent 個別題目時讀 legacy / IndexedDB
  if (!state.notes || typeof state.notes !== "object") state.notes = {};
  if (!state.notesMeta || typeof state.notesMeta !== "object") state.notesMeta = {};
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

function ensureNoteSeeded(q, scope) {
  if (!q) return;

  const k = keyForNote(q.id, scope);

  state.notes = state.notes || {};
  state.notesMeta = state.notesMeta || {};

  const existingHtml = state.notes[k];
  const hasExisting = (typeof existingHtml === "string" && existingHtml.trim().length > 0);

  // 已經有內容就完全不要動，避免任何情況覆蓋掉舊筆記
  if (hasExisting) return;

  // 只在記憶體補骨架：不要在這裡寫回 localStorage（避免把讀取異常時的空白寫回去）
  state.notes[k] = defaultNoteHTML(q);

  const exp = (q.explanation != null) ? String(q.explanation) : "";
  const curHash = hashStr(exp);

  let meta = state.notesMeta[k];
  if (!meta || typeof meta !== "object") meta = {};
  meta.seedHash = curHash;
  if (meta.userTouched !== true) meta.userTouched = false;
  state.notesMeta[k] = meta;
}

// ===== Notes helpers fallback (避免 getStoredNoteHtmlNoWrite is not defined) =====
(function ensureNotesHelpers() {
  const G = (typeof globalThis !== "undefined") ? globalThis : window;

  if (typeof G.getStoredNoteHtmlNoWrite !== "function") {
    G.getStoredNoteHtmlNoWrite = async function (k) {
      try {
        if (!k) return null;
        // 優先用 localStorage 的 notesv2（你程式內的 STORAGE.notes）
        const raw = localStorage.getItem(STORAGE && STORAGE.notes ? STORAGE.notes : "notesv2");
        const obj = raw ? JSON.parse(raw) : null;
        if (obj && Object.prototype.hasOwnProperty.call(obj, k)) {
          const v = obj[k];
          if (typeof v === "string" && v.trim().length) return v;
        }
      } catch (e) {}
      return null;
    };
  }

  if (typeof G.getStoredNoteMetaNoWrite !== "function") {
    G.getStoredNoteMetaNoWrite = async function (k) {
      try {
        if (!k) return null;
        const raw = localStorage.getItem(STORAGE && STORAGE.notesMeta ? STORAGE.notesMeta : "notesMetav2");
        const obj = raw ? JSON.parse(raw) : null;
        if (obj && Object.prototype.hasOwnProperty.call(obj, k)) {
          const v = obj[k];
          if (v && typeof v === "object") return v;
        }
      } catch (e) {}
      return null;
    };
  }

  // 有些版本會先呼叫這個做搬移；沒有 IndexedDB 那套時就讓它變 no-op
  if (typeof G.copyLegacyToIdbIfMissing !== "function") {
    G.copyLegacyToIdbIfMissing = async function () { return; };
  }
})();


async function loadNoteForCurrent() {
  if (!editor) return;

  try { cleanupHydratedBlobUrls(editor); } catch (e) {}

  const ctx = getCurrentNoteContext();
  const q = ctx.q;
  const scope = ctx.scope;

  if (!q) {
    editor.innerHTML = "";
    return;
  }

  // 先確保 key & 預設骨架存在（只在完全沒資料時才種）
  ensureNoteSeeded(q, scope);

  const k = keyForNote(q.id, scope);

  // 先用記憶體的版本瞬間回填（避免畫面閃爍）
  const memHtml = (state.notes && typeof state.notes[k] === "string") ? state.notes[k] : "";
  if (typeof memHtml === "string" && memHtml.length) {
    editor.innerHTML = memHtml;
  } else {
    editor.innerHTML = state.notes && typeof state.notes[k] === "string" ? state.notes[k] : defaultNoteHTML(q);
  }

  // 判斷這題是否已經被使用者動過（動過就以記憶體為準，不要被 storage 覆蓋）
  const memMeta = (state.notesMeta && typeof state.notesMeta[k] === "object" && state.notesMeta[k]) ? state.notesMeta[k] : null;
  const memTouched = !!(memMeta && memMeta.userTouched === true);

  try {
    // 只做「缺資料時」的搬運：legacy -> idb（不覆蓋現有）
    await copyLegacyToIdbIfMissing(k);

    // 從 storage 讀（可能是 idb 或 legacy）
    const storedHtml = await getStoredNoteHtmlNoWrite(k);

    // 只有在「使用者尚未動過」或「記憶體是空的」時，才允許用 storage 覆蓋
    // （新）用「等同空白筆記」判斷：骨架會被視為空白，才會讓儲存的筆記覆蓋回來
    const memNow = (state.notes && typeof state.notes[k] === "string") ? state.notes[k] : "";
    const memIsEmpty = isEffectivelyEmptyNoteHtml(memNow);


    if (typeof storedHtml === "string" && storedHtml.trim().length) {
      if (!memTouched || memIsEmpty) {
        if (!state.notes || typeof state.notes !== "object") state.notes = {};
        state.notes[k] = storedHtml;
        if (editor.innerHTML !== storedHtml) editor.innerHTML = storedHtml;
      }
    }

    const storedMeta = await getStoredNoteMetaNoWrite(k);
    if (storedMeta && typeof storedMeta === "object") {
      // meta 也只在「尚未 touched」時才覆蓋，避免把 userTouched 蓋回 false
      const curMeta = (state.notesMeta && typeof state.notesMeta[k] === "object" && state.notesMeta[k]) ? state.notesMeta[k] : null;
      const curTouched = !!(curMeta && curMeta.userTouched === true);

      if (!curTouched) {
        if (!state.notesMeta || typeof state.notesMeta !== "object") state.notesMeta = {};
        state.notesMeta[k] = storedMeta;
      }
    }

    try { await hydrateIdbImagesInEditor(editor); } catch (e) {}
    try { neutralizeOfficeVML(editor); } catch (e) {}
  } catch (e) {
    console.warn("loadNoteForCurrent failed", e);
    try { await hydrateIdbImagesInEditor(editor); } catch (e2) {}
    try { neutralizeOfficeVML(editor); } catch (e3) {}
  }
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






function highlightList() {
  if (!qList) return;

  // 搜尋結果列表時，不用這個函式來決定 active
  if (isGlobalSearchMode) return;

  Array.from(qList.children).forEach((el, i) => {
    el.classList.toggle("active", i === state.index);
  });
}


function resolveExplainMediaSrc(src) {
  const s = String(src || "").trim();
  if (!s) return "";
  if (/^https?:/i.test(s)) return s;
  if (s.startsWith("")) return s;
  if (s.startsWith("blob:")) return s;

  // 交給你原本的邏輯：支援 basePath / images 目錄 / 相對路徑等
  try {
    if (typeof resolveImage === "function") return resolveImage(s);
  } catch (e) {}

  return s;
}

function neutralizeOfficeVML(rootEl) {
  try {
    if (!rootEl) return;
    const all = rootEl.querySelectorAll ? rootEl.querySelectorAll('*') : [];
    let touched = 0;

    all.forEach((el) => {
      const tn = String(el.tagName || '').toLowerCase();

      // Office/Word 常見的 VML/命名空間標籤：v:shape, v:group, o:p, w:pict...
      const isOfficeNs = tn.startsWith('v:') || tn.startsWith('o:') || tn.startsWith('w:');

      // 有些不是 v:xxx，但 inline style / computed z-index 被設到超大，一樣會蓋住
      let hugeZ = false;
      try {
        const z = parseInt(getComputedStyle(el).zIndex, 10);
        hugeZ = Number.isFinite(z) && z > 9999;
      } catch {}

      if (isOfficeNs || hugeZ) {
        el.style.pointerEvents = 'none';
        if (hugeZ) el.style.zIndex = '0';
        touched++;
      }
    });

    // debug 模式下，給你一個提示看是否有處理到
    try {
      const usp = new URLSearchParams(location.search);
      const dbg = usp.get('debugclick') === '1' || localStorage.getItem('ntuvm_debug_click_blockers') === '1';
      if (dbg && touched) console.warn('[neutralizeOfficeVML] touched:', touched, 'in', rootEl.id || rootEl.className || rootEl.tagName);
    } catch {}
  } catch (e) {
    console.warn('neutralizeOfficeVML failed:', e);
  }
}

// ===== 詳解欄：自動對比（避免白底白字 / 黑底黑字）=====
function ensureExplainAutoContrastStyleOnce() {
  if (document.getElementById('explain-auto-contrast-style')) return;
  const style = document.createElement('style');
  style.id = 'explain-auto-contrast-style';
  style.textContent = `
    .explain-auto-contrast{
      transition: color .12s ease;
    }
  `;
  document.head.appendChild(style);
}

function clamp(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function parseCssNumberOrPercent(s, scaleIfPercent /* e.g. 255 or 1 */) {
  const t = String(s || '').trim();
  if (!t) return NaN;
  if (t.endsWith('%')) {
    const p = parseFloat(t.slice(0, -1));
    if (!Number.isFinite(p)) return NaN;
    return (p / 100) * scaleIfPercent;
  }
  const v = parseFloat(t);
  return v;
}

// 支援：rgb(1 2 3 / .5) / rgb(1,2,3) / #fff/#ffff/#ffffff/#ffffffff / transparent / 色名
function parseCssColorToRgba(str, _depth = 0) {
  try {
    const s0 = String(str || '').trim();
    const s = s0.toLowerCase();
    if (!s) return null;
    if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

    // hex
    if (s[0] === '#') {
      const hex = s.slice(1);
      if (hex.length === 3 || hex.length === 4) {
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        const a = (hex.length === 4) ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
        return { r, g, b, a: clamp(a, 0, 1) };
      }
      if (hex.length === 6 || hex.length === 8) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        const a = (hex.length === 8) ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
        return { r, g, b, a: clamp(a, 0, 1) };
      }
      return null;
    }

    // rgb/rgba (comma OR space, with optional / alpha)
    const m = s.match(/^rgba?\(\s*(.+)\s*\)$/);
    if (m) {
      let inside = m[1].trim();

      let alphaPart = null;
      if (inside.includes('/')) {
        const parts = inside.split('/');
        inside = (parts[0] || '').trim();
        alphaPart = (parts[1] || '').trim();
      }

      // normalize separators
      const nums = inside.replace(/,/g, ' ').trim().split(/\s+/).filter(Boolean);
      if (nums.length >= 3) {
        const r0 = parseCssNumberOrPercent(nums[0], 255);
        const g0 = parseCssNumberOrPercent(nums[1], 255);
        const b0 = parseCssNumberOrPercent(nums[2], 255);

        let a0 = 1;
        if (alphaPart != null && alphaPart !== '') {
          a0 = parseCssNumberOrPercent(alphaPart, 1);
        } else if (nums.length >= 4) {
          a0 = parseCssNumberOrPercent(nums[3], 1);
        }

        return {
          r: clamp(r0, 0, 255),
          g: clamp(g0, 0, 255),
          b: clamp(b0, 0, 255),
          a: clamp(a0, 0, 1)
        };
      }
    }

    // fallback：交給瀏覽器解析（支援 顏色名 等）
    if (_depth >= 2) return null;
    const tmp = document.createElement('span');
    tmp.style.color = s0;
    const host = document.body || document.documentElement;
    if (!host) return null;
    host.appendChild(tmp);
    const cs = getComputedStyle(tmp).color;
    tmp.remove();
    return parseCssColorToRgba(cs, _depth + 1);
  } catch {
    return null;
  }
}

function isTransparentRgba(rgba) {
  return !rgba || !(rgba.a > 0.01);
}

function compositeRgbaOver(fg, bg) {
  // fg over bg
  const F = fg || { r: 0, g: 0, b: 0, a: 0 };
  const B = bg || { r: 255, g: 255, b: 255, a: 1 };
  const fa = clamp(F.a, 0, 1);
  const ba = clamp(B.a, 0, 1);
  const outA = fa + ba * (1 - fa);
  if (!(outA > 0)) return { r: 0, g: 0, b: 0, a: 0 };

  const r = (F.r * fa + B.r * ba * (1 - fa)) / outA;
  const g = (F.g * fa + B.g * ba * (1 - fa)) / outA;
  const b = (F.b * fa + B.b * ba * (1 - fa)) / outA;
  return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a: clamp(outA, 0, 1) };
}

function toOpaqueOver(c, bg) {
  if (!c) return null;
  if (c.a >= 0.999) return { r: c.r, g: c.g, b: c.b, a: 1 };
  return compositeRgbaOver(c, bg || { r: 255, g: 255, b: 255, a: 1 });
}

function srgbToLinear(c) {
  const v = c / 255;
  return (v <= 0.04045) ? (v / 12.92) : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgbOpaque) {
  const c = rgbOpaque;
  const r = srgbToLinear(c.r);
  const g = srgbToLinear(c.g);
  const b = srgbToLinear(c.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatioOpaque(c1, c2) {
  const L1 = relativeLuminance(c1);
  const L2 = relativeLuminance(c2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function contrastRatioOnBg(fg, bg) {
  const bg2 = toOpaqueOver(bg, { r: 255, g: 255, b: 255, a: 1 }) || { r: 255, g: 255, b: 255, a: 1 };
  const fg2 = toOpaqueOver(fg, bg2);
  if (!fg2) return 1;
  return contrastRatioOpaque(fg2, bg2);
}

// 找「有效背景色」：一路往上把背景色合成（支援半透明背景）
function getEffectiveBackgroundRgba(el, fallbackEl) {
  const chain = [];

  const collect = (startEl) => {
    let cur = startEl;
    while (cur && cur.nodeType === 1) {
      let bg = null;
      try { bg = parseCssColorToRgba(getComputedStyle(cur).backgroundColor); } catch {}
      if (bg && bg.a > 0.01) chain.push(bg);
      cur = cur.parentElement;
    }
  };

  try { if (el) collect(el); } catch {}
  if (!chain.length) {
    try { if (fallbackEl) collect(fallbackEl); } catch {}
  }

  // base：body 或 html
  let base = null;
  try { base = parseCssColorToRgba(getComputedStyle(document.body).backgroundColor); } catch {}
  if (isTransparentRgba(base)) {
    try { base = parseCssColorToRgba(getComputedStyle(document.documentElement).backgroundColor); } catch {}
  }
  if (isTransparentRgba(base)) base = { r: 255, g: 255, b: 255, a: 1 };
  base = toOpaqueOver(base, { r: 255, g: 255, b: 255, a: 1 }) || { r: 255, g: 255, b: 255, a: 1 };

  // chain 是「由近到遠」收集，所以要從遠到近合成
  for (let i = chain.length - 1; i >= 0; i--) {
    base = compositeRgbaOver(chain[i], base);
  }
  return toOpaqueOver(base, { r: 255, g: 255, b: 255, a: 1 }) || { r: 255, g: 255, b: 255, a: 1 };
}

function pickBestTextColorForBg(bgRgba) {
  const black = { r: 17, g: 17, b: 17, a: 1 };
  const white = { r: 249, g: 250, b: 251, a: 1 };
  const r1 = contrastRatioOpaque(black, bgRgba);
  const r2 = contrastRatioOpaque(white, bgRgba);
  return (r1 >= r2) ? '#111111' : '#f9fafb';
}

function clearExplainAutoContrast(rootEl) {
  if (!rootEl) return;
  try { rootEl.classList.remove('explain-auto-contrast'); } catch {}
  try { rootEl.style.removeProperty('color'); } catch {}
  try { rootEl.style.removeProperty('-webkit-text-fill-color'); } catch {}
  try {
    rootEl.querySelectorAll('[data-explain-autofg="1"]').forEach(el => {
      el.style.removeProperty('color');
      el.style.removeProperty('-webkit-text-fill-color');
      el.removeAttribute('data-explain-autofg');
    });
  } catch {}
}

function autoFixExplanationContrast(rootEl, wrapEl, opts) {
  if (!rootEl) return;

  ensureExplainAutoContrastStyleOnce();

  const threshold = Number.isFinite(opts?.threshold) ? opts.threshold : 3.5; // 想更嚴格可改 4.5
  const bg = getEffectiveBackgroundRgba(rootEl, wrapEl);

  // 先清掉上次的修正
  clearExplainAutoContrast(rootEl);

  let rootColor = null;
  try { rootColor = parseCssColorToRgba(getComputedStyle(rootEl).color); } catch {}
  if (!rootColor) return;

  const rootRatio = contrastRatioOnBg(rootColor, bg);
  const needFixRoot = !(rootRatio >= threshold);
  if (!needFixRoot) return;

  const newColor = pickBestTextColorForBg(bg);
  rootEl.classList.add('explain-auto-contrast');
  rootEl.style.color = newColor;
  rootEl.style.webkitTextFillColor = newColor;

  // 再補強：修正「子元素被指定成同色/很淡」的狀況
  const SKIP_TAGS = new Set([
    'IMG','VIDEO','AUDIO','SOURCE','CANVAS','SVG','PATH',
    'BUTTON','INPUT','SELECT','TEXTAREA','OPTION'
  ]);

  const all = rootEl.querySelectorAll('*');
  for (const el of all) {
    if (!el || !el.tagName) continue;
    if (SKIP_TAGS.has(el.tagName)) continue;

    const txt = (el.textContent || '').replace(/\s+/g, '');
    if (!txt) continue;

    let fg = null;
    try { fg = parseCssColorToRgba(getComputedStyle(el).color); } catch {}
    if (!fg || isTransparentRgba(fg)) continue;

    const elBg = getEffectiveBackgroundRgba(el, rootEl);
    const r = contrastRatioOnBg(fg, elBg);
    if (r < threshold) {
      const best = pickBestTextColorForBg(elBg);
      el.style.color = best;
      el.style.webkitTextFillColor = best;
      el.setAttribute('data-explain-autofg', '1');
    }
  }
}


function renderExplanation(q) {
  if (!qExplain || !qExplainWrap) return;

  const raw = (q && q.explanation != null) ? String(q.explanation) : '';
  const exp = raw.trim();
  const has = exp.length > 0;

  qExplainWrap.classList.toggle('hidden', !has);
  qExplain.classList.toggle('hidden', !has);

  if (!has) {
    qExplain.innerHTML = '';
    try { clearExplainAutoContrast(qExplain); } catch (e) {}
    return;
  }

  // explanation HTML
  qExplain.innerHTML = exp;

  // media src post-process
  try {
    qExplain.querySelectorAll('img').forEach(img => {
      const fixed = resolveExplainMediaSrc(img.getAttribute('src'));
      if (fixed) img.setAttribute('src', fixed);
    });
    qExplain.querySelectorAll('source').forEach(srcEl => {
      const fixed = resolveExplainMediaSrc(srcEl.getAttribute('src'));
      if (fixed) srcEl.setAttribute('src', fixed);
    });
  } catch (e) {
    console.warn('Explanation media post-process failed', e);
  }

  try { neutralizeOfficeVML(qExplain); } catch (e) {}

  // ✅ 自動修正「文字色 = 背景色（或太接近）」的問題
  try {
    autoFixExplanationContrast(qExplain, qExplainWrap, { threshold: 3.5 });
  } catch (e) {
    console.warn('autoFixExplanationContrast failed', e);
  }
}


async function renderQuestionInGroupMode() {
  const item = state.visibleQuestions[state.index];
  if (!item || !item.groupEntry) {
    qNum.textContent = '';
    qText.textContent = '這個群組目前沒有題目';
    qOpts.innerHTML = '';
    qImg.classList.add('hidden');
    // 群組沒有題目時，也順便清空多圖區
    renderQuestionImagesFromState(null);
    renderExplanation(null);
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
    // 找不到題目的時候，同樣清空多圖區
    renderQuestionImagesFromState(null);
    renderExplanation(null);
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

  // ⭐ 這裡新增：處理多張圖片（第 2 張之後）
  renderQuestionImagesFromState(q);
  renderExplanation(q);

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
}


/題目顯示/
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
    // 沒有題目時也把多圖區清空
    renderQuestionImagesFromState(null);
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
  const correctSet = new Set(
    String(state.answers[String(q.id)] || '')
      .toUpperCase()
      .split('/')
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

  bSubj.textContent = getSubjectLabel();
  bYear.textContent = yearSel.value;
  bRound.textContent = roundSel.value;

  highlightList();
  loadNoteForCurrent();
  loadCommentsForCurrentQuestion();
  renderExplanation(q);

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
      btn.style.background = "透明";
      btn.style.color = "var(--accent)";
      btn.style.cursor = "pointer";
      btn.style.fontSize = "16px";
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

  // ⭐ 最後改成帶目前的題目 q，讓多圖區正確對應
  renderQuestionImagesFromState(q);
  renderExplanation(q);
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
// 綁定搜尋輸入框：停止打字 400ms 後觸發「跨科目＋跨年度＋跨梯次」搜尋

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const value = e.target.value;
    if (globalSearchTimer) clearTimeout(globalSearchTimer);
    globalSearchTimer = setTimeout(() => {
      searchAcrossVolumes(value);   // 這就是我們剛剛改好的跨科目搜尋
    }, 400);
  });
}



/* 導航 */
prevBtn.onclick = () => {
  saveNotes(state.scope ?? getScopeFromUI());

  // 1) 全域搜尋模式
  if (isGlobalSearchMode && globalSearchResults.length > 0) {
    if (globalSearchIndex > 0) globalSearchIndex--;
    else globalSearchIndex = 0;

    const hit = globalSearchResults[globalSearchIndex];
    if (hit) {
      if (qList) Array.from(qList.children).forEach((el, i) => el.classList.toggle("active", i === globalSearchIndex));
      jumpToSearchHit(hit);
    }
    return;
  }

  // 2) 檢討模式
  if (state.mode === "review") {
    stepReview(-1);
    return;
  }

  // 3) 一般瀏覽
  const list = (state.visibleQuestions && state.visibleQuestions.length) ? state.visibleQuestions : state.questions;
  if (state.index > 0) state.index--;
  else state.index = 0;

  renderQuestion();
  highlightList();
};

nextBtn.onclick = () => {
  saveNotes(state.scope ?? getScopeFromUI());

  // 1) 全域搜尋模式
  if (isGlobalSearchMode && globalSearchResults.length > 0) {
    if (globalSearchIndex < globalSearchResults.length - 1) globalSearchIndex++;
    else globalSearchIndex = globalSearchResults.length - 1;

    const hit = globalSearchResults[globalSearchIndex];
    if (hit) {
      if (qList) Array.from(qList.children).forEach((el, i) => el.classList.toggle("active", i === globalSearchIndex));
      jumpToSearchHit(hit);
    }
    return;
  }

  // 2) 檢討模式
  if (state.mode === "review") {
    stepReview(1);
    return;
  }

  // 3) 一般瀏覽
  const list = (state.visibleQuestions && state.visibleQuestions.length) ? state.visibleQuestions : state.questions;
  if (state.index < list.length - 1) state.index++;
  else state.index = list.length - 1;

  renderQuestion();
  highlightList();
};

try {
  if (!window.notesPagehideBound) {
    window.notesPagehideBound = true;
    window.addEventListener("pagehide", () => {
      try {
        saveNotes(state.scope ?? getScopeFromUI());
      } catch (e) {}
    });
  }
} catch (e) {}


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
bindTapClick(btnRandomQuiz, openRandomQuizPrepOverlay);
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
  if (!document.getElementById("fs-quiz-style")) {
    const css = document.createElement("style");
    css.id = "fs-quiz-style";
    css.textContent = `
      .fs-topbar{
        display:flex;
        align-items:flex-start;
        gap:10px;
        padding:12px 14px;
        border-bottom:1px solid var(--border,#2a2a2a);
        background:var(--card,#1b1b1b);
      }

      /* 只有在手機且真的超出寬度時，JS 會加上這個 class，才會啟用橫向捲動 */
      .fs-topbar.scrollable{
        overflow-x:auto;
        -webkit-overflow-scrolling:touch;
      }

      .fs-badge{
        padding:6px 10px;
        border:1px solid var(--border,#2a2a2a);
        border-radius:9999px;
        background:transparent;
        color:var(--fg,#fff);
        font-size:14px;
        flex:0 0 auto;
        white-space:nowrap;
      }

      .fs-spacer{ flex:1; min-width:0; }

      .fs-btn{
        padding:10px 14px;
        border-radius:9999px;
        border:1px solid var(--border,#2a2a2a);
        background:transparent;
        color:var(--fg,#fff);
        cursor:pointer;
        font-size:16px;
        flex:0 0 auto;
        white-space:nowrap;
      }
      .fs-btn:hover{
        border-color:var(--accent,#2f74ff);
        color:var(--accent,#2f74ff);
      }

      .fs-main{
        flex:1;
        display:flex;
        flex-direction:column;
        gap:12px;
        padding:16px;
        overflow:auto;
      }
      .fs-card{
        border:1px solid var(--border,#2a2a2a);
        border-radius:16px;
        padding:16px;
        background:var(--card,#1b1b1b);
      }
      .fs-qtext{
        font-size:18px;
        line-height:1.6;
      }
      .fs-qimg{
        margin-top:10px;
        max-width:100%;
        height:auto;
        border-radius:8px;
        border:1px solid var(--border,#2a2a2a);
      }

      /* ★ 新增：全螢幕模式的「第二張以後」圖片區塊，維持原圖比例、最多 100% 寬 */
      .fs-qimgs{
        margin-top:10px;
      }
      .fs-qimgs img{
        display:block;
        max-width:100%;
        height:auto;
        border-radius:8px;
        border:1px solid var(--border,#2a2a2a);
        margin-top:10px;
      }

      .fs-opts{
        margin-top:10px;
        display:flex;
        flex-direction:column;
        gap:8px;
      }
      .fs-nav{
        display:flex;
        gap:8px;
        align-items:center;
        margin-top:14px;
      }
      .fs-hidden{
        display:none !important;
      }

      /* ===== 測驗準備遮罩卡片 ===== */
      .fs-start-overlay{
        position:fixed;
        inset:0;
        z-index:100002;
        display:flex;
        align-items:center;
        justify-content:center;
        background:rgba(0,0,0,.65);
      }
      .fs-start-card{
        min-width:280px;
        max-width:420px;
        background:var(--card,#1b1b1b);
        border-radius:16px;
        border:1px solid var(--border,#2a2a2a);
        padding:20px 18px;
        box-shadow:0 18px 45px rgba(0,0,0,.4);
      }
      .fs-start-title{
        font-size:18px;
        font-weight:600;
        margin-bottom:12px;
      }
      .fs-start-row{
        font-size:15px;
        margin:4px 0;
      }
      .fs-start-row .value{
        font-weight:600;
      }
      .fs-start-actions{
        margin-top:16px;
        display:flex;
        justify-content:flex-end;
        gap:10px;
      }
      .fs-btn-primary{
        background:var(--accent,#2f74ff);
        color:#fff;
      }

      /* ===== 手機直立時：只改全螢幕測驗上方列的排版 ===== */
      @media (max-width: 600px) and (orientation: portrait) {
        .fs-topbar{
          flex-wrap:wrap;
        }

        /* 科目 / 年份 / 梯次 三個 badge 各占一整行，往下疊 */
        .fs-topbar .fs-badge:nth-child(1),
        .fs-topbar .fs-badge:nth-child(2),
        .fs-topbar .fs-badge:nth-child(3) {
          flex-basis: 100%;
        }

        /* 手機直立時不需要 spacer 撐開，避免擠掉按鈕 */
        .fs-topbar .fs-spacer {
          display:none;
        }
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
        <!-- ★ 新增：全螢幕模式的多圖容器 -->
        <div id="fsQImgs" class="fs-qimgs"></div>
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

  const fsTopbar = mask.querySelector('.fs-topbar');
  function updateFsTopbarScrollable() {
    if (!fsTopbar) return;
    const isPhone = window.innerWidth <= 768;
    const isOverflow = fsTopbar.scrollWidth > fsTopbar.clientWidth;
    if (isPhone && isOverflow) {
      fsTopbar.classList.add('scrollable');
    } else {
      fsTopbar.classList.remove('scrollable');
    }
  }
  setTimeout(updateFsTopbarScrollable, 0);
  window.addEventListener('resize', updateFsTopbarScrollable);

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
    fsQImgs: document.getElementById("fsQImgs"),    // ★ 新增：多圖容器
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
  const subjLabel = getSubjectLabel();
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

  // 導覽 / 提交 / 關閉
  bindTapClick(fs.fsPrev,  ()=> {
    if(qs.mode==="review"){
      stepReview(-1);
    } else {
      if(qs.index>0) qs.index--;
    }
    renderFS();
  });
  bindTapClick(fs.fsNext,  ()=> {
    if(qs.mode==="review"){
      stepReview( 1);
    } else {
      if(qs.index<state.questions.length-1) qs.index++;
    }
    renderFS();
  });
  bindTapClick(fs.fsSubmit, ()=> submitFS());
  bindTapClick(fs.fsClose,  ()=> closeFS());

  // ✅「進入作答」：這個時候才清除舊作答 + 啟動計時
  if (fsStartBtn){
    bindTapClick(fsStartBtn, ()=>{
      resetUserAnswersForCurrentScope();

      qs.mode   = "quiz";
      qs.index  = 0;
      qs.reviewOrder = [];
      qs.reviewPos   = 0;
      qs.remain = 60*60;

      renderFS();
      tickFS();
      qs.timerId = setInterval(tickFS, 1000);

      fsStartOverlay?.classList.add("fs-hidden");
    });
  }

  // ❌「取消」：關掉整個全螢幕，回到原本頁面
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
      if (fs.fsQImgs) fs.fsQImgs.innerHTML = "";
      return;
    }

    fs.fsQNum.textContent = `第 ${q.id} 題`;
    fs.fsQText.innerHTML  = escapeHTML(q.text);

    // ★ 整合 image / images：第一張進 fsQImg，其餘進 fsQImgs
    let imgs = [];
    if (Array.isArray(q.images) && q.images.length) {
      imgs = q.images.slice();
    } else if (q.image) {
      imgs = [q.image];
    }

    // 主圖處理（第一張）
    if (imgs.length) {
      const first = imgs[0];
      const raw = resolveImage(first);
      const bust = (raw.includes("?") ? "&" : "?") + "v=" + Date.now();
      fs.fsQImg.src = raw + bust;
      fs.fsQImg.classList.remove("fs-hidden");
    } else {
      fs.fsQImg.classList.add("fs-hidden");
      fs.fsQImg.removeAttribute("src");
    }

    // 額外圖片（第二張以後）
    if (fs.fsQImgs) {
      fs.fsQImgs.innerHTML = "";
      if (imgs.length > 1) {
        const extra = imgs.slice(1);
        extra.forEach(src => {
          const url = resolveImage(src);
          if (!url) return;
          const bust = (url.includes("?") ? "&" : "?") + "v=" + Date.now();
          const img = document.createElement("img");
          img.src = url + bust;
          img.alt = q.text ? String(q.text).slice(0, 40) : "question image";
          fs.fsQImgs.appendChild(img);
        });
      }
    }

    // 選項
    fs.fsQOpts.innerHTML = "";
    const ua = (state.user[String(q.id)]||"").toUpperCase();
    const letters = ["A","B","C","D"];
    const correctSet = new Set(
      String(state.answers[String(q.id)]||"")
        .toUpperCase()
        .split("/")
        .filter(Boolean)
    );

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
  document.body.classList.add("quiz-mode");
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
  state.mode="browse";
  document.body.classList.remove("quiz-mode");
  timerBadge.classList.add("hidden");
  btnSubmit.classList.add("hidden");
  btnClose.classList.add("hidden");
  reviewTag.classList.add("hidden");
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

// ===================== 字卡功能 Flashcards（表單式介面） =====================
const FLASHCARDS_STORAGE_KEY = 'ntuvm-flashcards-data-v2';
// 修改後的 fcImportFlashcards 函式
function fcImportFlashcards(parentId = null) {
  const pick = document.createElement('input');
  pick.type = 'file';
  pick.accept = 'application/json';
  pick.onchange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const text = await f.text();
      const data = JSON.parse(text);
      let name = '';
      let rows = [];
      if (Array.isArray(data)) {
        rows = data.filter(x => x && (x.front || x.back))
                   .map(x => ({ front: String(x.front || ''), back: String(x.back || '') }));
        name = prompt('請輸入主題名稱：', (f.name || '').replace(/\.json$/i,'').slice(0,40)) || '未命名主題';
      } else if (data && Array.isArray(data.cards)) {
        name = String(data.name || '').trim() || prompt('請輸入主題名稱：', '新主題') || '未命名主題';
        rows = data.cards.filter(x => x && (x.front || x.back))
                         .map(x => ({ front: String(x.front || ''), back: String(x.back || '') }));
      } else {
        alert('匯入格式不支援，請提供 JSON：[{front,back}] 或 {name, cards:[...]}');
        return;
      }
      
      // ★ 修正 1：這裡要傳物件 { name, parentId, type }
      const newNode = fcCreateNode({ name: name, parentId: parentId ?? null, type: 'topic' });
      if (!newNode) return;
      
      fcReplaceCardsOfNode(newNode.id, rows);

      // ★ 修正 2：補上底線 __，確保能呼叫到全域函式
      if (parentId == null) {
        window.__fcRenderHomeList?.(); 
      } else {
        window.__fcRenderFolderList?.();
      }
      
      alert(`已匯入主題「${name}」，共 ${rows.length} 張卡片。`);
      
      // 這裡也一起修正，保持一致
      if (typeof window.__fcRenderHomeList === 'function') window.__fcRenderHomeList();
      if (typeof window.__fcRenderFolderList === 'function') window.__fcRenderFolderList();

    } catch (err) {
      console.error('匯入失敗：', err);
      alert('匯入失敗，請確認檔案內容。');
    }
  };
  pick.click();
}


function fcLoad() {
  try {
    const raw = localStorage.getItem(FLASHCARDS_STORAGE_KEY);
    if (raw) state.flashcards = JSON.parse(raw);
  } catch (e) {
    console.error('fcLoad error:', e);
  }
  if (!state.flashcards || typeof state.flashcards !== 'object') state.flashcards = {};
  if (!Array.isArray(state.flashcards.folders)) state.flashcards.folders = [];
  if (!state.flashcards.cards || typeof state.flashcards.cards !== 'object') state.flashcards.cards = {};
}

function fcSave() {
  try {
    localStorage.setItem(FLASHCARDS_STORAGE_KEY, JSON.stringify(state.flashcards));
  } catch (e) {
    console.error('fcSave error:', e);
  }
}

function fcId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function fcGetNode(id) {
  return state.flashcards.folders.find(x => x.id === id) || null;
}

function fcChildren(parentId) {
  const pid = parentId || null;
  return state.flashcards.folders.filter(x => (x.parentId || null) === pid);
}

function fcCreateNode({ name, parentId = null, type = 'folder' }) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return null;

  const parent = parentId ? fcGetNode(parentId) : null;
  // 主題底下不要主題
  if (type === 'topic' && parent && parent.type === 'topic') {
    alert('主題底下不能再新增主題，只能新增資料夾或字卡。');
    return null;
  }

  const node = {
    id: fcId('fc'),
    name: trimmed,
    parentId: parentId || null,
    type: type === 'topic' ? 'topic' : 'folder',
    items: [] // cardIds
  };
  state.flashcards.folders.push(node);
  fcSave();
  return node;
}

function fcDeleteNodeRecursive(nodeId) {
  const node = fcGetNode(nodeId);
  if (!node) return;

  // 刪掉此節點字卡
  (node.items || []).forEach(cid => { delete state.flashcards.cards[cid]; });

  // 刪掉子節點
  fcChildren(nodeId).forEach(ch => fcDeleteNodeRecursive(ch.id));

  // 移除節點本身
  state.flashcards.folders = state.flashcards.folders.filter(x => x.id !== nodeId);
  fcSave();
}

function fcReplaceCardsOfNode(nodeId, rows) {
  const node = fcGetNode(nodeId);
  if (!node) return;

  // 清空舊卡
  (node.items || []).forEach(cid => { delete state.flashcards.cards[cid]; });
  node.items = [];

  // 建立新卡
  (rows || []).forEach(r => {
    const front = String(r.front || '').trim();
    const back = String(r.back || '').trim();
    if (!front && !back) return; // 空列略過
    const id = fcId('card');
    state.flashcards.cards[id] = { id, folderId: nodeId, front, back };
    node.items.push(id);
  });

  fcSave();
}

// ---------- Style ----------
function fcEnsureStyle() {
  if (document.getElementById('fc-style-v2')) return;
  const s = document.createElement('style');
  s.id = 'fc-style-v2';
  s.textContent = `
    .fc-mask{position:fixed;inset:0;z-index:100120;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center}
    .fc-screen{position:fixed;inset:0;z-index:100121;background:var(--bg,#0b1220);color:var(--fg,#fff);display:flex;flex-direction:column}
    .fc-top{display:flex;align-items:center;gap:10px;padding:14px 14px;border-bottom:1px solid var(--border,#233);background:rgba(0,0,0,.12)}
    .fc-top .title{font-weight:800;font-size:16px;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .fc-iconbtn{width:40px;height:36px;border-radius:12px;border:1px solid var(--border,#333);background:transparent;color:var(--fg,#fff);cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center}
    .fc-iconbtn:hover{border-color:var(--accent,#2f74ff);color:var(--accent,#2f74ff)}
    .fc-body{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:12px}
    .fc-panel{border:1px solid var(--border,#333);border-radius:16px;background:var(--card,#0b1220);padding:12px}
    .fc-row{display:flex;gap:10px;align-items:center}
    .fc-input{width:100%;box-sizing:border-box;padding:12px 12px;border-radius:14px;border:1px solid var(--border,#333);background:rgba(255,255,255,.06);color:var(--fg,#fff);outline:none;font-size:15px}
    textarea.fc-input{
      min-height:96px;
      resize:vertical;
      line-height:1.4;
      white-space:pre-wrap;
    }
    .fc-input:focus{border-color:var(--accent,#2f74ff)}
    .fc-list{display:flex;flex-direction:column;gap:10px}
    .fc-node{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:12px 12px;border:1px solid var(--border,#333);border-radius:14px;background:rgba(255,255,255,.04)}
    .fc-node .label{font-weight:700;cursor:inherit;flex:1;min-width:0}
    .fc-btn{padding:8px 12px;border-radius:9999px;border:1px solid var(--border,#333);background:transparent;color:var(--fg,#fff);cursor:pointer;font-size:13px}
    .fc-btn:hover{border-color:var(--accent,#2f74ff);color:var(--accent,#2f74ff)}
    .fc-btn.danger{color:#ff6b6b}
    .fc-btn.danger:hover{border-color:#ff6b6b;color:#ff6b6b}
    .fc-subtitle{font-weight:800;margin:2px 2px 8px 2px;opacity:.9}
    .fc-cardrow{border:1px solid var(--border,#333);border-radius:16px;padding:12px;background:rgba(255,255,255,.03)}
    .fc-cardrow .meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px}
    .fc-cardrow .meta .idx{font-weight:800;opacity:.75}
    .fc-cardrow .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .fc-floating-plus{position:fixed;left:50%;transform:translateX(-50%);bottom:18px;width:54px;height:54px;border-radius:9999px;border:none;background:var(--accent,#2f74ff);color:#fff;font-size:28px;cursor:pointer;z-index:100130;box-shadow:0 10px 30px rgba(0,0,0,.45)}
    .fc-floating-plus:active{transform:translateX(-50%) scale(.98)}
    .fc-hint{color:var(--muted,#aaa);font-size:13px;line-height:1.6}

    /* Viewer */
    .fc-viewer-mask{position:fixed;inset:0;z-index:100200;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:16px}
    .fc-viewer-card{
      width:min(520px,92vw);
      height:min(540px,72vh);
      background:rgba(255,255,255,.06);
      border:1px solid var(--border,#333);
      border-radius:24px;
      padding:26px;
      cursor:pointer;
      position:relative;
      backdrop-filter: blur(8px);

      /* 永遠置中，單純交給 overflow:auto 控制 scrollbar */
      overflow:auto;
      -webkit-overflow-scrolling:touch;
      display:flex;
      align-items:center;
      justify-content:center;
    }

    .fc-viewer-text{
      font-size:40px;
      font-weight:800;
      letter-spacing:.5px;
      text-align:center;
      line-height:1.25;
      word-break:break-word;
      overflow-wrap:anywhere;
      white-space:pre-wrap;

      /* 讓長內容在卡片內捲動時不會怪怪的 */
      width:100%;
    }

    .fc-viewer-close{position:fixed;top:16px;left:16px;z-index:100210;width:44px;height:44px;border-radius:9999px;border:1px solid var(--border,#333);background:rgba(0,0,0,.25);color:var(--fg,#fff);font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center}
    .fc-viewer-close:hover{border-color:var(--accent,#2f74ff);color:var(--accent,#2f74ff)}

    /* 平板 */
    @media (max-width: 1024px){
      .fc-viewer-text{font-size:34px}
    }
    /* 手機 */
    @media (max-width: 768px){
      .fc-body{padding:12px}
      .fc-cardrow .grid{grid-template-columns:1fr;gap:10px}
      .fc-viewer-text{font-size:28px}
    }
  `;
  document.head.appendChild(s);
}
function fcOpenEditor(mode = 'create', parentId = null, nodeId = null, type = 'topic') {
  
    // ✅ 同時支援：fcOpenEditor('create', ...) 以及 fcOpenEditor({ mode:'create', ... })
  if (mode && typeof mode === 'object') {
    const opts = mode;
    mode = opts.mode ?? 'create';
    parentId = opts.parentId ?? null;
    nodeId = opts.nodeId ?? null;
    type = opts.type ?? 'topic';
  }

  mode = String(mode || 'create').toLowerCase();
  type = (type === 'topic' ? 'topic' : 'folder');

  fcEnsureStyle();
  fcLoad();

  let node = null;
  if (mode === 'edit') {
    node = fcGetNode(nodeId);
    if (!node) {
      alert('找不到這個卡片集 / 節點');
      return;
    }
  }

  const old = document.getElementById('fc-editor-screen');
  if (old) old.remove();

  const screen = document.createElement('div');
  screen.id = 'fc-editor-screen';
  screen.className = 'fc-screen';
  screen.innerHTML = `
    <div class="fc-top">
      <button class="fc-iconbtn" id="fc-editor-close" title="關閉">✕</button>
      <button class="fc-btn" id="fc-editor-export" title="匯出 JSON">匯出</button>
      <div class="title">${mode === 'edit' ? '編輯字卡' : '新增字卡'}</div>
      <button class="fc-iconbtn" id="fc-editor-save" title="儲存">✓</button>
    </div>

    <div class="fc-body">
      <div class="fc-panel">
        <div class="fc-subtitle">名稱</div>
        <input class="fc-input" id="fc-editor-name" type="text" placeholder="例如：病理學...">
      </div>

      <div class="fc-panel">
        <div class="fc-subtitle">字卡 <span style="font-size:12px;opacity:0.7;"></span></div>
        <div class="fc-list" id="fc-editor-cards"></div>
      </div>

      <button class="fc-floating-plus" id="fc-editor-add-card">＋</button>
    </div>
  `;
  document.body.appendChild(screen);

  const nameInput = document.getElementById('fc-editor-name');
  const cardsList = document.getElementById('fc-editor-cards');
  const btnSave = document.getElementById('fc-editor-save');
  const btnClose = document.getElementById('fc-editor-close');
  const btnAddCard = document.getElementById('fc-editor-add-card');
  const btnExport = document.getElementById('fc-editor-export');

  function addCardRow({ front = '', back = '' } = {}) {
    const row = document.createElement('div');
    row.className = 'fc-cardrow';

    const meta = document.createElement('div');
    meta.className = 'meta';

    const idxSpan = document.createElement('span');
    idxSpan.className = 'idx';
    meta.appendChild(idxSpan);

    const btnDel = document.createElement('button');
    btnDel.className = 'fc-btn danger';
    btnDel.textContent = '刪除';
    btnDel.onclick = () => {
      row.remove();
      updateCardNumbers();
    };
    meta.appendChild(btnDel);

    const grid = document.createElement('div');
    grid.className = 'grid';

    const inp1 = document.createElement('textarea');
    inp1.className = 'fc-input';
    inp1.placeholder = '正面（題目）';
    inp1.value = front;
    inp1.rows = 3;

    const inp2 = document.createElement('textarea');
    inp2.className = 'fc-input';
    inp2.placeholder = '背面（答案）';
    inp2.value = back;
    inp2.rows = 3;

    grid.appendChild(inp1);
    grid.appendChild(inp2);

    row.appendChild(meta);
    row.appendChild(grid);

    cardsList.appendChild(row);
    updateCardNumbers();
  }

  function updateCardNumbers() {
    Array.from(cardsList.children).forEach((row, i) => {
      const span = row.querySelector('.idx');
      if (span) span.textContent = String(i + 1);
    });
  }

  function collectEditorRows() {
    return Array.from(cardsList.children)
      .map(row => {
        const inputs = row.querySelectorAll('textarea.fc-input');
        const front = (inputs[0]?.value ?? '').trim();
        const back = (inputs[1]?.value ?? '').trim();
        return { front, back };
      })
      .filter(r => r.front && r.back);
  }

  function sanitizeFilename(s) {
    return String(s || 'flashcards')
      .replace(/[\\/:*?"<>|]+/g, '_')
      .slice(0, 60);
  }

  // === 讀取既有資料（編輯模式）===
  if (mode === 'edit') {
    nameInput.value = node.name || '';

    // 1) 先拿 node.items（預期是 cardId 陣列）
    let cardIds = Array.isArray(node.items) ? node.items.slice() : [];

    // 2) 若 node.items 壞掉或空掉：改用 cards 反查 folderId 來救回
    if ((!cardIds || !cardIds.length) && state.flashcards && state.flashcards.cards) {
      const recovered = Object.values(state.flashcards.cards)
        .filter(c => c && String(c.folderId) === String(node.id))
        .map(c => c.id)
        .filter(Boolean);

      if (recovered.length) {
        // 用 id 裡的 timestamp 粗略排序（card-<ts>-xxxx）
        recovered.sort((a, b) => {
          const ta = Number(String(a).split('-')[1]) || 0;
          const tb = Number(String(b).split('-')[1]) || 0;
          return ta - tb;
        });

        cardIds = recovered;
        node.items = recovered.slice();
        fcSave();
      }
    }

    // 3) 把卡片內容畫進編輯器
    cardIds.forEach(cid => {
      const card = state.flashcards.cards?.[cid];
      if (card) addCardRow({ front: card.front, back: card.back });
    });
  }

  // 如果完全沒有任何 row，至少放一列空白
  if (!cardsList.children.length) addCardRow({ front: '', back: '' });

  btnAddCard.onclick = () => {
    addCardRow({ front: '', back: '' });
    cardsList.lastChild?.querySelector('textarea')?.focus();
  };

  if (btnExport) {
    btnExport.onclick = () => {
      const name = (nameInput.value || '').trim();
      const rows = collectEditorRows();
      const payload = { name, cards: rows };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${sanitizeFilename(name)}.json`;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        try { URL.revokeObjectURL(a.href); } catch {}
        try { a.remove(); } catch {}
      }, 500);
    };
  }

  btnClose.onclick = () => {
    try { screen.remove(); } catch {}
  };

  btnSave.onclick = () => {
    const name = (nameInput.value || '').trim();
    if (!name) {
      alert('請輸入名稱');
      nameInput.focus();
      return;
    }

    const rows = collectEditorRows();

    // 防誤刪：如果原本有卡，現在 rows 卻是 0，先確認
    if (mode === 'edit') {
      const had = Array.isArray(node.items) && node.items.length > 0;
      if (had && rows.length === 0) {
        const ok = confirm('目前沒有任何有效字卡（正面+背面）內容。\n\n按「確定」會把這個卡片集清空。\n按「取消」回去再檢查一下。');
        if (!ok) return;
      }
    }

    if (mode === 'create') {
      const newNode = fcCreateNode({ name, parentId, type: (type === 'topic' ? 'topic' : 'folder') });
      if (newNode) {
        fcReplaceCardsOfNode(newNode.id, rows);
        alert(`已建立：${name}（${rows.length} 張）`);
      }
      try { screen.remove(); } catch {}
      setTimeout(() => {
        try {
          if (typeof window.fcRenderHomeList === 'function') window.fcRenderHomeList();
          if (typeof window.fcRenderFolderList === 'function') window.fcRenderFolderList();
        } catch (e) {
          console.error('flashcards directory refresh failed', e);
        }
      }, 0);

      return;
    }

    // === edit（加強防呆：存檔當下再抓一次 node）===
    let liveNode = node;
    if (!liveNode && nodeId) liveNode = fcGetNode(nodeId);

    if (!liveNode) {
      alert('找不到要儲存的卡片集（可能已被刪除、或 nodeId 沒有正確傳入）。');
      return;
    }

    // 更新外層參照（避免後續邏輯仍拿到 null）
    node = liveNode;

    liveNode.name = name;
    fcReplaceCardsOfNode(liveNode.id, rows);
    fcSave();
    alert(`已儲存：${name}（${rows.length} 張）`);
    try { screen.remove(); } catch {}
    if (typeof window.fcRenderHomeList === 'function') window.fcRenderHomeList();
    if (typeof window.fcRenderFolderList === 'function') window.fcRenderFolderList();
    if (document.body.contains(nameInput)) setTimeout(() => nameInput.focus(), 100);
  };
   

  setTimeout(() => nameInput.focus(), 50);
}



// ---------- 主畫面：資料夾/主題清單 ----------
function fcOpenHome() {
  fcEnsureStyle();
  fcLoad();

  if (document.getElementById('fc-screen')) return;

  const screen = document.createElement('div');
  screen.id = 'fc-screen';
  screen.className = 'fc-screen';

  screen.innerHTML = `
    <div class="fc-top">
      <button class="fc-iconbtn" id="fc-home-close" title="退出">✕</button>
      <div class="title">字卡</div>
      <button class="fc-btn" id="fc-home-add-folder" title="新增資料夾">新增資料夾</button>
      <button class="fc-btn" id="fc-home-add-topic" title="新增主題">新增主題</button>
      <button class="fc-btn" id="fc-home-import" title="匯入字卡">匯入字卡</button>

    </div>

    <div class="fc-body">
      <div class="fc-panel">
        <div class="fc-subtitle">資料夾 / 主題</div>
        <div class="fc-list" id="fc-home-list"></div>
      </div>
    </div>
  `;

  document.body.appendChild(screen);

  const close = () => { try { screen.remove(); } catch {} };
  document.getElementById('fc-home-close').onclick = close;

  // 新增資料夾：直接建立，不進編輯器
  document.getElementById('fc-home-add-folder').onclick = () => {
    const nm = prompt('資料夾名稱：');
    if (!nm || !nm.trim()) return;
    fcCreateNode({ name: nm.trim(), parentId: null, type: 'folder' });
    renderHomeList();
  };

  // 新增主題：開編輯器（因為主題要新增字卡）
  document.getElementById('fc-home-add-topic').onclick = () => {
    fcOpenEditor({ mode: 'create', parentId: null, type: 'topic' });
  };
 
  document.getElementById('fc-home-import').onclick = () => fcImportFlashcards(null);

  function renderHomeList() {
    const list = document.getElementById('fc-home-list');
    if (!list) return;
    list.innerHTML = '';

    const roots = fcChildren(null);
    if (!roots.length) {
      list.innerHTML = `<div class="fc-hint">目前沒有資料夾/主題</div>`;
      return;
    }
    roots.forEach(node => {
      const row = document.createElement('div');
      row.className = 'fc-node';

      // 讓整列可點 + 可鍵盤操作
      row.style.cursor = 'pointer';
      row.tabIndex = 0;
      row.setAttribute('role', 'button');

      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = `${node.type === 'topic' ? '📘' : '📁'} ${node.name}`;
      // 避免 CSS 還留著 cursor:pointer 時造成誤導
      label.style.cursor = 'inherit';

      const right = document.createElement('div');
      right.className = 'fc-node-actions';
      right.style.display = 'flex';
      right.style.gap = '8px';
      right.style.flexShrink = '0';

      const openNode = () => {
        if (node.type === 'folder') fcOpenFolder(node.id);
        else fcOpenStudy(node.id);
      };

      row.addEventListener('click', (e) => {
        // 點到右側按鈕（或任何 button）就不要觸發整列開啟
        if (e.target && (e.target.closest('button') || e.target.closest('.fc-node-actions'))) return;
        openNode();
      });

      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openNode();
        }
      });

      // topic 才顯示「依序/隨機」
      if (node.type === 'topic') {
        const btnSeq = document.createElement('button');
        btnSeq.className = 'fc-btn';
        btnSeq.textContent = '依序';
        btnSeq.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          fcOpenStudy(node.id, 0, { shuffle: false });
        };

        const btnShuffle = document.createElement('button');
        btnShuffle.className = 'fc-btn';
        btnShuffle.textContent = '隨機';
        btnShuffle.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          fcOpenStudy(node.id, 0, { shuffle: true });
        };

        right.appendChild(btnSeq);
        right.appendChild(btnShuffle);
      }

      const edit = document.createElement('button');
      edit.className = 'fc-btn';
      edit.textContent = '編輯';
      edit.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (node.type === 'topic') {
          fcOpenEditor('edit', null, node.id, 'topic');
        } else {
          const newName = prompt('新名稱', node.name);
          if (!newName || !newName.trim()) return;
          node.name = newName.trim();
          fcSave();
          renderHomeList();
        }
      };

      const del = document.createElement('button');
      del.className = 'fc-btn danger';
      del.textContent = '刪除';
      del.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm(`確定刪除「${node.name}」？`)) return;
        fcDeleteNodeRecursive(node.id);
        renderHomeList();
      };

      right.appendChild(edit);
      right.appendChild(del);

      row.appendChild(label);
      row.appendChild(right);
      list.appendChild(row);
    });
  }

  // 提供給編輯器儲存回來時刷新
  window.__fcRenderHomeList = renderHomeList;
  renderHomeList();
}

// ---------- 資料夾檢視：只顯示主題/子資料夾 ----------
// ---------- 資料夾檢視：只顯示主題/子資料夾 ----------
function fcOpenFolder(nodeId) {
  fcEnsureStyle();
  fcLoad();

  const node = fcGetNode(nodeId);
  if (!node || node.type !== 'folder') return;

  const old = document.getElementById('fc-folder-screen');
  if (old) try { old.remove(); } catch {}

  const screen = document.createElement('div');
  screen.id = 'fc-folder-screen';
  screen.className = 'fc-screen';

  screen.innerHTML = `
    <div class="fc-top">
      <button class="fc-iconbtn" id="fc-folder-close" title="返回">✕</button>
      <div class="title">${node.name || '資料夾'}</div>
      <button class="fc-btn" id="fc-folder-add-folder" title="新增資料夾">新增資料夾</button>
      <button class="fc-btn" id="fc-folder-add-topic" title="新增主題">新增主題</button>
      <button class="fc-btn" id="fc-folder-import" title="匯入字卡">匯入字卡</button>
    </div>

    <div class="fc-body">
      <div class="fc-panel">
        <div class="fc-subtitle">內容</div>
        <div class="fc-list" id="fc-folder-list"></div>
      </div>
    </div>
  `;

  document.body.appendChild(screen);

  // ✕：如果有上一層資料夾，就回上一層；否則才回到根目錄（關掉資料夾畫面）
  const close = () => {
    if (node.parentId) {
      fcOpenFolder(node.parentId);
    } else {
      try { screen.remove(); } catch {}
    }
  };
  document.getElementById('fc-folder-close').onclick = close;

  // 在此資料夾內新增資料夾
  document.getElementById('fc-folder-add-folder').onclick = () => {
    const nm = prompt('子資料夾名稱：');
    if (!nm || !nm.trim()) return;
    fcCreateNode({ name: nm.trim(), parentId: node.id, type: 'folder' });
    renderFolderList();
    if (typeof window.__fcRenderHomeList === 'function') window.__fcRenderHomeList();
  };

  // 在此資料夾內新增主題
  document.getElementById('fc-folder-add-topic').onclick = () => {
    fcOpenEditor({ mode: 'create', parentId: node.id, type: 'topic' });
  };

  document.getElementById('fc-folder-import').onclick = () => fcImportFlashcards(node.id);

  function renderFolderList() {
    const list = document.getElementById('fc-folder-list');
    if (!list) return;
    list.innerHTML = '';

    const kids = fcChildren(node.id);
    if (!kids.length) {
      list.innerHTML = `<div class="fc-hint">目前沒有內容。</div>`;
      return;
    }
    kids.forEach(ch => {
      const row = document.createElement('div');
      row.className = 'fc-node';

      // 整列可點 + 可鍵盤操作
      row.style.cursor = 'pointer';
      row.tabIndex = 0;
      row.setAttribute('role', 'button');

      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = `${ch.type === 'topic' ? '📘' : '📁'} ${ch.name}`;
      // 避免 CSS 還留著 cursor:pointer 時造成「看起來像只有字可點」
      label.style.cursor = 'inherit';

      const right = document.createElement('div');
      right.className = 'fc-node-actions';
      right.style.display = 'flex';
      right.style.gap = '8px';
      right.style.flexShrink = '0';

      const openChild = () => {
        if (ch.type === 'folder') fcOpenFolder(ch.id);
        else fcOpenStudy(ch.id);
      };

      row.addEventListener('click', (e) => {
        // 點到右側按鈕/按鈕區就不要觸發整列開啟
        if (e.target && (e.target.closest('button') || e.target.closest('.fc-node-actions'))) return;
        openChild();
      });

      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openChild();
        }
      });

      // topic 才顯示「依序/隨機」
      if (ch.type === 'topic') {
        const btnSeq = document.createElement('button');
        btnSeq.className = 'fc-btn';
        btnSeq.textContent = '依序';
        btnSeq.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          fcOpenStudy(ch.id, 0, { shuffle: false });
        };

        const btnShuffle = document.createElement('button');
        btnShuffle.className = 'fc-btn';
        btnShuffle.textContent = '隨機';
        btnShuffle.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          fcOpenStudy(ch.id, 0, { shuffle: true });
        };

        right.appendChild(btnSeq);
        right.appendChild(btnShuffle);
      }

      const edit = document.createElement('button');
      edit.className = 'fc-btn';
      edit.textContent = '編輯';
      edit.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (ch.type === 'topic') {
          fcOpenEditor('edit', null, ch.id, 'topic');
        } else {
          const newName = prompt('新名稱', ch.name);
          if (!newName || !newName.trim()) return;
          ch.name = newName.trim();
          fcSave();
          renderFolderList();
          if (typeof window.fcRenderHomeList === 'function') window.fcRenderHomeList();
        }
      };

      const del = document.createElement('button');
      del.className = 'fc-btn danger';
      del.textContent = '刪除';
      del.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm(`確定刪除「${ch.name}」？`)) return;
        fcDeleteNodeRecursive(ch.id);
        renderFolderList();
        if (typeof window.fcRenderHomeList === 'function') window.fcRenderHomeList();
      };

      right.appendChild(edit);
      right.appendChild(del);

      row.appendChild(label);
      row.appendChild(right);
      list.appendChild(row);
    });
  }

  // 提供給編輯器儲存回來時刷新
  window.fcRenderFolderList = renderFolderList;
  window.__fcRenderFolderList = renderFolderList;
  renderFolderList();
}

function fcAutoFitTextToContainer(containerEl, textEl, opts) {
  if (!containerEl || !textEl) return;

  const minPx = Number.isFinite(Number(opts?.minPx)) ? Number(opts.minPx) : 12;
  const onDone = typeof opts?.onDone === "function" ? opts.onDone : null;

  if (!textEl.dataset.fcBaseFontPx) {
    const prev = textEl.style.fontSize;
    textEl.style.fontSize = ""; // inline CSS clear
    const base = parseFloat(getComputedStyle(textEl).fontSize);
    textEl.dataset.fcBaseFontPx = String(Number.isFinite(base) && base > 0 ? base : 44);
    textEl.style.fontSize = prev;
  }

  const baseMax = Number(textEl.dataset.fcBaseFontPx || 44);
  const maxPx = Number.isFinite(Number(opts?.maxPx)) ? Number(opts.maxPx) : baseMax;

  // token to cancel stale resize runs
  const token = String(Number(textEl.dataset.fcFitToken || 0) + 1);
  textEl.dataset.fcFitToken = token;

  textEl.style.fontSize = `${maxPx}px`;

  requestAnimationFrame(() => {
    if (textEl.dataset.fcFitToken !== token) return;

    // container padding
    const cs = getComputedStyle(containerEl);
    const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);

    const cw = Math.max(0, containerEl.clientWidth - padX);
    const ch = Math.max(0, containerEl.clientHeight - padY);
    if (!cw || !ch) return;

    const fits = (px) => {
      textEl.style.fontSize = `${px}px`;
      void textEl.offsetWidth; // iOS/Chromium reflow

      return textEl.scrollWidth <= cw && textEl.scrollHeight <= ch;
    };

    let lo = minPx;
    let hi = maxPx;
    let best = minPx;

    for (let i = 0; i < 14; i++) {
      const mid = Math.floor((lo + hi) / 2);
      if (fits(mid)) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    textEl.style.fontSize = `${best}px`;
    void textEl.offsetWidth;

    // expose result
    textEl.dataset.fcLastFitPx = String(best);
    textEl.dataset.fcLastFitHitMin = best <= minPx ? "1" : "0";

    const overflowX = textEl.scrollWidth > cw;
    const overflowY = textEl.scrollHeight > ch;

    if (onDone) {
      onDone(best, { minPx, maxPx, cw, ch, overflowX, overflowY, hitMin: best <= minPx });
    }
  });
}


function fcEnsureStudyStyle() {
  if (document.getElementById('fc-study-style')) return;
  const s = document.createElement('style');
  s.id = 'fc-study-style';
  s.textContent = `
    .fc-study-topright{ display:flex; gap:10px; align-items:center; }

    .fc-study-progress{
      opacity:.75;
      font-weight:700;
      min-width:64px;
      text-align:center;
      white-space:nowrap;
    }

    /* 原本你這裡是 display:none !important；所以按鍵永遠不會出現 */
    .fc-study-wrap-toggle{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:8px 12px;
      border-radius:9999px;
      border:1px solid var(--border, #333);
      background:transparent;
      color:var(--fg, #fff);
      cursor:pointer;
      font-size:13px;
      white-space:nowrap;
    }
    .fc-study-wrap-toggle:hover{
      border-color:var(--accent, #2f74ff);
      color:var(--accent, #2f74ff);
    }

    .fc-study-stage{
      flex:1;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:18px;
      position:relative;
      overflow:hidden;
    }

    .fc-study-card{
      width:min(620px, 92vw);
      max-width:calc(100vw - 32px);
      height:min(720px, 72vh);
      background:rgba(255,255,255,.06);
      border:1px solid var(--border, #333);
      border-radius:24px;
      padding:28px;
      text-align:center;
      cursor:pointer;
      backdrop-filter:blur(8px);
      user-select:none;
      box-sizing:border-box;
      overflow:hidden;
      display:flex;
      align-items:center;
      justify-content:center;
    }

    .fc-study-text{
      font-size:44px;
      font-weight:800;
      line-height:1.25;
      white-space:pre-wrap;     /* 預設：會換行 */
      overflow-wrap:anywhere;
      word-break:break-word;
      text-align:center;
      display:block;
      width:100%;
      max-width:100%;
    }

    /* 不換行模式（單行 / 可左右捲） */
    .fc-study-text.fc-nowrap{
      white-space:pre;
      overflow-wrap:normal;
      word-break:normal;
    }

    .fc-study-hint{
      position:absolute;
      bottom:18px;
      left:0; right:0;
      text-align:center;
      font-size:12px;
      color:var(--muted, #aaa);
      pointer-events:none;
    }

    .fc-study-bottom{
      padding:14px;
      border-top:1px solid var(--border, #333);
      display:flex;
      gap:10px;
      justify-content:center;
      background:rgba(0,0,0,.12);
    }

    .fc-study-navbtn{
      padding:10px 16px;
      border-radius:9999px;
      border:1px solid var(--border, #333);
      background:transparent;
      color:var(--fg, #fff);
      cursor:pointer;
      font-size:14px;
      min-width:90px;
      white-space:nowrap;
    }
    .fc-study-navbtn:hover{
      border-color:var(--accent, #2f74ff);
      color:var(--accent, #2f74ff);
    }
    .fc-study-navbtn:disabled{
      opacity:.45;
      cursor:not-allowed;
    }

    @media (max-width:1024px){ .fc-study-text{ font-size:36px; } }
    @media (max-width:768px){ .fc-study-text{ font-size:30px; } .fc-study-card{ height:min(640px, 68vh); } }
  `;
  document.head.appendChild(s);
}

function fcSyncCenterScroll(containerEl) {
  if (!containerEl) return;

  // 預設偏好置中（你原本就是這樣用）
  containerEl.dataset.fcCenter = "1";

  // 確保 overflow 修正的 CSS 有注入
  ensureFlashcardScrollFixStyle();

  requestAnimationFrame(() => {
    // sub-pixel / rounding 留個門檻
    const isOverflowY = (containerEl.scrollHeight - containerEl.clientHeight) > 2;
    const isOverflowX = (containerEl.scrollWidth - containerEl.clientWidth) > 2;

    const wasOverflowY = containerEl.dataset.fcOverflowY === "1";
    const wasOverflowX = containerEl.dataset.fcOverflowX === "1";

    containerEl.dataset.fcOverflowY = isOverflowY ? "1" : "0";
    containerEl.dataset.fcOverflowX = isOverflowX ? "1" : "0";

    // 這裡是關鍵：不管有沒有 preferCenter，都要把 X overflow 算進去
    const isAnyOverflow = isOverflowY || isOverflowX;
    containerEl.dataset.fcOverflow = isAnyOverflow ? "1" : "0";
    containerEl.classList.toggle("fc-overflow", isAnyOverflow);

    // overflow 狀態剛出現時，讓捲動回到起點
    if (isOverflowY && !wasOverflowY) containerEl.scrollTop = 0;
    if (isOverflowX && !wasOverflowX) containerEl.scrollLeft = 0;

    // 沒 overflow 時強制歸零，避免殘留位移
    if (!isOverflowY) containerEl.scrollTop = 0;
    if (!isOverflowX) containerEl.scrollLeft = 0;
  });
}


// ===== Flashcards：背卡顯示模式（換行 / 不換行改捲動）=====
const FC_STUDY_WRAP_KEY = "ntuvm-fc-study-wrap"; // 1=換行(pre-wrap) / 0=不換行(pre)

function fcGetStudyWrapMode() {
  try {
    const raw = localStorage.getItem(FC_STUDY_WRAP_KEY);
    if (raw === null) return true; // 預設：換行
    return raw === "1";
  } catch {
    return true;
  }
}

function fcSetStudyWrapMode(isWrap) {
  try {
    localStorage.setItem(FC_STUDY_WRAP_KEY, isWrap ? "1" : "0");
  } catch {}
}

function fcOpenStudy(nodeId, startIndex = 0, opts) {
  try { fcEnsureStyle?.(); } catch {}
  try { fcEnsureStudyStyle(); } catch {}
  try { fcLoad?.(); } catch {}
  try { fcLoad(); } catch {}

  const node = fcGetNode(nodeId);
  if (!node) return;

  const ids = Array.isArray(node.items) ? node.items : [];

  function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  const playIds = ids.slice();
  if (opts && opts.shuffle) shuffleInPlace(playIds);

  const cards = playIds.map(id => state.flashcards.cards[id]).filter(Boolean);
  if (!cards.length) {
    alert("這個題庫沒有卡片喔～");
    return;
  }

  const old = document.getElementById('fc-study-screen');
  if (old) try { old.remove(); } catch {}

  const screen = document.createElement('div');
  screen.id = 'fc-study-screen';
  screen.className = 'fc-screen';

  let idx = Math.max(0, Math.min(startIndex, cards.length - 1));
  let isFront = true;
  let forceWrapThisCard = false; // 單行縮到 minPx 仍放不下時，該張卡自動換行救援


  screen.innerHTML = `
    <div class="fc-top">
      <button class="fc-iconbtn" id="fc-study-exit" title="返回">←</button>
      <div class="title">${node.name}</div>

      <div class="fc-study-topright">
        <div class="fc-study-progress" id="fc-study-progress"></div>
        <button class="fc-iconbtn" id="fc-study-edit" title="編輯">✎</button>
      </div>
    </div>

    <div class="fc-study-stage" style="position:relative;">
      <div class="fc-study-card" id="fc-study-card">
        <div class="fc-study-text" id="fc-study-text"></div>
      </div>
      <div class="fc-study-hint">點一下翻面；左右鍵或下方按鈕換卡</div>
    </div>

    <div class="fc-study-bottom">
      <button class="fc-study-navbtn" id="fc-study-prev">上一張</button>
      <button class="fc-study-navbtn" id="fc-study-next">下一張</button>
    </div>
  `;

  document.body.appendChild(screen);

  const progressEl = screen.querySelector('#fc-study-progress');
  const textEl = screen.querySelector('#fc-study-text');
  const cardEl = screen.querySelector('#fc-study-card');
  const btnPrev = screen.querySelector('#fc-study-prev');
  const btnNext = screen.querySelector('#fc-study-next');

  // 在 topbar 右側插入「換行/單行」切換按鍵（不靠任何 patch）
  const topRight = screen.querySelector('.fc-study-topright') || screen.querySelector('.fc-top');
  const btnWrap = document.createElement('button');
  btnWrap.id = 'fc-study-wrap-toggle';
  btnWrap.className = 'fc-study-wrap-toggle';
  topRight.appendChild(btnWrap);

  function isWrapMode() {
    // 你原本就有 fcGetStudyWrapMode / fcSetStudyWrapMode / FCSTUDYWRAPKEY
    // true = 換行(pre-wrap), false = 單行(pre)
    try { return !!fcGetStudyWrapMode(); } catch { return true; }
  }
  function setWrapMode(v) {
    try { fcSetStudyWrapMode(!!v); } catch {}
  }
  function syncWrapUIOnly() {
    const wrap = isWrapMode();
    if (textEl) textEl.classList.toggle('fc-nowrap', !wrap);
    btnWrap.textContent = wrap ? '換行' : '單行';
  }

  if (cardEl) cardEl.dataset.fcCenter = "1";
  function fitText() {
    if (!cardEl || !textEl) return;

    textEl.style.visibility = "hidden";

    try {
      cardEl.scrollTop = 0;
      cardEl.scrollLeft = 0;
    } catch {}

    // 使用者偏好：true=可換行、false=單行
    const userWrap = isWrapMode();
    // 這張卡若需要救援，就算 userWrap=false 也強制換行
    const wrapNow = userWrap || forceWrapThisCard;

    // 注意：這裡不要改 btnWrap 的文字（維持顯示使用者的選擇）
    textEl.classList.toggle("fc-nowrap", !wrapNow);

    fcAutoFitTextToContainer(cardEl, textEl, {
      minPx: 14,
      onDone: (bestPx, info) => {
        // 單行模式下：如果已經縮到 minPx 還是塞不進去（overflowX），就改成可換行再 fit 一次
        if (!userWrap && !forceWrapThisCard && info.hitMin && info.overflowX) {
          forceWrapThisCard = true;
          textEl.classList.remove("fc-nowrap");

          fcAutoFitTextToContainer(cardEl, textEl, {
            minPx: 14, maxPx:14,
            onDone: () => {
              requestAnimationFrame(() => {
                try {
                  fcSyncCenterScroll(cardEl);
                } catch {}
                requestAnimationFrame(() => {
                  textEl.style.visibility = "visible";
                });
              });
            },
          });

          return;
        }

        requestAnimationFrame(() => {
          try {
            fcSyncCenterScroll(cardEl);
          } catch {}
          requestAnimationFrame(() => {
            textEl.style.visibility = "visible";
          });
        });
      },
    });
  }


  function render() {
    const c = cards[idx];
    if (!c) return;

    if (progressEl) progressEl.textContent = `${idx + 1} / ${cards.length}`;

    if (textEl) {
      // 先藏再換字，搭配 fitText 不會跳
      textEl.style.visibility = "hidden";
      textEl.textContent = isFront ? (c.front || "") : (c.back || "");
      forceWrapThisCard = false;
    }

    if (btnPrev) btnPrev.disabled = idx <= 0;
    if (btnNext) btnNext.disabled = idx >= cards.length - 1;

    syncWrapUIOnly();

    requestAnimationFrame(fitText);
  }

  function flip() {
    isFront = !isFront;
    render();
  }

  function prev() {
    if (idx <= 0) return;
    idx -= 1;
    isFront = true;
    render();
  }

  function next() {
    if (idx >= cards.length - 1) return;
    idx += 1;
    isFront = true;
    render();
  }

  btnWrap.addEventListener('click', (e) => {
    try { e.preventDefault(); e.stopPropagation(); } catch {}
    setWrapMode(!isWrapMode());
    syncWrapUIOnly();
    requestAnimationFrame(fitText);
  });

  const onResize = () => requestAnimationFrame(fitText);
  window.addEventListener('resize', onResize);

  if (cardEl) cardEl.addEventListener('click', flip);
  if (btnPrev) btnPrev.addEventListener('click', prev);
  if (btnNext) btnNext.addEventListener('click', next);

  screen.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
    if (e.key === ' ' || e.key === 'Enter') flip();
  });

  screen.tabIndex = -1;
  screen.focus();

  screen.querySelector('#fc-study-exit')?.addEventListener('click', () => {
    window.removeEventListener('resize', onResize);
    try { screen.remove(); } catch {}
  });

  screen.querySelector('#fc-study-edit')?.addEventListener('click', () => {
    window.removeEventListener('resize', onResize);
    try { screen.remove(); } catch {}
    fcOpenEditor('edit', null, node.id, 'topic');
  });

  render();
}
// 讓 Flashcards Study Patch v3 可以穩定掛勾（尤其是 script module / 封裝作用域時）
try { window.fcOpenStudy = fcOpenStudy; } catch (e) {}






// ---------- 檢視器：直式大卡，點一下翻面 ----------
function fcOpenViewer(cardId) {
  fcEnsureStyle();
  fcLoad();

  const card = state.flashcards.cards[cardId];
  if (!card) return;

  const old = document.getElementById('fc-viewer-mask');
  if (old) try { old.remove(); } catch {}
  const oldBtn = document.getElementById('fc-viewer-close');
  if (oldBtn) try { oldBtn.remove(); } catch {}

  const mask = document.createElement('div');
  mask.id = 'fc-viewer-mask';
  mask.className = 'fc-viewer-mask';

  const closeBtn = document.createElement('button');
  closeBtn.id = 'fc-viewer-close';
  closeBtn.className = 'fc-viewer-close';
  closeBtn.textContent = '✕';

  const cardEl = document.createElement('div');
  cardEl.className = 'fc-viewer-card';

  const text = document.createElement('div');
  text.className = 'fc-viewer-text';
  text.textContent = card.front || '';

  cardEl.appendChild(text);
  mask.appendChild(cardEl);
  document.body.appendChild(mask);
  document.body.appendChild(closeBtn);

  let isFront = true;
  const fitAndCenter = () => {
    text.style.visibility = "hidden";

    // Reset scroll first
    try {
      cardEl.scrollTop = 0;
      cardEl.scrollLeft = 0;
    } catch {}

    // Auto-fit font (runs measurement in rAF internally)
    fcAutoFitTextToContainer(cardEl, text, { minPx: 14 });

    // IMPORTANT: wait 1 frame so auto-fit applies, then re-check overflow & centering
    requestAnimationFrame(() => {
      try {
        fcSyncCenterScroll(cardEl);
      } catch {}

      // One more frame to ensure styles settle before showing
      requestAnimationFrame(() => {
        text.style.visibility = "visible";
      });
    });
  };



  const applyText = () => {
    text.style.visibility = "hidden";
    text.textContent = isFront ? (card.front || '') : (card.back || '');
    requestAnimationFrame(fitAndCenter);
  };

  applyText();

  cardEl.onclick = () => {
    isFront = !isFront;
    applyText();
  };

  const onResize = () => requestAnimationFrame(fitAndCenter);
  window.addEventListener('resize', onResize);

  const close = () => {
    window.removeEventListener('resize', onResize);
    try { mask.remove(); } catch {}
    try { closeBtn.remove(); } catch {}
  };

  closeBtn.onclick = close;
  mask.onclick = (e) => { if (e.target === mask) close(); };
}



// ---------- 綁定左欄按鈕 ----------
const btnFlashcards = document.getElementById('btnFlashcards');
if (btnFlashcards) {
  bindTapClick(btnFlashcards, fcOpenHome);
}
// =================== 字卡功能結束 ===================




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
      .rv-table col.c-op{width:90px;}
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
      <col class="c-op">
      <col class="c-date">
      <col class="c-subj">
      <col class="c-year">
      <col class="c-round">
      <col class="c-total">
      <col class="c-corr">
      <col class="c-score">
      <col class="c-wids">
      <col class="c-wdet">
      <col class="c-sum">
    </colgroup>
    <thead><tr>
      <th>操作</th><th>測驗日期</th><th>科目</th><th>年份</th><th>梯次</th>
      <th>總題數</th><th>正確題數</th><th>得分</th>
      <th>錯誤題號</th><th>錯題詳情</th><th>作答概覽</th>
    </tr></thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");
  arr.forEach((r, idx) => {
    const tr = document.createElement("tr");
  
    // 1. 先建立「操作」欄（最左邊）
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
    btnReview.onclick = () => reviewRecordWrong(arr[idx]);
  
    const btnDel = document.createElement("button");
    btnDel.textContent = "刪除";
    btnDel.style.padding = "4px 8px";
    btnDel.style.borderRadius = "9999px";
    btnDel.style.border = "1px solid var(--border)";
    btnDel.style.background = "transparent";
    btnDel.style.color = "var(--fg)";
    btnDel.style.cursor = "pointer";
    btnDel.style.fontSize = "12px";
    btnDel.style.marginLeft = "6px";
    btnDel.onclick = () => {
      const ok = confirm(`確定要刪除這筆紀錄嗎？\n科目：${r.subj}\n年份：${r.year}\n梯次：${r.round}\n時間：${r.ts}`);
      if (!ok) return;
  
      const rows = Array.from(tbody.children);
      const index = rows.indexOf(tr);
      if (index === -1) return;
  
      arr.splice(index, 1);
      try {
        localStorage.setItem("examRecords", JSON.stringify(arr));
      } catch (e) {
        console.error("save examRecords error:", e);
        alert("儲存刪除結果時發生錯誤。");
        return;
      }
      tr.remove();
    };
  
    tdOp.appendChild(btnReview);
    tdOp.appendChild(btnDel);
    tr.appendChild(tdOp);
  
    // 2. 再塞其他 10 欄資料（依照新的表頭順序）
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
    cells.forEach(c => {
      const td = document.createElement("td");
      td.innerHTML = escapeHTML(c ?? "");
      tr.appendChild(td);
    });
  
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

async function embedIdbImagesIntoHtmlForExport(html, dataUrlCache) {
  const srcPrefix = "idbimg:";
  const cache = dataUrlCache && typeof dataUrlCache === "object" ? dataUrlCache : {};

  const raw = typeof html === "string" ? html : "";
  if (!raw.trim()) return raw;

  let doc;
  try {
    doc = new DOMParser().parseFromString(`<div id="__root__">${raw}</div>`, "text/html");
  } catch (e) {
    return raw;
  }

  const root = doc.getElementById("__root__");
  if (!root) return raw;

  const imgs = Array.from(root.querySelectorAll("img"));
  for (const img of imgs) {
    let src = "";
    try {
      src = String(img.getAttribute("src") || "");
    } catch (e) {
      src = "";
    }

    let id = null;

    if (src.startsWith(srcPrefix)) {
      id = src.slice(srcPrefix.length).trim();
    } else {
      try {
        const dsId = img.dataset && img.dataset.nimgId ? String(img.dataset.nimgId) : "";
        if (dsId.trim()) id = dsId.trim();
      } catch (e) {}
    }

    if (!id) continue;

    if (!cache[id]) {
      try {
        const blob = await idbGetNoteImageBlob(id);
        if (blob) {
          const dataUrl = await blobToDataUrl(blob);
          if (typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
            cache[id] = dataUrl;
          }
        }
      } catch (e) {
        // ignore single image failure
      }
    }

    if (cache[id]) {
      try {
        img.setAttribute("src", cache[id]);
      } catch (e) {}
    }
  }

  return root.innerHTML;
}

async function exportNotesForCurrentScope() {
  try {
    // 0) 先把目前編輯中的內容存下來（避免漏最新）
    try {
      if (typeof saveNotes === "function") await Promise.resolve(saveNotes());
    } catch (e) {}

    const scope = typeof getScopeFromUI === "function"
      ? getScopeFromUI()
      : { subj: "unknown", year: "0", round: "0" };

    const prefix = `note${scope.subj}${scope.year}r${scope.round}q`;

    // 1) 先拉一份 IDB prefix map（快），但拿不到的要 fallback
    let map = {};
    try {
      if (typeof idbGetNotesMapByPrefix === "function") {
        map = await idbGetNotesMapByPrefix(prefix);
      }
    } catch (e) {
      map = {};
    }
    if (!map || typeof map !== "object") map = {};

    const qs = Array.isArray(state?.questions) ? state.questions : [];

    // 2) 一次匯出本卷所有題
    const dataUrlCache = Object.create(null);

    const arrAll = [];
    for (const q of qs) {
      const k = typeof keyForNote === "function"
        ? keyForNote(q.id, scope)
        : `note${scope.subj}${scope.year}r${scope.round}q${q.id}`;

      // 2-1) 依序 fallback：IDB prefix map -> getStoredNoteHtmlNoWrite -> state.notes
      let html = "";
      try {
        if (Object.prototype.hasOwnProperty.call(map, k)) {
          html = map[k] || "";
        }
      } catch (e) {}

      if (!String(html || "").trim()) {
        try {
          if (typeof getStoredNoteHtmlNoWrite === "function") {
            const v = await getStoredNoteHtmlNoWrite(k);
            if (typeof v === "string") html = v;
          }
        } catch (e) {}
      }

      if (!String(html || "").trim()) {
        try {
          const mem = state?.notes && typeof state.notes === "object" ? state.notes[k] : "";
          if (typeof mem === "string") html = mem;
        } catch (e) {}
      }

      // 2-2) 把 idbimg: 轉成 dataURL（圖片真的嵌進 HTML）
      let explanation = html || "";
      try {
        if (typeof embedIdbImagesIntoHtmlForExport === "function") {
          explanation = await embedIdbImagesIntoHtmlForExport(explanation, dataUrlCache);
        }
      } catch (e) {}

      arrAll.push({ id: q.id, explanation });
    }

    const total = arrAll.length;

    const ts = new Date();
    const y = ts.getFullYear();
    const m = String(ts.getMonth() + 1).padStart(2, "0");
    const d = String(ts.getDate()).padStart(2, "0");
    const hh = String(ts.getHours()).padStart(2, "0");
    const mm = String(ts.getMinutes()).padStart(2, "0");

    // 檔名可以保留 scope/meta 資訊（不影響 Python）
    const filename = `ntuvm-本卷詳解-${scope.subj}-${scope.year}-r${scope.round}-${y}${m}${d}-${hh}${mm}.json`;

    let ok = false;

    // 優先用大型陣列下載（避免 JSON.stringify 整包爆）
    try {
      if (typeof downloadJsonArrayLarge === "function") {
        ok = !!downloadJsonArrayLarge(arrAll, filename);
      }
    } catch (e) {
      ok = false;
    }

    // 後備：小檔案才用這個
    if (!ok) {
      if (typeof downloadJsonObject === "function") {
        downloadJsonObject(arrAll, filename);
        ok = true;
      } else {
        alert("downloadJsonObject 不存在，無法下載。");
        return;
      }
    }

    if (ok && typeof toast === "function") toast(`已下載本卷詳解（共 ${total} 題，含圖片）`);
  } catch (e) {
    console.error("exportNotesForCurrentScope failed", e);
    alert("下載詳解失敗，請看主控台錯誤訊息");
  }
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
function togglePalette(palette, btn) {
  if (!palette || !btn) return;

  const isShown = !palette.classList.contains('hidden');

  // 一律先關掉兩個 palette，避免重疊
  if (fontColorPalette) fontColorPalette.classList.add('hidden');
  if (hlPalette) hlPalette.classList.add('hidden');

  // 只負責開關，不再設定位置，讓 CSS (.color-palette) 控制
  if (!isShown) {
    palette.classList.remove('hidden');
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



imgNote.onchange = async e => {
  const f = e.target.files?.[0];
  if (!f) return;

  try {
    await insertNoteImageFromFile(f);
    saveNotes(); // 立刻存（但會存成 idbimg 參照，見下一步）
  } catch (err) {
    console.error("insert note image failed:", err);
    alert("插入圖片失敗，請重試或換一張圖。");
  } finally {
    imgNote.value = "";
  }
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
// 把檔案讀成 DataURL（用來存到 localStorage）
function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ===== 主題自訂背景：按鈕＋檔案選擇 =====

function initCustomBgControls() {
  if (!themeSel) return;
  // 確保毛玻璃 CSS 已經掛上
  if (typeof ensureCustomBgStyle === 'function') {
    ensureCustomBgStyle();
  }

  // 1) 建立隱藏的 <input type="file">
  let input = document.getElementById('customBgInput');
  if (!input) {
    input = document.createElement('input');
    input.type = 'file';
    input.id = 'customBgInput';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
  }

  // 2) 在主題下拉旁邊加一顆「選擇背景圖片」按鈕
  let btn = document.getElementById('btnCustomBg');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'btnCustomBg';
    btn.textContent = '選擇背景圖片';
    btn.style.marginLeft = '8px';
    btn.style.padding = '4px 10px';
    btn.style.borderRadius = '9999px';
    btn.style.border = '1px solid var(--border, #444)';
    btn.style.background = 'var(--btn, #222)';
    btn.style.color = 'var(--btn-fg, #f9fafb)';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '13px';
    btn.style.whiteSpace = 'nowrap';

    const parent = themeSel.parentElement || themeSel.closest('label') || themeSel;
    parent.insertBefore(btn, themeSel.nextSibling);
  }

  // 點按鈕 → 觸發檔案選擇
  btn.addEventListener('click', () => {
    input.click();
  });

  // 選完圖 → 轉成 DataURL 存 localStorage，然後套用 custom-bg
  input.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataURL(file);
      localStorage.setItem(CUSTOM_BG_STORAGE_KEY, dataUrl);
      applyTheme('custom-bg');
    } catch (err) {
      console.error('讀取自訂背景失敗', err);
      alert('讀取圖片失敗，換一張試試看～');
    } finally {
      // 清空 input，避免同一張圖無法再次選取
      input.value = '';
    }
  });
}

// 頁面載入完成後，初始化自訂背景按鈕
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    try { initCustomBgControls(); } catch (e) { console.error(e); }
  }, { once: true });
} else {
  try { initCustomBgControls(); } catch (e) { console.error(e); }
}

/* 皮膚 */
/* 主題系統 */

// ===== 主題 ＋ 自訂背景 =====

const themeSel = document.getElementById('themeSel');

// 多一個 custom-bg 主題
const THEMES = ['dark', 'light', 'sky', 'ocean', 'forest', 'yolk', 'cosmos', 'custom-bg'];

// 存自訂背景圖用的 key（存在 localStorage 裡）
const CUSTOM_BG_STORAGE_KEY = 'ntuvm-custom-bg-image';

function ensureCustomBgStyle() {
  if (document.getElementById('custom-bg-style')) return;

  const style = document.createElement('style');
  style.id = 'custom-bg-style';
  style.textContent = `
    /* 自訂背景模式：
       1. 改寫顏色變數，拿掉深藍卡片
       2. 背景圖保持清楚，只讓卡片有毛玻璃＋一點點黑 */
    body.theme-has-custom-bg {
      /* 保持原有字色配置，稍微變亮一點 */
      --fg: #f9fafb;
      --muted: #9ca3af;

      /* 把原本深藍 #0b1220 / #141b2b 改成半透明的黑玻璃 */
      --card: rgba(8, 8, 8, 0.36);   /* 大卡片、留言區、題號區底色 */
      --pill: rgba(8, 8, 8, 0.30);   /* 小膠囊、badge、按鈕底色 */
      --border: rgba(255, 255, 255, 0.22);
      --btn: rgba(8, 8, 8, 0.30);
      --btn-fg: #f9fafb;

      background-size: cover;
      background-position: center center;
      background-repeat: no-repeat;
      background-attachment: fixed;
    }
    body.theme-has-custom-bg .pet-quiz-card {
      background: rgba(8, 8, 8, 0.60);
    }

    /* 主要區塊：左欄 panel / 題目卡 / 留言區 / 筆記區 / 右欄題號清單
       → 用 var(--card) + 毛玻璃，圓角維持接近原本的 16px，不再誇張 */
    body.theme-has-custom-bg .panel,
    body.theme-has-custom-bg .question-card,
    body.theme-has-custom-bg #comments-section,
    body.theme-has-custom-bg .notes,
    body.theme-has-custom-bg .editor,
    body.theme-has-custom-bg .right .q-list {
      background: var(--card);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: 16px;
      border: 1px solid var(--border);
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
    }

    /* 題號清單每一行：統一成淺黑玻璃，不要深藍 */
    body.theme-has-custom-bg .right .q-item {
      background: var(--card);
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.16);
    }

    /* 頂部 topbar：只加一點玻璃效果，不改圓角（沿用原本 CSS 的半膠囊） */
    body.theme-has-custom-bg .center .topbar {
      background: transparent;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      border: none;
    }

    /* topbar 裡的小膠囊 badge ＋搜尋框，用 pill 色就好，不再額外放超大圓角 */
    body.theme-has-custom-bg .topbar .badge,
    body.theme-has-custom-bg .topbar .q-search {
      background: var(--pill);
      border: 1px solid rgba(255, 255, 255, 0.24);
    }
  `;
  document.head.appendChild(style);
}



// 確保下拉選單裡有「自訂背景」這個選項
function ensureThemeOptions() {
  if (!themeSel) return;

  if (!themeSel.querySelector('option[value="custom-bg"]')) {
    const opt = document.createElement('option');
    opt.value = 'custom-bg';
    opt.textContent = '自訂背景';
    themeSel.appendChild(opt);
  }
}

function applyTheme(name, opts = {}) {
  const save = opts.save !== false;

  ensureCustomBgStyle();

  // 把所有主題 class 先拿掉
  document.body.classList.remove(
    'light',
    'theme-sky',
    'theme-ocean',
    'theme-forest',
    'theme-yolk',
    'theme-cosmos',
    'theme-has-custom-bg'
  );

  // 預設先清掉背景圖（非 custom 時用）
  document.body.style.backgroundImage = '';

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
    case 'custom-bg': {
      const img = localStorage.getItem(CUSTOM_BG_STORAGE_KEY);
      if (img) {
        document.body.style.backgroundImage = `url("${img}")`;
        document.body.classList.add('theme-has-custom-bg');
      }
      break;
    }
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
  ensureCustomBgStyle();
  ensureThemeOptions();

  const saved = localStorage.getItem('themeName');
  const initial = THEMES.includes(saved) ? saved : 'dark';
  applyTheme(initial, { save: false });
})();



/* 選單變更 → 嘗試自動載入慣用命名檔案（若存在於同 repo） */
[yearSel, roundSel, subjectSel].forEach(sel=> sel.addEventListener("change", onScopeChange));

// --- debug friendly onScopeChange ---
async function onScopeChange() {
  // 1. 先把目前卷別的筆記存起來，避免切卷弄丟
  const oldScope = state.scope;
  saveNotes(oldScope);

  // 2. 從 localStorage 載入對應答案（如果之前有存）
  loadAnswersFromStorage();

  // 3. 準備題目／答案檔案路徑
  const p = subjectPrefix(subjectSel.value);
  const r = (roundSel.value === "第一次") ? "1" : "2";
  const qName = `${p}${yearSel.value}_${r}.json`;
  const aName = `${p}w${yearSel.value}_${r}.json`;

  const qURL = pathJoin(CONFIG.basePath, CONFIG.dirs.questions, `${qName}?v=${Date.now()}`);
  const aURL = pathJoin(CONFIG.basePath, CONFIG.dirs.answers, `${aName}?v=${Date.now()}`);

  console.groupCollapsed("onScopeChange");
  console.log("subjectSel.value =", subjectSel.value);
  console.log("subjectPrefix   =", p);
  console.log("qName / aName   =", qName, aName);
  console.log("qURL            =", qURL);
  console.log("aURL            =", aURL);
  console.log("CONFIG.basePath =", CONFIG.basePath, "CONFIG.dirs =", CONFIG.dirs);
  console.groupEnd();

  let loadedQ = false;
  let loadedA = false;

  // 3-1. 載入題目檔
  try {
    const qRes = await fetch(qURL, { cache: "no-store" });
    console.log("[fetch Q]", qRes);

    if (qRes.ok) {
      const ctype = qRes.headers.get("content-type");
      console.log("[fetch Q] content-type =", ctype);

      const arr = await qRes.json();
      if (Array.isArray(arr)) {
        // ✅ 每次換卷都先更新題目本體
        state.questions = arr;

        // ✅ 若「不是群組模式」，就讓 visibleQuestions 跟著指向這一卷的題目
        //    這樣即使是從全域搜尋跳題（isJumpingFromSearch = true），
        //    中央顯示也會用到正確卷別的題目陣列，而不是前一卷殘留的列表。
        if (!state.currentGroupId) {
          state.visibleQuestions = state.questions;
        }

        // ✅ 只有在「一般切卷」的情況下，才重設 index + 重畫右側卷內清單
        //    若是從搜尋結果跳過來（isJumpingFromSearch = true），就不要洗掉右欄。
        if (!state.currentGroupId && !isJumpingFromSearch) {
          state.index = 0;
          if (searchInput) searchInput.value = "";
          renderList(state.questions, { renumber: false });
        }

        loadedQ = true;
      } else {
        console.warn("onScopeChange：題目 JSON 格式不是陣列", qName, arr);
      }
    } else {
      console.warn("onScopeChange：載入題目失敗", qRes.status, qRes.statusText);
    }
  } catch (e) {
    console.error("onScopeChange：載入題目檔錯誤", e);
  }

  // 3-2. 載入答案檔
  try {
    const aRes = await fetch(aURL, { cache: "no-store" });
    console.log("[fetch A]", aRes);

    if (aRes.ok) {
      const ctype = aRes.headers.get("content-type");
      console.log("[fetch A] content-type =", ctype);

      const obj = await aRes.json();
      if (obj && typeof obj === "object") {
        state.answers = obj;
        loadedA = true;
        console.log("onScopeChange：答案載入完成，數量 =", Object.keys(obj).length);
      } else {
        console.error("onScopeChange：答案 JSON 格式錯誤", aName, obj);
        alert(`答案檔格式錯誤：${aName}`);
      }
    } else {
      console.warn("onScopeChange：載入答案失敗", aRes.status, aRes.statusText);
    }
  } catch (e) {
    console.error("onScopeChange：載入答案檔錯誤", e);
  }

  // 3-3. 若真的找不到檔案，給個提示
  if (!loadedQ) toast(`找不到題目檔：${qName}`);
  if (!loadedA) toast(`找不到答案檔：${aName}`);

  // 4. 更新目前 scope 記錄
  state.scope = getScopeFromUI();

  // 5. 只有在「一般切卷」時，自動重畫目前題目
  //    若是從搜尋結果跳題，會由 jumpToSearchHit 自己決定要跳到哪一題再 render。
  if (!state.currentGroupId && !isJumpingFromSearch) {
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

// ==============================
// 備份 / 恢復：筆記 + 紀錄（JSON）
// 放在題號（qNum）旁邊
// ==============================

function safeJsonParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function ensureNoteRecordBackupStyle() {
  if (document.getElementById('nr-backup-style')) return;

  const style = document.createElement('style');
  style.id = 'nr-backup-style';
  style.textContent = `
    .nr-qnum-row{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      margin-bottom:10px;
      flex-wrap:wrap;
    }
    .nr-qnum-actions{
      display:flex;
      gap:8px;
      align-items:center;
      flex:0 0 auto;
    }
    .nr-mini-btn{
      padding: 6px 10px;
      border-radius: 9999px;
      border: 1px solid var(--border, #444);
      background: transparent;
      color: var(--fg, #fff);
      cursor: pointer;
      font-size: 12px;
      line-height: 1;
      white-space: nowrap;
    }
    .nr-toolbar-actions{
      display:flex;
      gap:8px;
      align-items:center;
      flex:0 0 auto;
    }
    .nr-mini-btn:hover{
      border-color: var(--accent, #2f74ff);
      color: var(--accent, #2f74ff);
    }
  `;
  document.head.appendChild(style);
}


async function buildNotesRecordsBackupPayload() {
  // 1) 讀出 IndexedDB 裡的最新筆記
  const idbNotes = await idbDumpAllNotes();
  const idbMeta = await idbDumpAllMeta();

  // 2) 再把 legacy localStorage 的 notes_v2 / notesMeta_v2 也併進來（只讀，不刪）
  __loadLegacyOnce();
  const legacyNotes = __legacyNotesObj || {};
  const legacyMeta = __legacyMetaObj || {};

  const mergedNotes = { ...legacyNotes, ...idbNotes }; // 同 key 以 IDB 為準
  const mergedMeta  = { ...legacyMeta,  ...idbMeta  };

  // 3) 額外一起備份「隨機測驗紀錄」、「餵食紀錄」（原本就有）
  const randomQuizRecords = safeJsonParse(
    localStorage.getItem(typeof RANDOMQUIZRECORDSKEY !== "undefined"
      ? RANDOMQUIZRECORDSKEY
      : "ntuvm-random-quiz-records"
    )
  ) ?? [];

  const petFeedRecords = safeJsonParse(
    localStorage.getItem(typeof PETFEEDRECORDSKEY !== "undefined"
      ? PETFEEDRECORDSKEY
      : "ntuvm-pet-feed-records"
    )
  ) ?? [];

  // 4) 把筆記圖片也一起備份（id -> {meta, type, createdAt, dataUrl}）
  const notesImages = await dumpAllNoteImagesForBackup();

  return {
    schema: "ntuvm-notes-records-backup",
    version: 2,
    exportedAt: new Date().toISOString(),
    data: {
      notes: mergedNotes,
      notesMeta: mergedMeta,
      notesImages,
      randomQuizRecords,
      petFeedRecords
    }
  };
}


function downloadJsonObject(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function downloadJsonArrayLarge(rows, filename) {
  try {
    const arr = Array.isArray(rows) ? rows : [];

    const parts = [];
    parts.push("[");

    for (let i = 0; i < arr.length; i++) {
      const row = arr[i] && typeof arr[i] === "object" ? arr[i] : {};

      const safeRow = {
        id: row.id,
        explanation: row.explanation === undefined ? null : row.explanation
      };

      // 確保 explanation 不是奇怪型別
      if (safeRow.explanation !== null && typeof safeRow.explanation !== "string") {
        try {
          safeRow.explanation = JSON.stringify(safeRow.explanation);
        } catch (e) {
          safeRow.explanation = String(safeRow.explanation);
        }
      }

      if (i > 0) parts.push(",");
      parts.push(JSON.stringify(safeRow));
    }

    parts.push("]");

    const blob = new Blob(parts, { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => {
      try { URL.revokeObjectURL(url); } catch (e) {}
    }, 0);

    return true;
  } catch (e) {
    console.error("downloadJsonArrayLarge failed", e);
    return false;
  }
}



async function applyNotesRecordsBackupPayload(payload) {
  if (!payload || payload.schema !== "ntuvm-notes-records-backup" || !payload.data) {
    alert("備份檔格式不正確");
    return false;
  }

  const data = payload.data || {};
  const notesObj = (data.notes && typeof data.notes === "object") ? data.notes : {};
  const metaObj  = (data.notesMeta && typeof data.notesMeta === "object") ? data.notesMeta : {};
  const imagesObj = (data.notesImages && typeof data.notesImages === "object") ? data.notesImages : null;

  try {
    // 1) 先把 notes / meta 寫回 Notes DB（不清空，只覆蓋同 key）
    const db = await openNotesDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction([NOTES_DB.storeNotes, NOTES_DB.storeMeta], "readwrite");
      const sNotes = tx.objectStore(NOTES_DB.storeNotes);
      const sMeta  = tx.objectStore(NOTES_DB.storeMeta);

      try {
        for (const k of Object.keys(notesObj)) {
          sNotes.put({
            k: String(k),
            html: String(notesObj[k] ?? ""),
            updatedAt: Date.now()
          });
        }
        for (const k of Object.keys(metaObj)) {
          const m = (metaObj[k] && typeof metaObj[k] === "object") ? metaObj[k] : {};
          sMeta.put({
            k: String(k),
            meta: m,
            updatedAt: Date.now()
          });
        }
      } catch (e) {
        reject(e);
        return;
      }

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || new Error("applyNotesRecordsBackupPayload notes/meta failed"));
      tx.onabort = () => reject(tx.error || new Error("applyNotesRecordsBackupPayload notes/meta aborted"));
    });

    // 2) 再還原圖片（只覆蓋同 id，不清空整庫，避免把使用者後來多上的圖全部砍掉）
    try {
      await restoreNoteImagesFromBackup(imagesObj);
    } catch (e) {
      console.warn("restoreNoteImagesFromBackup failed:", e);
    }

    // 3) 仍然寫回其他小型紀錄（用 localStorage，體積小）
    if (typeof RANDOMQUIZRECORDSKEY !== "undefined") {
      localStorage.setItem(
        RANDOMQUIZRECORDSKEY,
        JSON.stringify(data.randomQuizRecords ?? [])
      );
    } else {
      localStorage.setItem(
        "ntuvm-random-quiz-records",
        JSON.stringify(data.randomQuizRecords ?? [])
      );
    }

    if (typeof PETFEEDRECORDSKEY !== "undefined") {
      localStorage.setItem(
        PETFEEDRECORDSKEY,
        JSON.stringify(data.petFeedRecords ?? [])
      );
    } else {
      localStorage.setItem(
        "ntuvm-pet-feed-records",
        JSON.stringify(data.petFeedRecords ?? [])
      );
    }

    // 4) 刷新記憶體狀態與畫面（不會觸碰 legacy notes_v2）
    try { if (typeof loadNotes === "function") loadNotes(); } catch {}
    try { if (typeof loadRandomQuizRecords === "function") loadRandomQuizRecords(); } catch {}
    try { if (typeof renderQuestion === "function") renderQuestion(); } catch {}
    try { if (typeof renderPetFeedLog === "function") renderPetFeedLog(); } catch {}
    try { updateNotesStorageStatus(false); } catch {}

    return true;
  } catch (e) {
    console.error("applyNotesRecordsBackupPayload error:", e);
    alert("還原失敗：請看 console");
    return false;
  }
}

function downloadNotesExportJsonLarge(payload, filename) {
  try {
    const meta = payload && typeof payload === "object" && payload.meta && typeof payload.meta === "object"
      ? payload.meta
      : {};

    const arr = payload && typeof payload === "object" && Array.isArray(payload.arr)
      ? payload.arr
      : [];

    // 用 Blob parts 分段組 JSON，避免 JSON.stringify 整包爆掉
    const parts = [];
    parts.push('{"meta":');
    parts.push(JSON.stringify(meta));
    parts.push(',"arr":[');

    for (let i = 0; i < arr.length; i++) {
      const row = arr[i] && typeof arr[i] === "object" ? arr[i] : {};
      const safeRow = {
        id: row.id,
        explanation: typeof row.explanation === "string" ? row.explanation : String(row.explanation ?? "")
      };

      if (i > 0) parts.push(",");
      parts.push(JSON.stringify(safeRow));
    }

    parts.push("]}");

    const blob = new Blob(parts, { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => {
      try { URL.revokeObjectURL(url); } catch (e) {}
    }, 0);

    return true;
  } catch (e) {
    console.error("downloadNotesExportJsonLarge failed", e);
    return false;
  }
}


function openRestoreNotesRecordsDialog() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.style.display = 'none';
  document.body.appendChild(input);

  input.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      input.remove();
      return;
    }

    const ok = confirm('要從備份檔恢復「筆記/紀錄」嗎？這會覆蓋你目前裝置上的筆記/紀錄。');
    if (!ok) {
      input.remove();
      return;
    }

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const applied = await applyNotesRecordsBackupPayload(payload);
      if (applied) alert("還原成功！");
    } catch (err) {
      console.error(err);
      alert('讀取備份檔失敗（可能不是 JSON 或檔案壞掉）');
    } finally {
      input.remove();
    }
  });

  input.click();
}

function ensureNotesRecordsBackupButtons() {
  ensureNoteRecordBackupStyle();

  const toolbarEl = document.querySelector('.toolbar');
  if (!toolbarEl) return;

  // 避免重複插入
  if (document.getElementById('btnNotesRecordsBackup')) return;

  // 找搜尋框
  const ref = (typeof searchInput !== 'undefined' && searchInput)
    ? searchInput
    : document.getElementById('questionSearch');
  if (!ref) return;

  const actions = document.createElement('div');
  actions.className = 'nr-toolbar-actions';

  const btnBackup = document.createElement('button');
  btnBackup.id = 'btnNotesRecordsBackup';
  btnBackup.className = 'nr-mini-btn';
  btnBackup.textContent = '備份筆記/紀錄';
  btnBackup.onclick = async () => {
    try {
      const payload = await buildNotesRecordsBackupPayload();
      const ts = new Date();
      const y = ts.getFullYear();
      const m = String(ts.getMonth() + 1).padStart(2, "0");
      const d = String(ts.getDate()).padStart(2, "0");
      const hh = String(ts.getHours()).padStart(2, "0");
      const mm = String(ts.getMinutes()).padStart(2, "0");
      downloadJsonObject(payload, `ntuvm-notes-records-${y}${m}${d}-${hh}${mm}.json`);
    } catch (e) {
      alert("備份失敗：請看 console");
      console.error(e);
    }
  };

  const btnRestore = document.createElement('button');
  btnRestore.id = 'btnNotesRecordsRestore';
  btnRestore.className = 'nr-mini-btn';
  btnRestore.textContent = '恢復筆記/紀錄';
  btnRestore.onclick = () => openRestoreNotesRecordsDialog();

  actions.appendChild(btnBackup);
  actions.appendChild(btnRestore);

  // ✅ 把 ref 往上爬到 toolbar 的「直接子節點」
  let anchor = ref;
  while (anchor && anchor.parentElement !== toolbarEl) {
    anchor = anchor.parentElement;
  }

  // 找不到就退而求其次：直接 append（至少不噴錯）
  if (anchor && anchor.parentElement === toolbarEl) {
    toolbarEl.insertBefore(actions, anchor);
  } else {
    toolbarEl.appendChild(actions);
  }
}





/* 工具：debounce */
function debounce(fn, ms){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); }; }
function bindNotesAutoSave() {
  if (!editor) return;
  if (editor.dataset.notesAutosaveBound) return;
  editor.dataset.notesAutosaveBound = "1";

  const debounced = debounce(() => {
    try {
      saveNotes(state.scope ?? getScopeFromUI());
    } catch (e) {}
  }, 300);

  editor.addEventListener("input", debounced);
  editor.addEventListener("compositionend", debounced);

  editor.addEventListener(
    "blur",
    () => {
      try {
        saveNotes(state.scope ?? getScopeFromUI());
      } catch (e) {}
    },
    true
  );
}


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
function setupMobileDrawers(){
  // 防止重複註冊事件（避免被 init() 呼叫多次時重複綁定）
  if (window.__ntuvmMobileDrawersInited) return;
  window.__ntuvmMobileDrawersInited = true;

  const btnLeft = document.getElementById('btnOpenLeft');
  const btnRight = document.getElementById('btnOpenRight');
  if (!btnLeft || !btnRight) return;

  const backdrop = document.createElement('div');
  backdrop.className = 'drawer-backdrop';
  backdrop.style.position = 'fixed';
  backdrop.style.inset = '0';
  backdrop.style.background = 'rgba(0,0,0,.45)';
  backdrop.style.zIndex = '100000';
  backdrop.style.display = 'none';
  document.body.appendChild(backdrop);

  function closeAll(){
    document.body.classList.remove('show-left-panel', 'show-right-panel');
    backdrop.style.display = 'none';
  }
  function openLeft(){
    document.body.classList.add('show-left-panel');
    document.body.classList.remove('show-right-panel');
    backdrop.style.display = 'block';
  }
  function openRight(){
    document.body.classList.add('show-right-panel');
    document.body.classList.remove('show-left-panel');
    backdrop.style.display = 'block';
  }

  btnLeft.addEventListener('click', (e)=>{
    e.preventDefault();
    if (document.body.classList.contains('show-left-panel')) closeAll();
    else openLeft();
  });

  btnRight.addEventListener('click', (e)=>{
    e.preventDefault();
    if (document.body.classList.contains('show-right-panel')) closeAll();
    else openRight();
  });

  backdrop.addEventListener('click', closeAll);

  window.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape') closeAll();
  });

  let touchStartX = 0;
  let touchStartY = 0;
  let trackingSwipe = false;
  let swipeMode = null; // 'left-open' | 'right-open' | 'left-edge' | 'right-edge'
  let touchFromExplain = false;

  function isDrawerTouchMode(){
    const w = window.innerWidth;
    const h = window.innerHeight;
    const portrait = h >= w;
    return (w <= 768 && portrait) || (w <= 1024 && !portrait);
  }

  function handleTouchStart(e){
    if (!isDrawerTouchMode()) return;
    const t = e.touches && e.touches[0];
    if (!t) return;

    const w = window.innerWidth;
    const x = t.clientX;
    const y = t.clientY;

    const edgeZone = 24; // 邊緣喚出側欄區
    const fromLeftEdge = x <= edgeZone;
    const fromRightEdge = (w - x) <= edgeZone;

    const explainEl = document.getElementById('qExplain');
    const target = e.target;
    touchFromExplain = !!(explainEl && target && explainEl.contains(target));

    const leftOpen = document.body.classList.contains('show-left-panel');
    const rightOpen = document.body.classList.contains('show-right-panel');

    // 已開啟側欄：允許從任何地方滑動關閉（包含 qExplain）
    if (leftOpen || rightOpen){
      swipeMode = leftOpen ? 'left-open' : 'right-open';
      touchStartX = x;
      touchStartY = y;
      trackingSwipe = true;
      return;
    }

    // 未開啟側欄：如果在 qExplain 內，只有「從邊緣開始」才啟用側欄手勢
    if (touchFromExplain && !fromLeftEdge && !fromRightEdge){
      swipeMode = null;
      trackingSwipe = false;
      return;
    }

    if (fromLeftEdge){
      swipeMode = 'left-edge';
    } else if (fromRightEdge){
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

  function handleTouchEnd(e){
    if (!trackingSwipe || !swipeMode) return;
    trackingSwipe = false;

    if (!isDrawerTouchMode()) return;

    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;

    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;

    // 必須主要是水平滑動、且距離夠
    if (Math.abs(dx) < 40) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.2) return;

    switch (swipeMode){
      case 'left-open':
        if (dx < -40) closeAll();
        break;
      case 'right-open':
        if (dx > 40) closeAll();
        break;
      case 'left-edge':
        if (dx > 40) openLeft();
        break;
      case 'right-edge':
        if (dx < -40) openRight();
        break;
    }

    touchFromExplain = false;
    swipeMode = null;
  }

  // 用 document 才能抓到邊緣滑出
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
  bindNotesAutoSave();
  setTimeout(ensureNotesRecordsBackupButtons, 0);
  if (AUTHOR_MODE && btnExportNotes) {
    btnExportNotes.classList.remove("hidden");
  }
  setupMobileDrawers();
  try { initSwipeGestures(); }
  catch (e) { console.error('initSwipeGestures failed', e); }

  try { initFlashcardSwipe(); } catch (e) {}

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
// ---------- Flashcard viewer overflow fix ----------
// ---------- Flashcard center/scroll behavior fix ----------
function ensureFlashcardScrollFixStyle() {
  if (document.getElementById("fc-scroll-fix-style")) return;

  const s = document.createElement("style");
  s.id = "fc-scroll-fix-style";
  s.textContent = `
/* Flashcards: stop horizontal overflow */
.fc-viewer-mask, .fc-screen {
  overflow-x: hidden !important;
}

/* Width should include padding/border */
.fc-viewer-card, .fc-study-card, fc-study-card {
  box-sizing: border-box !important;
  max-width: 100% !important;
  overflow-x: hidden !important;
}

/* Fix vw rounding / padding causing 1px overflow on iOS */
.fc-viewer-card {
  width: min(520px, calc(100vw - 32px)) !important; /* viewer-mask padding: 16*2 */
}

.fc-study-card, fc-study-card {
  width: min(620px, calc(100vw - 36px)) !important; /* study-stage padding: 18*2 */
  max-width: calc(100vw - 36px) !important;
}

/* Center only when NOT overflow */
.fc-viewer-card:not(.fc-overflow),
.fc-study-card:not(.fc-overflow),
fc-study-card:not(.fc-overflow) {
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  align-items: center !important;
}

/* When overflow, start at top and allow scrolling naturally */
.fc-viewer-card.fc-overflow,
.fc-study-card.fc-overflow,
fc-study-card.fc-overflow {
  justify-content: flex-start !important;
  align-items: stretch !important;
  padding-top: 28px !important;
  padding-bottom: 28px !important;
}
`;
  document.head.appendChild(s);
}



/* =========================================
   題庫：左右滑動換題（改善上下抖動/滾動）
   - 左滑：下一題
   - 右滑：上一題
   - 只在「題目內容區」啟用
   - 水平意圖時會 preventDefault()，避免整頁跟著上下動
   ========================================= */
function initSwipeGestures(){
  // 防止重複註冊事件（避免被 init() 呼叫多次時重複綁定）
  if (window.__ntuvmSwipeGesturesInited) return;
  window.__ntuvmSwipeGesturesInited = true;

  let startX = 0;
  let startY = 0;
  let lock = null; // 'h' | 'v' | null
  let tracking = false;

  const MINSWIPEX = 70;
  const STARTLOCKDIST = 12;

  // 靠邊緣不要換題：留給側欄手勢
  const EDGEGUARD = 26;

  function panelIsOpen(){
    return document.body.classList.contains('show-left-panel')
      || document.body.classList.contains('show-right-panel');
  }

  function inQuestionArea(target){
    if (!target) return false;
    // 刻意不把 #qExplain 算進來：詳解區完全交給原生捲動（避免 overflow-x 水平捲動誤觸換題）
    return !!target.closest('#qText, #qImg, #qOpts, #question-images, #qNum');
  }

  function shouldIgnoreTarget(target){
    if (!target) return true;

    // 只要在詳解區，直接忽略手勢（最關鍵）
    if (target.closest && target.closest('#qExplain')) return true;

    if (!inQuestionArea(target)) return true;
    if (target.closest('input, textarea, select')) return true;
    if (target.closest('#qList')) return true;
    if (target.closest('.drawer-backdrop')) return true;
    if (target.closest('.fc-screen') || target.closest('#fc-viewer-mask') || target.closest('.fc-viewer-mask')) return true;
    return false;
  }

  document.addEventListener('touchstart', (e)=>{
    if (panelIsOpen()){
      tracking = false;
      lock = null;
      return;
    }

    if (!e.touches || e.touches.length !== 1){
      tracking = false;
      lock = null;
      return;
    }

    const t = e.touches[0];

    // 邊緣留給側欄
    if (t.clientX < EDGEGUARD || t.clientX > window.innerWidth - EDGEGUARD){
      tracking = false;
      lock = null;
      return;
    }

    if (shouldIgnoreTarget(e.target)){
      tracking = false;
      lock = null;
      return;
    }

    startX = t.clientX;
    startY = t.clientY;
    lock = null;
    tracking = true;
  }, { passive: true, capture: true });

  document.addEventListener('touchmove', (e)=>{
    if (!tracking) return;
    if (!e.touches || e.touches.length !== 1) return;

    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    if (!lock){
      if (Math.abs(dx) < STARTLOCKDIST && Math.abs(dy) < STARTLOCKDIST) return;
      lock = (Math.abs(dx) > Math.abs(dy) * 1.2) ? 'h' : 'v';
    }

    // 垂直就交給原生捲動
    if (lock === 'v') return;

    // 水平滑動：我們要換題，所以阻止 iOS 橡皮筋/頁面滑動
    if (e.cancelable) e.preventDefault();
  }, { passive: false, capture: true });

  document.addEventListener('touchend', (e)=>{
    if (!tracking) return;
    tracking = false;

    if (panelIsOpen()){
      lock = null;
      return;
    }

    if (lock !== 'h'){
      lock = null;
      return;
    }

    if (!e.changedTouches || e.changedTouches.length !== 1){
      lock = null;
      return;
    }

    const t = e.changedTouches[0];
    const dx = t.clientX - startX;

    if (Math.abs(dx) < MINSWIPEX){
      lock = null;
      return;
    }

    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');

    // dx < 0：往左滑 => 下一題；dx > 0：往右滑 => 上一題
    if (dx < 0){
      if (nextBtn && !nextBtn.disabled) nextBtn.click();
    } else {
      if (prevBtn && !prevBtn.disabled) prevBtn.click();
    }

    lock = null;
  }, { passive: true, capture: true });
}


/* =========================================
   字卡背卡畫面（fcOpenStudy）：左右滑動換卡（改善上下抖動/滾動）
   - 左滑：下一張（#fc-study-next）
   - 右滑：上一張（#fc-study-prev）
   ========================================= */
(function initFlashcardSwipe() {
  let startX = 0;
  let startY = 0;
  let lock = null; // 'h' | 'v' | null
  let tracking = false;

  const MIN_SWIPE_X = 70;
  const START_LOCK_DIST = 12;
  const EDGE_GUARD = 26;

  function getStudyScreen() {
    return document.getElementById('fc-study-screen');
  }

  document.addEventListener('touchstart', (e) => {
    const screen = getStudyScreen();
    if (!screen) { tracking = false; lock = null; return; }

    if (!e.touches || e.touches.length !== 1) { tracking = false; lock = null; return; }

    const t = e.touches[0];
    if (t.clientX <= EDGE_GUARD || t.clientX >= (window.innerWidth - EDGE_GUARD)) {
      tracking = false; lock = null; return;
    }

    // 限制在背卡畫面內才吃手勢
    if (!e.target || !e.target.closest('#fc-study-screen')) {
      tracking = false; lock = null; return;
    }

    startX = t.clientX;
    startY = t.clientY;
    lock = null;
    tracking = true;
  }, { passive: true, capture: true });

  document.addEventListener('touchmove', (e) => {
    if (!tracking) return;
    const screen = getStudyScreen();
    if (!screen) return;
    if (!e.touches || e.touches.length !== 1) return;

    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    if (!lock) {
      if (Math.abs(dx) < START_LOCK_DIST && Math.abs(dy) < START_LOCK_DIST) return;
      lock = (Math.abs(dx) > Math.abs(dy) * 1.2) ? 'h' : 'v';
    }

    // 水平意圖：阻止頁面/容器跟著上下動
    if (lock === 'h') {
      if (e.cancelable) e.preventDefault();
    }
  }, { passive: false, capture: true });

  document.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;

    const screen = getStudyScreen();
    if (!screen) { lock = null; return; }
    if (lock !== 'h') { lock = null; return; }

    if (!e.changedTouches || e.changedTouches.length !== 1) { lock = null; return; }
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;

    if (Math.abs(dx) < MIN_SWIPE_X) { lock = null; return; }

    const btnPrev = screen.querySelector('#fc-study-prev');
    const btnNext = screen.querySelector('#fc-study-next');

    if (dx < 0) {
      if (btnNext && !btnNext.disabled) btnNext.click();
    } else {
      if (btnPrev && !btnPrev.disabled) btnPrev.click();
    }

    lock = null;
  }, { passive: true, capture: true });
})();
