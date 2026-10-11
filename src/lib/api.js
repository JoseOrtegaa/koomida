export async function localApi(path,options={}) {
 const response=await fetch(`/api/${path}`,{...options,headers:{'Content-Type':'application/json','X-Koomida-Key':sessionStorage.getItem('koomida-local-key')||'',...options.headers}});
 let body;try{body=await response.json();}catch{throw new Error('El servidor local de Koomida no está disponible. Inícialo en tu PC.');}
 if(!response.ok)throw new Error(body.error||'No se pudo conectar con tu PC.');return body;
}
