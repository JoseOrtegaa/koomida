import {parseExclusions} from '../shared/safety.js';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {networkInterfaces} from 'node:os';
const path='.env.local';
if(existsSync(path)){console.log('Ya existe .env.local. Se conserva sin cambios. Consulta el README para editarlo.');process.exit(0);}
const exclusions=parseExclusions(process.argv.find(a=>a.startsWith('--exclude='))?.slice(10)||'').join(',');
const key=randomBytes(24).toString('base64url');
const publicConfig=readFileSync('.env.example','utf8').split('\n').filter(line=>/^VITE_SUPABASE_(URL|PUBLISHABLE_KEY)=/.test(line)).join('\n');
writeFileSync(path,`${publicConfig}\nOLLAMA_URL=http://127.0.0.1:11434\nPORT=8787\nHOST=0.0.0.0\nHOUSEHOLD_EXCLUDED_ALLERGENS=${exclusions}\nVITE_HOUSEHOLD_EXCLUDED_ALLERGENS=${exclusions}\nKOOMIDA_LOCAL_KEY=${key}\n`,{mode:0o600,flag:'wx'});
console.log('Configuración creada en .env.local (excluida de Git).');
console.log('Clave local para Ajustes de Koomida en el iPhone:');
console.log(key);
try{for(const address of Object.values(networkInterfaces()).flat().filter(n=>n?.family==='IPv4'&&!n.internal))console.log(`Después de npm run build y npm start: http://${address.address}:8787`);}catch{console.log('Consulta la IP de tu PC con ipconfig y abre http://IP-DEL-PC:8787');}
console.log('Permite Node en el firewall solo para redes privadas. No abras puertos del router.');
