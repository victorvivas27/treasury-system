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
    const networkResponse = fetch(request, { cache: 'no-store' }).then((response) => {
      if (response.ok && response.type === 'basic') {
        void caches.open(CACHE_VERSION).then((cache) => cache.put('/', response.clone()))
      }
      return response
    })
    event.waitUntil(networkResponse.then(() => undefined).catch(() => undefined))
    event.respondWith(
      networkResponse.catch(async () => (await caches.match('/')) ?? Response.error()),
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

const updateAppBadge = async (count) => {
  const normalized = Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : 0
  if (normalized > 0 && self.navigator.setAppBadge) {
    await self.navigator.setAppBadge(normalized)
  } else if (normalized === 0 && self.navigator.clearAppBadge) {
    await self.navigator.clearAppBadge()
  }
  if (normalized === 0) {
    const notifications = await self.registration.getNotifications()
    notifications.filter((item) => item.tag?.startsWith('treasury-'))
      .forEach((item) => item.close())
  }
}

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'SYNC_BADGE') return
  event.waitUntil(updateAppBadge(event.data.count).catch(() => undefined))
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data?.json() ?? {}
  } catch {
    payload = { body: event.data?.text() ?? 'Tienes una nueva notificación.' }
  }
  const count = Math.max(0, Number(payload.badgeCount) || 0)
  const title = payload.title || 'Sistema de Tesorería'
  const options = {
    body: payload.body || 'Tienes una nueva notificación.',
    icon: payload.icon || '/icono-tesoreria.png',
    badge: payload.badge || '/favicon-tesoreria-v3.png',
    tag: `treasury-${payload.tag || Date.now()}`,
    renotify: true,
    data: { url: payload.url || '/notifications' },
    timestamp: Date.now(),
  }
  event.waitUntil(Promise.all([
    self.registration.showNotification(title, options),
    updateAppBadge(count),
  ]))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const destination = new URL(event.notification.data?.url || '/notifications', self.location.origin).href
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(async (windows) => {
      const existing = windows.find((client) => new URL(client.url).origin === self.location.origin)
      if (existing) {
        if ('navigate' in existing) await existing.navigate(destination)
        return existing.focus()
      }
      return self.clients.openWindow(destination)
    }))
})
