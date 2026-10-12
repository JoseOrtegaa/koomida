import { uuid } from '../../shared/uuid.js';
import { createClient } from '@supabase/supabase-js';
import { demoPantry } from '../data/recipes.js';
import { validItem, deductionPreview } from '../../shared/domain.js';
const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase=url&&key?createClient(url,key,{auth:{storage:typeof window==='undefined'?undefined:window.sessionStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
const DEMO_KEY='koomida-demo-v1';
const blank=()=>({pantry:demoPantry(),favorites:[],saved:[]});
export function readDemo() {
 try{const parsed=JSON.parse(localStorage.getItem(DEMO_KEY));if(parsed&&Array.isArray(parsed.pantry)&&Array.isArray(parsed.favorites)&&Array.isArray(parsed.saved))return parsed;}catch{/* Start a new local demo if storage was cleared. */}return blank();
}
export function demoStore() {
 let data=readDemo();const persist=()=>{try{localStorage.setItem(DEMO_KEY,JSON.stringify(data));}catch{throw new Error('No hay espacio para guardar en este navegador. Libera espacio antes de continuar.');}};
 const commit=next=>{const previous=data;data=next;try{persist();}catch(e){data=previous;throw e;}};
 return {
  load:async()=>structuredClone(data),
  saveItem:async item=>{const clean=validItem(item);const saved={...clean,id:clean.id||uuid()};commit({...data,pantry:[...data.pantry.filter(p=>p.id!==saved.id),saved]});},
  removeItem:async id=>commit({...data,pantry:data.pantry.filter(p=>p.id!==id)}),
  addPurchase:async items=>commit({...data,pantry:[...data.pantry,...items.map(i=>({...validItem(i),id:uuid()}))]}),
  favorite:async id=>commit({...data,favorites:data.favorites.includes(id)?data.favorites.filter(x=>x!==id):[...data.favorites,id]}),
  saveRecipe:async recipe=>{if(data.saved.some(r=>r.id===recipe.id))return;commit({...data,saved:[recipe,...data.saved]});},
  cook:async recipe=>{const result=deductionPreview(recipe,data.pantry);commit({...data,pantry:result.pantry});},
 };
}
const check=({data,error})=>{if(error)throw new Error(error.message);return data;};
export function cloudStore(userId) {
 const own=table=>supabase.from(table);
 return {
  load:async()=>{
   const [pantry,favorites]=await Promise.all([own('pantry_items').select('*').eq('user_id',userId).order('created_at'),own('favorites').select('recipe_id').eq('user_id',userId)]);
   return {pantry:check(pantry),favorites:check(favorites).map(x=>x.recipe_id),saved:[]};
  },
  saveItem:async item=>{const c=validItem(item);const row={name:c.name,quantity:c.quantity,unit:c.unit,category:c.category,expires_on:c.expires_on,user_id:userId};check(c.id?await own('pantry_items').update(row).eq('id',c.id).eq('user_id',userId).select().single():await own('pantry_items').insert(row));},
  removeItem:async id=>check(await own('pantry_items').delete().eq('id',id).eq('user_id',userId)),
  addPurchase:async items=>check(await own('pantry_items').insert(items.map(i=>({...validItem(i),user_id:userId})))),
  favorite:async(id,isFavorite)=>check(isFavorite?await own('favorites').delete().eq('user_id',userId).eq('recipe_id',id):await own('favorites').insert({user_id:userId,recipe_id:id})),
  cook:async recipe=>check(await supabase.rpc('cook_recipe',{ingredients:recipe.ingredients})),
 };
}
