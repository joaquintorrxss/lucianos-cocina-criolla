# Migración de Lucianos a infraestructura propia

## Punto de partida

- Fecha de preparación: 2 de octubre de 2026.
- Código original: commit `b2a6f10107500a1cb3d520051a58d6ea194938c1`.
- Sitio vigente: `https://lucianos-caja-mesas.joaquintorress1205.chatgpt.site/`.
- Original local: `../sistema`.
- Copia de trabajo: esta carpeta; rama `codex/migracion-independiente`.
- Repositorio privado propio: `https://github.com/joaquintorrxss/lucianos-cocina-criolla`, remoto `origin`.
- Respaldo privado: `../respaldos/2026-10-02-inicio/`. No subir a GitHub las exportaciones de ventas.

La primera etapa conserva los archivos de la aplicación. La copia aún contiene configuración y autenticación de Sites y NO está lista para publicar directamente en una cuenta propia. El historial de Git se conservó para comparar y revertir cambios.

Estado del respaldo inicial: código ZIP e historial Git completos. La inspección de producción encontró dos jornadas, 2026-09-27 y 2026-09-30, con revisiones 14 y 5. El lector de tablas disponible recorta los valores JSON largos y la API del historial exige identidad de usuario autenticado (HTTP 401 incluso con el token de acceso técnico de la plataforma). Por ello NO se guardaron fragmentos como si fueran una exportación completa. Hay que obtener un mecanismo de exportación autenticada antes de importar o trasladar datos reales; no desactivar la autenticación del sistema vigente para hacerlo.

## Qué hace cada servicio

| Herramienta | Función |
| --- | --- |
| Visual Studio Code | Editor local del código |
| Codex | Ayuda a modificar, explicar y comprobar el proyecto en el editor |
| Git y GitHub privado | Historial y respaldo del código en tu cuenta |
| Cloudflare Workers | Ejecuta la web y el backend |
| Cloudflare D1 | Guarda jornadas, pedidos, pagos y movimientos |
| Cloudflare Access | Restringe el acceso a personas autorizadas |

Flujo futuro: navegador → acceso privado → Worker/backend → D1. El navegador no recibe claves de administración de la base. Guardar un pago implica que el backend valida el importe, la jornada y la revisión del registro, y luego escribe en D1.

## Pasos restantes, en orden

1. Completar el inicio de sesión de Codex en VS Code.
2. Elegir o crear las cuentas propias de GitHub y Cloudflare. Autenticarse mediante los mecanismos oficiales; no compartir contraseñas por chat.

   GitHub ya está autenticada como `joaquintorrxss` mediante autorización del usuario en el navegador. Herramienta oficial instalada de forma portable, con credenciales en el almacén seguro de Windows. Consultar `docs/CUENTAS.md` para el estado y los comandos. Cloudflare sigue sin autenticar.
3. Crear el repositorio privado en la cuenta elegida y asociarlo únicamente a esta copia. Revisar archivos y excluir secretos y datos antes del primer push.

   Repositorio privado creado y `origin` vinculado a la cuenta del usuario. Los respaldos, bases locales y credenciales están excluidos de Git. Verificar las referencias remotas después de cada push.
4. Sustituir la configuración de Sites por configuración explícita del Worker propio y una base D1 nueva. No reutilizar IDs de recursos del sistema vigente.
5. Sustituir el inicio de sesión de Sites. La propuesta es Cloudflare Access con correos autorizados, validación del token en backend y acceso cerrado cuando falte configuración. Confirmar los correos con el usuario.
6. Importar una copia completa de los registros reales a la nueva D1 y cotejar IDs, revisiones, pedidos, importes históricos y arqueos. No importar datos de prueba locales.
7. Probar la instancia nueva: registro, detalle por plato, entregas, cobros, vuelto, caja, historial, filtros y PDF. Los ensayos de ventas deben realizarse en una base de prueba.
8. Entre jornadas, actualizar el respaldo de producción, importar los últimos cambios, comprobar totales y cambiar la dirección que usa el restaurante. Mantener una única instancia activa para ventas.
9. Tras validar la migración, agregar un panel administrativo para editar carta, nombres, precios y apariencia sin tocar código.

Un respaldo inicial no cubre las ventas que se registren después de la exportación. Antes del cambio definitivo hay que volver a exportar y comprobar.

## Estructura y preservación de datos

Actualmente D1 tiene una tabla `days`. Cada fila guarda la jornada completa en JSON, junto con fecha, estado activo y revisión. No hay todavía una tabla separada de productos administrables. Conservar esta estructura durante la primera migración reduce cambios de comportamiento.

Cada pedido guarda sus líneas con nombre, categoría, cantidad, precio unitario y unidades servidas, junto con sus pagos. Cambiar los precios de la carta no debe reemplazar esos valores históricos. Los importes son céntimos enteros; `1800` representa S/ 18.00.

El archivo `datos-produccion.json`, cuando la exportación esté verificada, contiene las filas completas. `datos-produccion.sql` incluye el esquema y los INSERT para una base vacía. `manifest-datos.json` registra fecha, huellas SHA-256 y totales para cotejar la restauración. La ausencia de cualquiera de ellos significa que todavía no debe darse por terminado el respaldo de datos.

## Límites actuales

Comprobaciones de la preparación local: extensión oficial `openai.chatgpt` instalada (versión 26.930.21537), dependencias instaladas con `npm ci`, 27 pruebas aprobadas, TypeScript sin errores y build completo. Se creó únicamente el esquema en D1 local. Las API de estado e historial respondieron HTTP 200 con sesión local; sin sesión, estado respondió HTTP 401. No se modificaron componentes, CSS ni reglas de negocio. El checkout original mantuvo el mismo commit y estado Git limpio.

- Instalar la extensión no publica el sitio ni migra la base.
- GitHub propia ya está vinculada y tiene un repositorio privado del proyecto. Todavía no se ha vinculado la cuenta Cloudflare ni creado un recurso Cloudflare propio del usuario.
- El acceso simulado de desarrollo solo sirve para pruebas en localhost y no sustituye autenticación de producción.
- Los reportes WhatsApp siguen usando los números personales confirmados y requieren compartir el PDF; no hay API Business para enviar adjuntos automáticamente.
- Antes de desplegar, retirar el identificador del proyecto de Sites de esta copia y documentar los recursos nuevos. No modificar ese identificador en el checkout original.
