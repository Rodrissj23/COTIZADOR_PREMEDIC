# Cotizador Premedic

Cotizador comercial web de Premedic en HTML, CSS y JavaScript.

## Estado
Versión funcional auditada para Septiembre 2026.

> La lógica comercial, navegación, PMO, aportes, responsive, autenticación y generación de PDF cuentan con QA automático. La comparación final contra las listas oficiales de precios y los PDFs oficiales de beneficios queda pendiente hasta disponer nuevamente de esas fuentes.

## Reglas incluidas
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
- Desregulado: aporte computable = `(aporte del recibo ÷ 3) × 7,65`.
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
2. actualizar `vigencia`;
3. revisar beneficios sólo si cambió la documentación oficial;
4. abrir un PR y esperar que `Premedic QA` quede en verde;
5. revisar los artefactos visuales antes de publicar.
