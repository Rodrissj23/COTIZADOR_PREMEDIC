import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const sandbox = { console };
sandbox.window = sandbox;
vm.createContext(sandbox);

for (const file of ['js/precios-premedic.js', 'js/promociones-premedic.js', 'js/motor-premedic.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
}

const { PremedicMotor, PremedicPromos } = sandbox;

function quote({ modalidad='directo', zona='amba', edad=35, aporteRecibo=0, promo='ninguna', categoria='A', fechaCotizacion } = {}) {
  PremedicPromos.state.promoId = promo;
  PremedicPromos.state.categoriaMonotributo = categoria;
  return PremedicMotor.quote({
    nombre: 'QA Premedic',
    dni: '',
    zona,
    modalidad,
    composicion: 'individual',
    aporteRecibo,
    edadTitular: edad,
    edadPareja: null,
    hijos: [],
    fechaCotizacion
  });
}

// FLASH25: AMBA, Directo/Desregulado, planes 300/400/500 y vigencia inclusiva.
{
  for (const modalidad of ['directo', 'desregulado']) {
    for (const planName of ['300', '400', '500']) {
      const result = quote({ modalidad, zona:'amba', promo:'flash25', aporteRecibo: modalidad === 'desregulado' ? 10000 : 0, fechaCotizacion:'2026-09-11' });
      const p = plan(result, planName);
      close(p.descuentoPromocion, p.bruto * 0.25, `FLASH25 ${modalidad} Plan ${planName}`);
      const aporte = modalidad === 'desregulado' ? PremedicMotor.aporteComputable(10000) : 0;
      close(p.neto, Math.max(0, p.bruto * 0.75 - aporte), `Neto FLASH25 ${modalidad} Plan ${planName}`);
    }
  }

  for (const planName of ['C-100', '200']) {
    assert.equal(plan(quote({ promo:'flash25', fechaCotizacion:'2026-09-11' }), planName).descuentoPromocion, 0);
  }
  assert.equal(plan(quote({ zona:'interior', promo:'flash25', fechaCotizacion:'2026-09-11' }), '300').descuentoPromocion, 0);
  assert.ok(PremedicPromos.promosDisponibles('directo', 'amba', '300', '2026-09-11').some(p => p.id === 'flash25'));
  assert.ok(PremedicPromos.promosDisponibles('desregulado', 'amba', '500', '2026-09-11').some(p => p.id === 'flash25'));
  assert.ok(!PremedicPromos.promosDisponibles('directo', 'amba', '300', '2026-09-12').some(p => p.id === 'flash25'));
  assert.ok(!PremedicPromos.promosDisponibles('directo', 'interior', '300', '2026-09-11').some(p => p.id === 'flash25'));
  assert.ok(!PremedicPromos.promosDisponibles('directo', 'amba', '200', '2026-09-11').some(p => p.id === 'flash25'));
  assert.ok(!PremedicPromos.promosDisponibles('monotributo', 'amba', '300', '2026-09-11').some(p => p.id === 'flash25'));
}

function plan(result, name) {
  const found = result.plans.find(p => p.plan === name);
  assert.ok(found, `Plan ${name} debe existir`);
  return found;
}

function close(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) < 0.01, `${label}: esperado ${expected}, obtenido ${actual}`);
}

// 1) Directo AMBA + Promo 40%.
{
  const p = plan(quote({ modalidad:'directo', zona:'amba', promo:'promo40' }), '200');
  assert.equal(p.bruto, 113707);
  close(p.descuentoPromocion, 45482.80, '40% Plan 200');
  close(p.neto, 68224.20, 'Neto 40% Plan 200');
}

// 2) Directo Mendoza + Promo 25% Interior Nuevo.
{
  const p = plan(quote({ modalidad:'directo', zona:'mendoza', promo:'interior25' }), '200');
  assert.equal(p.bruto, 113707);
  close(p.descuentoPromocion, 28426.75, '25% Mendoza Plan 200');
  close(p.neto, 85280.25, 'Neto 25% Mendoza Plan 200');
}

// 3) Directo Monotributo categoría D.
{
  const result = quote({ modalidad:'directo', zona:'amba', promo:'monotributo', categoria:'D' });
  const p = plan(result, '200');
  assert.equal(PremedicPromos.aporteMonotributo('D'), 23520);
  assert.equal(p.descuentoPromocion, 23520);
  assert.equal(p.neto, 90187);
  const c100 = plan(result, 'C-100');
  assert.equal(c100.descuentoPromocion, 0, 'Monotributo no debe aplicarse a C-100');
}

// 4) Desregulado + TC 15% + aporte de recibo de $30.000.
{
  const p = plan(quote({ modalidad:'desregulado', zona:'amba', promo:'tc15', aporteRecibo:30000 }), '200');
  assert.equal(p.bruto, 102903);
  close(p.descuentoPromocion, 15435.45, 'TC 15% Desregulado');
  close(p.aporteComputable, 76500, 'Aporte computable');
  close(p.neto, 10967.55, 'Neto Desregulado TC15 + aporte');
}

// Filtros de zona / segmento y exclusividad.
{
  const directMendoza = PremedicPromos.promosDisponibles('directo', 'mendoza').map(p => p.id);
  assert.ok(directMendoza.includes('monotributo'));
  assert.ok(directMendoza.includes('interior25'));
  assert.ok(!directMendoza.includes('promo40'));

  const desregCordoba = PremedicPromos.promosDisponibles('desregulado', 'cordoba').map(p => p.id);
  assert.ok(desregCordoba.includes('promo40'));
  assert.ok(!desregCordoba.includes('monotributo'));
  assert.ok(!desregCordoba.includes('interior25'));

  PremedicPromos.state.promoId = 'promo40';
  const onePromo = PremedicPromos.getPromo();
  assert.equal(onePromo.id, 'promo40');
}

console.log('Promociones QA OK: campañas existentes + FLASH25, filtros, fechas y monotributo validados.');
