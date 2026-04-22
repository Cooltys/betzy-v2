// Betzy V2 — service worker (network-first for HTML, cache-first for assets)
const VERSION = 'betzy-v2-2026-04-22'
const CORE = ['/', '/manifest.webmanifest']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  // Never cache Supabase or realtime websocket
  if (url.hostname.endsWith('supabase.co')) return

  // Navigation: network-first, fall back to cached root
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() => caches.match('/'))
    )
    return
  }

  // Static same-origin assets: cache-first, update in background
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((res) => {
          if (res && res.ok && request.method === 'GET') {
            const clone = res.clone()
            caches.open(VERSION).then((c) => c.put(request, clone))
          }
          return res
        }).catch(() => cached)
        return cached || fetchPromise
      })
    )
  }
})
