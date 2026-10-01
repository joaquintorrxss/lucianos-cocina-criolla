# Lucianos · Pedidos y caja

Aplicación privada de gestión de salón para las 13 mesas de Lucianos. Las jornadas se conservan en Cloudflare D1 y pueden consultarse por fecha.

## Uso diario

1. Abre la jornada y elige Domingo, Lunes o Jueves. Registra el efectivo inicial y las cantidades de cada plato. Las bebidas pueden tener disponibilidad limitada o sin límite.
2. Selecciona una mesa o Nuevo pedido. Busca un producto, elige la cantidad y escribe su detalle antes de agregarlo. Productos con detalles distintos ocupan líneas separadas. El precio se completa desde la carta y puede ajustarse en el pedido.
3. Cada producto se reserva al guardar. Marca el check de cada línea, sirve una unidad o marca todo el pedido atendido. Pedidos tiene cuatro listas: Por atender, Atendidos · por pagar, Pagados · por atender y Completados. Mesas separa las atendidas por cobrar del resto del salón.
4. Registra abonos o cobros por efectivo, Yape o ambos. Ingresa el efectivo recibido para calcular el vuelto. Antes de confirmar verás por separado lo que el cliente aún debe y el efectivo que quedará en caja. El saldo se guarda con el pago y los indicadores se actualizan inmediatamente. Yape se confirma manualmente; la aplicación no realiza transferencias.
5. En Caja registra ingresos y salidas adicionales con un motivo. Los cobros y vueltos ya se incluyen automáticamente: no los registres por segunda vez.
6. Antes de cerrar, revisa el dashboard de ingresos por categoría, cobros en efectivo, Yape y caja esperada. Los pagos de pedidos con varias categorías se distribuyen proporcionalmente al valor de los productos, conservando cada céntimo. Atiende y cobra todos los pedidos, cuenta el efectivo y confirma el cierre. El salón vuelve al inicio para elegir una nueva jornada, también después de recargar.
7. Historial conserva las jornadas cerradas y permite consultar sus pedidos, caja y resúmenes sin modificar los registros. Resumen muestra el negocio completo y se filtra por fecha calendario, día de atención (carta Domingo, Lunes o Jueves) y jornadas abiertas o cerradas. Esos filtros se mantienen al cambiar entre Resumen, Pedidos, Caja y Jornadas dentro del apartado. El efectivo esperado se consulta por jornada; las aperturas no se suman como ventas del negocio.

Se admite una jornada por fecha y una sola abierta a la vez. Para corregir un pedido sin pago ni entrega se puede anular: queda en el registro y devuelve su disponibilidad. Puedes agregar productos a pedidos atendidos o pagados: se conservan sus pagos y entregas, y el nuevo saldo vuelve a la lista correspondiente. Los productos de un pedido completamente pagado conservan sus precios y cantidades originales. Las jornadas cerradas no pueden modificarse.

## Datos y acceso

La base de datos está declarada con el enlace lógico DB en .openai/hosting.json. Las migraciones de Drizzle definen una tabla de jornadas con revisiones. Cada modificación se valida en el servidor y se guarda mediante comparación de revisión; esto evita que dos dispositivos sobrescriban pagos o disponibilidad. Las solicitudes llevan un identificador de operación para reconocer reintentos.

Los registros viven en la base de datos, no en el almacenamiento del navegador. Los formularios no enviados son temporales. Se necesita conexión para cargar y guardar. El acceso publicado comienza privado para la cuenta propietaria mediante la plataforma de Sites.

## Comprobaciones

- `node --test tests/model.test.mjs tests/storage-errors.test.mjs tests/enhancements.test.mjs tests/reports.test.mjs`: disponibilidad, pagos, entrega, caja, estados independientes, detalles, pagos adelantados, adiciones, desglose contable y filtros/totales históricos.
- `node node_modules/typescript/bin/tsc --noEmit`: comprobación de tipos.
- `node scripts/run-framework.mjs build`: aplicación para Workers.
- `tests/api-smoke.mjs`: prueba manual de concurrencia en el entorno local, requiere una jornada de prueba con el pedido mixto indicado. No ejecutar contra producción.

Las pruebas locales y el estado .wrangler están excluidos de la publicación de datos. La publicación aplica únicamente las migraciones del esquema.
