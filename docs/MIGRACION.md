# Lucianos en infraestructura propia: inicio desde cero

## Punto de partida

- Fecha de preparación: 2 de octubre de 2026.
- Código original: commit `b2a6f10107500a1cb3d520051a58d6ea194938c1`.
- Sitio vigente: `https://lucianos-caja-mesas.joaquintorress1205.chatgpt.site/`.
- Original local: `../sistema`.
- Copia de trabajo: esta carpeta; rama `codex/migracion-independiente`.
- Repositorio privado propio: `https://github.com/joaquintorrxss/lucianos-cocina-criolla`, remoto `origin`.
- Cuenta Cloudflare propia vinculada: `4c014cfa178db72a396081d8d33538f6`.
- D1 nueva: `lucianos-produccion`, ID `e539eb6d-8280-41b7-b8a3-f5ce0f447938`, esquema aplicado y cero jornadas.
- Respaldo privado: `../respaldos/2026-10-02-inicio/`. No subir a GitHub las exportaciones de ventas.

La aplicación conserva su diseño y reglas, y usa configuración propia del Worker (`wrangler.jsonc`) y acceso con contraseña (`docs/ACCESO.md`). Está publicada en https://lucianos-cocina-criolla.joaquintorress1205.workers.dev. El 6 de octubre de 2026 el usuario pidió iniciar desde cero: NO se trasladarán registros del sistema anterior. La D1 propia empieza sin jornadas, pedidos ni caja abierta. El historial de Git se conserva para comparar y revertir cambios.

Estado del respaldo de código: ZIP e historial Git completos. No se obtuvo una exportación completa de ventas del sistema anterior; los resultados recortados no se guardaron como respaldo. Tras la decisión de iniciar desde cero, esa exportación NO es requisito ni trabajo pendiente. El sistema anterior y sus registros se conservan sin modificaciones.

## Qué hace cada servicio

| Herramienta | Función |
| --- | --- |
| Visual Studio Code | Editor local del código |
| Codex | Ayuda a modificar, explicar y comprobar el proyecto en el editor |
| Git y GitHub privado | Historial y respaldo del código en tu cuenta |
| Cloudflare Workers | Ejecuta la web y el backend |
| Cloudflare D1 | Guarda jornadas, pedidos, pagos y movimientos |
| Acceso propio de Lucianos | Usuario y contraseña; validación de sesión en el backend |

Flujo futuro: navegador → acceso privado → Worker/backend → D1. El navegador no recibe claves de administración de la base. Guardar un pago implica que el backend valida el importe, la jornada y la revisión del registro, y luego escribe en D1.

## Pasos restantes, en orden

1. Completar el inicio de sesión de Codex en VS Code.
2. Elegir o crear las cuentas propias de GitHub y Cloudflare. Autenticarse mediante los mecanismos oficiales; no compartir contraseñas por chat.

   GitHub está autenticada como `joaquintorrxss` y Cloudflare como `joaquintorress1205@gmail.com`, ambas mediante OAuth. Consultar `docs/CUENTAS.md` para el estado y los comandos.
3. Crear el repositorio privado en la cuenta elegida y asociarlo únicamente a esta copia. Revisar archivos y excluir secretos y datos antes del primer push.

   Repositorio privado creado y `origin` vinculado a la cuenta del usuario. Los respaldos, bases locales y credenciales están excluidos de Git. Verificar las referencias remotas después de cada push.
4. Sustituir la configuración de Sites por configuración explícita del Worker propio y una base D1 nueva. No reutilizar IDs de recursos del sistema vigente.

   La D1 nueva tiene el esquema de jornadas y autenticación. La aplicación usa
   exclusivamente los recursos propios en `wrangler.jsonc`; se retiró de esta
   copia el identificador antiguo de Sites. Ver `docs/BASE_DE_DATOS.md`.
5. Acceso propio preparado: solo `lucianos@sistema.com` con contraseña.
   El usuario decidió reservar `joaquintorress1205@gmail.com` para administración
   posterior; no se creó esa cuenta ni un rol admin. Ver `docs/ACCESO.md`.
6. Inicio limpio confirmado por el usuario: NO importar datos históricos. La nueva D1 tiene una cuenta general y cero jornadas.
7. Registrar las nuevas jornadas únicamente en esta instancia, eligiendo carta del día, fondo inicial de caja y cantidades disponibles desde la pantalla de apertura.
8. El administrador y el panel para editar carta, nombres y precios se harán después; todavía no están creados.

## Estructura y preservación de datos

Actualmente D1 tiene una tabla `days`. Cada fila guarda la jornada completa en JSON, junto con fecha, estado activo y revisión. No hay todavía una tabla separada de productos administrables. Conservar esta estructura durante la primera migración reduce cambios de comportamiento.

Cada pedido guarda sus líneas con nombre, categoría, cantidad, precio unitario y unidades servidas, junto con sus pagos. Cambiar los precios de la carta no debe reemplazar esos valores históricos. Los importes son céntimos enteros; `1800` representa S/ 18.00.

No hay archivos de importación de ventas. La nueva base comienza desde cero por decisión del usuario; no crear ni importar esos archivos sin una nueva solicitud expresa.

## Límites actuales

Comprobaciones del 6 de octubre: 31 pruebas aprobadas, TypeScript sin errores, build completo y ensayo de publicación correcto. Las pruebas HTTP locales en desarrollo y servidor compilado cubrieron identidad falsa, contraseñas erróneas, ausencia de admin, limitación de intentos, origen, sesión caducada, cuenta desactivada y cierre de sesión. Las credenciales y SQL de aprovisionamiento están excluidos de Git. En Cloudflare se verificaron pantalla, inicio de sesión, D1 vacía, interfaz general y revocación por HTTPS. La copia original conserva el commit inicial y su estado limpio.

La publicación propia está en https://lucianos-cocina-criolla.joaquintorress1205.workers.dev/login. No se contrató un plan de pago. La nueva base empieza desde cero por decisión expresa del usuario.

- Instalar la extensión no publica el sitio ni migra la base.
- GitHub propia y Cloudflare están vinculadas. La D1 propia está creada con esquema e índices verificados y cero jornadas. El acceso propio está publicado y verificado por HTTPS en Workers Free. Solo la cuenta general está activa.
- El ingreso local ahora exige la cuenta real; se eliminó el acceso simulado de Sites.
- Los reportes WhatsApp siguen usando los números personales confirmados y requieren compartir el PDF; no hay API Business para enviar adjuntos automáticamente.
- El identificador de Sites ya fue retirado de esta copia. No modificar el checkout original. El ingreso y las consultas iniciales funcionaron en Workers Free; el coste de PDF con muchas órdenes y la carga sostenida aún no se verificaron en el plan gratuito.
