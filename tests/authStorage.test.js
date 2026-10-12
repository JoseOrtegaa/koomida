import {beforeEach,afterEach,describe,it,expect} from 'vitest';
import {authStorage} from '../src/lib/authStorage.js';

// Exercise the adapter across simulated app restarts and storage loss.
const originalIndexedDB=globalThis.indexedDB;
function memoryIndexedDB() {
 const values=new Map();
 const db={
  createObjectStore(){},close(){},
  transaction(){
   const tx={oncomplete:null,onerror:null,onabort:null,objectStore(){return {
    get(key){return perform(()=>values.get(key));},
    put(value,key){return perform(()=>values.set(key,value));},
    delete(key){return perform(()=>values.delete(key));},
   };}};
   function perform(action){const request={onsuccess:null,result:undefined};queueMicrotask(()=>{request.result=action();request.onsuccess?.();tx.oncomplete?.();});return request;}
   return tx;
  },
 };
 return {open(){const request={result:db,onupgradeneeded:null,onsuccess:null};queueMicrotask(()=>{request.onupgradeneeded?.();request.onsuccess?.();});return request;}};
}
beforeEach(()=>{globalThis.indexedDB=memoryIndexedDB();localStorage.clear();});
afterEach(()=>{globalThis.indexedDB=originalIndexedDB;localStorage.clear();});

describe('almacenamiento de sesión',()=>{
 it('recupera el token desde IndexedDB si localStorage desaparece',async()=>{
  await authStorage.setItem('sesion-prueba','token-prueba');
  expect(localStorage.getItem('sesion-prueba')).toBe('token-prueba');
  localStorage.clear();
  expect(await authStorage.getItem('sesion-prueba')).toBe('token-prueba');
 });
 it('el cierre de sesión borra ambas copias',async()=>{
  await authStorage.setItem('sesion-prueba','token-prueba');
  await authStorage.removeItem('sesion-prueba');
  expect(localStorage.getItem('sesion-prueba')).toBeNull();
  expect(await authStorage.getItem('sesion-prueba')).toBeNull();
 });
});
