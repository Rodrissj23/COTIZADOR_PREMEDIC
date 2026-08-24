import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE='http://127.0.0.1:4173';
const out=path.resolve('qa-artifacts');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});

async function desktop(){
  const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
  await page.goto(`${BASE}/index.html`,{waitUntil:'networkidle'});
  await page.screenshot({path:path.join(out,'01-portal-desktop.png'),fullPage:true});
  await page.locator('#abrirCotizadorBtn').click();
  await page.locator('#nombre').fill('Cliente Auditoría');
  await page.locator('#edadTitular').fill('35');
  await page.locator('#cotizarBtn').click();
  await page.locator('#resultadosSection').waitFor({state:'visible'});
  await page.screenshot({path:path.join(out,'02-resultados-directo-desktop.png'),fullPage:true});
  await page.locator('.plan-card[data-plan="300"] .elegir-plan').click();
  await page.locator('#verCotizacionBtn').click();
  await page.screenshot({path:path.join(out,'03-preview-plan300.png'),fullPage:false});
  await page.locator('#cerrarPreviewBtn').click();

  await page.locator('#modalidad').selectOption('desregulado');
  await page.locator('#aporteRecibo').fill('30000');
  await page.locator('#cotizarBtn').click();
  await page.screenshot({path:path.join(out,'04-resultados-pmo.png'),fullPage:true});
  await page.locator('.plan-card[data-plan="PMO"] .elegir-plan').click();
  await page.locator('#verCotizacionBtn').click();
  await page.screenshot({path:path.join(out,'05-preview-pmo.png'),fullPage:false});
  await page.locator('#cerrarPreviewBtn').click();

  const downloadPromise=page.waitForEvent('download',{timeout:60000});
  await page.locator('#guardarPdfBtn').click();
  const download=await downloadPromise;
  await download.saveAs(path.join(out,'Cotizacion Premedic (Cliente Auditoria).pdf'));
  await page.close();
}

async function mobile(){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(`${BASE}/index.html`,{waitUntil:'networkidle'});
  await page.screenshot({path:path.join(out,'06-portal-mobile.png'),fullPage:true});
  await page.locator('#abrirCotizadorBtn').click();
  await page.locator('#nombre').fill('Cliente Mobile');
  await page.locator('#edadTitular').fill('35');
  await page.locator('#cotizarBtn').click();
  await page.screenshot({path:path.join(out,'07-resultados-mobile.png'),fullPage:true});
  await page.close();
}

await desktop();
await mobile();
await browser.close();
console.log('Visual artifacts written to qa-artifacts');
