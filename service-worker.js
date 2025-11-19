/* service-worker.js（建議替換） */
/* 核心快取名稱，若你更新檔案請改這裡的版本字串以強制更新快取 */
const CACHE_CORE = 'ntuvm-core-v3';

/* 核心資產（保留 index.html 與 manifest、但 app.js 我們會改用 network-first） */
const CORE = [
  './',
  './index.html',
  './manifest.json'
  // 注意：不要把 app.js 放在這裡（或可放，但下方會 special-case）
];

/* 你仍可選擇把 app.js 放在這，但我採用 network-first 處理 */
const APP_SCRIPT = '/app.js'; // 用絕對路徑比相對路徑更穩定

self.addEventListener('install', (event) => {
  console.log('[sw] install');
  event.waitUntil(
    caches.open(CACHE_CORE)
      .then(cache => {
        // 只快取 CORE；app.js 會在啟用時另行更新
        return cache.addAll(CORE);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[sw] activate');
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map(k => (k === CACHE_CORE) ? null : caches.delete(k))
    );
    await self.clients.claim();
  })());
});

/* helper: build a 503 Response 用於 network fail 而又沒快取的情況 */
function serviceUnavailableResponse(){
  return new Response('Service Unavailable (offline)', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

async function freshAppScript(req){
  try{
    // 直接略過 HTTP cache，拿真正最新版本
    const netRes = await fetch(req, { cache: 'no-store' });
    if (req.method === 'GET' && netRes && netRes.ok) {
      // 如果你希望離線時也能啟動，就把最新的放進 SW cache
      const cache = await caches.open(CACHE_CORE);
      cache.put(req, netRes.clone()).catch(()=>{});
    }
    return netRes;
  }catch(err){
    // 網路失敗時才退回 SW 快取裡的舊 app.js
    const cache = await caches.open(CACHE_CORE);
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    return serviceUnavailableResponse();
  }
}

/* cache-first for core (index.html, manifest...) */
async function cacheFirst(req) {
  const cache = await caches.open(CACHE_CORE);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  try{
    const res = await fetch(req);
    if (req.method === 'GET' && res && res.ok) {
      cache.put(req, res.clone()).catch(()=>{/* ignore */});
    }
    return res;
  }catch(e){
    return serviceUnavailableResponse();
  }
}

/* stale-while-revalidate for general static (保守做法) */
async function staleWhileRevalidate(req){
  const cache = await caches.open(CACHE_CORE);
  const cached = await cache.match(req);
  const fetching = fetch(req).then(res => {
    if (req.method === 'GET' && res && res.ok) {
      cache.put(req, res.clone()).catch(()=>{/* ignore */});
    }
    return res;
  }).catch(()=>null);

  return cached || fetching || serviceUnavailableResponse();
}

/* 判斷 data 路徑（不快取，但當網路失敗要給明確回應） */
function isDataPath(pathname){
  return /\/data(\/|$)/.test(pathname) || /\/(題目|答案|圖片)\//.test(pathname);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // 非 GET 讓瀏覽器處理

  const url = new URL(req.url);

  // 只處理同網域
  if (url.origin !== self.location.origin) return;

  // data/（題目、答案、圖片）一律直接走 network（no-store），網路失敗回 503
  if (isDataPath(url.pathname)) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(res => {
          // 我們不把 data 存進快取（保持最新）
          return res;
        })
        .catch(err => {
          console.warn('[sw] data fetch failed, returning 503 fallback:', url.pathname, err && err.message);
          // 若你想要回退到某個預先快取的 fallback data 檔案，可在這裡改成 caches.match(...)
          return serviceUnavailableResponse();
        })
    );
    return;
  }

  // app script 使用 network-first（這能避免使用者一直跑到舊版）
  // ✅ app script：線上一定抓最新，離線才退回快取
  if (url.pathname === APP_SCRIPT || url.pathname.endsWith(APP_SCRIPT)) {
    event.respondWith(freshAppScript(req));
    return;
  }
  // ✅ 3) index.html / 首頁：改成「network-first，失敗才退 cache」
  if (url.pathname === '/' || url.pathname.endsWith('/index.html')) {
    event.respondWith((async () => {
      try {
        const netRes = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(CACHE_CORE);
        cache.put(req, netRes.clone()).catch(()=>{});
        return netRes;
      } catch (e) {
        const cache = await caches.open(CACHE_CORE);
        const cached = await cache.match(req, { ignoreSearch: true });
        return cached || serviceUnavailableResponse();
      }
    })());
    return;
  }

  // 核心資產走 cache-first
  const coreMatch = CORE.some(p => {
    const corePath = p.replace('./', '/');
    return url.pathname === corePath || url.pathname.endsWith(corePath);
  });
  if (coreMatch) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // 其他走 stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req));
});
