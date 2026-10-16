/* Configuración pública completa, cargada antes del motor. No contiene credenciales. */
(() => {
  const config = window.ZEROKA_PREMEDIC_PUBLICATION;
  if (config === null) return;
  try {
    const assert = (condition) => { if (!condition) throw new Error('Configuración comercial inválida'); };
    const codes = ['C-100', '200', '300', '400', '500'];
    const modes = ['directo', 'desregulado'];
    const zones = ['amba', 'interior', 'cordoba', 'mendoza', 'misiones', 'tucuman'];
    const components = ['individual', 'matrimonio', 'matrimonio1', 'matrimonio2', 'matrimonio3'];
    const positive = n => typeof n === 'number' && Number.isFinite(n) && n > 0;
    const subset = (items, allowed) => Array.isArray(items) && items.length > 0 && new Set(items).size === items.length && items.every(v => allowed.includes(v));
    const isoDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
    const dateParts = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Argentina/Buenos_Aires', year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const parts = Object.fromEntries(dateParts.map(p => [p.type,p.value]));
    const today = `${parts.year}-${parts.month}-${parts.day}`;
    assert(config && config.schema_version === 1 && Number.isInteger(config.publication_version) && config.publication_version > 0);
    assert(/^[a-f0-9]{64}$/.test(config.snapshot_hash) && isoDate(config.effective_date) && config.effective_date <= today);
    assert(subset(config.modes, modes) && subset(config.zones,zones));
    assert(config.data && typeof config.data.vigencia === 'string' && config.data.edadMaxima === 59);
    assert(Array.isArray(config.data.tramos) && config.data.tramos.length === 4 && config.data.tramos.every(t => typeof t === 'string'));
    assert(config.data.tarifas && Object.keys(config.data.tarifas).every(m => modes.includes(m)));
    for (const mode of config.modes) {
      const groups = config.data.tarifas[mode];
      assert(groups && Object.keys(groups).every(z => ['amba','interior'].includes(z)));
      for (const zone of config.zones) {
        const period = config.data.vigencias?.[mode]?.[zone === 'amba' ? 'amba' : 'interior'];
        assert(typeof period === 'string' && period.trim().length > 0);
        const group = groups[zone === 'amba' ? 'amba' : 'interior'];
        assert(group && Object.keys(group).every(p => codes.includes(p)));
        for (const [code, plan] of Object.entries(group)) {
          assert(!(zone !== 'amba' && code === 'C-100'));
          assert(components.every(c => Array.isArray(plan[c]) && plan[c].length === 4 && plan[c].every(positive)));
          assert(positive(plan.adicionalMenor1) && positive(plan.adicionalMenor25));
        }
      }
    }
    assert(Array.isArray(config.promotions));
    const ids = new Set();
    for (const promo of config.promotions) {
      assert(typeof promo.id === 'string' && /^control-\d+$/.test(promo.id) && !ids.has(promo.id));
      ids.add(promo.id);
      assert(typeof promo.label === 'string' && typeof promo.codigo === 'string');
      assert(subset(promo.modalidades,config.modes) && subset(promo.zonas,config.zones) && subset(promo.planes,codes));
      assert(['porcentaje','monto'].includes(promo.tipo) && positive(promo.valor) && (promo.tipo !== 'porcentaje' || promo.valor <= 100));
      assert(!promo.vigenteDesde || isoDate(promo.vigenteDesde));
      assert(!promo.vigenteHasta || isoDate(promo.vigenteHasta));
      assert(!promo.vigenteDesde || !promo.vigenteHasta || promo.vigenteDesde <= promo.vigenteHasta);
      assert([promo.edadDesde,promo.edadHasta].every(v => v === null || (Number.isInteger(v) && v >= 0)));
      assert(promo.edadDesde === null || promo.edadHasta === null || promo.edadDesde <= promo.edadHasta);
    }
    // Validar todo antes de cambiar la lista: nunca mezclar una publicación parcial con precios antiguos.
    const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
    window.PREMEDIC_DATA = freeze(config.data);
    window.PremedicControl = freeze(config);
  } catch (error) {
    window.PremedicControlError = 'No se puede cotizar: la configuración publicada de Control está incompleta o no está vigente. Revisá la publicación.';
  }
})();
