import fs from 'node:fs';
import vm from 'node:vm';

let passCount = 0;
const failures = [];
const pass = name => { passCount++; console.log(`PASS  ${name}`); };
const fail = (name, error) => { failures.push(`${name}: ${error.message}`); console.error(`FAIL  ${name}\n      ${error.message}`); };
const assert = (value, message) => { if (!value) throw new Error(message); };
const eq = (actual, expected, message='') => assert(Object.is(actual, expected), `${message} esperado=${expected} actual=${actual}`.trim());
const near = (actual, expected, tolerance=0.01, message='') => assert(Math.abs(actual-expected) <= tolerance, `${message} esperado≈${expected} actual=${actual}`.trim());
async function test(name, fn) { try { await fn(); pass(name); } catch (error) { fail(name, error); } }

const jsFiles = ['js/precios-premedic.js','js/motor-premedic.js','js/cotizacion.js','js/pmo-quote.js','js/app.js','js/portal.js'];
for (const file of jsFiles) {
  await test(`Sintaxis JavaScript ${file}`, async () => {
    new Function(fs.readFileSync(file, 'utf8'));
  });
}

const context = { window: {}, console, Intl, Date, Math, Number, String, Object, Array, Boolean, JSON, Set, Map };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/precios-premedic.js','utf8'), context, { filename:'precios-premedic.js' });
vm.runInContext(fs.readFileSync('js/motor-premedic.js','utf8'), context, { filename:'motor-premedic.js' });
vm.runInContext(fs.readFileSync('js/cotizacion.js','utf8'), context, { filename:'cotizacion.js' });
vm.runInContext(fs.readFileSync('js/pmo-quote.js','utf8'), context, { filename:'pmo-quote.js' });
const { PREMEDIC_DATA:data, PremedicMotor:motor, PremedicQuote:formal } = context.window;

const state = overrides => ({
  nombre:'Cliente Prueba', dni:'', zona:'amba', modalidad:'directo', composicion:'individual',
  aporteRecibo:'', edadTitular:29, edadPareja:null, hijos:[], asesorNombre:'', asesorTelefono:'', asesorMail:'',
  ...overrides
});

await test('Vigencia Septiembre 2026 y cuatro tramos oficiales configurados', async()=>{
  eq(data.vigencia,'Septiembre 2026');
  eq(data.edadMaxima,59);
  eq(data.tramos.length,4);
  eq(data.tramos[0],'1 a 29 años');
  eq(data.tramos[3],'50 a 59 años');
});

await test('Hay cinco planes tarifados y C-100 solo AMBA', async()=>{
  const directAmba=Object.keys(data.tarifas.directo.amba);
  assert(JSON.stringify(directAmba.sort())===JSON.stringify(['200','300','400','500','C-100'].sort()),`planes ${directAmba}`);
  assert(!('C-100' in data.tarifas.directo.interior),'C-100 aparece en Directo Interior');
  assert(!('C-100' in data.tarifas.desregulado.interior),'C-100 aparece en Desregulado Interior');
});

await test('Planes 200-500 mantienen misma tabla AMBA/Interior por modalidad', async()=>{
  for (const mode of ['directo','desregulado']) for (const plan of ['200','300','400','500']) {
    assert(JSON.stringify(data.tarifas[mode].amba[plan])===JSON.stringify(data.tarifas[mode].interior[plan]),`${mode} ${plan} difiere`);
  }
});

await test('Tramos cambian exactamente en 30, 40 y 50', async()=>{
  for (const [age,band] of [[29,0],[30,1],[39,1],[40,2],[49,2],[50,3],[59,3]]) {
    const r=motor.quote(state({edadTitular:age}));
    assert(r.ok,`edad ${age} rechazada`); eq(r.band,band,`edad ${age}`);
  }
});

await test('Edad 60 queda fuera del rango comercial', async()=>{
  const r=motor.quote(state({edadTitular:60}));
  assert(!r.ok,'edad 60 fue aceptada');
});

await test('Pareja usa la edad del mayor', async()=>{
  const r=motor.quote(state({composicion:'pareja',edadTitular:29,edadPareja:45}));
  assert(r.ok,r.error); eq(r.refAge,45); eq(r.band,2);
  eq(r.plans.find(p=>p.plan==='200').base,239113,'matrimonio Plan 200 banda 40-49');
});

await test('Titular + hijos suma adicionales por edad', async()=>{
  const r=motor.quote(state({composicion:'titular_hijos',hijos:[0,8]}));
  assert(r.ok,r.error);
  const p=r.plans.find(x=>x.plan==='200');
  eq(p.base,90579); eq(p.totalAdicionales,188066+60565); eq(p.bruto,90579+188066+60565);
});

await test('Pareja + 1/2/3 hijos usa tarifa familiar específica', async()=>{
  const expected={1:225694,2:267325,3:301750};
  for (const count of [1,2,3]) {
    const r=motor.quote(state({composicion:'pareja_hijos',edadPareja:29,hijos:Array(count).fill(8)}));
    assert(r.ok,r.error); eq(r.plans.find(x=>x.plan==='200').base,expected[count],`${count} hijos`);
  }
});

await test('Desde el cuarto hijo se agrega adicional', async()=>{
  const r=motor.quote(state({composicion:'pareja_hijos',edadPareja:29,hijos:[8,7,6,5,0]}));
  assert(r.ok,r.error);
  const p=r.plans.find(x=>x.plan==='200');
  eq(p.base,301750); eq(p.totalAdicionales,60565+188066); eq(p.extras.length,2);
});

await test('Hijo de 24 años entra y de 25 queda fuera', async()=>{
  assert(motor.quote(state({composicion:'titular_hijos',hijos:[24]})).ok,'24 rechazado');
  assert(!motor.quote(state({composicion:'titular_hijos',hijos:[25]})).ok,'25 aceptado');
});

await test('Aporte computable usa (aporte ÷ 3) × 7,65 sin tope', async()=>{
  near(motor.aporteComputable(30000),76500,0.001);
  near(motor.aporteComputable(1000000),2550000,0.001);
});

await test('Desregulado descuenta aporte y nunca queda negativo', async()=>{
  const r=motor.quote(state({modalidad:'desregulado',aporteRecibo:1000000}));
  assert(r.ok,r.error);
  assert(r.plans.filter(p=>!p.esPMO).every(p=>p.neto===0),'hay plan negativo/no cero');
});

await test('Directo no usa aporte monetario', async()=>{
  const a=motor.quote(state({modalidad:'directo',aporteRecibo:999999}));
  const b=motor.quote(state({modalidad:'directo',aporteRecibo:0}));
  eq(a.aporteComputable,0); eq(a.plans.find(p=>p.plan==='200').neto,b.plans.find(p=>p.plan==='200').neto);
});

await test('PMO solo aparece en Desregulado con aporte por persona >= $15.000', async()=>{
  const below=motor.quote(state({modalidad:'desregulado',aporteRecibo:5882.35}));
  assert(below.ok,below.error); assert(!below.plans.some(p=>p.esPMO),'PMO apareció por debajo');
  const atOrAbove=motor.quote(state({modalidad:'desregulado',aporteRecibo:5882.36}));
  assert(atOrAbove.ok,atOrAbove.error); const pmo=atOrAbove.plans.find(p=>p.esPMO); assert(pmo,'PMO no apareció'); eq(pmo.neto,0); eq(pmo.plan,'PMO');
  assert(!motor.quote(state({modalidad:'directo',aporteRecibo:999999})).plans.some(p=>p.esPMO),'PMO apareció en Directo');
});

await test('Umbral PMO considera todos los integrantes', async()=>{
  const twoBelow=motor.quote(state({modalidad:'desregulado',composicion:'pareja',edadPareja:29,aporteRecibo:11764.70}));
  assert(!twoBelow.pmoDisponible,'PMO habilitado debajo del umbral familiar');
  const twoOk=motor.quote(state({modalidad:'desregulado',composicion:'pareja',edadPareja:29,aporteRecibo:11764.71}));
  assert(twoOk.pmoDisponible,'PMO no habilitado al superar umbral familiar'); eq(twoOk.cantidadPersonas,2);
});

await test('Documento comercial tiene portada y resumen, sin cierre ni cobertura recreada', async()=>{
  const s=state({modalidad:'desregulado',aporteRecibo:30000,dni:'30111222'});
  const r=motor.quote(s); const html=formal.renderQuote({state:s,result:r,selectedPlan:'300',quoteId:'PM-QA'});
  eq((html.match(/class="quote-sheet quote-page/g)||[]).length,2);
  assert(html.includes('72 hs hábiles'),'no contiene vigencia');
  assert(html.includes('premedic-pdf-cover'),'falta portada Premedic');
  assert(html.includes('premedic-pdf-summary'),'falta resumen comercial');
  assert(!html.includes('quote-closing-page'),'incluye hoja de cierre');
  assert(!html.includes('quote-coverage-page'),'incluye cobertura recreada');
  const s2=state({dni:''}); const r2=motor.quote(s2); const html2=formal.renderQuote({state:s2,result:r2,selectedPlan:'200',quoteId:'PM-QA2'});
  assert(!html2.includes('No informado'),'imprime DNI faltante');
});

await test('PMO usa el mismo resumen oficial y no hereda contenido específico de C-100', async()=>{
  const s=state({modalidad:'desregulado',aporteRecibo:30000});
  const r=motor.quote(s); assert(r.plans.some(p=>p.esPMO),'PMO no disponible para prueba');
  const html=formal.renderQuote({state:s,result:r,selectedPlan:'PMO',quoteId:'PM-PMO'});
  eq((html.match(/class="quote-sheet quote-page/g)||[]).length,2);
  assert(html.includes('>PMO</strong>'),'no identifica PMO');
  assert(html.includes('>$ 0</strong>'),'no muestra total PMO $0');
  assert(!html.includes('Laboratorio de rutina, ECG y EEG'),'PMO heredó cobertura C-100');
  assert(!html.includes('Diagnóstico esencial'),'PMO heredó beneficios C-100');
});

await test('Index carga el override PMO antes de la aplicación', async()=>{
  const index=fs.readFileSync('index.html','utf8');
  const pmo=index.indexOf('js/pmo-quote.js');
  const app=index.indexOf('js/app.js');
  assert(pmo>0 && app>pmo,'pmo-quote.js no carga antes de app.js');
});

await test('Portal no usa MutationObserver global ni parches destructivos', async()=>{
  const portal=fs.readFileSync('js/portal.js','utf8');
  assert(!portal.includes('MutationObserver'),'sigue existiendo MutationObserver');
  assert(!portal.includes('.quote-economic-row-discount'),'portal sigue borrando desglose económico');
});

await test('App descarga PDF directo y no usa window.print', async()=>{
  const app=fs.readFileSync('js/app.js','utf8');
  assert(app.includes('html2canvas'),'no integra captura PDF');
  assert(app.includes('jspdf'),'no integra jsPDF');
  assert(app.includes('savePdfBytes(finalBytes, `Cotizacion Premedic ('),'nombre de descarga no configurado');
  assert(app.includes('outputDoc.embedPage(sourcePage)'),'los alcances no se integran como páginas PDF');
  assert(app.includes('scale = Math.min('),'el ajuste no preserva proporción');
  assert(!app.includes('window.print()'),'todavía usa diálogo de impresión');
});

await test('Middleware protege JS y restringe functions públicas', async()=>{
  const cf=fs.readFileSync('functions/_middleware.js','utf8');
  const netlify=fs.readFileSync('netlify/edge-functions/auth.js','utf8');
  assert(!cf.includes("pathname.startsWith('/js/')"),'Cloudflare deja JS público');
  assert(!netlify.includes("path.startsWith('/js/')"),'Netlify deja JS público');
  assert(!netlify.includes("path.startsWith('/.netlify/functions/')"),'Netlify deja cualquier function pública');
});

await test('Autenticación mantiene sesión de 8h y cookie segura', async()=>{
  const auth=fs.readFileSync('netlify/functions/_auth.mjs','utf8');
  assert(auth.includes('8*60*60'),'TTL no es 8h');
  for(const flag of ['HttpOnly','Secure','SameSite=Strict']) assert(auth.includes(flag),`falta ${flag}`);
});

console.log(`\nResultado: ${passCount} PASS, ${failures.length} FAIL`);
if (failures.length) {
  console.error('\nFallos:'); failures.forEach(f=>console.error(`- ${f}`)); process.exit(1);
}
