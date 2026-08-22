# Auditoría final

Se validó sintaxis JavaScript y una batería automática de 23 casos sobre el motor y la cotización formal.

## Casos cubiertos
- Directo AMBA.
- Directo Interior.
- Desregulado AMBA.
- Desregulado Interior.
- Cambio de tramo a 30 años.
- Tramo 50–59.
- Rechazo de 60 años.
- C-100 disponible en AMBA y oculto en Interior.
- Pareja con edad tarifaria del integrante mayor.
- Titular + hijo.
- Titular + bebé menor de 1 año.
- Pareja + 1 hijo.
- Pareja + 3 hijos.
- Pareja + 4 hijos con adicional.
- Fórmula de aporte: (aporte ÷ 3) × 7,65.
- Resta del aporte al valor del plan.
- Piso de $0 cuando el aporte supera el plan.
- Validación de hijos menores de 25 años.
- Nombre requerido para generar la cotización.
- Documento formal con aporte, total y vigencia de 72 hs hábiles.

Resultado: 23/23 pruebas superadas.

## Rediseño de cotización formal
- Se unificaron "Datos del cliente" y "Detalle del plan" en un único resumen de cotización.
- Se rediseñó el bloque económico para dar protagonismo al total a abonar.
- Se compactaron asesor, vigencia y legales para evitar saltos de página.
- La impresión ahora oculta completamente la interfaz y muestra únicamente el área A4, evitando páginas en blanco adicionales.
- Verificación realizada con un caso Directo individual y un caso Desregulado con pareja + 5 hijos y adicionales: ambos generan 1 sola página A4.
