# Publicación recomendada

## Dirección recomendada
La opción más limpia es:

`premedic.grupozeroka.com`

Si se quiere que la palabra cotizador aparezca en la dirección:

`cotizador-premedic.grupozeroka.com`

También es técnicamente posible usar:

`cotizador.premedic.grupozeroka.com`

El símbolo `@` se usa en direcciones de correo, no en una URL web.

## Infraestructura recomendada
- Repositorio GitHub con una única rama principal de producción.
- Cloudflare Pages conectado al repositorio.
- Dominio personalizado apuntando al proyecto.

El proyecto es estático, por lo que no necesita backend ni base de datos para funcionar.

## Flujo de actualización
1. Actualizar los archivos del proyecto.
2. Subir los cambios al mismo repositorio.
3. Cloudflare Pages publica automáticamente la actualización.
4. Mantener siempre el mismo dominio público.

## Configuración de Cloudflare Pages
Como el proyecto no necesita compilación:
- Framework preset: None / sin framework.
- Build command: vacío.
- Output directory: la raíz del repositorio.

Una vez publicado el proyecto:
1. Abrir el proyecto en Workers & Pages.
2. Ir a Custom domains.
3. Agregar el dominio elegido.
4. Configurar o aceptar el CNAME correspondiente.
5. Opcional: redirigir la dirección técnica `*.pages.dev` al dominio personalizado para que el usuario vea siempre el dominio de Grupo Zeroka.
