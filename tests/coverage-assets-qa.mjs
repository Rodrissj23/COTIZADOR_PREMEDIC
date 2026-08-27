import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const expected = {
  'PREMEDIC PMO.pdf': [1460881, '6b339e9eb7930dfd37448bd9685d6f92d9d16f80728f655992537edd59686cd8'],
  'PLAN C100-2_merged.pdf': [599726, 'ff59251699a71ae9db193711fd1cfece0df9f364bbc474a6117338d92df0caff'],
  'PLAN 200-2_merged.pdf': [941083, '0054a6f1253059915418992a028b6fb04e3c0040a0bf5dbe9ba3fec8e7cc277b'],
  'PREMEDIC PLAN 300.pdf': [805044, '102a35f78605688624e6c2c9f51d09d76109c780b32348e8c73a55a7c4e79741'],
  'PLAN 400-7_merged.pdf': [838192, 'e18ffa937dfc507b54359004b7828d8ced51ee84e6a31caace8f4f0ea954d1c4'],
  'PLAN 500-2_merged.pdf': [774966, '3270f7d99643a7e55150760ae2942de5c4b783e0725893eecd302a7d52390303']
};

const coverageDir = path.resolve('assets/coverage');
const failures = [];
for (const [fileName, [size, expectedHash]] of Object.entries(expected)) {
  const filePath = path.join(coverageDir, fileName);
  if (!fs.existsSync(filePath)) { failures.push(`${fileName}: falta archivo`); continue; }
  const bytes = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  if (bytes.length !== size) failures.push(`${fileName}: tamaño ${bytes.length}, esperado ${size}`);
  if (hash !== expectedHash) failures.push(`${fileName}: no coincide byte a byte con el original`);
  if (bytes.subarray(0, 4).toString('ascii') !== '%PDF') failures.push(`${fileName}: firma PDF inválida`);
}

const files = fs.readdirSync(coverageDir).filter(file => file.endsWith('.pdf')).sort();
if (files.length !== Object.keys(expected).length) failures.push(`cantidad de alcances ${files.length}, esperada ${Object.keys(expected).length}`);

const app = fs.readFileSync('js/app.js', 'utf8');
const mapping = {
  PMO: 'PREMEDIC PMO.pdf',
  'C-100': 'PLAN C100-2_merged.pdf',
  200: 'PLAN 200-2_merged.pdf',
  300: 'PREMEDIC PLAN 300.pdf',
  400: 'PLAN 400-7_merged.pdf',
  500: 'PLAN 500-2_merged.pdf'
};
for (const [plan, file] of Object.entries(mapping)) {
  if (!app.includes(`${plan.includes('-') ? `'${plan}'` : plan}: '${file}'`) && !app.includes(`${plan}: '${file}'`)) {
    failures.push(`mapeo faltante: ${plan} -> ${file}`);
  }
}
if (!app.includes('outputDoc.embedPage(sourcePage)')) failures.push('el alcance no se incorpora como página PDF vectorial');
if (!app.includes('scale = Math.min(targetWidth / sourceSize.width, targetHeight / sourceSize.height)')) failures.push('no hay escala uniforme para preservar aspecto');
if (!app.includes('x: (targetWidth - drawWidth) / 2') || !app.includes('y: (targetHeight - drawHeight) / 2')) failures.push('el alcance no queda centrado');

const index = fs.readFileSync('index.html', 'utf8');
for (const vendor of ['html2canvas.min.js', 'jspdf.umd.min.js', 'pdf-lib.min.js']) {
  if (!index.includes(`assets/vendor/${vendor}`)) failures.push(`falta librería local ${vendor}`);
}

console.log(`Alcances oficiales: ${Object.keys(expected).length - Math.min(failures.length, Object.keys(expected).length)}/${Object.keys(expected).length} verificados`);
if (failures.length) {
  failures.forEach(failure => console.error(`FAIL  ${failure}`));
  process.exit(1);
}
console.log('PASS  Mapeo, integridad, centrado y preservación de aspecto verificados.');
