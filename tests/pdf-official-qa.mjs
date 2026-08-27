import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import fs from 'node:fs';
import path from 'node:path';

const BASE='http://127.0.0.1:4173';
const OUT=path.resolve('qa-artifacts');
fs.mkdirSync(OUT,{recursive:true});

const allCases=[
  {plan:'PMO',file:'PREMEDIC PMO.pdf',coveragePages:4,coverageOrientation:'portrait',mode:'desregulado',aporte:'30000',promo:'ninguna'},
  {plan:'C-100',file:'PLAN C100-2_merged.pdf',coveragePages:5,coverageOrientation:'landscape',mode:'directo',promo:'ninguna'},
  {plan:'200',file:'PLAN 200-2_merged.pdf',coveragePages:7,coverageOrientation:'landscape',mode:'directo',promo:'promo40'},
  {plan:'300',file:'PREMEDIC PLAN 300.pdf',coveragePages:6,coverageOrientation:'landscape',mode:'directo',promo:'ninguna',family:true},
  {plan:'400',file:'PLAN 400-7_merged.pdf',coveragePages:6,coverageOrientation:'landscape',mode:'desregulado',aporte:'30000',promo:'tc15'},
  {plan:'500',file:'PLAN 500-2_merged.pdf',coveragePages:6,coverageOrientation:'landscape',mode:'directo',promo:'monotributo',category:'D',family:true}
];
const cases=process.env.PLAN_QA?allCases.filter(item=>item.plan===process.env.PLAN_QA):allCases;

const assert=(value,message)=>{if(!value)throw new Error(message)};
const browser=await chromium.launch({headless:true});
let passed=0;

for(const scenario of cases){
  const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
  const errors=[];
  const coverageRequests=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{
    if(request.url().includes('/assets/coverage/')){
      const fileName=decodeURIComponent(new URL(request.url()).pathname.split('/').pop());
      coverageRequests.push(fileName);
    }
  });

  await page.goto(`${BASE}/index.html#cotizador`,{waitUntil:'networkidle'});
  await page.locator('#promocionPremedic').waitFor({state:'visible'});
  await page.locator('#nombre').fill(`QA ${scenario.plan}`);
  await page.locator('#edadTitular').fill('35');

  if(scenario.family){
    await page.locator('#composicion').selectOption('pareja_hijos');
    await page.locator('#edadPareja').fill('34');
    await page.locator('#cantidadHijos').fill('2');
    const children=page.locator('#edadesHijos input');
    assert(await children.count()===2,`${scenario.plan}: no se crearon dos campos de hijos`);
    await page.evaluate(ages=>{
      [...document.querySelectorAll('#edadesHijos input')].forEach((input,index)=>{
        input.value=ages[index];
        input.dispatchEvent(new Event('input',{bubbles:true}));
      });
    },['8','4']);
  }

  await page.locator('#modalidad').selectOption(scenario.mode);
  if(scenario.aporte) await page.locator('#aporteRecibo').fill(scenario.aporte);
  await page.locator('#promocionPremedic').selectOption(scenario.promo);
  if(scenario.category) await page.locator('#categoriaMonotributo').selectOption(scenario.category);

  if(scenario.family){
    const childValues=await page.locator('#edadesHijos input').evaluateAll(inputs=>inputs.map(input=>input.value));
    assert(childValues.length===2&&childValues.every(Boolean),`${scenario.plan}: edades de hijos incompletas ${JSON.stringify(childValues)}`);
  }

  await page.locator('#cotizarBtn').click();
  const card=page.locator(`.plan-card[data-plan="${scenario.plan}"]`);
  if(await card.count()===0){
    const message=await page.locator('#mensaje').innerText().catch(()=> 'sin mensaje');
    throw new Error(`${scenario.plan}: no apareció el plan (${message})`);
  }
  await card.waitFor({state:'visible'});
  await card.locator('.elegir-plan').click();
  await page.locator('#verCotizacionBtn').click();

  assert(await page.locator('#previewContent .quote-page').count()===2,`${scenario.plan}: propuesta comercial no tiene 2 páginas`);
  assert(await page.locator('#previewContent .premedic-pdf-cover').count()===1,`${scenario.plan}: falta portada`);
  assert(await page.locator('#previewContent .premedic-pdf-summary').count()===1,`${scenario.plan}: falta resumen`);
  assert(await page.locator('#previewContent .quote-closing-page').count()===0,`${scenario.plan}: incluye cierre`);

  const labels=await page.locator('.premedic-summary-row>b').allTextContents();
  assert(JSON.stringify(labels)===JSON.stringify(['Grupo familiar','Zona','Valor detalle','Filiar a cargo','Aportes a descontar','Descuento promocional','Descuento multiproducto','IVA']),`${scenario.plan}: orden de campos incorrecto`);

  const expected=await page.evaluate(planName=>{
    const state={
      nombre:document.querySelector('#nombre').value,
      dni:document.querySelector('#dni').value,
      zona:document.querySelector('#zona').value,
      modalidad:document.querySelector('#modalidad').value,
      composicion:document.querySelector('#composicion').value,
      aporteRecibo:document.querySelector('#aporteRecibo').value===''?'':Number(document.querySelector('#aporteRecibo').value),
      edadTitular:Number(document.querySelector('#edadTitular').value),
      edadPareja:document.querySelector('#edadPareja').value===''?null:Number(document.querySelector('#edadPareja').value),
      hijos:[...document.querySelectorAll('#edadesHijos input')].map(input=>Number(input.value))
    };
    const result=window.PremedicMotor.quote(state);
    const selected=result.plans.find(plan=>plan.plan===planName);
    const money=window.PremedicMotor.money;
    let promotion=money(0);
    if(selected.descuentoPromocion&&selected.promocion?.tipo==='porcentaje') promotion=`${selected.promocion.valor}% - ${money(selected.descuentoPromocion)}`;
    if(selected.descuentoPromocion&&selected.promocion?.id==='monotributo') promotion=`Monotributo Cat. ${result.categoriaMonotributo} - ${money(selected.descuentoPromocion)}`;
    return {
      detail:money(selected.base),
      familyCharge:money(selected.totalAdicionales),
      contribution:selected.aporteComputable?`- ${money(selected.aporteComputable)}`:money(0),
      promotion,
      total:money(selected.neto)
    };
  },scenario.plan);

  const values=await page.locator('.premedic-summary-row>span').evaluateAll(nodes=>nodes.map(node=>node.innerText.split('\n')[0].trim()));
  assert(values[2]===expected.detail,`${scenario.plan}: valor detalle ${values[2]} != ${expected.detail}`);
  assert(values[3]===expected.familyCharge,`${scenario.plan}: familiar a cargo ${values[3]} != ${expected.familyCharge}`);
  assert(values[4]===expected.contribution,`${scenario.plan}: aporte ${values[4]} != ${expected.contribution}`);
  assert(values[5]===expected.promotion,`${scenario.plan}: promoción ${values[5]} != ${expected.promotion}`);
  const total=await page.locator('.premedic-summary-total>strong').innerText();
  assert(total.trim()===expected.total,`${scenario.plan}: total ${total} != ${expected.total}`);

  const downloadPromise=page.waitForEvent('download',{timeout:90000});
  await page.locator('#previewPdfBtn').click();
  const download=await downloadPromise;
  const output=path.join(OUT,`premedic-${scenario.plan.replace(/[^a-z0-9]/gi,'')}.pdf`);
  await download.saveAs(output);
  const displayPlan=scenario.plan==='PMO'?'Pmo':scenario.plan;
  assert(download.suggestedFilename()===`Cotizacion Premedic (Qa ${displayPlan}).pdf`,`${scenario.plan}: nombre inesperado ${download.suggestedFilename()}`);
  assert(coverageRequests.includes(scenario.file),`${scenario.plan}: pidió ${coverageRequests.join(', ')||'ningún alcance'} en vez de ${scenario.file}`);

  const bytes=fs.readFileSync(output);
  assert(bytes.length>scenario.coveragePages*70000,`${scenario.plan}: PDF demasiado pequeño (${bytes.length})`);
  const doc=await PDFDocument.load(bytes);
  assert(doc.getPageCount()===2+scenario.coveragePages,`${scenario.plan}: ${doc.getPageCount()} páginas, esperadas ${2+scenario.coveragePages}`);
  const first=doc.getPage(0).getSize();
  assert(Math.abs(first.width-595.28)<1&&Math.abs(first.height-841.89)<1,`${scenario.plan}: portada no es A4 vertical`);
  const coverage=doc.getPage(2).getSize();
  const orientation=coverage.width>coverage.height?'landscape':'portrait';
  assert(orientation===scenario.coverageOrientation,`${scenario.plan}: orientación ${orientation}, esperada ${scenario.coverageOrientation}`);
  assert(errors.length===0,`${scenario.plan}: ${errors.join(' | ')}`);

  passed++;
  console.log(`PASS  ${scenario.plan}: portada + resumen + ${scenario.coveragePages} páginas oficiales (${scenario.file})`);
  await page.close();
}

await browser.close();
console.log(`\nResultado PDF Premedic: ${passed}/${cases.length} planes verificados.`);
