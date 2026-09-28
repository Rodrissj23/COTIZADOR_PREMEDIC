(()=>{
  'use strict';
  const CACHE_KEY='zeroka-control:premedic:published:v1';
  const endpoint='/api/control-config';

  function validPayload(payload){
    return !!(
      payload&&typeof payload==='object'&&
      typeof payload.version==='string'&&payload.version&&
      typeof payload.fingerprint==='string'&&payload.fingerprint&&
      payload.prepaid_company?.code==='premedic'&&
      payload.catalog&&Array.isArray(payload.catalog.plans)&&Array.isArray(payload.catalog.zones)&&Array.isArray(payload.catalog.segments)&&
      payload.pricing&&payload.pricing.mode==='ZEROKA_CONTROL'&&payload.pricing.price_list&&Array.isArray(payload.pricing.price_list.rates)&&
      Array.isArray(payload.commercial_benefits)&&Array.isArray(payload.documents)
    );
  }

  function readCache(){
    try{
      const parsed=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
      return parsed&&validPayload(parsed.payload)?parsed:null;
    }catch{return null;}
  }

  function writeCache(payload,etag){
    const cached={payload,etag:etag||`"${payload.fingerprint}"`,version:payload.version,fetchedAt:new Date().toISOString()};
    try{localStorage.setItem(CACHE_KEY,JSON.stringify(cached));}catch{}
    return cached;
  }

  function expose(cached,source,error=''){
    window.ZEROKA_CONTROL_CONFIG=cached?.payload||null;
    window.ZEROKA_CONTROL_STATUS={
      source,
      version:cached?.payload?.version||null,
      fingerprint:cached?.payload?.fingerprint||null,
      fetchedAt:cached?.fetchedAt||null,
      error:error||null,
      pricingApplied:false,
      mode:'shadow'
    };
    window.dispatchEvent(new CustomEvent('zeroka-control-config',{detail:window.ZEROKA_CONTROL_STATUS}));
  }

  async function load(){
    const cached=readCache();
    const headers={Accept:'application/json'};
    if(cached?.etag)headers['If-None-Match']=cached.etag;
    try{
      const response=await fetch(endpoint,{method:'GET',credentials:'same-origin',headers,cache:'no-store'});
      if(response.status===304&&cached){
        expose(cached,'cache-validated');
        return cached.payload;
      }
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const payload=await response.json();
      if(!validPayload(payload))throw new Error('Configuración inválida');
      const live=writeCache(payload,response.headers.get('etag'));
      expose(live,'live');
      return payload;
    }catch(error){
      if(cached){
        expose(cached,'cache',String(error?.message||error));
        return cached.payload;
      }
      expose(null,'unavailable',String(error?.message||error));
      return null;
    }
  }

  window.ZerokaControlConfig={load,readCache,validPayload,CACHE_KEY};
  load();
})();
