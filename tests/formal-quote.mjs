import fs from 'node:fs';
import vm from 'node:vm';

const context={window:{},console,Intl,Date,Math,Number,String,Object,Array,Boolean,JSON,Set,Map};
vm.createContext(context);
for(const file of ['js/precios-premedic.js','js/promociones-premedic.js','js/motor-premedic.js','js/cotizacion.js','js/pmo-quote.js']) {
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}

const {PremedicMotor:motor,PremedicQuote:formal,PremedicPromos:promos}=context.window;
let pass=0;const failures=[];
const assert=(value,message)=>{if(!value)throw new Error(message)};
const test=(name,fn)=>{try{fn();pass++;console.log(`PASS  ${name}`)}catch(error){failures.push(`${name}: ${error.message}`);console.error(`FAIL  ${name}\n      ${error.message}`)}};
const base={nombre:'Cliente QA',dni:'30111222',zona:'amba',modalidad:'directo',composicion:'individual',aporteRecibo:'',edadTitular:35,edadPareja:null,hijos:[],asesorNombre:'Asesor QA',asesorTelefono:'1100000000',asesorMail:'qa@example.com'};

for(const plan of ['C-100','200','300','400','500']) test(`Cotización comercial Plan ${plan} completa`,()=>{
  promos.state.promoId='ninguna';
  const result=motor.quote(base);assert(result.ok,result.error);assert(result.plans.some(item=>item.plan===plan),`plan ${plan} no disponible`);
  const html=formal.renderQuote({state:base,result,selectedPlan:plan,quoteId:`PM-${plan}`});
  assert((html.match(/class="quote-sheet quote-page/g)||[]).length===2,'no genera portada + resumen');
  assert(html.includes('premedic-pdf-cover'),'falta portada');
  assert(html.includes('premedic-pdf-summary'),'falta resumen');
  for(const label of ['Grupo familiar','Zona','Valor detalle','Filiar a cargo','Aportes a descontar','Descuento promocional','Descuento multiproducto','IVA','TOTAL']) {
    assert(html.includes(label),`falta campo ${label}`);
  }
  assert(html.includes('72 hs hábiles'),'no muestra vigencia');
  assert(!html.includes('quote-closing-page'),'agrega cierre');
  assert(!html.includes('quote-coverage-page'),'agrega cobertura recreada');
  assert(!html.includes('undefined'),'contiene undefined');
  assert(!html.includes('NaN'),'contiene NaN');
});

test('Grupo familiar muestra composición y familiar adicional reales',()=>{
  promos.state.promoId='ninguna';
  const state={...base,composicion:'titular_hijos',hijos:[8,4]};
  const result=motor.quote(state);const selected=result.plans.find(plan=>plan.plan==='300');
  const html=formal.renderQuote({state,result,selectedPlan:'300',quoteId:'PM-FAM'});
  assert(html.includes('Titular 35 + 2 hijos'),'no muestra composición real');
  assert(html.includes(motor.money(selected.totalAdicionales)),'no muestra familiar a cargo real');
  assert(html.includes(motor.money(selected.neto)),'no muestra total real');
});

test('Resumen refleja descuento porcentual y aportes sin recalcularlos',()=>{
  promos.state.promoId='tc15';
  const state={...base,modalidad:'desregulado',aporteRecibo:30000};
  const result=motor.quote(state);const selected=result.plans.find(plan=>plan.plan==='200');
  const html=formal.renderQuote({state,result,selectedPlan:'200',quoteId:'PM-DESREG'});
  assert(html.includes(`15% - ${motor.money(selected.descuentoPromocion)}`),'descuento promocional incorrecto');
  assert(html.includes(`- ${motor.money(selected.aporteComputable)}`),'aporte incorrecto');
  assert(html.includes(motor.money(selected.neto)),'total incorrecto');
});

test('Monotributo conserva categoría e importe reales',()=>{
  promos.state.promoId='monotributo';promos.state.categoriaMonotributo='D';
  const result=motor.quote(base);const selected=result.plans.find(plan=>plan.plan==='400');
  const html=formal.renderQuote({state:base,result,selectedPlan:'400',quoteId:'PM-MONO'});
  assert(html.includes(`Monotributo Cat. D - ${motor.money(selected.descuentoPromocion)}`),'monotributo incorrecto');
  assert(html.includes(motor.money(selected.neto)),'total monotributo incorrecto');
});

test('PMO usa portada y resumen comunes con total $0',()=>{
  promos.state.promoId='ninguna';
  const state={...base,modalidad:'desregulado',aporteRecibo:30000};
  const result=motor.quote(state);assert(result.pmoDisponible,'PMO no habilitado');
  const html=formal.renderQuote({state,result,selectedPlan:'PMO',quoteId:'PM-PMO'});
  assert((html.match(/class="quote-sheet quote-page/g)||[]).length===2,'PMO no genera dos páginas');
  assert(html.includes('>PMO</strong>'),'no identifica PMO');
  assert(html.includes('>$ 0</strong>'),'no muestra $0');
  assert(!html.includes('Diagnóstico esencial'),'heredó C-100');
});

console.log(`\nResultado cotización formal: ${pass} PASS, ${failures.length} FAIL`);
if(failures.length){failures.forEach(failure=>console.error(`- ${failure}`));process.exit(1)}
