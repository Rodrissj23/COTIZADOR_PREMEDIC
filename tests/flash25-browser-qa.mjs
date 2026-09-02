import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
let passed = 0;
const failures = [];
const assert = (value, message) => { if (!value) throw new Error(message); };
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`PASS  ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.error(`FAIL  ${name}\n      ${error.message}`);
  }
}

async function pageAt(date) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  await page.clock.install({ time: new Date(`${date}T12:00:00-03:00`) });
  await page.goto(`${BASE}/index.html#cotizador`, { waitUntil: 'networkidle' });
  return page;
}

async function optionValues(page) {
  return page.locator('#promocionPremedic option').evaluateAll(options => options.map(option => option.value));
}

await test('FLASH25 aparece hasta el 11/09 para AMBA Directo y planes habilitados', async () => {
  const page = await pageAt('2026-09-11');
  assert((await optionValues(page)).includes('flash25'), 'FLASH25 no aparece en AMBA Directo');
  await page.locator('#nombre').fill('Flash Directo QA');
  await page.locator('#edadTitular').fill('35');
  await page.locator('#promocionPremedic').selectOption('flash25');
  await page.locator('#cotizarBtn').click();

  const expected = await page.evaluate(() => {
    const result = window.PremedicMotor.quote({
      nombre: 'Flash Directo QA', zona: 'amba', modalidad: 'directo', composicion: 'individual',
      aporteRecibo: '', edadTitular: 35, edadPareja: null, hijos: []
    });
    const plan = result.plans.find(item => item.plan === '300');
    return { price: window.PremedicMotor.money(plan.neto), discount: plan.descuentoPromocion, bruto: plan.bruto };
  });
  assert(Math.abs(expected.discount - expected.bruto * 0.25) < 0.01, 'el descuento no representa exactamente 25%');
  assert((await page.locator('.plan-card[data-plan="300"] .plan-price').innerText()).trim() === expected.price, 'precio final visual incorrecto');

  await page.locator('.plan-card[data-plan="300"] .elegir-plan').click();
  assert((await optionValues(page)).includes('flash25'), 'FLASH25 desapareció para Plan 300');
  await page.locator('#verCotizacionBtn').click();
  const preview = await page.locator('#previewContent').innerText();
  assert(preview.includes('Campaña aplicada'), 'el PDF no identifica la campaña');
  assert(preview.includes('FLASH25 — 25% permanente'), 'el PDF no identifica FLASH25 permanente');
  await page.locator('#cerrarPreviewBtn').click();

  const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
  await page.locator('#guardarPdfBtn').click();
  const download = await downloadPromise;
  if (process.env.FLASH25_PDF_OUT) await download.saveAs(process.env.FLASH25_PDF_OUT);
  const file = await download.path();
  assert(file && fs.statSync(file).size > 20000, 'el PDF FLASH25 está vacío o incompleto');
  await page.close();
});

await test('Seleccionar FLASH25 después de cotizar recalcula los precios inmediatamente', async () => {
  const page = await pageAt('2026-09-11');
  await page.locator('#nombre').fill('Flash Recalculo QA');
  await page.locator('#edadTitular').fill('35');
  await page.locator('#cotizarBtn').click();
  const original = await page.locator('.plan-card[data-plan="300"] .plan-price').innerText();
  await page.locator('#promocionPremedic').selectOption('flash25');
  await page.locator('#resultadosSection').waitFor({ state: 'visible' });
  const discounted = await page.locator('.plan-card[data-plan="300"] .plan-price').innerText();
  assert(discounted !== original, 'el precio no cambió al seleccionar FLASH25');
  const expected = await page.evaluate(() => window.PremedicMotor.money(window.PremedicMotor.quote({
    nombre: 'Flash Recalculo QA', zona: 'amba', modalidad: 'directo', composicion: 'individual',
    aporteRecibo: '', edadTitular: 35, edadPareja: null, hijos: []
  }).plans.find(item => item.plan === '300').neto));
  assert(discounted.trim() === expected, `precio FLASH25 incorrecto: ${discounted} != ${expected}`);
  await page.close();
});

await test('Cambiar a plan incompatible elimina FLASH25 automáticamente', async () => {
  const page = await pageAt('2026-09-11');
  await page.locator('#nombre').fill('Flash Plan QA');
  await page.locator('#edadTitular').fill('35');
  await page.locator('#promocionPremedic').selectOption('flash25');
  await page.locator('#cotizarBtn').click();
  await page.locator('.plan-card[data-plan="300"] .elegir-plan').click();
  await page.locator('.plan-card[data-plan="200"] .elegir-plan').click();
  assert(!(await optionValues(page)).includes('flash25'), 'FLASH25 sigue disponible para Plan 200');
  assert(await page.locator('#promocionPremedic').inputValue() === 'ninguna', 'FLASH25 quedó seleccionado para Plan 200');
  const fullPlan300 = await page.evaluate(() => window.PremedicMotor.money(window.PremedicMotor.quote({
    nombre: 'Flash Plan QA', zona: 'amba', modalidad: 'directo', composicion: 'individual',
    aporteRecibo: '', edadTitular: 35, edadPareja: null, hijos: []
  }).plans.find(item => item.plan === '300').neto));
  assert((await page.locator('.plan-card[data-plan="300"] .plan-price').innerText()).trim() === fullPlan300, 'quedó un precio FLASH25 residual al cambiar de plan');
  assert(await page.locator('.plan-card[data-plan="200"]').evaluate(card => card.classList.contains('selected')), 'el plan incompatible no se conservó seleccionado tras recalcular');
  await page.close();
});

await test('Cambiar AMBA a Interior elimina FLASH25 automáticamente', async () => {
  const page = await pageAt('2026-09-11');
  await page.locator('#promocionPremedic').selectOption('flash25');
  await page.locator('#zona').selectOption('interior');
  assert(!(await optionValues(page)).includes('flash25'), 'FLASH25 sigue disponible en Interior');
  assert(await page.locator('#promocionPremedic').inputValue() === 'ninguna', 'FLASH25 quedó seleccionado en Interior');
  await page.close();
});

await test('El 12/09/2026 FLASH25 ya no puede seleccionarse', async () => {
  const page = await pageAt('2026-09-12');
  assert(!(await optionValues(page)).includes('flash25'), 'FLASH25 aparece fuera de vigencia');
  await page.close();
});

await browser.close();
console.log(`\nResultado navegador FLASH25: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) {
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}
