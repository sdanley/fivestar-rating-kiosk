// Service Worker: offline + kiosk enhancements
// Increment version to invalidate old caches when app changes
const VERSION = 'v12';
const CACHE_NAME = `rating-app-${VERSION}`;
// Core assets for shell (add png icons for iOS install splash support)
// Use relative paths so it works when hosted under a subpath (e.g., GitHub Pages /repo-name/)
const CORE_ASSETS = [
  'index.html',
  'app.js',
  'styles.css',
  'manifest.webmanifest',
  'icon-192.svg',
  'icon-512.svg',
  'icon-192.png',
  'icon-512.png',
  'logo.svg',
  'logo-gray.svg'
];

self.addEventListener('install', event => {
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    try { await cache.addAll(CORE_ASSETS); } catch(e){ /* ignore individual failure */ }
    // Warm navigation fallback: ensure index stored
  try { const res=await fetch('index.html',{cache:'no-store'}); await cache.put('index.html',res.clone()); } catch{}
  })().then(()=>self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)));
    await self.clients.claim();
    // Notify clients of new version
    const clients=await self.clients.matchAll({includeUncontrolled:true});
    for(const client of clients){ client.postMessage({type:'sw:activated',version:VERSION}); }
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return; // Only handle GET
  const url = new URL(req.url);

  // Treat all navigation (including query/hash) as app shell
  if (req.mode === 'navigate') {
    event.respondWith((async()=>{
      try {
  const netRes = await fetch(req);
  const cache = await caches.open(CACHE_NAME);
  // Normalize to 'index.html' so cached key matches CORE_ASSETS
  const shell = await fetch('index.html',{cache:'no-store'}).catch(()=>null);
  if(shell) cache.put('index.html', shell.clone());
  return netRes;
      } catch {
  const cacheHit = await caches.match('index.html');
        return cacheHit || new Response('<!doctype html><title>Offline</title><h1>Offline</h1><p>Content unavailable.</p>',{headers:{'Content-Type':'text/html'}});
      }
    })());
    return;
  }

  // Same-origin: stale-while-revalidate strategy
  if (url.origin === location.origin) {
    event.respondWith((async()=>{
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      const fetchPromise = fetch(req).then(res=>{ if(res.ok){ cache.put(req,res.clone()); } return res; }).catch(()=>null);
      return cached || fetchPromise || new Response('',{status:504,statusText:'Offline'});
    })());
    return;
  }

  // Cross-origin: network first, fallback to cache if previously stored
  event.respondWith((async()=>{
    try { return await fetch(req); } catch { return caches.match(req); }
  })());
});

// Allow page to trigger immediate skipWaiting
self.addEventListener('message', e=>{
  if(e.data === 'sw:update'){ self.skipWaiting(); }
  if(e.data === 'sw:get-version'){
    // Reply with current version
    self.clients.matchAll({includeUncontrolled:true}).then(list=>{
      list.forEach(c=>c.postMessage({type:'sw:version',version:VERSION}));
    });
  }
});
