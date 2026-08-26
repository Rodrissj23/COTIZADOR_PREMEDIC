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

  function initPromociones() {
    const promoApi = window.PremedicPromos;
    const zona = document.getElementById('zona');
    const modalidad = document.getElementById('modalidad');
    const aporteWrap = document.getElementById('aporteWrap');
    const nombre = document.getElementById('nombre');
    const resultados = document.getElementById('resultados');
    const cotizarBtn = document.getElementById('cotizarBtn');
    if (!promoApi || !zona || !modalidad || !aporteWrap) return;

    const zonasExtra = [
      ['cordoba', 'Córdoba'],
      ['mendoza', 'Mendoza'],
      ['misiones', 'Misiones'],
      ['tucuman', 'Tucumán']
    ];
    zonasExtra.forEach(([value, label]) => {
      if (![...zona.options].some(o => o.value === value)) zona.add(new Option(label, value));
    });

    const panel = document.createElement('div');
    panel.id = 'promocionesPremedicPanel';
    panel.className = 'premedic-promo-panel';
    panel.innerHTML = `
      <div class="premedic-promo-copy">
        <span>Beneficio aplicable</span>
        <strong>Elegí una sola opción</strong>
        <p>Los beneficios no son acumulables y se filtran según modalidad y zona. Monotributo está disponible únicamente en Directo.</p>
      </div>
      <label class="field premedic-promo-field">
        <span>Beneficio</span>
        <select id="promocionPremedic"></select>
      </label>
      <label id="monotributoCategoriaWrap" class="field premedic-promo-field hidden">
        <span>Categoría de monotributo</span>
        <select id="categoriaMonotributo"></select>
        <small id="aporteMonotributoInfo"></small>
      </label>
    `;
    aporteWrap.insertAdjacentElement('afterend', panel);

    const promoSelect = document.getElementById('promocionPremedic');
    const categoriaWrap = document.getElementById('monotributoCategoriaWrap');
    const categoriaSelect = document.getElementById('categoriaMonotributo');
    const aporteInfo = document.getElementById('aporteMonotributoInfo');

    Object.entries(promoApi.MONOTRIBUTO_APORTES).forEach(([cat, aporte]) => {
      categoriaSelect.add(new Option(`Categoría ${cat} · ${window.PremedicMotor.money(aporte)}`, cat));
    });

    function invalidateQuote() {
      nombre?.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function updateMonotributoUI() {
      const isMono = promoSelect.value === 'monotributo';
      categoriaWrap.classList.toggle('hidden', !isMono);
      if (isMono) {
        promoApi.state.categoriaMonotributo = categoriaSelect.value;
        aporteInfo.textContent = `Aporte a descontar: ${window.PremedicMotor.money(promoApi.aporteMonotributo())}`;
      }
    }

    function populatePromos() {
      const disponibles = promoApi.promosDisponibles(modalidad.value, zona.value);
      const previous = promoApi.state.promoId;
      promoSelect.innerHTML = '';
      disponibles.forEach(p => promoSelect.add(new Option(p.label, p.id)));
      promoSelect.value = disponibles.some(p => p.id === previous) ? previous : 'ninguna';
      promoApi.state.promoId = promoSelect.value;
      updateMonotributoUI();
      decorateResults();
    }

    function getCurrentState() {
      const comp = document.getElementById('composicion')?.value || 'individual';
      return {
        nombre: document.getElementById('nombre')?.value || '',
        dni: document.getElementById('dni')?.value || '',
        zona: zona.value,
        modalidad: modalidad.value,
        composicion: comp,
        aporteRecibo: document.getElementById('aporteRecibo')?.value || 0,
        edadTitular: Number(document.getElementById('edadTitular')?.value || 0),
        edadPareja: Number(document.getElementById('edadPareja')?.value || 0),
        hijos: [...document.querySelectorAll('#edadesHijos input')].map(i => i.value === '' ? null : Number(i.value))
      };
    }

    function decorateResults() {
      if (!resultados || !resultados.children.length) return;
      const calculated = window.PremedicMotor.quote(getCurrentState());
      if (!calculated.ok) return;
      resultados.querySelectorAll('.plan-card').forEach(card => {
        card.querySelectorAll('.promo-breakdown-line').forEach(el => el.remove());
        const plan = calculated.plans.find(p => p.plan === card.dataset.plan);
        if (!plan || !plan.descuentoPromocion) return;
        let breakdown = card.querySelector('.breakdown');
        if (!breakdown) {
          breakdown = document.createElement('div');
          breakdown.className = 'breakdown breakdown-compact';
          card.querySelector('.plan-price-block')?.insertAdjacentElement('afterend', breakdown);
        }
        const row = document.createElement('div');
        row.className = 'breakdown-line discount promo-breakdown-line';
        const label = plan.promocion?.id === 'monotributo'
          ? `Aporte monotributo · Cat. ${promoApi.state.categoriaMonotributo}`
          : plan.promocion?.label || 'Beneficio';
        row.innerHTML = `<span>${label}</span><strong>-${window.PremedicMotor.money(plan.descuentoPromocion)}</strong>`;
        breakdown.prepend(row);
      });
    }

    promoSelect.addEventListener('change', () => {
      promoApi.state.promoId = promoSelect.value;
      updateMonotributoUI();
      invalidateQuote();
    });

    categoriaSelect.addEventListener('change', () => {
      promoApi.state.categoriaMonotributo = categoriaSelect.value;
      updateMonotributoUI();
      invalidateQuote();
    });

    zona.addEventListener('change', () => {
      populatePromos();
      invalidateQuote();
    });
    modalidad.addEventListener('change', () => {
      populatePromos();
      invalidateQuote();
    });

    // app.js registra primero el cálculo. Este listener corre después y agrega
    // únicamente el detalle visual del beneficio aplicado.
    cotizarBtn?.addEventListener('click', () => queueMicrotask(decorateResults));

    const style = document.createElement('style');
    style.textContent = `
      .premedic-promo-panel{margin-top:16px;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(220px,.9fr) minmax(220px,.9fr);gap:18px;align-items:end;padding:20px 22px;border:1px solid rgba(13,138,122,.18);border-radius:18px;background:linear-gradient(135deg,rgba(13,138,122,.07),rgba(255,255,255,.92))}
      .premedic-promo-copy span{display:block;font-size:.76rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#0d8a7a}.premedic-promo-copy strong{display:block;margin-top:4px;font-size:1rem}.premedic-promo-copy p{margin:6px 0 0;color:#61716d;font-size:.86rem;line-height:1.45}.premedic-promo-field{margin:0}.premedic-promo-field small{display:block;margin-top:6px;color:#0d8a7a;font-weight:700}.premedic-promo-panel .hidden{display:none!important}
      @media(max-width:850px){.premedic-promo-panel{grid-template-columns:1fr}.premedic-promo-copy{margin-bottom:2px}}
    `;
    document.head.appendChild(style);

    populatePromos();
  }

  const promoScript = document.createElement('script');
  promoScript.src = 'js/promociones-premedic.js';
  promoScript.onload = initPromociones;
  document.head.appendChild(promoScript);
})();
