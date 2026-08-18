const CACHE_VERSION = 'treasury-static-v2'
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
]
const STATIC_DESTINATIONS = new Set(['script', 'style', 'font', 'image'])

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('treasury-static-') && key !== CACHE_VERSION)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (
    request.method !== 'GET'
    || url.origin !== self.location.origin
    || url.pathname === '/api'
    || url.pathname.startsWith('/api/')
  ) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedShell = await caches.match('/')
        return cachedShell ?? Response.error()
      }),
    )
    return
  }

  if (!STATIC_DESTINATIONS.has(request.destination) && url.pathname !== '/manifest.webmanifest') {
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => cachedResponse ?? fetch(request).then((networkResponse) => {
        if (!networkResponse.ok || networkResponse.type !== 'basic') {
          return networkResponse
        }

        const responseToCache = networkResponse.clone()
        void caches.open(CACHE_VERSION).then((cache) => cache.put(request, responseToCache))
        return networkResponse
      })),
    )
    return
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse.ok && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone()
          void caches.open(CACHE_VERSION).then((cache) => cache.put(request, responseToCache))
        }
        return networkResponse
      })
      .catch(async () => (await caches.match(request)) ?? Response.error()),
  )
})
