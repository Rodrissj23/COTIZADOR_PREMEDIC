# Cotizador Premedic

Cotizador comercial web de Premedic en HTML, CSS y JavaScript.

## Estado
Directos y Desregulados, AMBA e Interior, actualizados a noviembre de 2026.

Actualización del 19/10/2026: 396 importes contrastados con las cuatro nóminas enviadas. La nueva nómina Desregulados AMBA reemplaza la recibida el 16/10 porque sus valores difieren. Las promociones se conservan por indicación de Rodri, aunque las nóminas contienen una nota de suspensión de bonificaciones.

## Reglas incluidas
- FLASH25: 25% permanente para planes 300/400/500 en AMBA y Córdoba. Admisión de Directos hasta el 20/11/2026 y de Desregulados hasta el 31/10/2026, inclusive, con fecha de Argentina. Se aplica antes de descontar los aportes y no se acumula con otros beneficios. La fecha de admisión no limita la permanencia del descuento otorgado.
- El cotizador no contiene una promoción de orden de compra de Vital activa.
- Planes: C-100, 200, 300, 400, 500 y PMO.
- C-100 disponible únicamente en AMBA.
- Modalidades Directo y Desregulado con tarifarios propios.
- Zonas AMBA e Interior.
- Tramos: 1–29, 30–39, 40–49 y 50–59 años.
- Límite comercial: hasta 59 años y 11 meses.
- Pareja: se utiliza la edad del integrante mayor.
- Hijos contemplados hasta 24 años y 11 meses.
- Menor de 1 año utiliza el adicional específico de la lista.
- Pareja + 1/2/3 hijos usa la tarifa familiar específica; desde el cuarto hijo se agregan adicionales.
- Desregulado: se ingresa el ítem de obra social del recibo. El motor calcula el aporte a descontar multiplicándolo por 2,33, como indica el cotizador original, y redondea a centavos. La pantalla distingue importe ingresado y aporte a descontar.
- Premedic no aplica tope adicional de aporte/base en este motor.
- El aporte se descuenta del valor del plan y el resultado nunca puede ser negativo.
- PMO se habilita cuando `aporte computable total ÷ cantidad de integrantes >= $15.000`.
- PMO informa valor mensual a abonar de $0 cuando se cumple esa condición.
- Cotización válida por 72 hs hábiles desde su emisión.

## PDF
- Vista previa formal de 4 páginas.
- Descarga directa, sin diálogo de impresión.
- Nombre de archivo: `Cotizacion Premedic (Nombre del cliente).pdf`.
- DNI y datos del asesor son opcionales.
- PMO posee una propuesta formal propia y no hereda beneficios de otro plan.

## Seguridad
El proyecto incluye autenticación para Cloudflare Pages Functions y Netlify Functions/Edge Functions.
Las credenciales se configuran mediante variables de entorno y la sesión usa cookie segura firmada por servidor.

Los archivos del tarifario no deben quedar accesibles sin autenticación en el deployment de producción. Si las tarifas son confidenciales, el repositorio también debe mantenerse privado y no publicarse por GitHub Pages.

## QA
El cambio de beneficio actualiza tanto el precio como su desglose, incluso antes de elegir un plan. **Limpiar** restablece el beneficio a “Sin beneficio” y la categoría de monotributo a A. Al recalcular se liberan los filtros del plan elegido anteriormente.

El workflow `Premedic QA` verifica en cada cambio a `main`:
- sintaxis y reglas del motor;
- estructura completa del tarifario cargado;
- PMO y umbral por integrante;
- composición familiar y adicionales;
- cotización formal de todos los planes;
- autenticación y middleware;
- navegación real con Chromium;
- responsive desktop/mobile;
- descarga real del PDF;
- capturas visuales de control.

## Actualización mensual
Para un cambio de vigencia:
1. reemplazar los valores de `js/precios-premedic.js` contra la lista oficial;
2. actualizar `vigencias[modalidad][zona]` (o `vigencia` cuando todas las tablas compartan mes);
3. revisar beneficios sólo si cambió la documentación oficial;
4. abrir un PR y esperar que `Premedic QA` quede en verde;
5. revisar los artefactos visuales antes de publicar.

## Administración desde Zeroka Control

Ver [conexión, publicación y actualización de precios y promociones](docs/ZEROKA_CONTROL.md).
