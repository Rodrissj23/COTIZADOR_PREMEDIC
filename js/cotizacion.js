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
          <div class="premedic-cover-logo"><img src="assets/premedic-logo-oficial.svg" alt="Premedic"></div>
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
          <div class="premedic-summary-logo"><img src="assets/premedic-logo-oficial.svg" alt="Premedic"><b>${esc(quoteId)}</b></div>
        </div>
      </section>`;
  }

  function benefitIcon(name) {
    const paths = {
      app: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M10 6h4M11 18h2"/>',
      authorization: '<path d="M12 3 5 6v5c0 4.8 2.9 8.1 7 10 4.1-1.9 7-5.2 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
      doctor: '<path d="M8 4v4a4 4 0 0 0 8 0V4M6 4h2M16 4h2"/><path d="M12 12v2a5 5 0 0 0 5 5h1"/><circle cx="19" cy="19" r="2"/>',
      payments: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>',
      travel: '<path d="m3 11 18-7-7 18-3-8-8-3Z"/><path d="m11 14 4-4"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.app}</svg>`;
  }

  function benefitCard(icon, title, text) {
    return `
      <div class="premedic-benefit-card">
        <div class="premedic-benefit-icon">${benefitIcon(icon)}</div>
        <div><strong>${esc(title)}</strong><p>${esc(text)}</p></div>
      </div>`;
  }

  function benefitsPage({ quoteId }) {
    return `
      <section class="quote-sheet quote-page premedic-pdf-page premedic-pdf-benefits">
        <div class="premedic-benefits-hero">
          <img src="assets/premedic-beneficios-familia.webp" alt="Familia compartiendo un momento de bienestar">
          <div class="premedic-benefits-shade"></div>
          <div class="premedic-benefits-brand"><img src="assets/premedic-logo-oficial.svg" alt="Premedic"></div>
          <div class="premedic-benefits-heading">
            <span>BIENESTAR CERCA TUYO</span>
            <h2>Beneficios<br>Premedic</h2>
            <p>Todo lo que tenés para cuidar tu salud, también desde donde estés.</p>
          </div>
        </div>
        <div class="premedic-benefits-body">
          <div class="premedic-benefit-featured">
            <div class="premedic-benefit-icon is-featured">${benefitIcon('app')}</div>
            <div><span>SERVICIOS DIGITALES</span><strong>APP Premedic Móvil</strong><p>Consultá tu cartilla digital y accedé a tu credencial virtual desde la aplicación.</p></div>
          </div>
          <div class="premedic-benefits-grid">
            ${benefitCard('authorization', 'Autorizaciones digitales', 'Solicitá tus autorizaciones de forma online desde la aplicación.')}
            ${benefitCard('doctor', 'Llamando al Doctor', 'Accedé al servicio de videoconsulta de Premedic.')}
            ${benefitCard('payments', 'Facturas y medios de pago', 'Visualizá tus facturas y consultá los medios de pago disponibles.')}
            ${benefitCard('travel', 'Asistencia al viajero', 'Contás con un servicio de asistencia sujeto a las condiciones vigentes del plan.')}
          </div>
          <p class="premedic-benefits-note">Los servicios, su disponibilidad y sus condiciones se rigen por la documentación oficial vigente de Premedic y por el plan contratado.</p>
          <footer class="premedic-benefits-footer"><span>PREMEDIC · BENEFICIOS GENERALES</span><b>${esc(quoteId)}</b></footer>
        </div>
      </section>`;
  }

  function renderQuote({ state, result, selectedPlan, quoteId }) {
    const selected = result.plans.find(plan => plan.plan === selectedPlan);
    if (!selected) return '';
    return `<article class="quote-document premedic-pdf-document">${coverPage({ state, selected, quoteId })}${summaryPage({ state, result, selected, quoteId })}${benefitsPage({ quoteId })}</article>`;
  }

  return { renderQuote, makeId, supportsOfficialPdf: true };
})();
