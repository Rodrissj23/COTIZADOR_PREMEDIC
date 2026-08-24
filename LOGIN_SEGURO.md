# Login seguro del Cotizador Premedic

El proyecto ya incluye autenticación real tanto para Cloudflare Pages Functions como para Netlify Functions.
Las credenciales NO se guardan en HTML ni JavaScript del navegador.

## Variables necesarias en Cloudflare Pages

Configurar en **Settings > Variables and Secrets** para Production:

- `AUTH_USER` → usuario de acceso definido por Grupo Zeroka.
- `AUTH_PASSWORD` → contraseña de acceso definida por Grupo Zeroka.
- `SESSION_SECRET` → cadena aleatoria larga (mínimo recomendado: 32 caracteres).

Marcar `AUTH_PASSWORD` y `SESSION_SECRET` como secretos cuando la interfaz lo permita.

## Importante

Este login no funciona como autenticación real si el sitio se publica únicamente con GitHub Pages, porque GitHub Pages sirve archivos estáticos y no ejecuta las Functions de este proyecto.

GitHub puede seguir siendo el repositorio. Para que el acceso sea seguro, desplegar el repositorio con **Cloudflare Pages** y configurar allí las variables anteriores.

La sesión dura 8 horas y usa una cookie `HttpOnly`, `Secure` y `SameSite=Strict` firmada por el servidor.

## Alternativa Netlify

El repositorio incluye `netlify.toml`, Functions y una Edge Function de protección. Configurar las mismas tres variables en **Project configuration > Environment variables**, con alcance de Functions, y ejecutar un nuevo deploy. No subir nunca un archivo `.env` al repositorio.
