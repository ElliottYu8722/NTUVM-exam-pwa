// 簡單版快取：核心檔案 + 使用過的資料與圖片
const CACHE = 'ntuvm-pwa-v1';
const CORE = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => (k===CACHE)?null:caches.delete(k)))))
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // 優先使用快取，沒有再抓網路並寫回快取
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        // 只快取 GET 成功的回應
        if (req.method === 'GET' && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
    })
  );
});
