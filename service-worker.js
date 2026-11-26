// 更新檔案時改版本字串，強制更新快取
const CACHE_CORE = 'ntuvm-core-v4';

// app.js 不放這裡，另外走 network-first
const CORE = [
  './',
  './index.html',
  './manifest.json'
];

const APP_SCRIPT = '/NTUVM-exam-pwa/app.js';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_CORE)
      .then(cache => {
        return cache.addAll(CORE);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map(k => (k === CACHE_CORE) ? null : caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// 離線且沒有快取時回 503
function serviceUnavailableResponse(){
  return new Response('Service Unavailable (offline)', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

async function freshAppScript(req){
  try{
    const netRes = await fetch(req, { cache: 'no-store' });
    if (req.method === 'GET' && netRes && netRes.ok) {
      // 存一份給離線用
      const cache = await caches.open(CACHE_CORE);
      cache.put(req, netRes.clone()).catch(()=>{});
    }
    return netRes;
  }catch(err){
    // 離線時用快取
    const cache = await caches.open(CACHE_CORE);
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    return serviceUnavailableResponse();
  }
}

// cache-first
async function cacheFirst(req) {
  const cache = await caches.open(CACHE_CORE);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  try{
    const res = await fetch(req);
    if (req.method === 'GET' && res && res.ok) {
      cache.put(req, res.clone()).catch(()=>{});
    }
    return res;
  }catch(e){
    return serviceUnavailableResponse();
  }
}

// stale-while-revalidate
async function staleWhileRevalidate(req){
  const cache = await caches.open(CACHE_CORE);
  const cached = await cache.match(req);
  const fetching = fetch(req).then(res => {
    if (req.method === 'GET' && res && res.ok) {
      cache.put(req, res.clone()).catch(()=>{});
    }
    return res;
  }).catch(()=>null);

  return cached || fetching || serviceUnavailableResponse();
}

// data 路徑不快取
function isDataPath(pathname){
  return /\/data(\/|$)/.test(pathname) || /\/(題目|答案|圖片)\//.test(pathname);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 只處理同網域
  if (url.origin !== self.location.origin) return;

  // data/（題目、答案、圖片）一律走網路，失敗回 503
  if (isDataPath(url.pathname)) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .catch(err => {
          console.warn('[sw] data fetch failed:', url.pathname, err && err.message);
          return serviceUnavailableResponse();
        })
    );
    return;
  }

  // app.js：network-first
  if (url.pathname === APP_SCRIPT || url.pathname.endsWith(APP_SCRIPT)) {
    event.respondWith(freshAppScript(req));
    return;
  }
  // 首頁 / index.html：network-first
  if (
    url.pathname === '/' ||
    url.pathname === '/NTUVM-exam-pwa/' ||
    url.pathname.endsWith('/index.html')
  ) {
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
  // 其他核心檔案：cache-first
  const coreMatch = CORE.some(p => {
    const corePath = p.replace('./', '/');
    return url.pathname === corePath || url.pathname.endsWith(corePath);
  });
  if (coreMatch) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // 其餘：stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req));
});
