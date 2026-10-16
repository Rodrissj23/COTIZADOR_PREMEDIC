import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const context = { window: {}, console, Intl, Date };
vm.createContext(context);
for (const name of ['precios-premedic', 'promociones-premedic', 'motor-premedic', 'cotizacion', 'pmo-quote']) {
  vm.runInContext(fs.readFileSync(`js/${name}.js`, 'utf8'), context);
}
const { PREMEDIC_DATA: data, PremedicMotor: motor, PremedicQuote: formal, PremedicPromos: promos } = context.window;
const expected = JSON.parse(fs.readFileSync('tests/fixtures/desregulados-amba-2026-11.json', 'utf8'));
assert.deepEqual(JSON.parse(JSON.stringify(data.tarifas.desregulado.amba)), expected.tarifas);
const base = { nombre: 'QA Noviembre', modalidad: 'desregulado', zona: 'amba', composicion: 'individual', edadTitular: 29, aporteRecibo: 0, hijos: [] };
let checks = 0;
for (const [plan, tariff] of Object.entries(expected.tarifas)) {
  for (const [band, age] of [29, 39, 49, 59].entries()) {
    for (const [field, count] of [['individual', -1], ['matrimonio', 0], ['matrimonio1', 1], ['matrimonio2', 2], ['matrimonio3', 3]]) {
      const state = { ...base, edadTitular: age, edadPareja: age, composicion: count < 0 ? 'individual' : count === 0 ? 'pareja' : 'pareja_hijos', hijos: Array(Math.max(count, 0)).fill(8) };
      const result = motor.quote(state);
      assert.equal(result.vigencia, 'Noviembre 2026');
      assert.equal(result.plans.find(p => p.plan === plan).neto, tariff[field][band]);
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
for (const [mode, zone] of [['directo', 'amba'], ['directo', 'interior'], ['desregulado', 'interior'], ['desregulado', 'cordoba']]) {
  const state = { ...base, modalidad: mode, zona: zone };
  const result = motor.quote(state);
  assert.equal(result.vigencia, 'Octubre 2026');
  const html = formal.renderQuote({ state, result, selectedPlan: '200', quoteId: 'QA-OCT' });
  assert(html.includes('tarifario Octubre 2026'));
}
promos.state.promoId = 'tc15';
const discounted = motor.quote({ ...base, edadTitular: 35, aporteRecibo: 30000 }).plans.find(p => p.plan === '200');
assert.equal(discounted.bruto, 107690);
assert.equal(discounted.neto, 21636.5);
console.log(`PASS Noviembre AMBA: 110 importes oficiales, ${checks} cotizaciones, adicionales, vigencias PDF y promociones conservadas.`);
