# Continuar Lucianos en Visual Studio Code

Esta carpeta es una copia separada del sistema. El usuario eligió iniciar desde cero en la instancia propia de Cloudflare. No se trasladarán registros del sistema anterior.

## Primer inicio

1. En Visual Studio Code abre la carpeta `lucianos-independiente`.
2. Abre el icono de Codex. Si no aparece, pulsa `Ctrl+Shift+P` y busca `Codex: Open Codex Sidebar`.
3. Elige iniciar sesión con ChatGPT y completa el acceso en tu navegador. No pegues contraseñas ni claves en el chat.
4. Abre un chat de Codex en VS Code y pega el siguiente mensaje:

> Estamos iniciando la migración de Lucianos a mis propias cuentas de GitHub y Cloudflare, sin cambiar el diseño ni el funcionamiento existente. Lee AGENTS.md, CONTINUAR_EN_CODEX.md y docs/MIGRACION.md. Trabaja solo en esta copia. Comprueba primero el estado real del proyecto y las validaciones pendientes. Ayúdame a configurar mis cuentas y luego el acceso privado, la base D1 y la nueva publicación. No publiques en el sitio antiguo ni cambies sus datos. NO importes registros del sistema anterior: elegí empezar desde cero. Explícame cada paso en español.

Estos archivos transmiten el contexto necesario; esta conversación no se copia automáticamente al nuevo chat.

## Archivos principales

| Archivo | Qué contiene |
| --- | --- |
| `app/workspace.tsx` | Interfaz principal de mesas, pedidos y caja |
| `app/globals.css` | Colores, bordes, tipografía y distribución |
| `app/order-tools.tsx` | Registro y edición de pedidos |
| `app/reports.tsx` | Resúmenes y filtros |
| `lib/model.ts` | Carta inicial, precios de referencia y reglas del negocio |
| `app/api/state/route.ts` | Backend para consultar y guardar jornadas |
| `app/api/history/route.ts` | Backend del historial |
| `app/api/report/route.ts` | Generación y descarga del reporte PDF |
| `db/schema.ts` y `drizzle/` | Estructura de la base de datos y migraciones |
| `app/auth.ts`, `app/login/` y `app/api/auth/` | Usuario y contraseña, sesión y cierre de sesión |

El proyecto está hecho con React y TypeScript: los componentes `.tsx` producen el HTML. No es una única página `index.html`. El CSS y la lógica están separados en los archivos indicados.

La carta se gestiona desde Administrar carta con el administrador. Ver `docs/ADMINISTRAR_CARTA.md`. El catálogo inicial en `lib/model.ts` solo sirve como referencia inicial y compatibilidad; editarlo no cambia el catálogo D1 vigente.

## Desarrollo local

Node.js y VS Code ya están instalados en esta computadora. Desde una terminal en esta carpeta:

```powershell
npm ci
npm run build
npm run db:init:local
node scripts/create-general-user.mjs
npm run dev -- --port 5174
```

Abre `http://localhost:5174`. Es un entorno local, con usuario y contraseña propios (ver `docs/ACCESO.md`). La base local es independiente: no modifica la base del sitio publicado.

`db:init:local` aplica migraciones pendientes en la base local, sin repetir las ya registradas. La copia NO incluirá ventas del sistema anterior: el usuario pidió iniciar desde cero.

En ESTA copia ya quedaron instaladas las dependencias, compilado el proyecto y creada la base local vacía. Para volver a arrancarla basta `npm run dev -- --port 5174`. Cuando se preparó esta guía se dejó una sesión de desarrollo corriendo en `http://127.0.0.1:5174/`; si más adelante no responde, ejecuta ese comando desde la terminal.

Para comprobar el código:

```powershell
npm.cmd test
node node_modules/typescript/bin/tsc --noEmit
npm run build
```

Si PowerShell bloquea `npm.ps1`, usa `npm.cmd` en lugar de `npm`; no hace falta cambiar la política de ejecución de Windows.

Consulta `docs/MIGRACION.md` para distinguir lo preparado de lo pendiente para el estado de la nueva instancia y su inicio limpio.

## Publicación propia

Comprobada el 6 de octubre de 2026: https://lucianos-cocina-criolla.joaquintorress1205.workers.dev/login.
Solo cuenta general `lucianos@sistema.com`; contraseña en `outputs/acceso-general.txt`, fuera de Git.
El correo del administrador sigue reservado. Leer `docs/ACCESO.md` para el estado
y `docs/MIGRACION.md` para la decisión de inicio limpio, sin trasladar historial.

## Cuentas y correo

Mi cuenta permite cambiar contraseña y asociar correo real. Usuarios es exclusivo de admin y permite gestionar cuentas. El propietario autorizó la rotación de las dos contraseñas iniciales y publicación en Cloudflare. Ver docs/USUARIOS_Y_CORREO.md para el envío pendiente de proveedor: no tiene servicio ni dominio. Las sesiones usan auth_version para invalidarse con cada cambio de acceso. Los enlaces públicos se gestionan en /acceso.
