/* * 專案代號：Behavior (消費行為感知)
 * 檔案：service-worker.js
 * 作用：PWA 離線緩存核心 (Offline Caching Core)
 * 策略：Cache First (優先讀取緩存，追求極致速度)
 */

const CACHE_NAME = 'behavior-app-v1.0';

// 定義需要緩存的檔案清單
// 注意：如果你之後拆分了 CSS/JS，要把檔名加進來
const ASSETS_TO_CACHE = [
    './',                // 根目錄
    './index.html',      // 主程式 (假設你把剛才的 html 存成 index.html)
    // './manifest.json', // 之後會用到
    // './icon-192.png',  // 之後會用到
    // './icon-512.png'   // 之後會用到
];

// 1. 安裝事件 (Install Event)
// 當瀏覽器初次看到這支 SW 時觸發，我們在這裡把檔案「抓」進緩存。
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching App Shell');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting()) // 強制啟用新版 SW，不需等待
    );
});

// 2. 啟用事件 (Activate Event)
// 清理舊版本的緩存，確保用戶不會卡在舊版 App。
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
        .then(() => self.clients.claim()) // 讓 SW 立即控制所有頁面
    );
});

// 3. 攔截請求 (Fetch Event)
// 這是最關鍵的部分：攔截所有網路請求，優先給緩存的檔案。
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // 如果緩存有，直接回傳 (速度最快)
                if (response) {
                    return response;
                }
                // 如果緩存沒有，才去網路抓
                return fetch(event.request);
            })
    );
});