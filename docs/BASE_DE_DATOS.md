# Base de datos propia de Lucianos

## Preparación

La cuenta Cloudflare fue creada por el usuario y vinculada mediante OAuth.
La nueva base `lucianos-produccion` ya está creada y tiene el esquema aplicado:

- Cuenta: `4c014cfa178db72a396081d8d33538f6`.
- Base: `e539eb6d-8280-41b7-b8a3-f5ce0f447938`.
- Región informada por Cloudflare: `ENAM`.
- Configuración de administración: `wrangler.d1.json`.
- Migración: `0000_puzzling_zaladane.sql`, registrada en `d1_migrations`.
- Comprobación remota del 2 de octubre de 2026: tabla, columnas e índices
  correctos, cero jornadas y ninguna migración pendiente en esa fecha.
- Comprobación del 6 de octubre: migración de autenticación aplicada, una sola cuenta general activa y cero jornadas.

Durante esta etapa se crean la estructura y la cuenta general del equipo. Los pedidos históricos
permanecen en el sitio original. El usuario eligió empezar desde cero en la nueva
base; no se exportarán ni importarán esos registros.

## Qué guarda la base

La tabla de negocio es `days`: una fila por jornada. Mantendremos el mismo
esquema del sistema vigente para conservar su comportamiento.

| Columna | Función |
| --- | --- |
| `id` | Identificador único de la jornada |
| `date` | Fecha calendario; no puede repetirse |
| `active` | `1` si la jornada sigue abierta, `NULL` si se cerró |
| `revision` | Número de versión para evitar sobrescribir cambios de otro dispositivo |
| `payload` | JSON con pedidos, pagos, caja, stock, precios de jornada y eventos |

Cada línea del pedido conserva nombre, categoría, cantidad, precio unitario,
unidades servidas y notas. Los pagos guardan efectivo, Yape, dinero recibido,
vuelto y saldo de caja después del pago. Los importes son enteros en céntimos.

El esquema en `drizzle/0000_puzzling_zaladane.sql` crea la tabla y los índices
que permiten una jornada por fecha y una sola jornada abierta. Las migraciones
de Wrangler también crean `d1_migrations`, una tabla técnica para recordar
qué archivos SQL ya se aplicaron; no contiene pedidos.

## Cómo interviene el backend

Cuando guardas un pedido en la pantalla, el navegador envía una solicitud al
backend (`app/api/state/route.ts`). El servidor comprueba el acceso, valida
productos, cantidades, stock, pagos y estado de jornada. Luego actualiza D1
solo si la revisión coincide con la que se consultó. Devuelve el nuevo estado
para que la pantalla actualice pedidos y caja.

La base no se conecta directamente al navegador mediante una contraseña.
El Worker la obtiene por el enlace `DB`; los permisos de administración quedan
en la cuenta Cloudflare y en las herramientas de desarrollo.

La aplicación usa `wrangler.jsonc`, vinculada a la D1 propia. Desarrollo utiliza
una D1 local separada. El acceso propio con contraseña se describe en
`docs/ACCESO.md`. El Worker propio está publicado y su conexión a D1 verificada por HTTPS.

`wrangler.d1.json` contiene los identificadores de esta cuenta y su nueva base.
Sirve para los comandos de administración de D1. No incluye una entrada de
Worker para publicar la web. Sus identificadores no son contraseñas; los
permisos se comprueban mediante la sesión autenticada de Wrangler.

## Comandos desde VS Code

En una terminal abierta en esta carpeta:

```powershell
npm.cmd run db:status:remote
npm.cmd run db:migrations:remote
```

El primero consulta cuántas jornadas existen en la D1 nueva; el segundo muestra
migraciones pendientes. Ambos usan explícitamente `wrangler.d1.json` y
`lucianos-produccion`.

Para aplicar nuevos archivos SQL versionados, después de revisarlos:

```powershell
npm.cmd run db:migrate:remote
```

La migración inicial ya está aplicada; este comando no vuelve a ejecutarla.
Las migraciones de estructura no trasladan automáticamente las ventas del
sitio anterior.

## Cambios de precios y carta

Actualmente la carta inicial está en `lib/model.ts` y los precios de cada jornada
se guardan en su JSON. Todavía no hay una tabla separada de productos ni un
panel general de administración. Ese panel se construirá después de validar
la migración. Las líneas históricas conservarán sus precios originales.

Para inspeccionar jornadas sin alterar registros, la consola D1 admite:

```sql
SELECT id, date, active, revision FROM days ORDER BY date DESC;
SELECT COUNT(*) AS jornadas FROM days;
```

## Estado y límites

- La base local del proyecto está separada de la base remota.
- La base remota propia tiene cero jornadas y una sola cuenta general activa.
- La migración `0001_typical_nighthawk.sql` crea las tablas `auth_users`, `auth_sessions` y `auth_attempts`; no contiene contraseñas.
- El usuario decidió iniciar desde cero: NO hay traslado de datos históricos pendiente.
- Worker propio publicado en `https://lucianos-cocina-criolla.joaquintorress1205.workers.dev`, con acceso general protegido. La nueva instancia comienza desde cero. El sitio anterior se conserva sin modificar ni borrar sus registros.

Referencias oficiales:
- https://developers.cloudflare.com/d1/get-started/
- https://developers.cloudflare.com/d1/reference/migrations/
