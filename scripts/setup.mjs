import {existsSync,copyFileSync} from 'node:fs';
if(existsSync('.env.local')) {
 console.log('.env.local ya existe; se conserva sin cambios.');
} else {
 copyFileSync('.env.example','.env.local');
 console.log('Configuración pública copiada a .env.local.');
}
