const CACHE_NAME = 'cfs-cache-v3.1'; // 升級 v3.1，強制清除舊版快取

const ASSETS_TO_CACHE = [
  './index.html',         // 唯一入口
  './manifest.json',
  './icons/icon-192.png', // 實體存在的 Icon
  './icons/icon-512.png',
  // 外部資源 (CDN)
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
        // 只要不是 v3.1 的快取，全部刪除
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      })
    )).then(() => self.clients.claim()) // 立即接管頁面
  );
});

// 3. 請求攔截 (Fetch)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 策略 A: 針對 HTML 檔案 -> Network First (網路優先)
  // 確保使用者重新整理時能立刻看到 HTML 的內容更新
  if (url.pathname.endsWith('index.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          // 連網成功：複製一份存入快取，供下次離線使用
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return res;
        })
        .catch(() => {
          // 連網失敗（離線）：回傳快取中的舊版頁面
          return caches.match(event.request);
        })
    );
  } else {
    // 策略 B: 針對靜態資源 (JS, CSS, Images) -> Cache First (快取優先)
    // 加快載入速度，省流量
    event.respondWith(
      caches.match(event.request).then(res => res || fetch(event.request))
    );
  }
});