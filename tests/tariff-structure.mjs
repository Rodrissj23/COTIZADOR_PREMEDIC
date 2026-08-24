import fs from 'node:fs';
import vm from 'node:vm';

const context={window:{},console,Intl,Date,Math,Number,String,Object,Array,Boolean,JSON,Set,Map};
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/precios-premedic.js','utf8'),context);
const data=context.window.PREMEDIC_DATA;
let pass=0;
const failures=[];
const ok=(name,fn)=>{try{fn();pass++;console.log(`PASS  ${name}`)}catch(e){failures.push(`${name}: ${e.message}`);console.error(`FAIL  ${name}\n      ${e.message}`)}};
const assert=(v,m)=>{if(!v)throw new Error(m)};
const plans=['200','300','400','500'];
const fields=['individual','matrimonio','matrimonio1','matrimonio2','matrimonio3'];

ok('Todas las matrices tarifarias tienen 4 bandas positivas',()=>{
  for(const mode of ['directo','desregulado']){
    for(const zone of ['amba','interior']){
      for(const [planName,plan] of Object.entries(data.tarifas[mode][zone])){
        for(const field of fields){
          assert(Array.isArray(plan[field]),`${mode}/${zone}/${planName}/${field} no es array`);
          assert(plan[field].length===4,`${mode}/${zone}/${planName}/${field} no tiene 4 bandas`);
          assert(plan[field].every(v=>Number.isFinite(v)&&v>0),`${mode}/${zone}/${planName}/${field} contiene valor inválido`);
        }
        assert(Number.isFinite(plan.adicionalMenor1)&&plan.adicionalMenor1>0,`${mode}/${zone}/${planName} adicionalMenor1 inválido`);
        assert(Number.isFinite(plan.adicionalMenor25)&&plan.adicionalMenor25>0,`${mode}/${zone}/${planName} adicionalMenor25 inválido`);
      }
    }
  }
});

ok('Las tarifas adultas no disminuyen al subir de tramo',()=>{
  for(const mode of ['directo','desregulado']) for(const zone of ['amba','interior']) for(const [name,p] of Object.entries(data.tarifas[mode][zone])){
    for(const field of fields) for(let i=1;i<p[field].length;i++) assert(p[field][i]>=p[field][i-1],`${mode}/${zone}/${name}/${field} baja en banda ${i}`);
  }
});

ok('Las composiciones familiares crecen con la cantidad de integrantes',()=>{
  for(const mode of ['directo','desregulado']) for(const zone of ['amba','interior']) for(const [name,p] of Object.entries(data.tarifas[mode][zone])){
    for(let i=0;i<4;i++){
      assert(p.matrimonio[i]>=p.individual[i],`${mode}/${zone}/${name} matrimonio < individual banda ${i}`);
      assert(p.matrimonio1[i]>=p.matrimonio[i],`${mode}/${zone}/${name} matrimonio1 < matrimonio banda ${i}`);
      assert(p.matrimonio2[i]>=p.matrimonio1[i],`${mode}/${zone}/${name} matrimonio2 < matrimonio1 banda ${i}`);
      assert(p.matrimonio3[i]>=p.matrimonio2[i],`${mode}/${zone}/${name} matrimonio3 < matrimonio2 banda ${i}`);
    }
  }
});

ok('Desregulado no supera la tarifa Directo equivalente',()=>{
  for(const zone of ['amba','interior']) for(const name of Object.keys(data.tarifas.desregulado[zone])){
    const d=data.tarifas.directo[zone][name];
    const r=data.tarifas.desregulado[zone][name];
    assert(d,`falta equivalente Directo ${zone}/${name}`);
    for(const field of fields) for(let i=0;i<4;i++) assert(r[field][i]<=d[field][i],`${zone}/${name}/${field}/${i} Desregulado > Directo`);
    assert(r.adicionalMenor1<=d.adicionalMenor1,`${zone}/${name} adicional menor1 Desregulado > Directo`);
    assert(r.adicionalMenor25<=d.adicionalMenor25,`${zone}/${name} adicional menor25 Desregulado > Directo`);
  }
});

ok('La progresión comercial C-100 → 200 → 300 → 400 → 500 no retrocede',()=>{
  for(const mode of ['directo','desregulado']){
    const zone='amba';
    const order=['C-100','200','300','400','500'];
    for(const field of fields) for(let band=0;band<4;band++){
      for(let i=1;i<order.length;i++){
        const prev=data.tarifas[mode][zone][order[i-1]][field][band];
        const curr=data.tarifas[mode][zone][order[i]][field][band];
        assert(curr>=prev,`${mode}/${field}/banda${band}: ${order[i]} < ${order[i-1]}`);
      }
    }
  }
});

ok('AMBA e Interior coinciden exactamente en 200-500',()=>{
  for(const mode of ['directo','desregulado']) for(const name of plans){
    assert(JSON.stringify(data.tarifas[mode].amba[name])===JSON.stringify(data.tarifas[mode].interior[name]),`${mode}/${name} difiere`);
  }
});

console.log(`\nResultado estructura tarifaria: ${pass} PASS, ${failures.length} FAIL`);
if(failures.length){failures.forEach(x=>console.error(`- ${x}`));process.exit(1)}
