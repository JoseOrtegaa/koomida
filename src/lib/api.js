import {supabase} from './store.js';
export async function localApi(path,options={}) {
 const {data,error}=supabase?await supabase.auth.getSession():{data:null,error:true};
 if(error||!data?.session?.access_token)throw new Error('Inicia sesión para usar las recomendaciones.');
 const response=await fetch(`/api/${path}`,{...options,headers:{'Content-Type':'application/json','Authorization':`Bearer ${data.session.access_token}`,'X-Koomida-Key':sessionStorage.getItem('koomida-local-key')||'',...options.headers}});
 let body;try{body=await response.json();}catch{throw new Error('El servidor local de Koomida no está disponible. Inícialo en tu PC.');}
 if(!response.ok)throw new Error(body.error||'No se pudo conectar con tu PC.');return body;
}
