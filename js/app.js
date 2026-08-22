(() => {
  const { data, money, quote } = window.PremedicMotor;
  const { renderQuote, makeId } = window.PremedicQuote;

  const $ = id => document.getElementById(id);
  const els = {
    vigenciaBadge: $('vigenciaBadge'),
    nombre: $('nombre'), dni: $('dni'), zona: $('zona'), modalidad: $('modalidad'), composicion: $('composicion'),
    aporteWrap: $('aporteWrap'), aporteRecibo: $('aporteRecibo'),
    reglaEdad: $('reglaEdad'), edadTitular: $('edadTitular'), parejaWrap: $('parejaWrap'), edadPareja: $('edadPareja'),
    hijosWrap: $('hijosWrap'), cantidadHijos: $('cantidadHijos'), edadesHijos: $('edadesHijos'),
    asesorNombre: $('asesorNombre'), asesorTelefono: $('asesorTelefono'), asesorMail: $('asesorMail'),
    cotizarBtn: $('cotizarBtn'), limpiarBtn: $('limpiarBtn'), mensaje: $('mensaje'),
    emptySummary: $('emptySummary'), summaryContent: $('summaryContent'), sumCliente: $('sumCliente'), sumTipo: $('sumTipo'),
    sumComposicion: $('sumComposicion'), sumEdad: $('sumEdad'), sumTramo: $('sumTramo'), sumAporteReciboRow: $('sumAporteReciboRow'),
    sumAporteRecibo: $('sumAporteRecibo'), sumAporteCalculadoRow: $('sumAporteCalculadoRow'), sumAporteCalculado: $('sumAporteCalculado'),
    sumPlanes: $('sumPlanes'),
    resultadosSection: $('resultadosSection'), resumenCaso: $('resumenCaso'), badgeTramo: $('badgeTramo'),
    notasModalidad: $('notasModalidad'), resultados: $('resultados'),
    seleccionSection: $('seleccionSection'), seleccionPlan: $('seleccionPlan'), seleccionPrecio: $('seleccionPrecio'), seleccionDetalle: $('seleccionDetalle'),
    verCotizacionBtn: $('verCotizacionBtn'), guardarPdfBtn: $('guardarPdfBtn'),
    previewDialog: $('previewDialog'), previewContent: $('previewContent'), previewPdfBtn: $('previewPdfBtn'), cerrarPreviewBtn: $('cerrarPreviewBtn'),
    printArea: $('printArea')
  };

  let currentResult = null;
  let selectedPlan = null;
  let quoteId = null;

  els.vigenciaBadge.textContent = `Vigencia ${data.vigencia}`;


  function displayName(value) {
    return String(value || '')
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(part => part ? part.charAt(0).toLocaleUpperCase('es-AR') + part.slice(1).toLocaleLowerCase('es-AR') : '')
      .join(' ');
  }

  function compositionLabel(key) {
    return {
      individual: 'Individual',
      titular_hijos: 'Titular + hijo/s',
      pareja: 'Titular + pareja',
      pareja_hijos: 'Titular + pareja + hijo/s'
    }[key];
  }

  function getState() {
    return {
      nombre: els.nombre.value,
      dni: els.dni.value,
      zona: els.zona.value,
      modalidad: els.modalidad.value,
      composicion: els.composicion.value,
      aporteRecibo: els.aporteRecibo.value === '' ? '' : Number(els.aporteRecibo.value),
      edadTitular: els.edadTitular.value === '' ? null : Number(els.edadTitular.value),
      edadPareja: els.edadPareja.value === '' ? null : Number(els.edadPareja.value),
      hijos: [...els.edadesHijos.querySelectorAll('input')].map(i => i.value === '' ? null : Number(i.value)),
      asesorNombre: els.asesorNombre.value,
      asesorTelefono: els.asesorTelefono.value,
      asesorMail: els.asesorMail.value
    };
  }

  function renderLiveSummary() {
    const state = getState();
    const hasData = Boolean(
      state.nombre.trim() || state.dni.trim() || state.edadTitular !== null ||
      state.modalidad !== 'directo' || state.zona !== 'amba' || state.composicion !== 'individual'
    );

    if (!hasData) {
      els.summaryContent.classList.add('hidden');
      els.emptySummary.classList.remove('hidden');
      return;
    }

    els.emptySummary.classList.add('hidden');
    els.summaryContent.classList.remove('hidden');
    els.sumCliente.textContent = displayName(state.nombre) || 'Sin nombre';
    els.sumTipo.textContent = `${state.modalidad === 'directo' ? 'Directo' : 'Desregulado'} · ${state.zona === 'amba' ? 'AMBA' : 'Interior'}`;
    els.sumComposicion.textContent = compositionLabel(state.composicion);

    const preview = quote(state);
    if (preview.ok) {
      els.sumEdad.textContent = `${preview.refAge} años`;
      els.sumTramo.textContent = preview.bandLabel;
      els.sumPlanes.textContent = preview.plans.length;
      const isDesreg = state.modalidad === 'desregulado';
      els.sumAporteReciboRow.classList.toggle('hidden', !isDesreg);
      els.sumAporteCalculadoRow.classList.toggle('hidden', !isDesreg);
      if (isDesreg) {
        els.sumAporteRecibo.textContent = money(preview.aporteRecibo);
        els.sumAporteCalculado.textContent = money(preview.aporteComputable);
      }
    } else {
      els.sumEdad.textContent = state.edadTitular !== null ? `${state.edadTitular} años` : '—';
      els.sumTramo.textContent = '—';
      els.sumPlanes.textContent = '—';
      els.sumAporteReciboRow.classList.add('hidden');
      els.sumAporteCalculadoRow.classList.add('hidden');
    }
  }

  function resetCalculatedViews() {
    currentResult = null;
    selectedPlan = null;
    quoteId = null;
    els.resultados.innerHTML = '';
    els.resultadosSection.classList.add('hidden');
    els.seleccionSection.classList.add('hidden');
    els.mensaje.classList.add('hidden');
    renderLiveSummary();
  }

  function showAlert(text) {
    els.mensaje.textContent = text;
    els.mensaje.classList.remove('hidden');
  }

  function renderChildrenInputs() {
    const count = Math.max(1, Math.min(10, Number(els.cantidadHijos.value) || 1));
    els.cantidadHijos.value = count;
    const old = [...els.edadesHijos.querySelectorAll('input')].map(i => i.value);
    els.edadesHijos.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const label = document.createElement('label');
      label.className = 'field';
      label.innerHTML = `
        <span>Edad hijo/a ${i + 1}</span>
        <input type="number" min="0" max="24" step="1" inputmode="numeric" placeholder="Ej. ${i === 0 ? 8 : 4}">
      `;
      const input = label.querySelector('input');
      if (old[i] !== undefined) input.value = old[i];
      input.addEventListener('input', resetCalculatedViews);
      els.edadesHijos.appendChild(label);
    }
  }

  function updateCompositionUI() {
    const comp = els.composicion.value;
    const hasPartner = ['pareja', 'pareja_hijos'].includes(comp);
    const hasChildren = ['titular_hijos', 'pareja_hijos'].includes(comp);

    els.parejaWrap.classList.toggle('hidden', !hasPartner);
    els.hijosWrap.classList.toggle('hidden', !hasChildren);
    els.reglaEdad.textContent = hasPartner
      ? 'Para esta cotización se toma la edad del mayor de la pareja.'
      : 'La edad tarifaria se toma desde la edad del titular.';

    if (hasChildren) renderChildrenInputs();
    resetCalculatedViews();
  }

  function updateModalidadUI() {
    const isDesreg = els.modalidad.value === 'desregulado';
    els.aporteWrap.classList.toggle('hidden', !isDesreg);
    resetCalculatedViews();
  }

  function renderSummary(state, result) {
    els.emptySummary.classList.add('hidden');
    els.summaryContent.classList.remove('hidden');
    els.sumCliente.textContent = displayName(state.nombre) || '—';
    els.sumTipo.textContent = `${state.modalidad === 'directo' ? 'Directo' : 'Desregulado'} · ${state.zona === 'amba' ? 'AMBA' : 'Interior'}`;
    els.sumComposicion.textContent = compositionLabel(state.composicion);
    els.sumEdad.textContent = `${result.refAge} años`;
    els.sumTramo.textContent = result.bandLabel;
    els.sumPlanes.textContent = result.plans.length;

    const isDesreg = state.modalidad === 'desregulado';
    els.sumAporteReciboRow.classList.toggle('hidden', !isDesreg);
    els.sumAporteCalculadoRow.classList.toggle('hidden', !isDesreg);
    if (isDesreg) {
      els.sumAporteRecibo.textContent = money(result.aporteRecibo);
      els.sumAporteCalculado.textContent = money(result.aporteComputable);
    }
  }

  function renderNote(state) {
    if (state.modalidad !== 'desregulado') {
      els.notasModalidad.classList.add('hidden');
      return;
    }
    els.notasModalidad.innerHTML = 'En <strong>Desregulado</strong> el sistema descuenta automáticamente el aporte computable calculado como <strong>(aporte del recibo ÷ 3) × 7,65</strong>. Si el aporte cubre totalmente el plan, el total a abonar se muestra en <strong>$ 0</strong>.';
    els.notasModalidad.classList.remove('hidden');
  }

  function detailText(planResult) {
    const parts = [planResult.baseLabel];
    const inf = planResult.extras.filter(x => x.tipo === 'Menor de 1 año').length;
    const u25 = planResult.extras.filter(x => x.tipo === 'Menor de 25 años').length;
    if (inf) parts.push(`${inf} adicional${inf > 1 ? 'es' : ''} menor de 1 año`);
    if (u25) parts.push(`${u25} adicional${u25 > 1 ? 'es' : ''} menor${u25 > 1 ? 'es' : ''} de 25 años`);
    return parts.join(' · ');
  }

  function renderResults(state, result) {
    els.resultados.innerHTML = '';
    const planOrder = { 'C-100': 0, '200': 1, '300': 2, '400': 3, '500': 4 };
    const orderedPlans = [...result.plans].sort((a, b) => (planOrder[a.plan] ?? 99) - (planOrder[b.plan] ?? 99));

    orderedPlans.forEach(planResult => {
      const card = document.createElement('article');
      card.className = 'plan-card plan-card-refined';
      card.dataset.plan = planResult.plan;

      const detailRows = [];
      if (planResult.totalAdicionales > 0) {
        detailRows.push(`<div class="breakdown-line"><span>Valor base</span><strong>${money(planResult.base)}</strong></div>`);
        detailRows.push(`<div class="breakdown-line"><span>Adicionales</span><strong>${money(planResult.totalAdicionales)}</strong></div>`);
      }
      if (state.modalidad === 'desregulado') {
        if (planResult.totalAdicionales === 0) detailRows.push(`<div class="breakdown-line"><span>Valor del plan</span><strong>${money(planResult.bruto)}</strong></div>`);
        detailRows.push(`<div class="breakdown-line discount"><span>Aporte computable</span><strong>-${money(planResult.aporteComputable)}</strong></div>`);
      }

      card.innerHTML = `
        <div class="plan-card-top">
          <div>
            <div class="plan-brand">Premedic</div>
            <h3 class="plan-name">Plan ${planResult.plan}</h3>
          </div>
          <div class="plan-card-tags">
            ${planResult.plan === 'C-100' ? '<span class="plan-special-tag">Solo AMBA</span>' : ''}
            <span class="plan-mode">${state.modalidad === 'directo' ? 'Directo' : 'Desregulado'}</span>
          </div>
        </div>
        <div class="plan-content">
          <div class="plan-price-block">
            <div class="plan-row-label">Valor mensual a abonar</div>
            <div class="plan-price">${money(planResult.neto)}</div>
          </div>
          ${detailRows.length ? `<div class="breakdown breakdown-compact">${detailRows.join('')}</div>` : ''}
          <div class="plan-detail">${detailText(planResult)}${planResult.cubiertoPorAporte ? ' · Aportes suficientes para cubrir el plan' : ''}</div>
          <button class="btn btn-primary elegir-plan" type="button">Elegir Plan ${planResult.plan}</button>
        </div>
      `;
      card.querySelector('.elegir-plan').addEventListener('click', () => selectPlan(planResult.plan));
      els.resultados.appendChild(card);
    });

    els.resumenCaso.textContent = `${compositionLabel(state.composicion)} · ${state.zona === 'amba' ? 'AMBA' : 'Interior'} · ${state.modalidad === 'directo' ? 'Directo' : 'Desregulado'} · edad tarifaria ${result.refAge}`;
    els.badgeTramo.textContent = `Tramo ${result.bandLabel}`;
    renderNote(state);
    els.resultadosSection.classList.remove('hidden');
  }


  function refreshSelectionMeta() {
    if (!currentResult || !selectedPlan) return;
    const selected = currentResult.plans.find(p => p.plan === selectedPlan);
    if (!selected) return;
    const state = getState();
    els.seleccionDetalle.textContent = `${displayName(state.nombre) || 'Cliente'} · ${state.modalidad === 'directo' ? 'Directo' : 'Desregulado'} · ${detailText(selected)}`;
  }

  function selectPlan(planName) {
    if (!currentResult) return;
    selectedPlan = planName;
    quoteId = quoteId || makeId();
    [...els.resultados.querySelectorAll('.plan-card')].forEach(card => card.classList.toggle('selected', card.dataset.plan === planName));
    const selected = currentResult.plans.find(p => p.plan === planName);
    const state = getState();
    els.seleccionPlan.textContent = `Premedic ${planName}`;
    els.seleccionPrecio.textContent = `${money(selected.neto)} / mes`;
    els.seleccionDetalle.textContent = `${displayName(state.nombre)} · ${state.modalidad === 'directo' ? 'Directo' : 'Desregulado'} · ${detailText(selected)}`;
    els.seleccionSection.classList.remove('hidden');
    els.seleccionSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function calculate() {
    const state = getState();
    const result = quote(state);
    els.mensaje.classList.add('hidden');

    if (!result.ok) {
      showAlert(result.error);
      return;
    }

    currentResult = result;
    selectedPlan = null;
    quoteId = makeId();
    renderSummary(state, result);
    renderResults(state, result);
    els.seleccionSection.classList.add('hidden');
    els.resultadosSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function buildQuoteHTML() {
    if (!currentResult || !selectedPlan) return '';
    return renderQuote({ state: getState(), result: currentResult, selectedPlan, quoteId });
  }

  function openPreview() {
    if (!currentResult || !selectedPlan) return;
    if (!els.nombre.value.trim()) { showAlert('Completá el nombre del cliente antes de generar la cotización formal.'); return; }
    els.previewContent.innerHTML = buildQuoteHTML();
    els.previewDialog.showModal();
    const previewBody = els.previewDialog.querySelector('.preview-body');
    els.previewDialog.scrollTop = 0;
    els.previewContent.scrollTop = 0;
    if (previewBody) previewBody.scrollTop = 0;
    requestAnimationFrame(() => {
      els.previewDialog.scrollTop = 0;
      els.previewContent.scrollTop = 0;
      if (previewBody) previewBody.scrollTop = 0;
    });
  }

  function printQuote() {
    if (!currentResult || !selectedPlan) return;
    if (!els.nombre.value.trim()) { showAlert('Completá el nombre del cliente antes de guardar el PDF.'); return; }
    els.printArea.innerHTML = buildQuoteHTML();
    window.print();
  }

  function clearForm() {
    ['nombre','dni','aporteRecibo','edadTitular','edadPareja','asesorNombre','asesorTelefono','asesorMail'].forEach(k => els[k].value = '');
    els.zona.value = 'amba';
    els.modalidad.value = 'directo';
    els.composicion.value = 'individual';
    els.cantidadHijos.value = '1';
    els.edadesHijos.innerHTML = '';
    updateModalidadUI();
    updateCompositionUI();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Sólo invalidamos una cotización cuando cambia algo que modifica el precio.
  [els.zona, els.aporteRecibo, els.edadTitular, els.edadPareja].forEach(el => {
    el.addEventListener('input', resetCalculatedViews);
    el.addEventListener('change', resetCalculatedViews);
  });
  els.composicion.addEventListener('change', updateCompositionUI);
  els.modalidad.addEventListener('change', updateModalidadUI);
  els.cantidadHijos.addEventListener('input', () => { renderChildrenInputs(); resetCalculatedViews(); });

  // Nombre y DNI no cambian el precio, pero sí actualizan el resumen en vivo.
  els.nombre.addEventListener('input', () => { refreshSelectionMeta(); renderLiveSummary(); });
  els.dni.addEventListener('input', renderLiveSummary);
  [els.zona, els.modalidad, els.composicion, els.aporteRecibo, els.edadTitular, els.edadPareja, els.cantidadHijos].forEach(el => {
    el.addEventListener('input', renderLiveSummary);
    el.addEventListener('change', renderLiveSummary);
  });

  els.cotizarBtn.addEventListener('click', calculate);
  els.limpiarBtn.addEventListener('click', clearForm);
  els.verCotizacionBtn.addEventListener('click', openPreview);
  els.guardarPdfBtn.addEventListener('click', printQuote);
  els.previewPdfBtn.addEventListener('click', printQuote);
  els.cerrarPreviewBtn.addEventListener('click', () => els.previewDialog.close());

  updateModalidadUI();
  updateCompositionUI();
  renderLiveSummary();
})();
