// @vitest-environment node
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
let db;
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002';
async function asUser(id,query){await db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`);return db.exec(query);}
beforeAll(async()=>{
 db=new PGlite();await db.exec(`create schema auth; create role anon; create role authenticated; create table auth.users(id uuid primary key); insert into auth.users values('${A}'),('${B}');create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth,public to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
 const file=(await readdir('supabase/migrations')).find(f=>f.endsWith('.sql'));await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
},20000);
afterAll(async()=>{await db?.close();});
describe('Postgres RLS and transactions',()=>{
 it('isolates private inventory and disallows owner reassignment',async()=>{
  await asUser(A,`insert into public.pantry_items(user_id,name,quantity,unit,category) values('${A}','Tomate',1,'kg','Verduras');`);
  const result=await asUser(B,'select * from public.pantry_items;');expect(result[0].rows).toHaveLength(0);
  await expect(asUser(B,`insert into public.pantry_items(user_id,name,quantity,unit,category) values('${A}','Intrusión',1,'g','Verduras')`)).rejects.toThrow();
  await expect(asUser(A,`update public.pantry_items set user_id='${B}'`)).rejects.toThrow();
 });
 it('deducts the current users compatible quantities atomically',async()=>{
  await asUser(B,`insert into public.pantry_items(user_id,name,quantity,unit,category) values('${B}','Tomate',500,'g','Verduras')`);
  await asUser(A,`select public.cook_recipe('[{"name":"Tomate","quantity":400,"unit":"g"}]'::jsonb);`);
  let result=await asUser(A,'select quantity from public.pantry_items');expect(Number(result[0].rows[0].quantity)).toBe(.6);
  result=await asUser(B,'select quantity from public.pantry_items');expect(Number(result[0].rows[0].quantity)).toBe(500);
  await expect(asUser(A,`select public.cook_recipe('[{"name":"Tomate","quantity":200,"unit":"g"},{"name":"Tomate","quantity":-1,"unit":"g"}]'::jsonb)`)).rejects.toThrow();
  result=await asUser(A,'select quantity from public.pantry_items');expect(Number(result[0].rows[0].quantity)).toBe(.6);
 });
 it('protects favorites and rejects unauthenticated reads and RPC calls',async()=>{
  await asUser(A,`insert into public.favorites values('${A}','demo-garbanzos')`);
  expect((await asUser(B,'select * from public.favorites'))[0].rows).toHaveLength(0);
  await db.exec('reset role;set role anon;');await expect(db.exec('select * from public.pantry_items')).rejects.toThrow();
  await expect(db.exec(`select public.cook_recipe('[{"name":"Tomate","quantity":1,"unit":"g"}]')`)).rejects.toThrow();
 });
});
