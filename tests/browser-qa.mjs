import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE='http://127.0.0.1:4173';
let passed=0;
const failures=[];
const pass=name=>{passed++;console.log(`PASS  ${name}`)};
const fail=(name,error)=>{failures.push(`${name}: ${error.message}`);console.error(`FAIL  ${name}\n      ${error.message}`)};
const assert=(value,message)=>{if(!value)throw new Error(message)};
async function test(name,fn){try{await fn();pass(name)}catch(error){fail(name,error)}}

const browser=await chromium.launch({headless:true});

await test('Portal abre el cotizador sin trabas y sin errores JS',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${BASE}/index.html`,{waitUntil:'networkidle'});
  assert(await page.locator('#portalScreen').isVisible(),'portal no visible');
  const start=Date.now();
  await page.locator('#abrirCotizadorBtn').click();
  await page.locator('#cotizadorApp').waitFor({state:'visible'});
  assert(Date.now()-start<1500,`abrir cotizador tardó ${Date.now()-start}ms`);
  assert(errors.length===0,errors.join(' | '));
  await page.close();
});

await test('Directo AMBA edad 35 muestra 5 planes y precio correcto del 200',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto(`${BASE}/index.html#cotizador`,{waitUntil:'networkidle'});
  await page.locator('#nombre').fill('Juan Perez');
  await page.locator('#edadTitular').fill('35');
  await page.locator('#cotizarBtn').click();
  await page.locator('#resultadosSection').waitFor({state:'visible'});
  assert(await page.locator('#resultados .plan-card').count()===5,'no hay 5 planes');
  const price=(await page.locator('.plan-card[data-plan="200"] .plan-price').innerText()).replace(/\s/g,'');
  assert(price.includes('$113.707'),`precio 200 inesperado ${price}`);
  await page.close();
});

await test('Interior oculta C-100',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto(`${BASE}/index.html#cotizador`,{waitUntil:'networkidle'});
  await page.locator('#nombre').fill('Interior QA');
  await page.locator('#edadTitular').fill('29');
  await page.locator('#zona').selectOption('interior');
  await page.locator('#cotizarBtn').click();
  assert(await page.locator('#resultados .plan-card').count()===4,'Interior no muestra 4 planes');
  assert(await page.locator('.plan-card[data-plan="C-100"]').count()===0,'C-100 aparece en Interior');
  await page.close();
});

await test('Desregulado mantiene aporte visible y PMO aparece primero con valor $0',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto(`${BASE}/index.html#cotizador`,{waitUntil:'networkidle'});
  await page.locator('#nombre').fill('PMO QA');
  await page.locator('#edadTitular').fill('29');
  await page.locator('#modalidad').selectOption('desregulado');
  await page.locator('#aporteRecibo').fill('5882.36');
  await page.locator('#cotizarBtn').click();
  const first=page.locator('#resultados .plan-card').first();
  assert(await first.getAttribute('data-plan')==='PMO','PMO no quedó primero');
  assert((await first.locator('.plan-price').innerText()).includes('$ 0'),'PMO no muestra total $0');
  assert((await first.locator('.breakdown-line').innerText()).includes('Valor del plan'),'PMO no muestra Valor del plan');
  assert((await first.locator('.breakdown-line').innerText()).includes('$ 0'),'Valor del plan PMO no muestra $0');
  assert(await page.locator('#sumAporteCalculadoRow').isVisible(),'aporte computable fue ocultado');
  const contributionCopy=await page.locator('#aporteWrap').innerText();
  assert(!contributionCopy.includes('÷')&&!contributionCopy.includes('7,65'),'la explicación técnica del aporte sigue visible');
  const contributionNote=await page.locator('#notasModalidad').innerText();
  assert(!contributionNote.includes('÷')&&!contributionNote.includes('7,65'),'la leyenda técnica del aporte sigue visible en resultados');
  await page.close();
});

await test('Cantidad de hijos ya no queda limitada artificialmente a 10',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto(`${BASE}/index.html#cotizador`,{waitUntil:'networkidle'});
  await page.locator('#composicion').selectOption('titular_hijos');
  assert(await page.locator('#cantidadHijos').getAttribute('max')===null,'sigue existiendo max en runtime');
  await page.locator('#cantidadHijos').fill('12');
  assert(await page.locator('#edadesHijos input').count()===12,'no renderizó 12 edades');
  await page.close();
});

await test('Cambiar edad invalida plan seleccionado',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto(`${BASE}/index.html#cotizador`,{waitUntil:'networkidle'});
  await page.locator('#nombre').fill('Seleccion QA');
  await page.locator('#edadTitular').fill('35');
  await page.locator('#cotizarBtn').click();
  await page.locator('.plan-card[data-plan="200"] .elegir-plan').click();
  const selectedCard=page.locator('.plan-card[data-plan="200"]');
  assert(await selectedCard.evaluate(card=>card.classList.contains('selected')),'la tarjeta elegida no quedó seleccionada');
  assert((await selectedCard.locator('.elegir-plan').innerText()).includes('elegido'),'el botón no confirma el plan elegido');
  assert(await page.locator('.plan-card.selected').count()===1,'hay más de un plan marcado como elegido');
  assert(await page.locator('#seleccionSection').isVisible(),'selección no visible');
  await page.locator('#edadTitular').fill('36');
  assert(!(await page.locator('#seleccionSection').isVisible()),'selección vieja quedó visible');
  await page.close();
});

await test('Preview formal genera portada, resumen y beneficios, sin hoja de cierre',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto(`${BASE}/index.html#cotizador`,{waitUntil:'networkidle'});
  await page.locator('#nombre').fill('Preview QA');
  await page.locator('#edadTitular').fill('35');
  await page.locator('#cotizarBtn').click();
  await page.locator('.plan-card[data-plan="300"] .elegir-plan').click();
  await page.locator('#verCotizacionBtn').click();
  assert(await page.locator('#previewDialog').isVisible(),'dialog no visible');
  assert(await page.locator('#previewContent .quote-page').count()===3,'preview no tiene 3 páginas');
  assert(await page.locator('#previewContent .premedic-pdf-cover').count()===1,'falta portada');
  assert(await page.locator('#previewContent .premedic-pdf-summary').count()===1,'falta resumen');
  assert(await page.locator('#previewContent .premedic-pdf-benefits').count()===1,'falta beneficios');
  assert(await page.locator('#previewContent .quote-closing-page').count()===0,'aparece hoja de cierre');
  await page.close();
});

await test('Descarga PDF directa con nombre correcto y archivo no vacío',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
  await page.goto(`${BASE}/index.html#cotizador`,{waitUntil:'networkidle'});
  await page.locator('#nombre').fill('Juan Perez');
  await page.locator('#edadTitular').fill('35');
  await page.locator('#cotizarBtn').click();
  await page.locator('.plan-card[data-plan="200"] .elegir-plan').click();
  const downloadPromise=page.waitForEvent('download',{timeout:60000});
  await page.locator('#guardarPdfBtn').click();
  const download=await downloadPromise;
  assert(download.suggestedFilename()==='Cotizacion Premedic (Juan Perez).pdf',`nombre ${download.suggestedFilename()}`);
  const path=await download.path();
  assert(path && fs.statSync(path).size>20000,`PDF demasiado pequeño ${path?fs.statSync(path).size:0}`);
  await page.close();
});

await test('Mobile 390px no tiene overflow horizontal',async()=>{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(`${BASE}/index.html`,{waitUntil:'networkidle'});
  let dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  assert(dims.scroll<=dims.client+2,`portal overflow ${JSON.stringify(dims)}`);
  await page.locator('#abrirCotizadorBtn').click();
  dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  assert(dims.scroll<=dims.client+2,`cotizador overflow ${JSON.stringify(dims)}`);
  await page.close();
});

await browser.close();
console.log(`\nResultado navegador: ${passed} PASS, ${failures.length} FAIL`);
if(failures.length){console.error('\nFallos:');failures.forEach(f=>console.error(`- ${f}`));process.exit(1)}
