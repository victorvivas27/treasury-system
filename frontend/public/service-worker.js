const BUILD_VERSION = new URL(self.location.href).searchParams.get('v') || 'legacy'
const CACHE_VERSION = `treasury-static-${BUILD_VERSION}`
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/icono-tesoreria.png',
]
const STATIC_DESTINATIONS = new Set(['script', 'style', 'font', 'image'])

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(async (cache) => {
        await Promise.all(APP_SHELL.map(async (url) => {
          const response = await fetch(url, { cache: 'reload' })
          if (!response.ok) throw new Error(`No se pudo precachear ${url}`)
          await cache.put(url, response)
        }))
      })
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
    const networkResponse = fetch(request).then((response) => {
      if (response.ok && response.type === 'basic') {
        void caches.open(CACHE_VERSION).then((cache) => cache.put('/', response.clone()))
      }
      return response
    })
    event.waitUntil(networkResponse.then(() => undefined).catch(() => undefined))
    event.respondWith(
      caches.match('/').then((cachedShell) => {
        return cachedShell ?? networkResponse.catch(() => Response.error())
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
