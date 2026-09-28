import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { handler } from '../netlify/functions/control-config.mjs';

const sample={
  version:'v2026.09.28.PREMEDIC.001',fingerprint:'abc123',
  prepaid_company:{code:'premedic'},
  catalog:{plans:[{code:'200'}],zones:[{code:'amba'}],segments:[{code:'directo'}]},
  pricing:{mode:'ZEROKA_CONTROL',price_list:{rates:[{plan:'200',zone:'amba',segment:'directo',age_from:0,age_to:29,price:'100000.00'}]}},
  commercial_benefits:[],documents:[]
};

async function testProxy(){
  const oldFetch=global.fetch;
  const oldUrl=process.env.ZEROKA_CONTROL_URL;
  const oldToken=process.env.ZEROKA_CONTROL_API_TOKEN;
  process.env.ZEROKA_CONTROL_URL='https://control.example';
  process.env.ZEROKA_CONTROL_API_TOKEN='secret';
  let request;
  global.fetch=async(url,options)=>{
    request={url,options};
    return new Response(JSON.stringify(sample),{status:200,headers:{ETag:'"abc123"','X-Config-Version':sample.version,'Content-Type':'application/json'}});
  };
  try{
    const result=await handler({httpMethod:'GET',headers:{'if-none-match':'"old"'}});
    assert.equal(result.statusCode,200);
    assert.equal(JSON.parse(result.body).version,sample.version);
    assert.equal(request.url,'https://control.example/api/config/premedic');
    assert.equal(request.options.headers.Authorization,'Bearer secret');
    assert.equal(request.options.headers['If-None-Match'],'"old"');
    assert.equal(result.headers.ETag,'"abc123"');
  }finally{
    global.fetch=oldFetch;
    if(oldUrl===undefined)delete process.env.ZEROKA_CONTROL_URL;else process.env.ZEROKA_CONTROL_URL=oldUrl;
    if(oldToken===undefined)delete process.env.ZEROKA_CONTROL_API_TOKEN;else process.env.ZEROKA_CONTROL_API_TOKEN=oldToken;
  }
}

async function runBrowserLoader({fetchImpl,cached=null}){
  const storage=new Map();
  if(cached)storage.set('zeroka-control:premedic:published:v1',JSON.stringify(cached));
  class CustomEventMock{constructor(type,init){this.type=type;this.detail=init?.detail;}}
  const window={dispatchEvent(){}};
  const context={
    window,
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
    fetch:fetchImpl,
    CustomEvent:CustomEventMock,
    console,
    Date,
    JSON,
    setTimeout,
    clearTimeout
  };
  vm.createContext(context);
  const source=fs.readFileSync(new URL('../js/zeroka-control-config.js',import.meta.url),'utf8');
  vm.runInContext(source,context);
  await new Promise(resolve=>setTimeout(resolve,0));
  return {window,storage};
}

async function testLiveAndCache(){
  const headers=new Headers({ETag:'"abc123"'});
  const live=await runBrowserLoader({fetchImpl:async()=>({ok:true,status:200,headers,json:async()=>sample})});
  assert.equal(live.window.ZEROKA_CONTROL_STATUS.source,'live');
  assert.equal(live.window.ZEROKA_CONTROL_STATUS.mode,'shadow');
  assert.equal(live.window.ZEROKA_CONTROL_STATUS.pricingApplied,false);
  assert.equal(live.window.ZEROKA_CONTROL_CONFIG.version,sample.version);

  const cache=JSON.parse(live.storage.get('zeroka-control:premedic:published:v1'));
  const fallback=await runBrowserLoader({cached:cache,fetchImpl:async()=>{throw new Error('offline');}});
  assert.equal(fallback.window.ZEROKA_CONTROL_STATUS.source,'cache');
  assert.equal(fallback.window.ZEROKA_CONTROL_CONFIG.version,sample.version);
}

async function testStaticTariffsStillLoadWithoutDom(){
  const context={window:{}};
  vm.createContext(context);
  const source=fs.readFileSync(new URL('../js/precios-premedic.js',import.meta.url),'utf8');
  vm.runInContext(source,context);
  assert.equal(context.window.PREMEDIC_DATA.tarifas.directo.amba['200'].individual[0],92390);
}

await testProxy();
await testLiveAndCache();
await testStaticTariffsStillLoadWithoutDom();
console.log('Control pilot QA: OK');
