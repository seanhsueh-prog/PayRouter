const CACHE_NAME = 'cfs-cache-v1.2'; // 升級為 v1.2

const ASSETS_TO_CACHE = [
  './CashFlowSense_v1.2.html', // 鎖定 v1.2 主程式
  './manifest.json',
  // 外部 CDN 資源
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 1. 安裝階段 (Install)
self.addEventListener('install', (event) => {
  self.skipWaiting(); // 強制跳過等待，讓新版 SW 立刻生效
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. 啟動階段 (Activate) - 清理舊版
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        // 只要不是 v1.2 的快取，全部刪除
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      })
    )).then(() => self.clients.claim())
  );
});

// 3. 請求攔截 (Fetch)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 策略 A: 針對 HTML 檔案 -> Network First (網路優先)
  if (url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return res;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  } else {
    // 策略 B: 針對靜態資源 -> Cache First (快取優先)
    event.respondWith(
      caches.match(event.request).then(res => res || fetch(event.request))
    );
  }
});