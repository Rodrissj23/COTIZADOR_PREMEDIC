const BASE='https://cotizadorpremedicgz.netlify.app';
let pass=0;const failures=[];
const assert=(v,m)=>{if(!v)throw new Error(m)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function test(name,fn){try{await fn();pass++;console.log(`PASS  ${name}`)}catch(e){failures.push(`${name}: ${e.message}`);console.error(`FAIL  ${name}\n      ${e.message}`)}}

async function request(path,options={}){
  let lastError;
  for(let attempt=1;attempt<=3;attempt++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),15000);
    try{
      return await fetch(`${BASE}${path}`,{redirect:'manual',signal:controller.signal,...options});
    }catch(error){
      lastError=error;
      if(attempt<3) await sleep(750*attempt);
    }finally{
      clearTimeout(timer);
    }
  }
  throw new Error(`fetch failed tras 3 intentos: ${lastError?.message||'error de red'}`);
}

await test('Login público responde y renderiza el formulario',async()=>{
  const r=await request('/login.html?next=%2F');
  assert(r.status===200,`status ${r.status}`);
  const html=await r.text();
  assert(html.includes('Acceso · Premedic'),'título de login ausente');
  assert(html.includes('id="loginForm"'),'formulario de login ausente');
});

await test('Raíz protegida redirige al login',async()=>{
  const r=await request('/');
  assert([301,302,303,307,308].includes(r.status),`status ${r.status}`);
  const location=r.headers.get('location')||'';
  assert(location.includes('/login.html'),'no redirige al login');
});

for(const asset of ['/js/precios-premedic.js','/js/motor-premedic.js']){
  await test(`${asset} no queda público sin sesión`,async()=>{
    const r=await request(asset);
    assert([301,302,303,307,308,401,403].includes(r.status),`status ${r.status}`);
    if(r.status<400){
      const location=r.headers.get('location')||'';
      assert(location.includes('/login.html'),'asset protegido no redirige al login');
    }
  });
}

await test('Endpoint de login está configurado y rechaza credenciales inválidas',async()=>{
  const r=await request('/api/login',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({username:'__qa_invalid__',password:'__qa_invalid__'})
  });
  assert(r.status===401,`status ${r.status}; esperado 401. Un 500 indicaría variables de entorno faltantes.`);
});

console.log(`\nResultado producción: ${pass} PASS, ${failures.length} FAIL`);
if(failures.length){failures.forEach(f=>console.error(`- ${f}`));process.exit(1)}
