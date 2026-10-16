# Premedic desde Zeroka Control

El cotizador puede usar una publicación completa de Control: tarifas individuales y familiares, adicionales, planes habilitados por segmento y promociones manuales porcentuales o de monto fijo. La primera configuración está en `null`: hasta recibir una publicación sigue usando `js/precios-premedic.js` y las campañas actuales.

## Activar la conexión

1. Instalar la actualización R5 en `ZEROKA_CONTROL_V1_FINAL` y ejecutar `manage.py prepare_premedic_baseline --apply` con su entorno Python. Esto crea una lista y campañas en **borrador**, sin modificar precios activos ni el FLASH25 existente. Conserva la elegibilidad configurada de los planes.
2. Revisar la lista y cada campaña en Control, incluyendo fechas, duración y condiciones. La base se tomó de `e3dbe91eba680e601453583590fcdfea5bc7b4c9`: Desregulados AMBA usa noviembre 2026; las otras tablas mantienen octubre. Las campañas sin inicio informado usan la fecha de carga como inicio técnico del borrador, pendiente de revisión comercial.
3. Activar la lista y los beneficios que correspondan. Crear, revisar y publicar una nueva versión en **Publicaciones**. Un borrador no cambia el cotizador.
4. Descargar **Configuración Premedic** de la publicación y reemplazar `config/premedic-publicada.js` en este repositorio. También se puede usar **Enviar al cotizador Premedic** después de configurar el acceso local descrito abajo.
5. Verificar el despliegue y recargar el sitio. La página usa una publicación completa durante toda su sesión; no mezcla precios nuevos mientras se arma un PDF.

La versión que se envía debe ser la última publicada. Para revertir un envío, restaurar la publicación anterior como un **nuevo borrador**, revisar y publicar una nueva versión. La descarga manual permite revisar versiones históricas.

## Enviar desde el panel

Se configura una vez en Control con `manage.py configure_premedic_github`. El token se ingresa oculto en la terminal y se guarda únicamente en el `.env` local. Debe estar restringido a este repositorio con permiso **Contents: Read and write**. No compartirlo en el chat, no subir `.env` a GitHub y no incluirlo en el archivo del cotizador.

El comando admite `--branch nombre-de-rama`; por defecto usa `main`. Primero debe incorporarse esta integración a la rama de destino. El botón hace un commit exclusivamente de `config/premedic-publicada.js`, con comprobación del SHA actual para detectar cambios concurrentes. El envío a `main` puede disparar el despliegue habitual. El panel registra usuario, versión, rama y commit del envío; enviar otra vez el mismo contenido no crea otro commit. Un error de conexión requiere revisar el historial antes de repetir.

## Actualizar precios, planes o campañas

- **Precios:** descargar el Excel editable de una lista, cambiar precios y etiquetas de vigencia por tabla, crear una **lista nueva vacía** e importar el Excel. El análisis detecta rangos superpuestos; no sobrescribe tarifas existentes. También se puede duplicar la lista y editar tarifas desde el panel.
- **Planes:** activar/desactivar un plan o cambiar sus segmentos elegibles. El motor conserva las coberturas existentes de C-100, 200, 300, 400 y 500; un código nuevo necesita también su cobertura oficial y soporte en el cotizador.
- **Promociones:** editar alcance, fechas, porcentaje o monto; activar las que correspondan. Las campañas que no estén en la publicación desaparecen del selector. Se mantiene el cálculo especial de monotributo en el motor.

Después de cada cambio: crear/actualizar un borrador de publicación, revisar, publicar y enviar. La activación de un registro por sí sola no actualiza la copia publicada. Las publicaciones programadas siguen necesitando ejecutar `publish_scheduled` y luego enviar la versión publicada al repositorio.

## Validaciones y alcance

Los componentes de precio son `individual`, `matrimonio`, `matrimonio1`, `matrimonio2`, `matrimonio3`, `adicionalMenor1` y `adicionalMenor25`. Las cinco matrices adultas usan 1–29, 30–39, 40–49 y 50–59; los adicionales usan 0–0 y 1–24. Cada tabla debe estar completa, con una misma etiqueta de vigencia tarifaria en todas sus filas. La fecha de activación de la lista se administra aparte de esa etiqueta.

Esta integración mantiene una promoción manual por cotización, antes de descontar los aportes en Desregulado. Control bloquea la exportación de beneficios automáticos o acumulables, para no cambiar esa regla sin implementar otro motor. Los filtros de edad usan la edad de referencia de la tarifa (la mayor de los dos adultos).

Un archivo configurado pero inválido, incompleto o de vigencia futura bloquea la cotización con un mensaje. Solo el `null` inicial habilita la lista histórica; una falla de carga no habilita una mezcla parcial. No se exportan documentos privados, notas internas, datos de clientes ni credenciales.

## Verificación

`node tests/control-qa.mjs` compara 672 casos con la base actual y prueba cambios de precio, plan, promoción, edades, fechas y fallos de configuración. `node tests/control-browser-qa.mjs` prueba el archivo publicado en la interfaz, incluidos mensajes de error y etiquetas sin interpretación HTML. Ambos están incorporados al flujo de QA existente.
