# Administrar la carta de Lucianos

Acceso: https://lucianos-cocina-criolla.joaquintorress1205.workers.dev/login

Administrador: `joaquintorress1205@gmail.com`. Equipo: `lucianos@sistema.com`.
Las contraseñas están en `outputs/acceso-admin.txt` y `outputs/acceso-general.txt`,
archivos locales excluidos de Git. Son cuentas del sistema; no requieren un buzón
ni utilizan la contraseña del correo electrónico.

## Crear un producto

1. Inicia sesión con el administrador.
2. Abre **Administrar carta** en el menú lateral.
3. Pulsa **Nuevo producto**.
4. Escribe el nombre, elige Platos, Bebidas o Adicionales, e ingresa el precio en soles.
5. Marca uno o varios días: Domingo, Lunes, Jueves.
6. Pulsa **Guardar producto**.

Los filtros permiten buscar por nombre, categoría, día y estado.
**Editar** cambia nombre, precio, categoría y días. **Retirar** quita el producto
de futuras cartas. Para recuperarlo, selecciona **Retirados** y pulsa **Restaurar**.
Retirar conserva los pedidos históricos y permite recuperar el producto.

## Jornada y precios

La carta del negocio se copia al abrir cada jornada. Los cambios del administrador
se aplican a las próximas jornadas. Las cantidades disponibles se ingresan en la
apertura; no son un campo fijo del catálogo.

Durante una jornada, **Carta del día → Editar precio → Guardar ajuste** cambia el
precio para nuevos pedidos de esa jornada. Este ajuste no reemplaza el precio base
del catálogo ni el precio de pedidos ya registrados. Para un cambio permanente,
edita el producto en **Administrar carta**.

Cada pedido conserva su nombre, categoría, cantidad y precio registrado. Retirar
o renombrar un producto no cambia esos valores ni el PDF histórico.

## Backend

- `products` en Cloudflare D1 guarda ID estable, nombre, categoría, precio en
  céntimos, días, estado, revisión y fecha de actualización.
- `auth_users.role` distingue `admin` de `operator`. Las cuentas existentes quedan
  como operator. El rol se consulta en el servidor en cada petición autenticada.
- `/api/catalog` exige admin para consultar y modificar el catálogo administrable.
  `/api/state` devuelve la carta activa a los usuarios autenticados del servicio.
- El backend valida precio, categoría y días; verifica origen para las escrituras.
  La revisión evita sobrescribir cambios hechos desde otra sesión.
- Las jornadas guardan una copia de su catálogo. La apertura comprueba la versión
  del catálogo para evitar abrir con una carta que cambió mientras se llenaba el formulario.
- El navegador no recibe contraseñas almacenadas, hashes ni claves de Cloudflare.

Para reproducir en desarrollo local: aplicar migraciones y ejecutar
`node scripts/create-general-user.mjs` y `node scripts/create-admin-user.mjs`.
Los scripts no restablecen contraseñas existentes.
Las pruebas HTTP de `scripts/smoke-catalog.mjs` usan solo una D1 local vacía y
eliminan sus propios registros de prueba. Nunca ejecutarlas contra producción.

## Validación de publicación

Publicado y comprobado el 6 de octubre de 2026. 34 pruebas automatizadas, TypeScript y build correctos. Prueba HTTP local del CRUD, permisos, origen, conflictos, carta desde D1 y preservación de pedidos aprobada. En producción: ambos accesos HTTPS verificados, cuenta general rechazada para administrar, validación de entrada y sesiones revocadas comprobadas. La base remota conserva 25 productos activos y cero jornadas; no se insertaron pruebas de venta ni de productos en producción.
