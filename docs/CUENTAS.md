# Vincular las cuentas propias de Lucianos

## GitHub

Cuenta elegida por el usuario: `joaquintorrxss`.

Se preparó GitHub CLI oficial v2.102.0 en `.sites-runtime/tools/gh/bin/gh.exe`.
El paquete Windows se descargó de `github.com/cli/cli` y se verificó contra
su huella SHA-256 antes de ejecutarlo. Es una herramienta local excluida de Git.

Para comprobar la vinculación, desde PowerShell en esta carpeta:

```powershell
& './.sites-runtime/tools/gh/bin/gh.exe' auth status --hostname github.com
& './.sites-runtime/tools/gh/bin/gh.exe' api user --jq .login
```

Si aún falta iniciar sesión:

```powershell
& './.sites-runtime/tools/gh/bin/gh.exe' auth login --hostname github.com --git-protocol https --web --skip-ssh-key
```

La herramienta presenta un código temporal y abre `https://github.com/login/device`.
El usuario inicia sesión y autoriza GitHub CLI personalmente en el navegador.
No guardar códigos temporales ni tokens en este repositorio. Confirmar que
la cuenta autenticada sea `joaquintorrxss` antes de crear o subir el repositorio.

Repositorio creado y comprobado como privado:
`https://github.com/joaquintorrxss/lucianos-cocina-criolla`.
El remoto `origin` de esta copia apunta a ese repositorio. La cuenta autenticada
es `joaquintorrxss`; GitHub CLI confirmó almacenamiento de credenciales en el
almacén seguro de Windows (`keyring`).

Se usa `main` como rama principal de la copia preparada y
`codex/migracion-independiente` para continuar la migración. El checkout original
mantiene sus propios remotos y ramas.

Para comprobar los cambios subidos:

```powershell
git remote -v
git status
git ls-remote origin refs/heads/main refs/heads/codex/migracion-independiente
```

Se revisaron los ocho commits originales buscando patrones de claves privadas
y tokens habituales de GitHub/OpenAI, sin coincidencias. Esta revisión no es
una garantía de detectar cualquier secreto; mantener las exclusiones de `.env`,
`.dev.vars`, `.wrangler`, dependencias y exportaciones de ventas.

Fuentes oficiales:
- https://cli.github.com/manual/gh_auth_login
- https://cli.github.com/manual/gh_repo_create

## Cloudflare

Wrangler está instalado como dependencia del proyecto y quedó vinculado mediante
OAuth con la cuenta creada por el usuario el 2 de octubre de 2026.

- Usuario: `joaquintorress1205@gmail.com`.
- Cuenta comprobada con `whoami --json`: `4c014cfa178db72a396081d8d33538f6`.
- Base D1 nueva: `lucianos-produccion`, ID `e539eb6d-8280-41b7-b8a3-f5ce0f447938`.
- Migración aplicada: `drizzle/0000_puzzling_zaladane.sql`.
- Verificación: esquema e índices correctos; cero jornadas y sin migraciones pendientes.
- No se ha publicado un Worker propio ni configurado todavía Cloudflare Access.

La vinculación usó los permisos `account:read`, `user:read`, `workers:write`,
`workers_scripts:write`, `d1:write` y `offline_access`. No se copiaron tokens al
repositorio ni al chat. Wrangler gestiona sus credenciales fuera del proyecto.

El primer intento agotó el plazo de espera de autorización. La vinculación
se completó al reiniciar el receptor local en `127.0.0.1`. Para volver a vincular
desde PowerShell si alguna vez es necesario:

```powershell
node node_modules/wrangler/bin/wrangler.js login --callback-host 127.0.0.1 --scopes account:read user:read workers:write workers_scripts:write d1:write
node node_modules/wrangler/bin/wrangler.js whoami --json
```
El registro de la cuenta no requiere agregar un dominio.

Guía oficial de registro:
https://developers.cloudflare.com/fundamentals/account/create-account/

## Estado

GitHub vinculada y repositorio privado creado. Comprobar las referencias remotas
al terminar cada subida; crear el repositorio no publica una aplicación ni migra
su base de datos.

Subida inicial verificada: `main` y `codex/migracion-independiente` apuntaron
al commit `a46a2f7814e6696ad0b466e77c17d8c71f587291`. La documentación puede
avanzar en commits posteriores. Cloudflare ya está vinculada y la nueva D1 tiene
su estructura preparada. La conexión del Worker, el acceso privado y la
importación de datos reales siguen pendientes; ver `docs/BASE_DE_DATOS.md`.
El sistema publicado sigue siendo la instancia que recibe las ventas reales.
