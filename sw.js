// sw.js - Service Worker بسيط لتفعيل عمل التطبيق دون اتصال بالإنترنت
// يخزّن ملفات التطبيق الأساسية (app shell) عند أول زيارة، ثم يقدّمها من
// الذاكرة المؤقتة عند عدم توفر الشبكة.

const CACHE_NAME = 'shakour-erp-v1';

const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './css/main.css',
    './js/db.js',
    './js/ui.js',
    './js/auth.js',
    './js/inventory.js',
    './js/pos/pos-core.js',
    './js/pos/pos-persons.js',
    './js/pos/pos-payment.js',
    './js/purchases.js',
    './js/gdrive.js',
    './js/accounting.js',
    './js/crm.js',
    './js/reports.js',
    './js/app.js',
    './icon-192.png',
    './icon-512.png'
];

// ===== التثبيت: تخزين ملفات التطبيق الأساسية =====
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
            .catch((err) => console.warn('⚠️ فشل تخزين بعض ملفات app shell:', err))
    );
});

// ===== التفعيل: حذف أي نسخ تخزين قديمة =====
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// ===== الجلب: نستخدم الشبكة أولاً (لأحدث نسخة)، ونرجع للتخزين المؤقت
// عند تعذر الاتصال (وضع عدم الاتصال) =====
self.addEventListener('fetch', (event) => {
    // نتجاهل طلبات المكتبات الخارجية (CDN) عبر شبكات لا نتحكم بها،
    // ونهتم فقط بملفات التطبيق نفسه (نفس الأصل - same origin)
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                return response;
            })
            .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
});
