const CACHE_NOME = 'poupaia-v2';
const ARQUIVOS = ['./manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NOME).then((cache) => cache.addAll(ARQUIVOS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(nomes.filter((n) => n !== CACHE_NOME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evento) => {
  const url = evento.request.url;

  // Nunca cachear chamadas de IA (Google Gemini) — precisam sempre de rede, respostas mudam sempre
  if (url.includes('generativelanguage.googleapis.com') || url.includes('api.anthropic.com')) {
    return;
  }

  // O HTML principal (index.html / navegação) sempre busca a versão mais nova da rede primeiro.
  // Só usa a cópia guardada se estiver sem internet.
  if (evento.request.mode === 'navigate' || url.endsWith('/index.html') || url.endsWith('/poupaia-app/')) {
    evento.respondWith(
      fetch(evento.request)
        .then((respostaRede) => {
          caches.open(CACHE_NOME).then((cache) => cache.put(evento.request, respostaRede.clone()));
          return respostaRede;
        })
        .catch(() => caches.match(evento.request))
    );
    return;
  }

  // Demais arquivos (ícones, manifest): cache primeiro, com fallback pra rede
  evento.respondWith(
    caches.match(evento.request).then((respostaCache) => respostaCache || fetch(evento.request))
  );
});
