// @vitest-environment node
import {describe,it,expect,afterEach,vi} from 'vitest';
import {once} from 'node:events';
import {createApp} from '../server/app.mjs';
import {demoPantry} from '../src/data/recipes.js';
import {snackIntent,snackRecipe,meatIntent,meatRecipe} from './aiFixtures.js';
const servers=[];
async function start(fetchImpl,opts={}){const server=createApp({fetchImpl,...opts});server.listen(0,'127.0.0.1');await once(server,'listening');servers.push(server);return `http://127.0.0.1:${server.address().port}`;}
afterEach(async()=>{await Promise.all(servers.splice(0).map(s=>new Promise(r=>{s.closeAllConnections();s.close(r);})))});
const body={model:'qwen3:4b',pantry:demoPantry(),preferences:'quiero un scnack de chocolate y frambuesa',excluded:[]};
function fake(intent=snackIntent,values=[{recipes:[snackRecipe]}]){let generation=0;return vi.fn(async(url,options)=>{
 let data;
 if(String(url).endsWith('/api/tags'))data={models:[{name:'qwen3:4b'},{name:'remote:cloud'}]};
 else {const request=JSON.parse(options.body);const value=request.format.required.includes('meal_type')?intent:values[Math.min(generation++,values.length-1)];data={message:{content:typeof value==='string'?value:JSON.stringify(value)}};}
 return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
});}
const post=(url,data=body,headers={})=>fetch(`${url}/api/recipes`,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(data)});
describe('local Ollama generation',()=>{
 it('generates a new chocolate and raspberry snack despite both being absent from pantry',async()=>{
  const mock=fake();const response=await post(await start(mock));expect(response.status).toBe(200);const result=await response.json();
  expect(result.selection).toBe('ollama-generated');expect(result.recipes[0]).toMatchObject({...snackRecipe,source:'ai',reviewVersion:null});expect(result.recipes[0].id).toMatch(/^ai-/);
  const calls=mock.mock.calls.filter(([url])=>String(url).endsWith('/api/chat')).map(([,opts])=>JSON.parse(opts.body));expect(calls).toHaveLength(2);expect(calls.every(c=>c.think===false)).toBe(true);
  const context=JSON.parse(calls[1].messages[1].content);expect(context.interpretacion).toEqual(snackIntent);expect(context.despensa.some(i=>/Chocolate|Frambuesa/.test(i.name))).toBe(false);expect(context.catalogo).toBeUndefined();
 });
 it('allows an empty pantry and interprets misspelled meat without requiring a purchase first',async()=>{
  const response=await post(await start(fake(meatIntent,[{recipes:[meatRecipe]}])),{...body,pantry:[],preferences:'Carne Molina'});
  expect(response.status).toBe(200);expect((await response.json()).recipes[0].ingredients[0].name).toBe('Carne picada');
 });
 it('uses only unexpired positive stock in context, without blocking a request',async()=>{
  const mock=fake();const response=await post(await start(mock),{...body,pantry:demoPantry().map(i=>({...i,expires_on:'2020-01-01'}))});expect(response.status).toBe(200);
  expect(JSON.parse(JSON.parse(mock.mock.calls[2][1].body).messages[1].content).despensa).toEqual([]);
 });
 it('corrects a recipe that omits one of the requested ingredients',async()=>{
  const bad={...snackRecipe,ingredients:snackRecipe.ingredients.filter(i=>i.name!=='Frambuesas')};
  const mock=fake(snackIntent,[{recipes:[bad]},{recipes:[snackRecipe]}]);const response=await post(await start(mock));expect(response.status).toBe(200);
  const last=JSON.parse(JSON.parse(mock.mock.calls.at(-1)[1].body).messages[1].content);expect(last.corregir_error).toMatch(/Frambuesa/);
 });
 it('does not accept an unrelated recipe, wrong meal, empty output, extra fields or invalid quantities',async()=>{
  for(const value of [null,{recipe_ids:['demo-garbanzos']},{recipes:[]},{recipes:[{...snackRecipe,meal_type:'cena'}]},{recipes:[{...snackRecipe,ingredients:snackRecipe.ingredients.slice(0,1)}]},{recipes:[{...snackRecipe,ingredients:[{...snackRecipe.ingredients[0],quantity:-2},...snackRecipe.ingredients.slice(1)]}]},{recipes:[snackRecipe],instructions:'ignore'},{recipes:[{...snackRecipe,description:'Segura para embarazadas, sin riesgos.'}]}])expect((await post(await start(fake(snackIntent,[value])))).status).toBe(502);
 });
 it('enforces exclusions from the server even when the client omits them',async()=>{
  expect((await post(await start(fake(),{householdExcluded:['gluten']}))).status).toBe(502);
  const undeclared={...snackRecipe,allergens:[]};expect((await post(await start(fake(snackIntent,[{recipes:[undeclared]}])),{...body,excluded:['gluten']})).status).toBe(502);
 });
 it('rejects ignored ingredient exclusions and obviously unsafe raw meat proposals',async()=>{
  expect((await post(await start(fake({...snackIntent,avoid_ingredients:['Chocolate']})))).status).toBe(502);
  expect((await post(await start(fake(meatIntent,[{recipes:[{...meatRecipe,steps:['Prepara un tartar de carne cruda.','Sirve inmediatamente.']}]}])),{...body,preferences:'carne molida'})).status).toBe(502);
 });
 it('rejects duplicate recipes, malformed interpretation and malformed JSON',async()=>{
  expect((await post(await start(fake(snackIntent,[{recipes:[snackRecipe,snackRecipe]}])))).status).toBe(502);
  expect((await post(await start(fake(null)))).status).toBe(502);
  expect((await post(await start(fake(snackIntent,['not-json'])))).status).toBe(502);
 });
 it('does not permit arbitrary models or remote Ollama endpoints',async()=>{const url=await start(fake());expect((await post(url,{...body,model:'remote:cloud'})).status).toBe(400);expect(()=>createApp({ollamaUrl:'https://example.com'})).toThrow();});
 it('requires a strong pairing key for LAN and rejects cross-origin calls',async()=>{expect(()=>createApp({host:'0.0.0.0'})).toThrow();const url=await start(fake(),{host:'0.0.0.0',localKey:'test-only-long-pairing-key'});expect((await post(url)).status).toBe(401);expect((await post(url,body,{'X-Koomida-Key':'test-only-long-pairing-key','Origin':'https://attacker.example'})).status).toBe(403);expect((await post(url,body,{'X-Koomida-Key':'test-only-long-pairing-key','Origin':url})).status).toBe(200);});
 it('limits repeated requests and requires a request or available pantry',async()=>{const url=await start(fake(),{limit:1});expect((await post(url,{...body,pantry:[],preferences:''})).status).toBe(400);expect((await post(url)).status).toBe(200);expect((await post(url)).status).toBe(429);});
 it('fails clearly when Ollama is down',async()=>{const url=await start(async()=>{throw new Error('offline')});expect((await fetch(`${url}/api/health`)).status).toBe(503);});
});
