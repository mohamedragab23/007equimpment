/* eslint-disable no-restricted-globals */
// Service Worker (PWA) — استراتيجيات كاش آمنة لتطبيق Vite
// الهدف: منع "التعليق" على نسخة قديمة + تنظيف الكاش القديم تلقائياً

const SW_VERSION = '007ems-sw-v2';
const CACHE_PREFIX = '007ems';
const CACHE_STATIC = `${CACHE_PREFIX}:static:${SW_VERSION}`;
const CACHE_PAGES = `${CACHE_PREFIX}:pages:${SW_VERSION}`;

const APP_SHELL = ['/', '/index.html'];

self.addEventListener('message', (event) => {
  if (event?.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_PAGES);
      await cache.addAll(APP_SHELL);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith(`${CACHE_PREFIX}:`) && ![CACHE_STATIC, CACHE_PAGES].includes(k))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function isSameOrigin(request) {
  try {
    return new URL(request.url).origin === self.location.origin;
  } catch {
    return false;
  }
}

function isApiRequest(request) {
  try {
    const url = new URL(request.url);
    return url.origin === self.location.origin && url.pathname.startsWith('/api');
  } catch {
    return false;
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (_) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw _;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((fresh) => {
      if (fresh && fresh.ok) cache.put(request, fresh.clone());
      return fresh;
    })
    .catch(() => null);

  return cached || (await fetchPromise) || fetch(request);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (!request || request.method !== 'GET') return;
  if (isApiRequest(request)) return; // لا نكاشي API
  if (!isSameOrigin(request)) return; // لا نكاشي طلبات خارجية (مثل Supabase)

  const isNavigation = request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
  const dest = request.destination;
  const isStaticAsset =
    dest === 'script' ||
    dest === 'style' ||
    dest === 'image' ||
    dest === 'font' ||
    request.url.includes('/assets/');

  if (isNavigation) {
    event.respondWith(networkFirst(request, CACHE_PAGES));
    return;
  }

  if (isStaticAsset) {
    event.respondWith(staleWhileRevalidate(request, CACHE_STATIC));
  }
});

