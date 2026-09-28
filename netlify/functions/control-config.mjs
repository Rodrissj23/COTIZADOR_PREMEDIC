const json=(statusCode,body,headers={})=>({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers},body:JSON.stringify(body)});

export async function handler(event){
  if(event.httpMethod!=='GET'&&event.httpMethod!=='HEAD')return json(405,{ok:false,error:'Método no permitido.'},{Allow:'GET, HEAD'});
  const base=String(process.env.ZEROKA_CONTROL_URL||'').trim().replace(/\/$/,'');
  const token=String(process.env.ZEROKA_CONTROL_API_TOKEN||'').trim();
  if(!base||!token)return json(503,{ok:false,error:'La integración con Zeroka Control todavía no está configurada.'});

  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),5000);
  try{
    const headers={Authorization:`Bearer ${token}`,Accept:'application/json'};
    const etag=event.headers?.['if-none-match']||event.headers?.['If-None-Match'];
    if(etag)headers['If-None-Match']=etag;
    const response=await fetch(`${base}/api/config/premedic`,{method:'GET',headers,signal:controller.signal});
    const responseHeaders={};
    const upstreamEtag=response.headers.get('etag');
    const version=response.headers.get('x-config-version');
    if(upstreamEtag)responseHeaders.ETag=upstreamEtag;
    if(version)responseHeaders['X-Config-Version']=version;

    if(response.status===304)return {statusCode:304,headers:{'Cache-Control':'no-store',...responseHeaders},body:''};
    const text=await response.text();
    if(!response.ok){
      return json(response.status===404?404:502,{ok:false,error:'No se pudo obtener una configuración publicada válida de Zeroka Control.',upstreamStatus:response.status},responseHeaders);
    }
    if(event.httpMethod==='HEAD')return {statusCode:200,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...responseHeaders},body:''};
    return {statusCode:200,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...responseHeaders},body:text};
  }catch(error){
    const timedOut=error?.name==='AbortError';
    return json(502,{ok:false,error:timedOut?'Zeroka Control no respondió dentro del tiempo esperado.':'No se pudo conectar con Zeroka Control.'});
  }finally{
    clearTimeout(timer);
  }
}
