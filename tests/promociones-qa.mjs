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

// FLASH25: AMBA y Córdoba, Directo y Desregulado hasta el 24/11 a las 12:00 hs de Argentina.
{
  for (const modalidad of ['directo', 'desregulado']) {
    for (const planName of ['300', '400', '500']) {
      const result = quote({ modalidad, zona:'amba', promo:'flash25', aporteRecibo: modalidad === 'desregulado' ? 10000 : 0, fechaCotizacion:'2026-10-21' });
      const p = plan(result, planName);
      close(p.descuentoPromocion, p.bruto * 0.25, `FLASH25 ${modalidad} Plan ${planName}`);
      const aporte = modalidad === 'desregulado' ? PremedicMotor.aporteComputable(10000) : 0;
      close(p.neto, Math.max(0, p.bruto * 0.75 - aporte), `Neto FLASH25 ${modalidad} Plan ${planName}`);
    }
  }

  for (const planName of ['C-100', '200']) {
    assert.equal(plan(quote({ promo:'flash25', fechaCotizacion:'2026-10-21' }), planName).descuentoPromocion, 0);
  }
  assert.equal(plan(quote({ zona:'interior', promo:'flash25', fechaCotizacion:'2026-10-21' }), '300').descuentoPromocion, 0);
  assert.ok(PremedicPromos.promosDisponibles('directo', 'amba', '300', '2026-10-21').some(p => p.id === 'flash25'));
  assert.ok(PremedicPromos.promosDisponibles('desregulado', 'amba', '500', '2026-10-21').some(p => p.id === 'flash25'));
  assert.ok(PremedicPromos.promosDisponibles('directo', 'amba', '300', '2026-10-22').some(p => p.id === 'flash25'));
  assert.ok(!PremedicPromos.promosDisponibles('directo', 'interior', '300', '2026-10-21').some(p => p.id === 'flash25'));
  assert.ok(!PremedicPromos.promosDisponibles('directo', 'amba', '200', '2026-10-21').some(p => p.id === 'flash25'));
  assert.ok(!PremedicPromos.promosDisponibles('monotributo', 'amba', '300', '2026-10-21').some(p => p.id === 'flash25'));
}

let flashCases = 0;
for (const modalidad of ['directo', 'desregulado']) {
  const until = '2026-11-24';
  for (const zona of ['amba', 'cordoba', 'interior', 'mendoza', 'misiones', 'tucuman']) {
    for (const fechaCotizacion of ['2026-10-13', '2026-10-14', '2026-10-22', '2026-10-31', '2026-11-01', '2026-11-06', '2026-11-20', '2026-11-21', '2026-11-24', '2026-11-25']) {
      const result = quote({ modalidad, zona, promo:'flash25', aporteRecibo:10000, fechaCotizacion });
      for (const p of result.plans.filter(p => !p.esPMO)) {
        const applies = ['amba', 'cordoba'].includes(zona) && ['300', '400', '500'].includes(p.plan)
          && fechaCotizacion >= '2026-10-14' && fechaCotizacion <= until;
        close(p.descuentoPromocion, applies ? p.bruto * .25 : 0, `${modalidad}/${zona}/${p.plan}/${fechaCotizacion}`);
        close(p.neto, Math.max(0, p.bruto * (applies ? .75 : 1) - (modalidad === 'desregulado' ? 23300 : 0)), 'Neto FLASH25');
        flashCases++;
      }
      const available = PremedicPromos.promosDisponibles(modalidad, zona, '300', fechaCotizacion).find(p => p.id === 'flash25');
      assert.equal(Boolean(available), ['amba', 'cordoba'].includes(zona) && fechaCotizacion >= '2026-10-14' && fechaCotizacion <= until);
      if (available) assert.ok(available.label.includes(until.split('-').reverse().join('/')), 'La opción debe mostrar el vencimiento de su modalidad');
    }
  }
}
// El corte es exactamente a las 12:00 de Argentina (15:00 UTC), en ambas modalidades.
for (const modalidad of ['directo', 'desregulado']) {
  for (const zona of ['amba', 'cordoba']) {
    for (const [instante, aplica] of [
      ['2026-11-24T11:59:59.999-03:00', true],
      ['2026-11-24T12:00:00-03:00', false],
      ['2026-11-24T12:00:00.001-03:00', false],
      ['2026-11-24T14:59:59.999Z', true],
      ['2026-11-24T15:00:00Z', false]
    ]) {
      for (const fecha of [instante, new Date(instante)]) {
        const disponible = PremedicPromos.promosDisponibles(modalidad, zona, '300', fecha).find(p => p.id === 'flash25');
        assert.equal(Boolean(disponible), aplica, `${modalidad}/${zona}/${instante}`);
        if (disponible) assert.ok(disponible.label.includes('12:00 hs (Argentina)'));
        for (const p of quote({modalidad, zona, promo:'flash25', fechaCotizacion:fecha}).plans.filter(p => !p.esPMO)) {
          close(p.descuentoPromocion, aplica && ['300','400','500'].includes(p.plan) ? p.bruto * .25 : 0, `Corte horario ${p.plan}`);
        }
      }
    }
  }
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
  assert.equal(p.bruto, 121735);
  close(p.descuentoPromocion, 48694.00, '40% Plan 200');
  close(p.neto, 73041.00, 'Neto 40% Plan 200');
}

// 2) Directo Mendoza + Promo 25% Interior Nuevo.
{
  const p = plan(quote({ modalidad:'directo', zona:'mendoza', promo:'interior25' }), '200');
  assert.equal(p.bruto, 121735);
  close(p.descuentoPromocion, 30433.75, '25% Mendoza Plan 200');
  close(p.neto, 91301.25, 'Neto 25% Mendoza Plan 200');
}

// 3) Directo Monotributo categoría D.
{
  const result = quote({ modalidad:'directo', zona:'amba', promo:'monotributo', categoria:'D' });
  const p = plan(result, '200');
  assert.equal(PremedicPromos.aporteMonotributo('D'), 27482);
  assert.equal(p.descuentoPromocion, 27482);
  assert.equal(p.neto, 94253);
  const c100 = plan(result, 'C-100');
  assert.equal(c100.descuentoPromocion, 0, 'Monotributo no debe aplicarse a C-100');
}

// Cuadro 2 de Condiciones Monotributo Nov 26: columna recibida/descontada.
// Verificar el total de todos los planes y que no se extienda el beneficio
// a Desregulado, C-100 y está disponible en AMBA e Interior.
const aportesNoviembre = { A:23125, B:23125, C:23125, D:27482, E:33515,
  F:38542, G:41588, H:49937, I:61667, J:69208, K:79094 };
let monotributoCases = 0;
for (const [categoria, aporte] of Object.entries(aportesNoviembre)) {
  assert.equal(PremedicPromos.aporteMonotributo(categoria), aporte);
  for (const modalidad of ['directo', 'desregulado']) {
    for (const zona of ['amba', 'cordoba', 'mendoza', 'misiones', 'tucuman', 'interior']) {
      for (const edad of [29, 35, 45, 55]) {
        const result = quote({ modalidad, zona, edad, promo:'monotributo', categoria });
        assert.ok(result.ok);
        for (const p of result.plans) {
          const aplica = modalidad === 'directo' && p.plan !== 'C-100';
          const descuento = aplica ? aporte : 0;
          assert.equal(p.descuentoPromocion, descuento, `${categoria}/${modalidad}/${zona}/${p.plan}`);
          assert.equal(p.aporteMonotributo, descuento);
          assert.equal(p.neto, Math.max(0, p.bruto - descuento));
          monotributoCases++;
        }
      }
    }
  }
}

// 4) Desregulado + TC 15% + aporte del recibo de $30.000.
{
  const p = plan(quote({ modalidad:'desregulado', zona:'amba', promo:'tc15', aporteRecibo:30000 }), '200');
  assert.equal(p.bruto, 110167);
  close(p.descuentoPromocion, 16525.05, 'TC 15% Desregulado');
  close(p.aporteComputable, 69900, 'Aporte computable');
  close(p.neto, 23741.950, 'Neto Desregulado TC15 + aporte');
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

// Cuadro actualizado de diciembre: cierre de admisión y códigos regionales.
for (const modalidad of ['directo', 'desregulado']) {
  for (const [zona, codigo] of [['mendoza','MZA25'],['misiones','MIS25'],['tucuman','TUC25']]) {
    const p = plan(quote({modalidad,zona,promo:'interior25',fechaCotizacion:'2027-01-31'}),'200');
    assert.equal(p.promocion.codigo,codigo);
    assert.equal(p.descuentoPromocion,p.bruto*.25);
    assert.equal(plan(quote({modalidad,zona,promo:'interior25',fechaCotizacion:'2027-02-01'}),'200').descuentoPromocion,0);
  }
  for (const promo of ['tc15','cbu15','efectivo10','promo40']) {
    assert.ok(plan(quote({modalidad,promo,fechaCotizacion:'2027-01-31'}),'300').descuentoPromocion>0);
    assert.equal(plan(quote({modalidad,promo,fechaCotizacion:'2027-02-01'}),'300').descuentoPromocion,0);
    assert.equal(plan(quote({modalidad,promo,fechaCotizacion:new Date('2027-02-01T02:59:59Z')}),'300').descuentoPromocion>0,true);
    assert.equal(plan(quote({modalidad,promo,fechaCotizacion:new Date('2027-02-01T03:00:00Z')}),'300').descuentoPromocion,0);
  }
}
assert.equal(PremedicPromos.getPromo('promo40').duracionMeses,3);
assert.ok(PremedicPromos.getPromo('promo40').descripcion.includes('tarjeta de crédito'));
assert.equal(PremedicPromos.getPromo('interior25').permanente,true);
assert.ok(PremedicPromos.promosDisponibles('directo','interior').some(p=>p.id==='monotributo'));

console.log(`Promociones QA OK: ${flashCases} escenarios FLASH25 y ${monotributoCases} casos de monotributo noviembre 2026; promociones al 31/01/2027 y códigos MZA25/MIS25/TUC25 verificados.`);

