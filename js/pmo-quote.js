(() => {
  const baseQuote = window.PremedicQuote;
  if (!baseQuote?.renderQuote) return;

  const originalRenderQuote = baseQuote.renderQuote;
  const esc = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const displayName = value => String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(part => part ? part.charAt(0).toLocaleUpperCase('es-AR') + part.slice(1).toLocaleLowerCase('es-AR') : '')
    .join(' ');

  const formatDate = (date = new Date()) => new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(date);

  const pmoIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.4 2.7 7.9 7 10 4.3-2.1 7-5.6 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>';

  function proposalData(state, result) {
    const rows = [];
    if (state.dni?.trim()) rows.push(['DNI', state.dni.trim()]);
    rows.push(['Composición', result.compositionLabel]);
    rows.push(['Edad tarifaria', `${result.refAge} años`]);
    rows.push(['Aporte computable por persona', window.PremedicMotor.money(result.aportePorPersona)]);
    return rows.map(([label, value]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('');
  }

  function advisorStrip(state) {
    const items = [];
    if (state.asesorNombre?.trim()) items.push(['Asesor comercial', displayName(state.asesorNombre)]);
    if (state.asesorTelefono?.trim()) items.push(['WhatsApp / Tel.', state.asesorTelefono.trim()]);
    if (state.asesorMail?.trim()) items.push(['Mail', state.asesorMail.trim()]);
    if (!items.length) return '';
    return `<section class="quote-advisor-strip quote-advisor-strip-v3 quote-advisor-dynamic cols-${items.length}">${items.map(([label,value]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('')}</section>`;
  }

  function pmoInfoPage(quoteId) {
    const items = [
      ['Elegibilidad por aportes', 'La opción PMO se habilita cuando el aporte computable por persona alcanza $ 15.000.'],
      ['Valor a abonar', 'Con la condición de aportes cumplida, el cotizador informa un valor mensual a abonar de $ 0.'],
      ['Aporte del titular', 'El cálculo utiliza un único aporte informado desde el recibo de sueldo del titular.'],
      ['Sin tope adicional', 'La fórmula de aportes de Premedic se aplica sin un tope adicional de base dentro de este cotizador.'],
      ['Alcance de cobertura', 'Las prestaciones, prestadores, autorizaciones y condiciones se rigen por la documentación oficial vigente de Premedic.'],
      ['Confirmación comercial', 'La afiliación y el alcance definitivo quedan sujetos a validación de datos y condiciones de contratación.']
    ];
    return `
      <section class="quote-sheet quote-page quote-benefits-page">
        <header class="benefits-header benefits-header-editorial">
          <div class="benefits-header-copy">
            <div class="benefits-brand"><img src="assets/premedic-logo-oficial.png" alt="Premedic" class="quote-brand-logo benefits-brand-logo"></div>
            <span>Opción por aportes</span>
            <h2>Plan PMO.</h2>
            <p>Información comercial sobre la alternativa habilitada por el nivel de aportes informado.</p>
          </div>
          <div class="benefits-family" aria-hidden="true"><img src="assets/benefits-family.jpg" alt=""></div>
        </header>
        <div class="benefits-grid benefits-grid-editorial">
          ${items.map(([title, copy], index) => `
            <article class="benefit-card benefit-row">
              <div class="benefit-icon">${pmoIcon}</div>
              <div class="benefit-row-copy">
                <div class="benefit-number">0${index + 1}</div>
                <h3>${esc(title)}</h3>
                <p>${esc(copy)}</p>
              </div>
            </article>
          `).join('')}
        </div>
        <div class="benefits-closing benefits-closing-editorial">
          <span>PREMEDIC</span>
          <strong>La documentación oficial vigente define el alcance contractual.</strong>
        </div>
        <footer class="quote-footer benefits-footer quote-footer-clean">
          <div class="quote-legal">Resumen comercial de elegibilidad. No reemplaza la documentación contractual del PMO.</div>
          <div class="quote-footer-side"><span>2 / 4 · Grupo Zeroka</span><b>${esc(quoteId)}</b></div>
        </footer>
      </section>`;
  }

  function pmoConditionsPage(quoteId) {
    const rows = [
      ['PMO', 'Condición de acceso', 'Aportes', 'Aporte computable por persona igual o superior a $ 15.000.'],
      ['PMO', 'Valor mensual', 'Cubierto', 'El valor a abonar informado por esta opción es $ 0 cuando se cumple la condición de aportes.'],
      ['PMO', 'Cobertura médica', 'Según PMO', 'Prestaciones y alcance conforme a la documentación oficial vigente aplicable.'],
      ['PMO', 'Prestadores', 'Según cartilla', 'Disponibilidad y cartilla sujetas a la documentación y condiciones vigentes de Premedic.'],
      ['PMO', 'Afiliación', 'Sujeta a validación', 'La incorporación definitiva requiere validación de datos y condiciones comerciales.']
    ];
    return `
      <section class="quote-sheet quote-page quote-coverage-page">
        <header class="coverage-header-premedic">
          <div>
            <span>Información para decidir</span>
            <h2>PMO · condiciones de la propuesta</h2>
            <p>Se muestran únicamente las condiciones que el cotizador puede afirmar con la información actualmente validada.</p>
          </div>
          <img src="assets/premedic-logo-oficial.png" alt="Premedic" class="coverage-brand-logo">
        </header>
        <div class="coverage-table-head-premedic"><span>Concepto</span><span>Resultado</span><span>Condición principal</span></div>
        <div class="coverage-groups-premedic">
          <section class="coverage-group-premedic">
            <h3>PMO</h3>
            <table><tbody>
              ${rows.map(([, service, coverage, detail]) => `<tr><td>${esc(service)}</td><td><span class="coverage-pill-premedic">${esc(coverage)}</span></td><td>${esc(detail)}</td></tr>`).join('')}
            </tbody></table>
          </section>
        </div>
        <aside class="coverage-reading-note"><strong>Importante</strong><span>Esta página no enumera prestaciones médicas específicas porque esas condiciones deben verificarse contra la documentación oficial vigente.</span></aside>
        <footer class="quote-footer quote-footer-clean coverage-footer-premedic">
          <div class="quote-legal">Resumen orientativo de la opción PMO.</div>
          <div class="quote-footer-side"><span>3 / 4 · Grupo Zeroka</span><b>${esc(quoteId)}</b></div>
        </footer>
      </section>`;
  }

  function closingPage(quoteId) {
    return `
      <section class="quote-sheet quote-page quote-closing-page">
        <div class="closing-orbit closing-orbit-a"></div>
        <div class="closing-orbit closing-orbit-b"></div>
        <div class="closing-orbit closing-orbit-c"></div>
        <div class="closing-premedic-lockup">
          <div class="closing-logo-card"><img src="assets/premedic-logo-oficial.png" alt="Premedic"></div>
          <span>Tu propuesta · Plan PMO</span>
          <h2>Tu salud,<br>más cerca.</h2>
          <p>Gracias por elegir una propuesta Premedic.</p>
        </div>
        <div class="closing-premedic-meta"><span>GRUPO ZEROKA</span><b>${esc(quoteId)}</b></div>
      </section>`;
  }

  function renderPmoQuote({ state, result, quoteId }) {
    const selected = result.plans.find(plan => plan.plan === 'PMO');
    if (!selected) return '';
    const fecha = formatDate();
    const zonaLabel = state.zona === 'amba' ? 'AMBA' : 'Interior';
    const client = displayName(state.nombre);
    const pageOne = `
      <section class="quote-sheet quote-page quote-commercial-page">
        <header class="quote-editorial-header quote-editorial-header-clean">
          <div class="quote-editorial-top">
            <div class="quote-brand-lockup">
              <img src="assets/premedic-logo-oficial.png" alt="Premedic" class="quote-brand-logo quote-brand-logo-header">
              <em>Cotización comercial</em>
            </div>
            <div class="quote-meta quote-meta-light">
              <div><span>Emisión</span><strong>${fecha}</strong></div>
              <div><span>Vigencia</span><strong>72 hs hábiles</strong></div>
              <div><span>ID</span><strong>${esc(quoteId)}</strong></div>
            </div>
          </div>
          <div class="quote-editorial-main quote-proposal-band">
            <span class="quote-eyebrow-dark">Propuesta para</span>
            <h1>${esc(client)}</h1>
            <div class="quote-plan-line"><span>Plan PMO</span><strong>Desregulado</strong><strong>${zonaLabel}</strong></div>
          </div>
        </header>
        <section class="quote-body quote-body-v3 quote-body-final">
          <section class="quote-client-summary quote-client-summary-final">
            <div class="quote-summary-title"><div><span>Datos de la propuesta</span><strong>Información utilizada para validar la opción PMO</strong></div><b>Plan PMO</b></div>
            <div class="quote-client-data quote-client-data-dynamic">${proposalData(state, result)}</div>
          </section>
          <section class="quote-economy quote-economy-v3 quote-economy-final">
            <div class="quote-economy-left">
              <div class="quote-section-heading quote-section-heading-economic"><div><span>Detalle económico</span><strong>Cubierto íntegramente con aportes</strong></div></div>
              <div class="quote-economic-list">
                <div class="quote-economic-row"><span>Aporte computable total</span><strong>${window.PremedicMotor.money(result.aporteComputable)}</strong></div>
                <div class="quote-economic-row"><span>Aporte computable por persona</span><strong>${window.PremedicMotor.money(result.aportePorPersona)}</strong></div>
                <div class="quote-economic-row"><span>Valor del plan</span><strong>$ 0</strong></div>
              </div>
              <div class="quote-covered-note">La opción PMO quedó habilitada porque el aporte computable por persona alcanza $ 15.000.</div>
            </div>
            <div class="quote-total-card quote-total-card-v3 quote-total-card-final">
              <span>Total a abonar</span><b>Plan PMO</b><strong>$ 0</strong><small>Valor mensual a abonar</small><em>Cubierto por aportes</em>
            </div>
          </section>
          ${advisorStrip(state)}
          <section class="quote-highlights quote-highlights-final" aria-label="Datos destacados de la propuesta">
            <article><div class="quote-highlight-icon">${pmoIcon}</div><div class="quote-highlight-copy"><strong>≥ $15.000</strong><span>Aporte computable por persona</span></div></article>
            <article><div class="quote-highlight-icon">${pmoIcon}</div><div class="quote-highlight-copy"><strong>$ 0</strong><span>Valor mensual PMO</span></div></article>
            <article><div class="quote-highlight-icon">${pmoIcon}</div><div class="quote-highlight-copy"><strong>72 hs</strong><span>Vigencia de la propuesta</span></div></article>
          </section>
          <section class="quote-brand-story quote-brand-story-final">
            <div><span>PREMEDIC</span><strong>Una alternativa habilitada por tus aportes.</strong><small>El alcance médico y las condiciones definitivas se rigen por la documentación oficial vigente.</small></div>
            <div class="quote-brand-story-art" aria-hidden="true"><span></span><i></i></div>
          </section>
          <section class="quote-conditions quote-conditions-final">
            <div><span>Tarifa aplicada</span><strong>Vigencia ${esc(window.PremedicMotor.data.vigencia)}</strong></div>
            <p>La opción PMO se habilita por el nivel de aportes informado. Prestaciones, prestadores y condiciones de afiliación se rigen por la documentación oficial vigente de Premedic.</p>
          </section>
        </section>
        <footer class="quote-footer quote-footer-v3 quote-footer-clean">
          <div class="quote-legal">Premedic · Cotización orientativa para uso comercial.</div>
          <div class="quote-footer-side"><span>1 / 4 · Grupo Zeroka</span><b>${esc(quoteId)}</b></div>
        </footer>
      </section>`;
    return `<article class="quote-document">${pageOne}${pmoInfoPage(quoteId)}${pmoConditionsPage(quoteId)}${closingPage(quoteId)}</article>`;
  }

  baseQuote.renderQuote = args => args?.selectedPlan === 'PMO' ? renderPmoQuote(args) : originalRenderQuote(args);
})();
