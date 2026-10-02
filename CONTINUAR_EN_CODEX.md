# Continuar Lucianos en Visual Studio Code

Esta carpeta es una copia separada del sistema. El restaurante continúa usando el sitio actual durante la preparación.

## Primer inicio

1. En Visual Studio Code abre la carpeta `lucianos-independiente`.
2. Abre el icono de Codex. Si no aparece, pulsa `Ctrl+Shift+P` y busca `Codex: Open Codex Sidebar`.
3. Elige iniciar sesión con ChatGPT y completa el acceso en tu navegador. No pegues contraseñas ni claves en el chat.
4. Abre un chat de Codex en VS Code y pega el siguiente mensaje:

> Estamos iniciando la migración de Lucianos a mis propias cuentas de GitHub y Cloudflare, sin cambiar el diseño ni el funcionamiento existente. Lee AGENTS.md, CONTINUAR_EN_CODEX.md y docs/MIGRACION.md. Trabaja solo en esta copia. Comprueba primero el estado real del proyecto y las validaciones pendientes. Ayúdame a configurar mis cuentas y luego el acceso privado, la base D1 y la nueva publicación. No publiques en el sitio antiguo ni cambies sus datos. Explícame cada paso en español.

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
| `app/chatgpt-auth.ts` | Acceso actual; pendiente adaptar para hosting propio |

El proyecto está hecho con React y TypeScript: los componentes `.tsx` producen el HTML. No es una única página `index.html`. El CSS y la lógica están separados en los archivos indicados.

Cambiar la carta en código todavía requiere revisar las reglas y publicar. Tener VS Code no crea automáticamente un panel para editar productos; ese panel se hará después de validar la migración.

## Desarrollo local

Node.js y VS Code ya están instalados en esta computadora. Desde una terminal en esta carpeta:

```powershell
npm ci
npm run build
npm run db:init:local
npm run dev -- --port 5174
```

Abre `http://localhost:5174`. Es un entorno local, con inicio de sesión simulado. La base local es independiente: no modifica la base del sitio publicado.

`db:init:local` crea las tablas de una base local NUEVA y vacía. Solo se ejecuta una vez al preparar un checkout limpio, después del build. No repitas la creación de tablas sobre una base que ya tiene registros. La copia no incluye las ventas reales hasta completar su exportación e importación verificadas.

En ESTA copia ya quedaron instaladas las dependencias, compilado el proyecto y creada la base local vacía. Para volver a arrancarla basta `npm run dev -- --port 5174`. Cuando se preparó esta guía se dejó una sesión de desarrollo corriendo en `http://127.0.0.1:5174/`; si más adelante no responde, ejecuta ese comando desde la terminal.

Para comprobar el código:

```powershell
node --test tests/model.test.mjs tests/storage-errors.test.mjs tests/enhancements.test.mjs tests/reports.test.mjs tests/order-report.test.mjs
node node_modules/typescript/bin/tsc --noEmit
npm run build
```

Si PowerShell bloquea `npm.ps1`, usa `npm.cmd` en lugar de `npm`; no hace falta cambiar la política de ejecución de Windows.

Consulta `docs/MIGRACION.md` para distinguir lo preparado de lo pendiente antes de usar esta copia para ventas reales.
