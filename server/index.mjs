import { parseExclusions } from '../shared/safety.js';
import { createApp } from './app.mjs';
const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||8787);
const server=createApp({host,ollamaUrl:process.env.OLLAMA_URL||'http://127.0.0.1:11434',localKey:process.env.KOOMIDA_LOCAL_KEY||'',householdExcluded:parseExclusions(process.env.HOUSEHOLD_EXCLUDED_ALLERGENS||'')});
server.listen(port,host,()=>console.log(`Koomida: http://${host}:${port} · Ollama local`));
