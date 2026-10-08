# Inventario, pedidos para llevar y conteos

## Gaseosas entre jornadas

En **Bebidas inventario** registra una vez las unidades disponibles de cada gaseosa. Usa **Reponer / ajustar** para sumar compras o corregir el saldo físico, siempre con motivo. Ambas cuentas pueden gestionar el inventario; cada movimiento registra quién lo hizo.

El sistema descuenta al guardar un pedido, devuelve la diferencia al reducir cantidades y devuelve todas las unidades al anular un pedido permitido. El servicio y el pago no vuelven a descontar. Cerrar una jornada conserva el saldo para la siguiente. Ejemplo: 3 Inca Kola de litro, vender 1 el domingo, quedan 2 el lunes y 2 el jueves si no hay más ventas.

Al abrir la jornada, las gaseosas con inventario conocido muestran su saldo conservado y no pueden reiniciarse desde ese formulario. Si aún no se registró el stock inicial, puedes ingresarlo allí. Cero significa agotado; vacío significa que falta registrar, no disponibilidad ilimitada. Las jarras frescas siguen disponibles únicamente los domingos y su stock es diario. Las cervezas y adicionales conservan su disponibilidad diaria.

La actualización conserva las jornadas y pedidos existentes. Para iniciar el inventario toma el saldo restante de gaseosas de la última jornada, si estaba registrado como cantidad. Si se vendía sin límite, necesitas contar las unidades reales y registrarlas; el sistema no inventa una cantidad.

## Presas compartidas

**Pepián con pato** y **Pepián con cabrito** cuestan inicialmente S/ 30.00. Cada unidad descuenta una presa del mismo stock de **Pato guisado** o **Cabrito**, respectivamente. Al abrir, registra las presas una sola vez en el plato base. Con 7 presas de pato, vender 3 patos y 1 pepián deja 3 disponibles para cualquiera de ambos platos.

En **Administrar carta**, el administrador puede cambiar el precio o seleccionar **Stock / presas compartidas** para otros platos. El plato base debe estar activo, tener stock propio y ofrecerse en los mismos días. No se admiten cadenas de referencias. La jornada abierta conserva su carta y sus relaciones; los cambios del catálogo se aplican a la siguiente jornada. Los pedidos anteriores conservan sus precios y nombres.

## Pedido y entrega

Los detalles se despliegan desde **Agregar detalle de plato** y, al final, **Agregar detalle general del pedido**. **Para llevar** agrega automáticamente un táper por unidad de la categoría Platos; las bebidas no suman táperes. Puedes editar la cantidad o quitar la línea si el cliente trae sus envases. Ese cambio pasa a modo manual; **Volver al cálculo automático** restablece la relación con la cantidad de platos.

Los productos pendientes quedan a la izquierda y los servidos a la derecha. Si se sirve parte de una línea, sus cantidades se reparten entre ambos lados. El check sirve las unidades pendientes; **Servir 1** permite entregas parciales. Desmarcar la parte servida la devuelve a pendientes.

## Cobro y cierre

**Monto total** es el total a cobrar en esta operación, incluido cualquier pago por Yape. En **Ambos**, ingresa el monto por Yape y el sistema calcula la parte en efectivo. **Efectivo recibido del cliente** es el dinero físico entregado antes del vuelto. Ejemplo: total S/ 145, Yape S/ 50, parte efectivo S/ 95; si entrega S/ 100, vuelto S/ 5 y la caja aumenta S/ 95.

Los campos de cobro y conteo usan entrada decimal sin flechas ni rueda que alteren cantidades. Las notificaciones se retiran tras 3 segundos; los errores de un formulario permanecen visibles para corregirlos.

**Cerrar jornada**, junto a **En servicio**, muestra primero los ingresos y luego pide dos conteos manuales: efectivo físico y Yape comprobado de esa jornada. Guarda ambos y sus diferencias por separado. Los cierres anteriores sin conteo de Yape se muestran como no registrados, sin suponer cero.

El PDF final contiene exclusivamente los pedidos: una hoja por pedido, productos, cantidades, precios, notas y pagos de ese pedido. No incluye el arqueo general del día. Los conteos permanecen disponibles en Historial → Jornadas.

## Backend y consistencia

D1 incorpora `inventory` (saldo y revisión) e `inventory_movements` (historial). `/api/inventory` exige sesión y valida origen, cantidades, motivo y revisión. `/api/state` guarda el pedido y el saldo con un batch atómico de D1, condicionado a las revisiones de jornada e inventario. Un marcador único vincula ambas escrituras; un conflicto no descuenta stock sin guardar el pedido. Los reintentos usan un identificador para evitar duplicados. Los saldos de jornadas cerradas no se sobreescriben con el inventario actual.

La migración `0004_legal_silver_sable.sql` agrega el esquema, las relaciones de presas y los dos pepianes. La migración `0005_glamorous_morlun.sql` agrega índices para buscar movimientos y comprobar reintentos sin recorrer todo el historial. La migración `0006_preserve_existing_pepians.sql` vincula también los pepianes que el propietario ya había creado sin tilde, conserva sus identificadores y retira las entradas iniciales duplicadas. No modifica el JSON de jornadas existentes ni las tablas de acceso. Pruebas de negocio y HTTP se ejecutan exclusivamente con fixtures locales; no se crean ventas de prueba en Cloudflare.
