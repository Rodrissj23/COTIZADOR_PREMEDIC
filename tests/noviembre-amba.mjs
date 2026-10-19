import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const context = { window: {}, console, Intl, Date };
vm.createContext(context);
for (const name of ['precios-premedic', 'promociones-premedic', 'motor-premedic', 'cotizacion', 'pmo-quote']) {
  vm.runInContext(fs.readFileSync(`js/${name}.js`, 'utf8'), context);
}
const { PREMEDIC_DATA: data, PremedicMotor: motor, PremedicQuote: formal, PremedicPromos: promos } = context.window;
let checks = 0, prices = 0;
for (const modalidad of ['directo','desregulado']) for (const zona of ['amba','interior']) {
  const expected = JSON.parse(fs.readFileSync(`tests/fixtures/${modalidad === 'directo' ? 'directos' : 'desregulados'}-${zona}-2026-11.json`, 'utf8'));
  assert.deepEqual(JSON.parse(JSON.stringify(data.tarifas[modalidad][zona])), expected.tarifas);
  const base = { nombre: 'QA Noviembre', modalidad, zona, composicion: 'individual', edadTitular: 29, aporteRecibo: 0, hijos: [] };
  for (const [plan, tariff] of Object.entries(expected.tarifas)) {
    prices += 22;
    for (const [band, age] of [29, 39, 49, 59].entries()) {
      for (const [field, count] of [['individual', -1], ['matrimonio', 0], ['matrimonio1', 1], ['matrimonio2', 2], ['matrimonio3', 3]]) {
        const state = { ...base, edadTitular: age, edadPareja: age, composicion: count < 0 ? 'individual' : count === 0 ? 'pareja' : 'pareja_hijos', hijos: Array(Math.max(count, 0)).fill(8) };
        const result = motor.quote(state);
        assert.equal(result.vigencia, 'Noviembre 2026');
        assert.equal(result.plans.find(p => p.plan === plan).neto, tariff[field][band], `${modalidad}/${zona}/${plan}/${field}/${band}`);
        checks++;
      }
    }
    const result = motor.quote({ ...base, composicion: 'titular_hijos', hijos: [0, 24] });
    assert.equal(result.plans.find(p => p.plan === plan).neto, tariff.individual[0] + tariff.adicionalMenor1 + tariff.adicionalMenor25);
    const html = formal.renderQuote({ state: base, result, selectedPlan: plan, quoteId: 'QA-NOV' });
    assert(html.includes('tarifario Noviembre 2026'));
    assert(html.includes('Vigencia Noviembre 2026'));
    assert(!html.includes('Octubre 2026'));
  }
}
for (const zona of ['cordoba','mendoza','misiones','tucuman']) {
  const state = { nombre: 'QA Interior', modalidad:'desregulado', zona, composicion:'individual', edadTitular:35, aporteRecibo:0, hijos:[] };
  assert.equal(motor.quote(state).vigencia,'Noviembre 2026');
  assert.equal(motor.quote(state).plans.find(p=>p.plan==='200').neto,107480);
}
promos.state.promoId = 'tc15';
const discounted = motor.quote({nombre:'QA Promo', modalidad:'desregulado',zona:'amba',composicion:'individual',edadTitular:35,aporteRecibo:30000,hijos:[]}).plans.find(p=>p.plan==='200');
assert.equal(discounted.bruto,107480);
assert.equal(discounted.neto,21458);
assert.equal(prices,396);
assert.equal(checks,360);
console.log(`PASS Noviembre: ${prices} importes oficiales, ${checks} cotizaciones, cuatro tablas, adicionales, vigencias PDF y promociones conservadas.`);
