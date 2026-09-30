# Lucianos · Pedidos y caja

Aplicación privada de gestión de salón para las 13 mesas de Lucianos. Las jornadas se conservan en Cloudflare D1 y pueden consultarse por fecha.

## Uso diario

1. Abre la jornada y elige Domingo, Lunes o Jueves. Registra el efectivo inicial y las cantidades de cada plato. Las bebidas pueden tener disponibilidad limitada o sin límite.
2. Selecciona una mesa o Nuevo pedido. Busca productos, elige Coca-Cola o Inca Kola, registra cantidades y detalles. El precio se completa desde la carta y puede ajustarse en el pedido.
3. Cada producto se reserva al guardar. Marca las unidades entregadas desde el detalle del pedido. Atención y pago tienen estados independientes.
4. Registra abonos o cobros por efectivo, Yape o ambos. Ingresa el efectivo recibido para calcular el vuelto. Yape se confirma manualmente; la aplicación no realiza transferencias.
5. En Caja registra ingresos y salidas adicionales con un motivo. Los cobros y vueltos ya se incluyen automáticamente: no los registres por segunda vez.
6. Atiende y cobra todos los pedidos. Cuenta el efectivo y cierra la jornada. Resumen conserva las unidades por producto y categoría, cobros y diferencia de caja.

Se admite una jornada por fecha y una sola abierta a la vez. Para corregir un pedido sin pago ni entrega se puede anular: queda en el registro y devuelve su disponibilidad. Los pedidos pagados y las jornadas cerradas no pueden modificarse.

## Datos y acceso

La base de datos está declarada con el enlace lógico DB en .openai/hosting.json. Las migraciones de Drizzle definen una tabla de jornadas con revisiones. Cada modificación se valida en el servidor y se guarda mediante comparación de revisión; esto evita que dos dispositivos sobrescriban pagos o disponibilidad. Las solicitudes llevan un identificador de operación para reconocer reintentos.

Los registros viven en la base de datos, no en el almacenamiento del navegador. Los formularios no enviados son temporales. Se necesita conexión para cargar y guardar. El acceso publicado comienza privado para la cuenta propietaria mediante la plataforma de Sites.

## Comprobaciones

- `node --test tests/model.test.mjs`: reglas de disponibilidad, pagos, entrega, caja y cartas.
- `node node_modules/typescript/bin/tsc --noEmit`: comprobación de tipos.
- `node scripts/run-framework.mjs build`: aplicación para Workers.
- `tests/api-smoke.mjs`: prueba manual de concurrencia en el entorno local, requiere una jornada de prueba con el pedido mixto indicado. No ejecutar contra producción.

Las pruebas locales y el estado .wrangler están excluidos de la publicación de datos. La publicación aplica únicamente las migraciones del esquema.
