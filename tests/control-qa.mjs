import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const fixture=JSON.parse(fs.readFileSync('tests/control-publication.fixture.json','utf8'));
function load(config, adapter=true) {
  const ctx={window:{},console};vm.createContext(ctx);
  const run=file=>vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
  run('js/precios-premedic.js');
  ctx.window.ZEROKA_PREMEDIC_PUBLICATION=config;
  if(adapter) run('js/control-premedic.js');
  run('js/motor-premedic.js');run('js/promociones-premedic.js');
  return ctx.window;
}
const state={nombre:'QA',edadTitular:35,edadPareja:40,composicion:'individual',hijos:[],modalidad:'directo',zona:'amba',aporteRecibo:5000,fechaCotizacion:'2026-10-16'};
const legacy=load(null,false), bridged=load(fixture);
assert(!bridged.PremedicControlError);
assert.equal(bridged.PremedicMotor.vigenciaPara({...state,modalidad:'desregulado'}),'Noviembre 2026');
assert.equal(bridged.PremedicMotor.vigenciaPara({...state,modalidad:'directo'}),'Octubre 2026');
let cases=0;
for (const modalidad of ['directo','desregulado']) for(const zona of ['amba','interior','cordoba','mendoza','misiones','tucuman']) for(const edadTitular of [1,29,30,39,40,49,50,59]) for(const [composicion,hijos] of [['individual',[]],['pareja',[]],['titular_hijos',[0,10,24]],['pareja_hijos',[0]],['pareja_hijos',[0,5]],['pareja_hijos',[0,5,10]],['pareja_hijos',[0,5,10,24]]]) {
  const input={...state,modalidad,zona,edadTitular,composicion,hijos};
  assert.equal(JSON.stringify(legacy.PremedicMotor.quote(input).plans),JSON.stringify(bridged.PremedicMotor.quote(input).plans));cases++;
}
const changed=structuredClone(fixture);
changed.data.tarifas.directo.amba['300'].individual[1]+=10000;
for(const zone of Object.values(changed.data.tarifas.desregulado)) delete zone['500'];
changed.promotions=[{...changed.promotions.find(p=>p.codigo==='FLASH25'),valor:30,edadDesde:30,edadHasta:39}];
const next=load(changed);
next.PremedicPromos.state.promoId=changed.promotions[0].id;
const plan=next.PremedicMotor.quote(state).plans.find(p=>p.plan==='300');
assert.equal(plan.bruto,fixture.data.tarifas.directo.amba['300'].individual[1]+10000);
assert.equal(plan.descuentoPromocion,plan.bruto*.3);
assert(!next.PremedicMotor.quote({...state,modalidad:'desregulado'}).plans.some(p=>p.plan==='500'));
assert.equal(next.PremedicMotor.quote({...state,edadTitular:40}).plans.find(p=>p.plan==='300').descuentoPromocion,0);
assert.equal(next.PremedicMotor.quote({...state,fechaCotizacion:'2026-10-22'}).plans.find(p=>p.plan==='300').descuentoPromocion,0);
assert.equal(next.PremedicPromos.PROMOS.filter(p=>p.tipo==='porcentaje').length,1);
assert(!next.PremedicMotor.quote({...state,zona:'unknown'}).ok);
const fixed=structuredClone(changed);fixed.promotions[0].tipo='monto';fixed.promotions[0].valor=9999999;
const fixedWindow=load(fixed);fixedWindow.PremedicPromos.state.promoId=fixed.promotions[0].id;
assert.equal(fixedWindow.PremedicMotor.quote(state).plans.find(p=>p.plan==='300').neto,0);
for(const mutate of [c=>delete c.data.tarifas.directo.amba['300'].individual,c=>c.data.tarifas.directo.amba['300'].individual[0]=0,c=>c.promotions[0].valor=101,c=>c.schema_version=9,c=>c.effective_date='2099-01-01']) {
  const bad=structuredClone(fixture);mutate(bad);const window=load(bad);
  assert(window.PremedicControlError);assert.equal(window.PremedicMotor.quote(state).ok,false);
}
assert(load(undefined).PremedicControlError,'Falla de carga debe bloquear cotización');
assert.equal(JSON.stringify(load(null).PremedicMotor.quote(state)),JSON.stringify(legacy.PremedicMotor.quote(state)));
console.log(`Control QA OK: ${cases} casos de paridad, precios, planes, montos, edades, fechas y configuración inválida.`);
