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

  function limpiarAporteComputable() {
    const aporteCopy = document.querySelector('.contribution-copy p');
    const aporteTexto = 'Ingresá el aporte del recibo para calcular los planes disponibles.';
    if (aporteCopy && aporteCopy.textContent !== aporteTexto) {
      aporteCopy.textContent = aporteTexto;
    }

    document.getElementById('sumAporteCalculadoRow')?.classList.add('hidden');
    document.getElementById('notasModalidad')?.classList.add('hidden');

    document.querySelectorAll('.breakdown-line.discount, .quote-economic-row-discount').forEach(el => el.remove());

    const resultados = document.getElementById('resultados');
    if (resultados) {
      const pmo = [...resultados.querySelectorAll('.plan-card')]
        .find(card => card.dataset.plan === 'PMO');
      if (pmo && resultados.firstElementChild !== pmo) resultados.prepend(pmo);
      if (pmo) {
        const detail = pmo.querySelector('.plan-detail');
        const detailTexto = 'PMO · cubierto íntegramente con los aportes del recibo';
        if (detail && detail.textContent !== detailTexto) {
          detail.textContent = detailTexto;
        }
        const valueRow = pmo.querySelector('.breakdown-line');
        if (valueRow) valueRow.remove();
      }
    }
  }

  const style = document.createElement('style');
  style.textContent = `
    #sumAporteCalculadoRow,
    .breakdown-line.discount,
    .quote-economic-row-discount { display:none !important; }
  `;
  document.head.appendChild(style);

  let limpiezaPendiente = false;
  const observer = new MutationObserver(() => {
    if (limpiezaPendiente) return;
    limpiezaPendiente = true;
    requestAnimationFrame(() => {
      limpiezaPendiente = false;
      limpiarAporteComputable();
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  limpiarAporteComputable();

  // Permitir escribir manualmente la cantidad de hijos sin que el campo se
  // restablezca a 1 al borrar. El cálculo original sigue reaccionando al
  // evento input, así que no se modifica la lógica del cotizador.
  const cantidadHijos = document.getElementById('cantidadHijos');
  if (cantidadHijos) {
    let campoVaciado = false;

    const aplicarCantidad = value => {
      const numero = Math.max(1, Math.min(10, Number(value) || 1));
      cantidadHijos.value = String(numero);
      cantidadHijos.dispatchEvent(new Event('input', { bubbles: true }));
      cantidadHijos.dispatchEvent(new Event('change', { bubbles: true }));
    };

    cantidadHijos.addEventListener('keydown', event => {
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        cantidadHijos.value = '';
        campoVaciado = true;
        return;
      }

      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        let siguiente;

        if (campoVaciado || cantidadHijos.value === '') {
          siguiente = event.key;
          campoVaciado = false;
        } else if (cantidadHijos.value === '1' && event.key === '0') {
          siguiente = '10';
        } else {
          // Al escribir sobre el valor existente, reemplazarlo. Así se puede
          // pasar de 1 a 2, 3, etc. sin usar las flechas del input.
          siguiente = event.key;
        }

        aplicarCantidad(siguiente);
      }
    });

    cantidadHijos.addEventListener('paste', event => {
      event.preventDefault();
      const texto = (event.clipboardData?.getData('text') || '').replace(/\D/g, '');
      if (texto) aplicarCantidad(texto);
    });
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
