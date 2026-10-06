# Acceso propio de Lucianos

El usuario eligió ingresar con usuario y contraseña, sin códigos por correo.
Se creó únicamente la cuenta general `lucianos@sistema.com`. Es un identificador
interno: no necesita buzón, dominio registrado ni WhatsApp Business.

`joaquintorress1205@gmail.com` queda reservado para la futura administración.
Todavía NO hay una segunda cuenta, rol administrativo ni panel de administración.

## Dónde están las credenciales

La contraseña aleatoria se entrega en `outputs/acceso-general.txt`, excluido de
Git. No se incluye en el código, GitHub, las migraciones ni el navegador.
Guardar una copia en un gestor de contraseñas. La misma cuenta se preparó en
la D1 propia y en la D1 local; no se modificó el acceso del sitio vigente.

## Cómo funciona el backend

1. `/login` envía usuario y contraseña al endpoint `/api/auth/login` del mismo
   servidor. En producción debe usarse HTTPS; HTTP solo se admite en localhost.
2. El backend limita intentos durante 15 minutos por IP, usuario y combinación
   de ambos. Los contadores están en D1, no en la memoria de un único servidor.
3. Comprueba la huella de contraseña con scrypt (`N=16384`, `r=8`, `p=5`),
   sal aleatoria por cuenta y comparación constante. Un usuario desconocido
   también ejecuta la comprobación y recibe el mismo mensaje de error.
4. Al ingresar, crea un token aleatorio de 256 bits. En D1 guarda solamente su
   SHA-256; el navegador recibe una cookie HttpOnly, SameSite=Strict, Secure
   cuando hay HTTPS. La sesión expira a las 12 horas.
5. Las API de jornadas, historial y PDF validan la sesión contra D1. Una cookie
   de desarrollo antigua o cabeceras de identidad enviadas por un cliente no
   otorgan acceso. Las escrituras comprueban el origen de la solicitud.
6. `Cerrar sesión` revoca el token en D1 y borra la cookie. Es independiente de
   `Cerrar jornada`: salir de la sesión no cierra la caja.

Tablas nuevas: `auth_users`, `auth_sessions` y `auth_attempts`. La tabla `days`
y sus reglas de pedidos, precios históricos, stock y caja se conservan.
La migración SQL crea estructura; no contiene contraseñas ni crea usuarios.

## Desarrollo y creación inicial

```powershell
npm.cmd run db:init:local
node scripts/create-general-user.mjs
npm.cmd run dev -- --port 5174
```

El script genera la contraseña una sola vez, verifica el destino D1 y no
reemplaza contraseñas existentes. Para la cuenta remota propia, la preparación
se hizo con `node scripts/create-general-user.mjs --remote`, después de aplicar
las migraciones. No ejecutar este paso contra el sitio anterior.

## Publicación comprobada el 6 de octubre de 2026

La copia independiente está publicada en https://lucianos-cocina-criolla.joaquintorress1205.workers.dev/login.
Worker: `lucianos-cocina-criolla`; D1: `lucianos-produccion`.
La cuenta permanece en Workers Free; no se contrató un plan de pago.
Se comprobaron por HTTPS: pantalla de ingreso, rechazo de acceso anónimo,
ingreso con la cuenta general, cookie Secure/HttpOnly/SameSite, lectura de
D1, carga de interfaz y revocación al cerrar sesión. Sin errores 1102 en esas
comprobaciones. Esto no sustituye una prueba de carga ni verifica aún el coste
del PDF con muchas órdenes reales.

La D1 nueva tiene cero jornadas. El usuario decidió iniciar desde cero el 6 de
octubre: NO se importará ningún registro del sistema anterior. La apertura de
la primera jornada creará los primeros pedidos y movimientos de la nueva etapa.
El administrador continúa pendiente.

No hay recuperación automática por correo ni panel para cambiar contraseñas.
Una futura recuperación requerirá una operación controlada en el backend.

Referencias: [crypto en Workers](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/)
y [almacenamiento de contraseñas OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
