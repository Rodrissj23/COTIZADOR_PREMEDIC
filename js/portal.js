(() => {
  const portal = document.getElementById('portalScreen');
  const app = document.getElementById('cotizadorApp');
  const openBtn = document.getElementById('abrirCotizadorBtn');
  const backBtn = document.getElementById('volverPortalBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  if (!portal || !app || !openBtn || !backBtn) return;

  function showCotizador(updateHash = true) {
    portal.classList.add('hidden');
    app.classList.remove('hidden');
    if (updateHash && window.location.hash !== '#cotizador') {
      history.pushState(null, '', '#cotizador');
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function showPortal(updateHash = true) {
    app.classList.add('hidden');
    portal.classList.remove('hidden');
    if (updateHash) {
      history.pushState(null, '', window.location.pathname + window.location.search);
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  logoutBtn?.addEventListener('click', async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      window.location.replace('/login.html');
    }
  });

  openBtn.addEventListener('click', () => showCotizador(true));
  backBtn.addEventListener('click', () => showPortal(true));

  window.addEventListener('popstate', () => {
    if (window.location.hash === '#cotizador') showCotizador(false);
    else showPortal(false);
  });

  if (window.location.hash === '#cotizador') showCotizador(false);
})();
