# La Victoria · Perfumería

Estatico (HTML/CSS/JS) + Supabase. Pedidos por WhatsApp (y registro en tabla `orders`).

## Estructura
index.html · carrito.html · ubicacion.html (paginas publicas) ·
tienda.css (estilo publico) · app.js · carrito.js · ubicacion.js ·
admin.html · admin.css · admin.js (panel) · styles.css (estilo base del admin) ·
config.js · vendor/supabase.js · _headers · supabase/schema.sql

## Puesta en marcha
1. Supabase: crea el proyecto → SQL Editor → pega `supabase/schema.sql` (cambia el correo admin).
2. `config.js`: pon `SUPABASE_URL`, `SUPABASE_ANON_KEY` (solo la anon/publishable), `ADMIN_EMAIL`, `wa`, direccion y horario.
3. GitHub: `git init && git add . && git commit -m "tienda" && git push`.
4. Cloudflare → Workers & Pages → Create → Pages → Connect to Git → elige el repo.
   Framework: None · Build command: (vacio) · Output directory: `/`.

## Panel admin (/admin.html)
1. Supabase → Authentication → Users → Add user: el correo de `ADMIN_EMAIL` con contrasena (marca "Auto confirm user").
2. Supabase → Authentication → Sign In / Providers → desactiva "Allow new users to sign up".
3. Entra a `tu-dominio/admin.html`: productos (crear, editar, eliminar, subir foto), pedidos y pie de pagina.
