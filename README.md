# Koomida

Recetario web y despensa privada con React, Vite y Supabase. La web se puede alojar en GitHub Pages; no necesita un servidor en tu PC.

## Probar en local

Requiere Node.js 22.12+.

```bash
npm ci
npm run setup
npm run dev
```

`setup` copia la configuración pública de `.env.example` a `.env.local` si todavía no existe. Nunca añadas claves secretas ni `service_role` al cliente. La clave `sb_publishable_...` es pública por diseño.

## GitHub Pages

El workflow `.github/workflows/pages.yml` ejecuta las pruebas, construye la web con base `/koomida/` y publica `dist/` al hacer push a `main`. En el repositorio, configura **Settings → Pages → Build and deployment → Source: GitHub Actions**. La URL prevista es `https://joseortegaa.github.io/koomida/`.

Supabase Auth debe permitir `https://joseortegaa.github.io/koomida/` en **Authentication → URL Configuration → Redirect URLs** para confirmaciones de cuentas nuevas; `emailRedirectTo` apunta a esa URL. El inicio de sesión con contraseña de cuentas ya confirmadas usa Supabase directamente. Si aún está configurada como Site URL `http://localhost:8787`, conviene cambiarla a la dirección publicada. Esto no altera los datos existentes.

## Funciones

- Catálogo público de ocho recetas de ejemplo, con pasos, ingredientes y fuente de precauciones alimentarias.
- Login con Supabase Auth; despensa, favoritos y ajustes privados para cada cuenta mediante RLS.
- Lista de compra por texto, cantidades aproximadas, fechas de caducidad, búsqueda y comparación de ingredientes con la despensa.
- Confirmación antes de descontar stock al cocinar. Comprueba cantidades y envases antes de preparar la receta.
- Exclusiones de alérgenos configurables por cuenta y navegador. Estos filtros no certifican ausencia de trazas ni reemplazan indicaciones clínicas. Las recetas no están validadas por un profesional sanitario.

Las preferencias de filtros guardadas en el navegador anterior no se transfieren automáticamente al dominio de Pages; vuelve a seleccionarlas en Ajustes. Los datos de despensa y favoritos sí están en Supabase.

## Verificación

```bash
npm test
npm run build
```

La aplicación ya no incluye generación de recetas, API local ni dependencia de Ollama. Más adelante se puede ampliar el catálogo sin inventar recetas durante el uso.
