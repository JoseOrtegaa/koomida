# Koomida — trabajo proporcional

- Lee README.md y el código afectado. Evita documentación adicional salvo decisiones necesarias.
- Mantén React + Supabase y el puente Node a Ollama local. No añadas servicios de pago sin autorización explícita.
- Modo embarazo: catálogo cerrado. La IA nunca redacta, modifica o certifica recetas. Toda ampliación exige revisar ingredientes, alérgenos y pasos contra fuentes oficiales, más indicaciones clínicas cuando existan. No conviertas un filtro por palabras en una garantía de seguridad.
- No subas .env, credenciales, claves locales, datos reales ni informes médicos. Usa placeholders y datos sintéticos.
- Supabase: RLS en todas las tablas públicas, auth.uid() para propiedad, funciones invoker y permisos explícitos. Nunca claves service_role en frontend.
- Comprueba solo los riesgos del cambio. npm test y npm run build son la verificación base. No afirmes haber probado iPhone u Ollama real si no se ha hecho.
- Mantén la documentación breve y el diseño móvil. No necesitas un workflow multiagente para cambios pequeños.
