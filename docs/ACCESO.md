# Acceso privado a Lucianos

Sitio: https://lucianos-cocina-criolla.joaquintorress1205.workers.dev/login

El usuario autorizó crear el administrador y CRUD de carta el 6 de octubre de 2026.

| Cuenta | Rol | Contraseña local |
| --- | --- | --- |
| joaquintorress1205@gmail.com | admin | outputs/acceso-admin.txt |
| lucianos@sistema.com | operator | outputs/acceso-general.txt |

Estos nombres son identificadores de Lucianos: no requieren un buzón real y no usan la contraseña del correo. Los archivos de contraseña están ignorados por Git. No compartir la cuenta administradora con el equipo de atención.

El administrador puede usar el sistema habitual y Administrar carta. La cuenta general puede atender pedidos y caja, y ajustar precios durante una jornada; no puede modificar el catálogo permanente. Ver docs/ADMINISTRAR_CARTA.md.

## Implementación

Contraseñas con scrypt, salt aleatorio y comparación segura; sesión aleatoria de 256 bits. D1 guarda únicamente hashes de contraseñas y de tokens. Cookie HttpOnly, Secure en HTTPS, SameSite Strict y duración de 12 horas. El backend valida sesión, usuario activo y rol en cada solicitud. Los encabezados de identidad y cookies simuladas del sitio anterior no dan acceso.

El inicio de sesión limita intentos por IP y usuario y no registra contraseñas. Las escrituras verifican el origen. Mi cuenta permite cambiar contraseña y correo. Usuarios, exclusivo de admin, permite crear, editar roles/accesos, activar/desactivar y restablecer contraseñas con reautenticación. La recuperación y verificación por correo están implementadas, con envío pendiente de proveedor. Ver docs/USUARIOS_Y_CORREO.md.

## Aprovisionamiento

Aplicar primero las migraciones D1. Ejecutar scripts/create-general-user.mjs y scripts/create-admin-user.mjs para local; usar --remote solo para la D1 propia autorizada. Los scripts verifican cuenta e ID y no reemplazan contraseñas existentes. Crean una contraseña aleatoria solo si el archivo local aún no existe.

Las contraseñas de entrega se actualizan solo cuando el propietario solicita la rotación. Después de cambiarlas desde la web, los archivos de entrega pueden quedar desactualizados; no son la fuente de autenticación.

Las pruebas con jornadas y productos se ejecutan exclusivamente en local. La instancia nueva comienza sin ventas del sistema anterior.
