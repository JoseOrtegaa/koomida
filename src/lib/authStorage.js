// Supabase accepts asynchronous storage. Keep a second local copy so a WebKit
// Home Screen app can recover a session if one storage backend loses its data.
const DATABASE = 'koomida-auth';
const STORE = 'sessions';

function database() {
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined')return reject(new Error('IndexedDB no disponible'));
  const request=indexedDB.open(DATABASE,1);
  request.onupgradeneeded=()=>request.result.createObjectStore(STORE);
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
  request.onblocked=()=>reject(new Error('IndexedDB bloqueado'));
 });
}

async function stored(mode,operation,key,value) {
 const db=await database();
 try {
  return await new Promise((resolve,reject)=>{
   const transaction=db.transaction(STORE,mode);
   const store=transaction.objectStore(STORE);
   const request=operation==='get'?store.get(key):operation==='put'?store.put(value,key):store.delete(key);
   let result;
   request.onsuccess=()=>{result=request.result;};
   transaction.oncomplete=()=>resolve(result);
   transaction.onerror=()=>reject(transaction.error);
   transaction.onabort=()=>reject(transaction.error||new Error('Operación cancelada'));
  });
 } finally { db.close(); }
}

export const authStorage={
 async getItem(key) {
  try { const value=localStorage.getItem(key);if(value!==null)return value; } catch { /* Try IndexedDB. */ }
  try { return await stored('readonly','get',key)??null; } catch { return null; }
 },
 async setItem(key,value) {
  let localSaved=false;
  try { localStorage.setItem(key,value);localSaved=true; } catch { /* Try IndexedDB. */ }
  try { await stored('readwrite','put',key,value); } catch(error) {
   if(!localSaved)throw new Error('No se pudo guardar la sesión en este dispositivo.',{cause:error});
  }
 },
 async removeItem(key) {
  let localRemoved=false;
  try { localStorage.removeItem(key);localRemoved=true; } catch { /* Try IndexedDB. */ }
  try { await stored('readwrite','delete',key); } catch(error) {
   if(!localRemoved)throw new Error('No se pudo borrar la sesión de este dispositivo.',{cause:error});
  }
 },
};

export async function requestPersistentStorage() {
 try { if(navigator.storage?.persist)await navigator.storage.persist(); } catch { /* Best effort; Auth still uses its storage. */ }
}
