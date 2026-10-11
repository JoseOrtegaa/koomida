// @vitest-environment node
import {describe,it,expect,afterEach,vi} from 'vitest';
import {once} from 'node:events';
import {createApp} from '../server/app.mjs';
import {demoPantry,recipes} from '../src/data/recipes.js';
const servers=[];
async function start(fetchImpl,opts={}){const server=createApp({fetchImpl,...opts});server.listen(0,'127.0.0.1');await once(server,'listening');servers.push(server);return `http://127.0.0.1:${server.address().port}`;}
afterEach(async()=>{await Promise.all(servers.splice(0).map(s=>new Promise(r=>{s.closeAllConnections();s.close(r);})))});
const body={model:'qwen3:4b',pantry:demoPantry(),preferences:'algo rápido',excluded:[]};
const fake=(value={recipe_id:'demo-garbanzos'})=>vi.fn(async url=>new Response(JSON.stringify(String(url).endsWith('/api/tags')?{models:[{name:'qwen3:4b'},{name:'remote:cloud'}]}:{message:{content:JSON.stringify(value)}}),{headers:{'Content-Type':'application/json'}}));
const post=(url,data=body,headers={})=>fetch(`${url}/api/recipes`,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(data)});
describe('local Ollama boundary',()=>{
 it('returns the canonical recipe, never model-authored instructions',async()=>{const mock=fake();const url=await start(mock);const response=await post(url);expect(response.status).toBe(200);expect((await response.json()).recipe).toEqual(recipes[0]);const request=JSON.parse(mock.mock.calls[1][1].body);expect(request.think).toBe(false);expect(request.options.num_predict).toBe(80);});
 it('blocks unknown IDs, injected steps and excluded allergens',async()=>{for(const value of [{recipe_id:'sushi'},{recipe_id:'demo-garbanzos',steps:['comer crudo']},{recipe_id:'demo-pasta'}]){const url=await start(fake(value));const response=await post(url,{...body,excluded:['gluten']});expect(response.status).toBe(502);}});
 it('enforces household restrictions even if the client omits them',async()=>{const url=await start(fake({recipe_id:'demo-pasta'}),{householdExcluded:['gluten']});expect((await post(url,{...body,excluded:[]})).status).toBe(502);});
 it('does not permit arbitrary models or remote Ollama endpoints',async()=>{const url=await start(fake());expect((await post(url,{...body,model:'remote:cloud'})).status).toBe(400);expect(()=>createApp({ollamaUrl:'https://example.com'})).toThrow();});
 it('requires a strong pairing key for LAN and rejects cross-origin calls',async()=>{expect(()=>createApp({host:'0.0.0.0'})).toThrow();const url=await start(fake(),{host:'0.0.0.0',localKey:'test-only-long-pairing-key'});expect((await post(url)).status).toBe(401);expect((await post(url,body,{'X-Koomida-Key':'test-only-long-pairing-key','Origin':'https://attacker.example'})).status).toBe(403);expect((await post(url,body,{'X-Koomida-Key':'test-only-long-pairing-key','Origin':url})).status).toBe(200);});
 it('limits repeated requests and rejects malformed inputs',async()=>{const url=await start(fake(),{limit:1});expect((await post(url,{...body,pantry:[]})).status).toBe(400);expect((await post(url)).status).toBe(200);expect((await post(url)).status).toBe(429);});
 it('fails closed when Ollama is down',async()=>{const url=await start(async()=>{throw new Error('offline')});const response=await fetch(`${url}/api/health`);expect(response.status).toBe(503);expect((await response.json()).online).toBe(false);});
});
