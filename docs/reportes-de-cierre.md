# Reportes de cierre de Lucianos

## Flujo disponible

Al confirmar el arqueo, `/api/state` guarda la jornada cerrada y el efectivo contado en D1. El salón vuelve a la pantalla de apertura y aparece el reporte de cierre. También se puede abrir desde Historial, en cada jornada cerrada.

La interfaz solicita `GET /api/report?dayId=<id>`. Esta ruta exige una sesión, busca la jornada en D1 y rechaza jornadas abiertas. Genera un PDF en memoria con `pdf-lib`, fuentes locales Manrope y los precios originales de las líneas. No modifica pedidos, pagos ni el arqueo. El navegador recibe el archivo con `Cache-Control: private, no-store`; no se crea una URL pública de los pedidos.

Cada pedido tiene una página, ordenada por su número. Los platos conservan su orden de registro y sus notas. Los anulados se identifican y quedan fuera de ventas. Las páginas habituales son A4; los pedidos extensos usan una hoja más larga para mantener el texto legible. Los símbolos sin glifo se representan por su código Unicode y la interfaz lo advierte. Si no hubo pedidos, se genera una hoja con esa indicación y el arqueo.

El reporte incluye el efectivo neto de ventas, Yape, caja inicial, movimientos, caja esperada, contada y diferencia. Los vueltos están descontados del efectivo de ventas.

## WhatsApp disponible actualmente

Contactos: +51 944 041 834 y +51 982 647 828.

`Descargar PDF` descarga el archivo. `Compartir archivo` aparece cuando el navegador admite compartir PDFs con aplicaciones del dispositivo. El usuario elige WhatsApp y los destinatarios. `Abrir chat` abre cada contacto con el resumen escrito; el usuario adjunta el PDF y confirma el envío. Estas acciones no acreditan entrega al destinatario: no se guarda un estado ficticio de “enviado”.

## Integración automática pendiente

Hace falta una cuenta emisora de WhatsApp Business Platform o un proveedor, sus credenciales seguras y una plantilla de documento aprobada para los mensajes fuera de la ventana de atención. Las cuentas receptoras pueden ser personales.

Cuando exista esa configuración, habrá que implementar la ruta de envío autenticada, carga del PDF como medio en Meta, envío de la plantilla a los contactos permitidos y registros durables por destinatario. Se distinguirán API aceptada, entrega confirmada y fallo. Los resultados inciertos por timeout requieren conciliación antes de reintentar. La confirmación de entrega requerirá un webhook firmado accesible desde Meta; debe resolverse sin abrir al público el sistema privado de Lucianos.

Esta versión no contiene tokens, un emisor configurado, llamadas de envío a Meta ni un webhook. La base de datos actual es suficiente para generar y recuperar reportes; los estados automáticos necesitarán una nueva migración cuando se integre el proveedor.
