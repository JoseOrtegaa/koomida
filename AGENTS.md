# Koomida

- Lee README.md y el código afectado. Mantén React + Supabase y una web estática publicable en GitHub Pages.
- No añadas servicios de pago sin autorización explícita. El recetario actual es fijo; no introduzcas generación de recetas sin una decisión posterior del usuario.
- No subas `.env.local`, credenciales, claves secretas, datos reales ni informes médicos. La clave `sb_publishable_...` es pública.
- Supabase: RLS en todas las tablas públicas, `auth.uid()` para propiedad, funciones invoker y permisos explícitos. Nunca claves `service_role` en frontend.
- Respeta exclusiones, pero no certifiques seguridad alimentaria con filtros. Usa pautas oficiales de preparación y no presentes la app como sustituto de indicaciones clínicas.
- Comprueba los riesgos del cambio con `npm test` y `npm run build`. Mantén diseño móvil.
