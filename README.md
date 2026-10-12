# Koomida

Una despensa sencilla y un recetario para comer con lo que tienes. React + Supabase + Ollama local. Diseño original con ilustraciones SVG, adaptado a móvil y escritorio.

## Arranque rápido (Windows, macOS o Linux)

Requisitos: Node.js 22.12+ y Ollama actualizado. No hace falta Docker para probar la app.

```bash
npm ci
npm run setup
npm run build
npm start
```

`setup` crea `.env.local` sin sobreescribir configuraciones previas, incluye la URL y clave pública de Supabase y genera una clave local aleatoria. Puedes añadir `-- --exclude=ALÉRGENO` al comando para imponer una exclusión privada en el servidor; consulta `shared/safety.js` para los nombres admitidos. Muestra la URL del PC y la clave: en el iPhone, conectado a la misma Wi-Fi, abre esa URL en Safari. En **Ajustes → Ollama**, introduce la clave, pulsa **Guardar clave local** y después **Comprobar conexión**. Abre Ollama en el PC y selecciona `qwen3:4b` (preferido) o `qwen3:8b`.

Si Windows pregunta por el firewall, permite Node solo en redes privadas. El PC debe seguir encendido. **No abras puertos del router ni expongas Ollama a Internet**. Ollama sigue escuchando en localhost; solo Koomida escucha en la LAN. La conexión LAN de esta versión usa HTTP: úsala exclusivamente en una red de confianza; para publicación o redes no confiables, requiere HTTPS y autenticación adicional. No es todavía una PWA sin conexión.

Sin Supabase, la app funciona como **demo local**, con datos de prueba persistidos en ese navegador. PC e iPhone tendrán demos independientes. La demo y una cuenta real no mezclan datos.

## Conectar Supabase

El proyecto en J.org (París) ya tiene las migraciones aplicadas. `setup` copia su URL y su clave **publishable** a `.env.local`. Esa clave es pública por diseño; las contraseñas de base de datos y claves secret/service_role no forman parte de la app ni del repositorio. No subas `.env.local` a Git.

Supabase Auth usa correo/contraseña y exige confirmar la cuenta por correo. La Site URL está configurada como `http://localhost:8787`: abre el enlace de confirmación en el PC donde se ejecuta Koomida, y luego inicia sesión desde el PC o iPhone. Si abres ese enlace en el iPhone, `localhost` apunta al teléfono y no abrirá Koomida; vuelve a la URL del PC tras confirmar. La entrega del correo depende del proveedor de email de Supabase; para uso más amplio necesitarás configurar SMTP y una URL HTTPS estable. La despensa real empieza vacía.

Cada cuenta tiene su propia despensa y favoritos, protegidos con RLS. No hay invitaciones ni hogares compartidos en este MVP. Puedes fijar exclusiones para todo el hogar con `npm run setup -- --exclude=ALERGENO` al crear la configuración. Se guardan en `.env.local`, no en Git. El servidor las impone aunque un cliente omita sus filtros. Si editas la configuración, mantén iguales `HOUSEHOLD_EXCLUDED_ALLERGENS` y `VITE_HOUSEHOLD_EXCLUDED_ALLERGENS` y recompila. Los filtros adicionales de la interfaz son locales a cada navegador. No se almacenan historiales clínicos.

## Qué hace

- Despensa: alta, edición, eliminación, cantidades aproximadas y caducidad opcional.
- Compra por texto: pega `ingrediente;cantidad;unidad`, revisa y confirma hasta 40 líneas. No hay OCR de fotografías.
- Ocho recetas de prueba para dos personas, búsqueda, filtros, coincidencia de ingredientes y favoritos.
- «La he preparado»: confirmación y descuento aproximado, atómico en Supabase. Respeta unidades compatibles, prioriza lotes con fecha próxima y no descuenta alimentos con fecha vencida.
- Ollama interpreta la petición y genera de una a dos recetas nuevas. Los ingredientes pedidos son obligatorios aunque no figuren en la despensa (incluye correcciones como «carne molina» → carne picada). Aprovecha el inventario para reducir compras; también funciona con despensa vacía si escribes una petición. Muestra ingredientes no registrados para comprobar o comprar. No busca en Internet. Las recetas siguen disponibles aunque Ollama esté apagado.

## Propuestas de IA y precauciones de preparación

El recetario fijo sigue disponible sin IA. Las propuestas nuevas de Ollama se identifican como **propuestas IA sin revisión individual**: no son recetas clínicamente validadas ni certifican seguridad o ausencia de alérgenos/trazas. Comprueba ingredientes, cantidades, etiquetas y preparación antes de cocinar; sigue las indicaciones del profesional que lleva el embarazo.

La API usa dos respuestas estructuradas: interpretación (tipo de comida, ingredientes pedidos y evitados) y generación. Valida cantidades/unidades/pasos, exige los ingredientes pedidos, respeta las exclusiones del hogar y rechaza formatos incompletos. Un intento de corrección automática puede resolver una propuesta inválida; no se devuelve una receta del catálogo como sustituto silencioso. Los filtros adicionales son una ayuda, nunca una garantía de seguridad alimentaria. Alérgenos declarados por el modelo y detección adicional son orientativos; pueden ser incompletos.

El prompt aplica pautas generales consultadas el 12/10/2026: lácteos pasteurizados, lavar frutas/verduras, separar utensilios crudos, cocción completa (carne/pescado a más de 70 °C durante al menos 2 minutos en el centro; huevo cuajado), evitar alcohol y preparaciones crudas de origen animal. No garantiza que cada receta cumpla esas pautas: requiere revisión humana. Fuentes: [AESAN, alimentación durante el embarazo](https://www.aesan.gob.es/AECOSAN/docs/documentos/publicaciones/seguridad_alimentaria/embarazadas.pdf), [AESAN, prevención de listeriosis](https://www.aesan.gob.es/AECOSAN/docs/documentos/publicaciones/seguridad_alimentaria/Folleto_LISTERIOSIS.pdf). No se realizan búsquedas externas durante la generación ni se actualizan alertas automáticamente.

Las propuestas generadas quedan en la sesión de consulta; se pueden abrir y usar «La he preparado» para descontar únicamente stock registrado. No se añaden aún a favoritos ni a un recetario persistente.

## Desarrollo y verificación

```bash
npm run dev    # interfaz en localhost:5173 y API en :8787
npm test       # UI con jsdom, dominio, API con Ollama simulado y SQL con PGlite
npm run build  # producción en dist/
```

`src/`: interfaz, catálogo y adaptadores demo/Supabase. `shared/`: reglas de inventario, alérgenos e identificadores. `server/`: servidor Node y puente a Ollama. `supabase/migrations/`: tablas y permisos. No hay frameworks de backend adicionales.

La IA tiene un máximo de 90 s de espera, una solicitud simultánea y 12 intentos por hora por proceso. Qwen usa `think:false`, contexto de 4096 tokens y hasta 220 tokens para interpretar y 1600 para generar. No se descarga ni cambia ningún modelo automáticamente. Los límites se reinician al reiniciar el servidor: son protección doméstica, no una solución de servicio público.

La CI ejecuta pruebas y build, sin credenciales. La suite SQL comprueba aislamiento entre cuentas, rechazo de acceso anónimo, descuento y rollback. La suite API verifica filtros y validación de propuestas generadas con dobles de prueba, no con tu Ollama real. La velocidad real y Safari/iPhone requieren validación en tu PC. No se han ejecutado pruebas visuales en un navegador real en este entorno.
