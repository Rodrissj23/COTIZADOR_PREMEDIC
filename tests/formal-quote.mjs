import fs from 'node:fs';
import vm from 'node:vm';
const context={window:{},console,Intl,Date,Math,Number,String,Object,Array,Boolean,JSON,Set,Map};
vm.createContext(context);
for(const file of ['js/precios-premedic.js','js/motor-premedic.js','js/cotizacion.js','js/pmo-quote.js']) vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const {PremedicMotor:motor,PremedicQuote:formal}=context.window;
let pass=0;const failures=[];
const assert=(v,m)=>{if(!v)throw new Error(m)};
const test=(name,fn)=>{try{fn();pass++;console.log(`PASS  ${name}`)}catch(e){failures.push(`${name}: ${e.message}`);console.error(`FAIL  ${name}\n      ${e.message}`)}};
const base={nombre:'Cliente QA',dni:'30111222',zona:'amba',modalidad:'directo',composicion:'individual',aporteRecibo:'',edadTitular:35,edadPareja:null,hijos:[],asesorNombre:'Asesor QA',asesorTelefono:'1100000000',asesorMail:'qa@example.com'};

for(const plan of ['C-100','200','300','400','500']) test(`Cotización formal Plan ${plan} completa`,()=>{
  const result=motor.quote(base);assert(result.ok,result.error);assert(result.plans.some(p=>p.plan===plan),`plan ${plan} no disponible`);
  const html=formal.renderQuote({state:base,result,selectedPlan:plan,quoteId:`PM-${plan}`});
  assert((html.match(/class="quote-sheet quote-page/g)||[]).length===4,'no genera 4 páginas');
  assert(html.includes(`Plan ${plan}`),'no identifica el plan');
  assert(html.includes('72 hs hábiles'),'no muestra vigencia');
  assert(html.includes('30111222'),'no muestra DNI');
  assert(!html.includes('undefined'),'contiene undefined');
  assert(!html.includes('NaN'),'contiene NaN');
});

test('Cotización formal PMO completa y prudente',()=>{
  const state={...base,modalidad:'desregulado',aporteRecibo:30000};
  const result=motor.quote(state);assert(result.pmoDisponible,'PMO no habilitado');
  const html=formal.renderQuote({state,result,selectedPlan:'PMO',quoteId:'PM-PMO'});
  assert((html.match(/class="quote-sheet quote-page/g)||[]).length===4,'PMO no genera 4 páginas');
  assert(html.includes('Plan PMO'),'no identifica PMO');
  assert(html.includes('$ 0'),'no muestra $0');
  assert(html.includes('documentación oficial vigente'),'no contiene aclaración documental');
  assert(html.includes('Condición de acceso'),'tabla PMO no contiene concepto de acceso');
  assert(html.includes('Aporte computable por persona igual o superior a $ 15.000.'),'tabla PMO perdió condición principal');
  assert(html.includes('Aporte del titular'),'página informativa PMO perdió regla de aporte único');
  assert(html.includes('Sin tope adicional'),'página informativa PMO perdió regla sin tope');
  assert((html.match(/class="benefit-card benefit-row"/g)||[]).length===6,'PMO no tiene seis bloques informativos');
  assert(!html.includes('Diagnóstico esencial'),'heredó C-100');
  assert(!html.includes('undefined'),'contiene undefined');
});

test('Datos opcionales de asesor no dejan huecos textuales',()=>{
  const state={...base,dni:'',asesorNombre:'',asesorTelefono:'',asesorMail:''};
  const result=motor.quote(state);const html=formal.renderQuote({state,result,selectedPlan:'200',quoteId:'PM-OPT'});
  assert(!html.includes('No informado'),'muestra placeholder no deseado');
  assert(!html.includes('qa@example.com'),'arrastra asesor de otro caso');
});

console.log(`\nResultado cotización formal: ${pass} PASS, ${failures.length} FAIL`);
if(failures.length){failures.forEach(f=>console.error(`- ${f}`));process.exit(1)}
