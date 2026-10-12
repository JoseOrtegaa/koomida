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
- Ollama devuelve de cero a tres recetas del catálogo: primero respeta tu petición (por ejemplo, «quiero un snack») y después la despensa. Muestra ingredientes faltantes; no sustituye una búsqueda sin resultados por la receta más disponible. Las recetas siguen disponibles aunque Ollama esté apagado.

## Embarazo: alcance deliberadamente limitado

**Un prompt no es una garantía de seguridad alimentaria.** La IA únicamente puede devolver hasta tres identificadores de recetas fijas. El servidor valida ese identificador y devuelve sus ingredientes y pasos originales; cualquier contenido añadido por el modelo se rechaza. No existe un endpoint de generación libre de recetas.

Las recetas se contrastaron con pautas oficiales generales el 11/10/2026; **no tienen validación clínica** y no constituyen una dieta completa. La app no verifica conservación real, contaminación cruzada, marcas, trazas, alertas vigentes ni restricciones médicas individuales. Antes del uso alimentario personal, contrastar las recetas con las indicaciones de la matrona/médico, especialmente si hay alergias, celiaquía, diabetes gestacional u otra dieta pautada. No subir informes médicos al repositorio.

Fuentes: [Ministerio de Consumo](https://www.dsca.gob.es/es/consumo/novedades/recomendaciones/recomendaciones-alimentarias/alimentacion-embarazo), [AESAN: alimentación segura durante el embarazo](https://www.aesan.gob.es/AECOSAN/docs/documentos/para_consumidor/alimentacion_segura_embarazo.pdf). La política es conservadora: el catálogo no incluye pescado, carnes curadas, alcohol ni preparaciones crudas de origen animal. Eso limita este catálogo de ejemplo; no significa que todos los alimentos ausentes estén prohibidos.

## Desarrollo y verificación

```bash
npm run dev    # interfaz en localhost:5173 y API en :8787
npm test       # UI con jsdom, dominio, API con Ollama simulado y SQL con PGlite
npm run build  # producción en dist/
```

`src/`: interfaz, catálogo y adaptadores demo/Supabase. `shared/`: reglas de inventario, alérgenos e identificadores. `server/`: servidor Node y puente a Ollama. `supabase/migrations/`: tablas y permisos. No hay frameworks de backend adicionales.

La IA tiene un máximo de 45 s de espera, una solicitud simultánea y 12 intentos por hora por proceso. Qwen usa `think:false`, contexto de 4096 tokens y salida de hasta 160 tokens. No se descarga ni cambia ningún modelo automáticamente. Los límites se reinician al reiniciar el servidor: son protección doméstica, no una solución de servicio público.

La CI ejecuta pruebas y build, sin credenciales. La suite SQL comprueba aislamiento entre cuentas, rechazo de acceso anónimo, descuento y rollback. La suite API verifica filtros y rechazo de contenido inventado con dobles de prueba, no con tu Ollama real. La velocidad real y Safari/iPhone requieren validación en tu PC. No se han ejecutado pruebas visuales en un navegador real en este entorno.
