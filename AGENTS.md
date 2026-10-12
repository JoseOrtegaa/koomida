# Koomida — trabajo proporcional

- Lee README.md y el código afectado. Evita documentación adicional salvo decisiones necesarias.
- Mantén React + Supabase y el puente Node a Ollama local. No añadas servicios de pago sin autorización explícita.
- La petición del usuario autoriza recetas nuevas de Ollama, con ingredientes pedidos aunque falten en la despensa. Mantén separadas las propuestas IA sin revisión individual y el recetario fijo. Respeta exclusiones; valida estructura e ingredientes solicitados. Nunca certifiques seguridad alimentaria con prompts o filtros por palabras. Usa pautas oficiales de preparación y no presentes la IA como sustituto de indicaciones clínicas.
- No subas .env, credenciales, claves locales, datos reales ni informes médicos. Usa placeholders y datos sintéticos.
- Supabase: RLS en todas las tablas públicas, auth.uid() para propiedad, funciones invoker y permisos explícitos. Nunca claves service_role en frontend.
- Comprueba solo los riesgos del cambio. npm test y npm run build son la verificación base. No afirmes haber probado iPhone u Ollama real si no se ha hecho.
- Mantén la documentación breve y el diseño móvil. No necesitas un workflow multiagente para cambios pequeños.
