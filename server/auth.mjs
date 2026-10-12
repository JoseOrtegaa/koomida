import {createClient} from '@supabase/supabase-js';

// Ask Auth to validate the bearer token; never trust a decoded JWT or browser user id.
export function createAuthenticator(url,key){
 if(!url||!key)return async()=>null;
 const endpoint=new URL(url);
 if(endpoint.protocol!=='https:')throw new Error('Supabase requiere una URL HTTPS.');
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(8000)})}});
 return async token=>{
  try{const {data,error}=await client.auth.getUser(token);return !error&&data.user&&!data.user.is_anonymous?data.user:null;}catch{return null;}
 };
}
