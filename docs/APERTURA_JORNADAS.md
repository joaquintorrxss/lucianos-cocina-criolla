# Apertura después del cierre

Una jornada cerrada no impide abrir una nueva con la misma fecha calendario. Cada jornada conserva su ID, pedidos, caja, precios y fecha/hora de apertura. El historial y los filtros incluyen todas las jornadas de la fecha elegida; el listado de fechas no repite opciones.

La migración `0007_allow_new_jornada_after_close.sql` elimina exclusivamente la restricción de fecha única, añade un índice de consulta y registra el identificador de la operación de apertura. No borra ni recalcula registros históricos. La restricción de una sola jornada activa sigue vigente.

El backend guarda jornada e inventario en una transacción D1. Repetir la misma operación devuelve la jornada ya creada, sin volver a descontar stock ni modificar la caja. Dos aperturas simultáneas no pueden crear dos jornadas activas. Si cambia la carta mientras está abierto el formulario, este recibe la versión actual y conserva las cantidades ingresadas para revisarlas y volver a pulsar Abrir jornada.

Validación: pruebas de migración, apertura en una fecha previamente cerrada, reintentos, concurrencia, versiones desactualizadas y rollback; además del ensayo HTTP `scripts/smoke-opening.mjs`, que crea y retira registros exclusivamente en una base local vacía. No se crean ventas de prueba en producción.
