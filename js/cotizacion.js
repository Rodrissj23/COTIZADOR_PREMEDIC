window.PremedicQuote = (() => {
  const { money } = window.PremedicMotor;

  function makeId() {
    const date = new Date();
    const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    return `PM-${stamp}-${Math.floor(100000 + Math.random() * 900000)}`;
  }

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function displayName(value) {
    return String(value || '')
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(part => part
        ? part.charAt(0).toLocaleUpperCase('es-AR') + part.slice(1).toLocaleLowerCase('es-AR')
        : '')
      .join(' ');
  }

  function zoneLabel(zone) {
    return {
      amba: 'AMBA',
      interior: 'Interior',
      cordoba: 'Córdoba',
      mendoza: 'Mendoza',
      misiones: 'Misiones',
      tucuman: 'Tucumán'
    }[zone] || String(zone || 'Interior');
  }

  function familyLabel(state) {
    const parts = [`Titular ${state.edadTitular}`];
    if (['pareja', 'pareja_hijos'].includes(state.composicion)) {
      parts.push(`Pareja ${state.edadPareja}`);
    }
    const children = Array.isArray(state.hijos) ? state.hijos.length : 0;
    if (children) parts.push(`${children} hijo${children === 1 ? '' : 's'}`);
    return parts.join(' + ');
  }

  function modeLabel(state, selected) {
    if (selected.esPMO) return 'Desregulado · cubierto por aportes';
    if (selected.promocion?.id === 'monotributo') return 'Directo · Monotributo';
    return state.modalidad === 'desregulado' ? 'Desregulado' : 'Directo';
  }

  function promotionDetail(selected, result) {
    if (!selected.descuentoPromocion) return { value: money(0), note: '' };
    const promo = selected.promocion || {};
    if (promo.tipo === 'porcentaje') {
      return {
        value: `${promo.valor}% - ${money(selected.descuentoPromocion)}`,
        note: promo.label || 'Beneficio comercial aplicado'
      };
    }
    if (promo.id === 'monotributo') {
      return {
        value: `Monotributo Cat. ${result.categoriaMonotributo || '-'} - ${money(selected.descuentoPromocion)}`,
        note: 'Aporte correspondiente a la categoría seleccionada'
      };
    }
    return { value: `- ${money(selected.descuentoPromocion)}`, note: promo.label || '' };
  }

  function summaryRow(label, value, note = '') {
    const text = String(value);
    const longClass = text.length > 32 ? ' is-long' : text.length > 21 ? ' is-medium' : '';
    return `
      <div class="premedic-summary-row${note ? ' has-note' : ''}">
        <b>${esc(label)}</b>
        <span class="${longClass.trim()}">${esc(text)}${note ? `<small>${esc(note)}</small>` : ''}</span>
      </div>`;
  }

  function coverPage({ state, selected, quoteId }) {
    const client = displayName(state.nombre);
    const firstName = client.split(/\s+/)[0] || 'Hola';
    return `
      <section class="quote-sheet quote-page premedic-pdf-page premedic-pdf-cover">
        <div class="premedic-cover-orbit orbit-one"></div>
        <div class="premedic-cover-orbit orbit-two"></div>
        <div class="premedic-cover-dots" aria-hidden="true"></div>
        <div class="premedic-cover-panel">
          <div class="premedic-cover-logo"><img src="assets/premedic-logo-oficial.png" alt="Premedic"></div>
          <div class="premedic-cover-copy">
            <span>NUEVA COTIZACIÓN</span>
            <h1>Hola, ${esc(firstName)}.<br>Tu cobertura,<br>más cerca.</h1>
            <p>Te acercamos tu cotización personalizada Premedic.</p>
          </div>
          <div class="premedic-cover-card">
            <div><span>PLAN ELEGIDO</span><strong>${esc(selected.plan)}</strong></div>
            <div><span>GRUPO FAMILIAR</span><strong>${esc(familyLabel(state))}</strong></div>
            <div><span>ZONA · SEGMENTO</span><strong>${esc(zoneLabel(state.zona))} · ${esc(modeLabel(state, selected))}</strong></div>
          </div>
          <div class="premedic-cover-footer"><span>Grupo Zeroka · Vigencia ${esc(window.PremedicMotor.data.vigencia)}</span><b>${esc(quoteId)}</b></div>
        </div>
      </section>`;
  }

  function summaryPage({ state, result, selected, quoteId }) {
    const promo = promotionDetail(selected, result);
    const rows = [
      ['Grupo familiar', familyLabel(state), ''],
      ['Zona', zoneLabel(state.zona), ''],
      ['Valor detalle', money(selected.base), ''],
      ['Filiar a cargo', money(selected.totalAdicionales), ''],
      ['Aportes a descontar', selected.aporteComputable ? `- ${money(selected.aporteComputable)}` : money(0), ''],
      ['Descuento promocional', promo.value, promo.note],
      ['Descuento multiproducto', money(0), ''],
      ['IVA', 'Incluido', '']
    ];

    return `
      <section class="quote-sheet quote-page premedic-pdf-page premedic-pdf-summary">
        <div class="premedic-summary-orbit summary-orbit-one"></div>
        <div class="premedic-summary-orbit summary-orbit-two"></div>
        <div class="premedic-summary-panel">
          <header class="premedic-summary-title"><span>| Nueva</span><strong>COTIZACIÓN</strong></header>
          <div class="premedic-summary-plan"><span>PLAN</span><strong>${esc(selected.plan)}</strong></div>
          <div class="premedic-summary-table">${rows.map(row => summaryRow(...row)).join('')}</div>
          <div class="premedic-summary-total"><b>TOTAL</b><strong>${money(selected.neto)}</strong></div>
          <div class="premedic-summary-legal">
            <p>*Los datos exhibidos en este reporte son una aproximación de los valores finales y pueden variar por ajustes de precios o por la fidelidad de los datos brindados al cotizador.</p>
            <p>*Precios correspondientes al tarifario ${esc(window.PremedicMotor.data.vigencia)} · propuesta válida por 72 hs hábiles.</p>
          </div>
          <div class="premedic-summary-logo"><img src="assets/premedic-logo-oficial.png" alt="Premedic"><b>${esc(quoteId)}</b></div>
        </div>
      </section>`;
  }

  function renderQuote({ state, result, selectedPlan, quoteId }) {
    const selected = result.plans.find(plan => plan.plan === selectedPlan);
    if (!selected) return '';
    return `<article class="quote-document premedic-pdf-document">${coverPage({ state, selected, quoteId })}${summaryPage({ state, result, selected, quoteId })}</article>`;
  }

  return { renderQuote, makeId, supportsOfficialPdf: true };
})();
