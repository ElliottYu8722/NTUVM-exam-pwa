// 只快取核心；data/ 底下全部不快取
const CACHE_CORE = 'ntuvm-core-v2';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './app.js'
];

// 安裝：放入核心資產
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_CORE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

// 啟用：清掉舊版本快取
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map(k => (k === CACHE_CORE) ? null : caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// 工具：cache-first（核心）
async function cacheFirst(req) {
  const cache = await caches.open(CACHE_CORE);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (req.method === 'GET' && res && res.ok) {
    cache.put(req, res.clone());
  }
  return res;
}

// 工具：stale-while-revalidate（一般靜態）
async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_CORE);
  const cached = await cache.match(req);
  const fetching = fetch(req).then(res => {
    if (req.method === 'GET' && res && res.ok) {
      cache.put(req, res.clone());
    }
    return res;
  }).catch(() => null);

  return cached || fetching;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // 非 GET 直接交給瀏覽器

  const url = new URL(req.url);

  // 只處理同網域；第三方資源直接放行
  if (url.origin !== self.location.origin) return;

  // ---- 重要：data/ 與 題目/答案/圖片 一律不快取 ----
  const isData = /\/data(\/|$)/.test(url.pathname) ||
                 /\/(題目|答案|圖片)\//.test(url.pathname);

  if (isData) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .catch(() => caches.match(req)) // 網路掛了才回退快取（通常沒有，因為不快取）
    );
    return;
  }

  // 核心資產：cache-first
  const isCore = CORE.some(p => {
    const corePath = p.replace('./', '/');
    return url.pathname === corePath || url.pathname.endsWith(corePath);
  });
  if (isCore) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // 其他：stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req));
});
