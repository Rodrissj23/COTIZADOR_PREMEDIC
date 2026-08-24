window.PremedicQuote = (() => {
  const { money } = window.PremedicMotor;

  function formatDate(date = new Date()) {
    return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  }

  function makeId() {
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    const rand = String(Math.floor(100000 + Math.random() * 900000));
    return `PM-${stamp}-${rand}`;
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
      .map(part => part ? part.charAt(0).toLocaleUpperCase('es-AR') + part.slice(1).toLocaleLowerCase('es-AR') : '')
      .join(' ');
  }

  function benefitIcon(kind) {
    const icons = {
      hospital: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V8h16v13M9 8V4h6v4M8 12h2M14 12h2M8 16h2M14 16h2M11 21v-4h2v4"/></svg>',
      network: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v16H7zM9 8h6M9 12h6M9 16h3M4 7h3M17 7h3M4 17h3M17 17h3"/></svg>',
      shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.4 2.7 7.9 7 10 4.3-2.1 7-5.6 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>',
      tooth: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.2 3.5C5.5 3.5 4 5.3 4 8c0 2.2 1.2 3.8 2 5.7.8 1.9.8 6.8 3.1 6.8 1.8 0 1.5-4.7 2.9-4.7s1.1 4.7 2.9 4.7c2.3 0 2.3-4.9 3.1-6.8.8-1.9 2-3.5 2-5.7 0-2.7-1.5-4.5-4.2-4.5-1.5 0-2.4.7-3.8.7s-2.3-.7-3.8-.7Z"/></svg>',
      diagnostic: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3v5a4 4 0 0 0 8 0V3M10 16a4 4 0 0 0 8 0v-2"/><circle cx="18" cy="12" r="2"/><path d="M10 12v4a4 4 0 0 0 4 4"/></svg>',
      video: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3z"/><circle cx="9.5" cy="10" r="2"/><path d="M6.5 16c.6-1.8 1.6-2.7 3-2.7s2.4.9 3 2.7"/></svg>'
    };
    return icons[kind] || icons.shield;
  }

  function renderEconomicLines(selected, state, result) {
    const rows = [];
    const hasExtras = selected.totalAdicionales > 0;
    const isDesreg = state.modalidad === 'desregulado';

    if (!hasExtras && !isDesreg) {
      return '<div class="quote-economic-empty"><strong>Valor directo del plan</strong><span>Sin adicionales ni aportes a descontar.</span></div>';
    }

    rows.push(`<div class="quote-economic-row"><span>Valor base</span><strong>${money(selected.base)}</strong></div>`);
    if (hasExtras) {
      rows.push(`<div class="quote-economic-row"><span>Adicionales por integrantes</span><strong>${money(selected.totalAdicionales)}</strong></div>`);
    }
    if (hasExtras || isDesreg) {
      rows.push(`<div class="quote-economic-row"><span>Subtotal</span><strong>${money(selected.bruto)}</strong></div>`);
    }
    if (isDesreg) {
      rows.push(`<div class="quote-economic-row quote-economic-row-discount"><span>Aporte computable</span><strong>-${money(result.aporteComputable)}</strong></div>`);
    }
    return rows.join('');
  }

  function proposalData(state, result) {
    const rows = [];
    if (state.dni?.trim()) rows.push(['DNI', state.dni.trim()]);
    rows.push(['Composición', result.compositionLabel]);
    rows.push(['Edad tarifaria', `${result.refAge} años`]);
    rows.push(['Tramo', result.bandLabel]);
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

  function planBenefits(plan) {
    const benefitsByPlan = {
      'C-100': [
        ['video', 'Atención desde el ingreso', 'Guardia, atención domiciliaria y videoconsulta sin cargo, sin tope y sin límite.'],
        ['diagnostic', 'Diagnóstico esencial', 'Laboratorio de rutina, electrocardiograma y electroencefalograma sin cargo.'],
        ['shield', 'Farmacia todos los días', '40% en medicamentos bajo receta y 70% en medicación crónica, según normativa.'],
        ['hospital', 'Urgencias y traslados', 'Ambulancia y traslados derivados de urgencias o emergencias sin cargo.'],
        ['network', 'Todo desde la app', 'Cartilla digital, credencial, autorizaciones, facturas y medios de pago en el celular.'],
        ['tooth', 'Bienestar y asistencia', 'Asistencia nacional y en países limítrofes, más beneficios digitales de Nume.']
      ],
      '200': [
        ['video', 'Atención ágil', 'Guardia, atención domiciliaria y videoconsulta sin cargo desde el ingreso.'],
        ['diagnostic', 'Más diagnóstico sin cargo', 'Radiología simple, mamografías, PAP, ECG y estudios de rutina incluidos.'],
        ['tooth', 'Odontología integral', 'Consultas, urgencias, prevención, endodoncia y operatoria según alcance del plan.'],
        ['shield', 'Salud mental y rehabilitación', 'Hasta 15 sesiones anuales de foniatría o psicología y kinesiología incluida.'],
        ['hospital', 'Farmacia y emergencias', '40% en medicamentos, 70% en crónicos y cobertura de ambulancia ante urgencias.'],
        ['network', 'App y asistencia al viajero', 'Gestiones digitales y asistencia nacional y en países limítrofes.']
      ],
      '300': [
        ['shield', 'Consultas sin coseguro', 'Atención en consultorio, domicilio, guardia y videoconsulta sin cargo.'],
        ['diagnostic', 'Alta complejidad incluida', 'Hasta 2 TAC y 2 resonancias por año, por persona y por estudio, sin cargo.'],
        ['tooth', 'Cobertura odontológica', 'Atención preventiva, endodoncia, operatoria, cirugía bucal y periodoncia.'],
        ['network', 'Más acompañamiento', 'Hasta 20 sesiones anuales de foniatría, psicología o psiquiatría por persona.'],
        ['hospital', 'Farmacia y emergencias', '40% en medicamentos, 70% en crónicos y ambulancia ante urgencias.'],
        ['video', 'Salud conectada', 'App Premedic, videoconsulta y asistencia nacional y en países limítrofes.']
      ],
      '400': [
        ['shield', 'Consultas sin coseguro', 'Consultorio, domicilio, guardia y videoconsulta sin cargo, sin tope y sin límite.'],
        ['diagnostic', 'Diagnóstico superior', 'Hasta 3 TAC y 3 resonancias por año, por persona y por estudio, sin cargo.'],
        ['hospital', 'Habitación individual', 'Internación clínica, quirúrgica y maternidad con habitación individual.'],
        ['network', 'Salud mental ampliada', 'Hasta 30 sesiones anuales de foniatría, psicología o psiquiatría por persona.'],
        ['tooth', 'Beneficio odontológico', 'Cobertura odontológica integral y blanqueamiento según condiciones del plan.'],
        ['video', 'Farmacia, app y asistencia', '40% en medicamentos, 70% en crónicos, gestiones digitales y asistencia al viajero.']
      ],
      '500': [
        ['shield', 'Consultas sin coseguro', 'Consultorio, domicilio, guardia y videoconsulta sin cargo, sin tope y sin límite.'],
        ['diagnostic', 'Diagnóstico superior', 'Hasta 3 TAC y 3 resonancias por año, por persona y por estudio, sin cargo.'],
        ['hospital', 'Habitación individual', 'Internación clínica, quirúrgica y maternidad con habitación individual.'],
        ['network', 'Máximo acompañamiento', 'Hasta 35 sesiones anuales de foniatría, psicología o psiquiatría por persona.'],
        ['tooth', 'Extras del Plan 500', 'Blanqueamiento, un par de lentes y ecografía 4D según condiciones de cartilla.'],
        ['video', 'Farmacia, app y asistencia', '40% en medicamentos, 70% en crónicos, gestiones digitales y asistencia al viajero.']
      ]
    };
    return benefitsByPlan[plan] || benefitsByPlan['C-100'];
  }

  function renderBenefitsPage(plan, quoteId) {
    const benefits = planBenefits(plan);

    return `
      <section class="quote-sheet quote-page quote-benefits-page">
        <header class="benefits-header benefits-header-editorial">
          <div class="benefits-header-copy">
            <div class="benefits-brand"><img src="assets/premedic-logo-oficial.png" alt="Premedic" class="quote-brand-logo benefits-brand-logo"></div>
            <span>Lo mejor de tu cobertura</span>
            <h2>Lo destacado del Plan ${esc(plan)}.</h2>
            <p>Una selección simple de los beneficios que más valor suman en el día a día.</p>
          </div>
          <div class="benefits-family" aria-hidden="true"><img src="assets/benefits-family.jpg" alt=""></div>
        </header>

        <div class="benefits-grid benefits-grid-editorial">
          ${benefits.map(([icon, title, copy], index) => `
            <article class="benefit-card benefit-row">
              <div class="benefit-icon">${benefitIcon(icon)}</div>
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
          <strong>Salud cerca, simple y conectada.</strong>
        </div>

        <footer class="quote-footer benefits-footer quote-footer-clean">
          <div class="quote-legal">Resumen comercial. Topes, carencias, prestadores y condiciones se rigen por la cartilla vigente del Plan ${esc(plan)}.</div>
          <div class="quote-footer-side"><span>Herramienta comercial · Grupo Zeroka</span><b>${esc(quoteId)}</b></div>
        </footer>
      </section>
    `;
  }

  function renderQuote({ state, result, selectedPlan, quoteId }) {
    const selected = result.plans.find(p => p.plan === selectedPlan);
    const fecha = formatDate(new Date());
    const zonaLabel = state.zona === 'amba' ? 'AMBA' : 'Interior';
    const modLabel = state.modalidad === 'directo' ? 'Directo' : 'Desregulado';
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
            <div class="quote-plan-line">
              <span>Plan ${esc(selected.plan)}</span>
              <strong>${modLabel}</strong>
              <strong>${zonaLabel}</strong>
            </div>
          </div>
        </header>

        <section class="quote-body quote-body-v3 quote-body-final">
          <section class="quote-client-summary quote-client-summary-final">
            <div class="quote-summary-title">
              <div>
                <span>Datos de la propuesta</span>
                <strong>Información utilizada para calcular el plan</strong>
              </div>
              <b>Plan ${esc(selected.plan)}</b>
            </div>
            <div class="quote-client-data quote-client-data-dynamic">${proposalData(state, result)}</div>
          </section>

          <section class="quote-economy quote-economy-v3 quote-economy-final">
            <div class="quote-economy-left">
              <div class="quote-section-heading quote-section-heading-economic">
                <div><span>Detalle económico</span><strong>${state.modalidad === 'directo' ? 'Valor actual del plan' : 'Cómo se compone el valor'}</strong></div>
              </div>
              <div class="quote-economic-list">${renderEconomicLines(selected, state, result)}</div>
              ${selected.cubiertoPorAporte ? `<div class="quote-covered-note">Los aportes informados cubren el valor actual del plan.</div>` : ''}
            </div>

            <div class="quote-total-card quote-total-card-v3 quote-total-card-final">
              <span>Total a abonar</span>
              <b>Plan ${esc(selected.plan)}</b>
              <strong>${money(selected.neto)}</strong>
              <small>Valor mensual a abonar</small>
              ${state.modalidad === 'desregulado' ? `<em>Aportes aplicados automáticamente</em>` : `<em>Valor directo del plan</em>`}
            </div>
          </section>

          ${advisorStrip(state)}

          <section class="quote-highlights quote-highlights-final" aria-label="Beneficios destacados">
            <article>
              <div class="quote-highlight-icon">${benefitIcon('hospital')}</div>
              <div class="quote-highlight-copy"><strong>+90</strong><span>Clínicas y sanatorios</span></div>
            </article>
            <article>
              <div class="quote-highlight-icon">${benefitIcon('network')}</div>
              <div class="quote-highlight-copy"><strong>+400</strong><span>Centros médicos</span></div>
            </article>
            <article>
              <div class="quote-highlight-icon">${benefitIcon('video')}</div>
              <div class="quote-highlight-copy"><strong>24 hs</strong><span>Médico por videollamada</span></div>
            </article>
          </section>

          <section class="quote-brand-story quote-brand-story-final">
            <div>
              <span>PREMEDIC</span>
              <strong>Cobertura pensada para vos y tu familia.</strong>
              <small>Una red de atención, prestadores y herramientas digitales para acompañarte de forma simple.</small>
            </div>
            <div class="quote-brand-story-art" aria-hidden="true"><span></span><i></i></div>
          </section>

          <section class="quote-conditions quote-conditions-final">
            <div><span>Tarifa aplicada</span><strong>Vigencia ${esc(window.PremedicMotor.data.vigencia)}</strong></div>
            <p>Los valores son informativos y corresponden a la nómina vigente utilizada por este cotizador. La propuesta puede variar por actualizaciones tarifarias, condiciones comerciales, verificación de datos y aprobación de afiliación.</p>
          </section>
        </section>

        <footer class="quote-footer quote-footer-v3 quote-footer-clean">
          <div class="quote-legal">Premedic · Cotización orientativa para uso comercial.</div>
          <div class="quote-footer-side"><span>Herramienta comercial · Grupo Zeroka</span><b>${esc(quoteId)}</b></div>
        </footer>
      </section>
    `;

    return `<article class="quote-document">${pageOne}${renderBenefitsPage(selected.plan, quoteId)}</article>`;
  }

  return { renderQuote, makeId };
})();
