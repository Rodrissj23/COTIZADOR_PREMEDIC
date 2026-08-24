import { chromium } from 'playwright';
const BASE='http://127.0.0.1:4173';
let pass=0;const failures=[];
const assert=(v,m)=>{if(!v)throw new Error(m)};
async function test(name,fn){try{await fn();pass++;console.log(`PASS  ${name}`)}catch(e){failures.push(`${name}: ${e.message}`);console.error(`FAIL  ${name}\n      ${e.message}`)}}
const browser=await chromium.launch({headless:true});
for(const viewport of [{name:'desktop',width:1440,height:900},{name:'mobile',width:390,height:844}]){
  await test(`Login ${viewport.name} visible, usable y sin overflow`,async()=>{
    const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${BASE}/login.html?next=%2F`,{waitUntil:'networkidle'});
    assert(await page.locator('#loginForm').isVisible(),'formulario no visible');
    assert(await page.locator('input[name="username"]').isVisible(),'usuario no visible');
    assert(await page.locator('#password').isVisible(),'contraseña no visible');
    const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
    assert(dims.scroll<=dims.client+2,`overflow ${JSON.stringify(dims)}`);
    await page.locator('#password').fill('prueba');
    await page.locator('#togglePassword').click();
    assert(await page.locator('#password').getAttribute('type')==='text','botón Ver no funciona');
    assert(errors.length===0,errors.join(' | '));
    await page.close();
  });
}
await browser.close();
console.log(`\nResultado login navegador: ${pass} PASS, ${failures.length} FAIL`);
if(failures.length){failures.forEach(f=>console.error(`- ${f}`));process.exit(1)}
