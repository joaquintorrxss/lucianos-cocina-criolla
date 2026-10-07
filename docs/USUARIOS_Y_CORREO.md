# Cuentas, contraseñas y correo

## Uso de la web

Acceso: https://lucianos-cocina-criolla.joaquintorress1205.workers.dev/login
No hace falta ejecutar npm ni mantener la computadora encendida para usar la versión publicada.

- **Mi cuenta:** cada usuario cambia su propia contraseña confirmando la actual,
  la nueva y su repetición. También asocia un correo real para recuperación.
- **Usuarios:** solo el administrador crea usuarios, modifica rol/correo/identificador,
  restablece contraseñas y activa o desactiva cuentas. Cada cambio requiere la
  contraseña actual del administrador. Su propia cuenta se gestiona en Mi cuenta.
- Las contraseñas guardadas no pueden visualizarse. Restablecer significa definir
  una nueva; no recuperar la anterior. Las contraseñas admiten entre 8 y 256 caracteres.
- Cambiar/restablecer contraseña, rol, datos de acceso o estado invalida las sesiones
  anteriores. Desactivar conserva los pedidos y registros del usuario.
- No se permite quitar el último administrador activo ni desactivar/demover el propio acceso.

El propietario solicitó actualizar las contraseñas de las dos cuentas iniciales el
6 de octubre de 2026. Se entregan en `outputs/accesos-lucianos.txt`, excluido de Git.
Ese archivo es una copia de entrega: no se actualiza automáticamente si cambias una
contraseña desde la web. Tampoco editarlo modifica la contraseña de la base.

## Estado del correo

El propietario confirmó que todavía no tiene servicio de envío ni dominio.
La integración y los formularios están preparados, pero el envío real permanece
desactivado hasta configurar el proveedor. La pantalla lo indica expresamente y
no muestra un correo como verificado por haberlo escrito.

`lucianos@sistema.com` es un identificador ficticio: hay que asociarle un correo
real desde Mi cuenta. La cuenta administradora tiene asociado el Gmail del
propietario, inicialmente sin verificar. La verificación no bloquea el acceso
normal ni los cambios de contraseña hechos con la contraseña actual.

Con el envío configurado:

1. Guardar el correo real desde Mi cuenta.
2. Pulsar Enviar verificación de correo.
3. Abrir el enlace recibido y pulsar Confirmar mi correo.
4. Si olvidas la contraseña, usar ¿Olvidaste tu contraseña? en el inicio de sesión.
5. Ingresar el usuario de Lucianos, abrir el mensaje y definir una nueva contraseña.

Los enlaces vencen en 30 minutos y solo sirven una vez. Recuperar contraseña exige
un correo previamente verificado. Si se cambia el correo, se anula la verificación
y los enlaces anteriores. Si se cambia la contraseña, se invalidan los enlaces
anteriores por la versión de autenticación.

## Activar envío cuando esté disponible el servicio

El backend incluye un adaptador de [Resend](https://resend.com/docs/api-reference/emails/send-email).
No se creó una cuenta externa, contrató servicio, compró dominio ni guardó una
clave de proveedor en el repositorio.

En el Worker `lucianos-cocina-criolla`, configurar:

- `RESEND_API_KEY`: secreto del proveedor, nunca una variable pública del navegador.
- `EMAIL_FROM`: remitente autorizado, por ejemplo `Lucianos <acceso@tu-dominio.pe>`.
- `APP_URL`: ya apunta al sitio propio HTTPS. Debe ser una URL confiable configurada
  por el propietario, nunca una cabecera de la solicitud del visitante.

El dominio remitente requiere la verificación indicada por Resend. Su remitente de
pruebas `onboarding@resend.dev` permite pruebas al correo de la propia cuenta Resend,
pero no reemplaza un dominio verificado para enviar a otras personas:
[limitación del remitente de pruebas](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

Después de configurar, verificar desde la web la recepción real y confirmar el
enlace. Un ajuste en D1 o escribir el correo no demuestra recepción del mensaje.
Mientras el servicio esté pendiente, el administrador puede restablecer los accesos
del equipo manualmente desde Usuarios.

## Backend y pruebas

`/api/account` gestiona la cuenta actual. `/api/users` exige rol admin y reautenticación.
`/api/auth/email` solicita o consume enlaces. `auth_tokens` guarda únicamente hashes,
usuario, propósito, correo, versión, caducidad y uso; no guarda enlaces utilizables.
El token viaja en el fragmento del enlace para evitar incluirlo en la URL que recibe
el servidor. La confirmación se hace por POST. Las sesiones se validan contra
`auth_users.auth_version`; una sesión antigua no revive al activar un usuario.

`scripts/smoke-accounts.mjs` verifica el ciclo con usuarios y tokens sintéticos en
la D1 local, los elimina al terminar y no toca jornadas. La entrega real de correo
queda pendiente del servicio externo. No simular envíos o verificaciones en producción.

Para una rotación explícitamente autorizada de las dos cuentas iniciales:
`node scripts/set-account-passwords.mjs --file outputs/archivo-privado.json`.
Usar `--remote` únicamente para la D1 propia ya autorizada. El JSON de entrada y
el SQL generado permanecen fuera de Git. El script no debe ejecutarse para
restablecer contraseñas sin una instrucción nueva del propietario.

## Validación de publicación

Publicado y comprobado el 6 de octubre de 2026: 36 pruebas automatizadas, TypeScript y build correctos. Pruebas HTTP locales de usuarios, cambio de contraseña, reautenticación, permisos, caducidad, uso único de tokens, recuperación y revocación aprobadas. En Cloudflare se verificaron ambos accesos con las nuevas contraseñas y el cambio de contraseña desde el backend publicado, con rechazo posterior de la sesión anterior. No se crearon usuarios, tokens de correo ni ventas de prueba en producción. El envío real continúa pendiente del proveedor.
