/* Service Worker do NFT Alface — estrategia "rede primeiro" (network-first).
   Objetivo: o app sempre carrega a versao mais nova quando ha internet,
   e continua funcionando offline com a ultima versao baixada.
   Resolve o cache teimoso do iOS quando o app fica como icone na tela inicial. */

const CACHE = 'nft-alface-v2';
const CORE = ['./', './index.html'];

self.addEventListener('install', (e) => {
  // Pre-carrega a pagina principal para funcionar offline; nao falha o install se der erro.
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {})
  );
  self.skipWaiting(); // ativa a versao nova do SW imediatamente
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Remove caches antigos de versoes anteriores.
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim(); // assume o controle das paginas abertas
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // so intercepta leituras
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // ignora APIs externas (clima, geo)

  // Rede primeiro: tenta baixar fresquinho; se cair a internet, usa o cache.
  e.respondWith((async () => {
    try {
      const fresh = await fetch(req, { cache: 'no-store' }); // fura o cache do navegador
      const cache = await caches.open(CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const home = await caches.match('./index.html') || await caches.match('./');
        if (home) return home;
      }
      throw err;
    }
  })());
});
