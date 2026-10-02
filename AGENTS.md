# Lucianos: inicio de migración

Lee primero `CONTINUAR_EN_CODEX.md` y `docs/MIGRACION.md`.

- Trabaja únicamente en este checkout, `lucianos-independiente`, rama `codex/migracion-independiente`.
- El checkout hermano `../sistema` y el sitio publicado siguen siendo el sistema vigente. No modificar, publicar ni migrar su base de datos durante la preparación.
- Esta copia conserva la implementación de Sites como punto de partida. No ejecutar publicación de Sites desde aquí ni reutilizar el proyecto de `.openai/hosting.json` como destino de despliegue.
- El usuario autorizó preparar la migración a sus propias cuentas de GitHub y Cloudflare. GitHub está vinculado como `joaquintorrxss`, con repositorio privado `joaquintorrxss/lucianos-cocina-criolla`. Cloudflare está autenticada, cuenta `4c014cfa178db72a396081d8d33538f6`; D1 propia `lucianos-produccion` (`e539eb6d-8280-41b7-b8a3-f5ce0f447938`) tiene el esquema aplicado y cero jornadas. Ver `wrangler.d1.json` y `docs/BASE_DE_DATOS.md`. Configurar acceso privado antes de publicar la nueva instancia.
- `wrangler.d1.json` administra únicamente la nueva base; no es la configuración de despliegue del Worker. La aplicación aún conserva configuración y autenticación de Sites, pendientes de adaptar. No publicar ese backend aceptando cabeceras de identidad sin validación.
- Acceso privado previsto: propietario `joaquintorress1205@gmail.com` y otros correos que el usuario indicó que proporcionará. La lista adicional todavía está pendiente; no sustituirla por una política que permita a cualquiera ni dar por terminado el acceso privado.
- Mantener diseño, comportamiento, pedidos, caja, historial y PDF. Administración visual de carta y apariencia será una etapa posterior.
- Importes enteros en céntimos. Cada línea de pedido conserva nombre, categoría y precio del momento de la venta. No recalcular pedidos históricos con precios actuales.
- Exportaciones y SQL con ventas reales están fuera de este repositorio, en `../respaldos/`. No agregarlos a Git, ni copiar credenciales, `.wrangler` o datos de prueba del proyecto anterior.
- Autenticación actual `app/chatgpt-auth.ts` depende de cabeceras confiables de Sites. En un servidor independiente NO basta aceptar esas cabeceras públicas. Reemplazar con autenticación validada en servidor antes del despliegue.
- Aplicar esquema e importaciones únicamente a una base nueva de propiedad del usuario. Revisar cuenta e ID de destino antes de ejecutar comandos remotos.
- Hacer el corte entre jornadas, con exportación final y cotejo de totales. Solo una instancia recibirá pedidos reales.
- Verificar con las pruebas existentes de `tests/`, TypeScript y build. Las pruebas API que crean ventas se ejecutan solo en bases locales de prueba.
- No hay WhatsApp Business configurado. Conservar descarga de PDF, compartir archivo compatible y enlaces a números personales; no afirmar que hay envío automático de adjuntos.

Explica los pasos en español, para una persona que está aprendiendo desarrollo y backend.
