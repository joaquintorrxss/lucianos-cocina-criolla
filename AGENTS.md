# Lucianos: inicio de migración

Lee primero `CONTINUAR_EN_CODEX.md` y `docs/MIGRACION.md`.

- Trabaja únicamente en este checkout, `lucianos-independiente`, rama `codex/migracion-independiente`.
- El checkout hermano `../sistema` y su sitio se conservan como referencia del sistema anterior. No modificar, publicar, borrar ni migrar su base de datos.
- Esta copia deriva del sistema original. No ejecutar publicación de Sites desde aquí; usar exclusivamente la infraestructura propia autorizada.
- El usuario autorizó preparar la migración a sus propias cuentas de GitHub y Cloudflare. GitHub está vinculado como `joaquintorrxss`, con repositorio privado `joaquintorrxss/lucianos-cocina-criolla`. Cloudflare está autenticada, cuenta `4c014cfa178db72a396081d8d33538f6`; D1 propia `lucianos-produccion` (`e539eb6d-8280-41b7-b8a3-f5ce0f447938`) tiene el esquema aplicado y cero jornadas. Ver `wrangler.d1.json` y `docs/BASE_DE_DATOS.md`. Acceso propio con contraseña verificado antes de publicar la copia. El usuario decidió iniciar desde cero en la nueva instancia el 6 de octubre de 2026.
- El usuario autorizó el 6 de octubre de 2026 crear el administrador y CRUD de carta. Cuenta general `lucianos@sistema.com` con rol operator y administrador `joaquintorress1205@gmail.com` con rol admin. Ver `docs/ACCESO.md` y `docs/ADMINISTRAR_CARTA.md`.
- La copia usa `wrangler.jsonc` y autenticación propia en `app/auth.ts`; se retiraron el identificador de Sites y su acceso simulado. Las cabeceras `oai-authenticated-*` NO otorgan acceso. `wrangler.d1.json` administra la misma D1 nueva, sin publicar. El Worker propio está publicado en `https://lucianos-cocina-criolla.joaquintorress1205.workers.dev`, con cuenta general validada por HTTPS en Workers Free. No se contrató ningún plan. NO importar jornadas ni registros antiguos: el usuario eligió comenzar desde cero.
- Contraseñas y SQL de aprovisionamiento solo en archivos ignorados (`outputs/`, `.sites-runtime/`). No imprimirlos ni incluirlos en commits. Las migraciones de auth NO contienen credenciales.
- Mantener diseño, comportamiento, pedidos, caja, historial y PDF. La administración visual de carta está autorizada e implementada en `app/catalog-admin.tsx`, con catálogo D1 y jornada que conserva su propia carta.
- Importes enteros en céntimos. Cada línea de pedido conserva nombre, categoría y precio del momento de la venta. No recalcular pedidos históricos con precios actuales.
- Exportaciones y SQL con ventas reales están fuera de este repositorio, en `../respaldos/`. No agregarlos a Git, ni copiar credenciales, `.wrangler` o datos de prueba del proyecto anterior.
- Aplicar esquema e importaciones únicamente a una base nueva de propiedad del usuario. Revisar cuenta e ID de destino antes de ejecutar comandos remotos.
- Decisión expresa del 6 de octubre: inicio limpio en la D1 propia. No trasladar jornadas, pedidos, pagos, caja, stock de jornadas ni historial del sitio anterior. Mantener la carta inicial del sistema y la cuenta general. No interpretar esto como autorización para borrar datos del sistema anterior.
- Verificar con las pruebas existentes de `tests/`, TypeScript y build. Las pruebas API que crean ventas se ejecutan solo en bases locales de prueba.
- No hay WhatsApp Business configurado. Conservar descarga de PDF, compartir archivo compatible y enlaces a números personales; no afirmar que hay envío automático de adjuntos.

Explica los pasos en español, para una persona que está aprendiendo desarrollo y backend.
