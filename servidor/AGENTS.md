# Instrucciones para un agente: instalar el servidor del aula en vivo de ClassBots

Este documento es para un agente (Claude Code u otro) con acceso a una terminal en la VPS. Sigue los pasos en orden. **Cada paso tiene una comprobación**: no avances si falla. Las personas pueden leer `README.md`.

## Objetivo

Dos contenedores corren en Docker **rootless** con el usuario sin privilegios `classbots`:

- `aula` (Node.js + WebSocket + SQLite): **no publica puertos**, y su red `interna` no tiene salida a internet.
- `tunel` (Cloudflare Tunnel, `cloudflare/cloudflared`): conecta hacia fuera con Cloudflare y le entrega a `aula` el tráfico de `wss://<DOMINIO>/aula`, por la red interna (`http://aula:8787`).

Este es el **modo túnel**, el recomendado. Existe también un **modo proxy**, para cuando la persona no usa Cloudflare: el aula escucha en `127.0.0.1:8787` y un proxy HTTPS existente (Caddy o Nginx) le pasa el tráfico. Se activa en `.env` y está descrito en el paso 5B.

## Datos que debes pedir a la persona antes de empezar

Pregúntalos todos juntos y no los inventes:

| Dato | Ejemplo | Uso |
|---|---|---|
| Modo | túnel (recomendado) o proxy | Pasos 3 y 5 |
| `DOMINIO` | `aula.eehub.ing` | Subdominio público del aula. En modo túnel, **de un solo nivel** bajo la zona de Cloudflare |
| `ORIGEN_JUEGO` | `https://classbots.eehub.ing` | Única página que puede conectarse (`ORIGENES`) |
| Solo modo proxy: proxy existente y si corre en un contenedor | Caddy en el sistema, Nginx en contenedor… | Paso 5B |
| Permiso para usar `sudo` | sí / no | Paso 1 (y 5B) |

En modo túnel, comprueba enseguida que `DOMINIO` tenga **un solo nivel**: `aula.eehub.ing` sirve, `api.classbots.eehub.ing` no, porque el certificado gratuito de Cloudflare no lo cubre. Si tiene dos niveles, detente y propón uno de un nivel.

## Reglas

- **No toques** los contenedores, redes, volúmenes, túneles ni la configuración del Docker que ya existe (el normal, con root), ni un `cloudflared` instalado en el sistema. Este servicio usa un Docker rootless y un túnel propios.
- **El token del túnel es un secreto.** Vive solo en `.env`, con permisos `600`. No lo muestres, no lo escribas en registros ni en el informe, y no lo pongas en `compose.yaml`. Lo ideal es que la persona lo pegue ella misma en `.env`; si te lo da, escríbelo sin repetirlo en pantalla.
- No agregues `ports` en modo túnel, no quites `internal: true` de la red `interna` y no abras puertos en el firewall.
- No desactives TLS, SELinux ni AppArmor, y no corras contenedores como root ni con `--privileged`. No cambies `read_only`, `cap_drop`, `security_opt` ni `user`.
- No copies ni muestres llaves, contraseñas de clase ni el contenido de `aula.db`. El servidor solo guarda datos cifrados, pero igual son de estudiantes.
- Antes de modificar un archivo del sistema (proxy, DNS), haz una copia `*.bak-classbots` y muéstrale a la persona el cambio.
- Si un comando falla dos veces con el mismo error, detente y explica el error; no improvises alternativas que cambien la seguridad.

## Paso 0 · Reconocimiento (solo lectura)

```bash
cat /etc/os-release | head -3
docker version --format '{{.Server.Version}}' 2>/dev/null || echo "sin docker"
id classbots 2>/dev/null || echo "sin usuario classbots"
ss -ltnp | grep -E ':(80|443|8787)\b' || true
```

**Comprobación:** en modo proxy, el puerto 8787 debe estar libre. Si está ocupado, pregunta qué puerto usar y cámbialo en `compose.puerto.yaml`. En modo túnel el puerto da igual, porque no se publica.

## Paso 1 · Usuario y Docker rootless (requiere sudo)

```bash
sudo useradd -m -s /bin/bash classbots            # omitir si ya existe
sudo loginctl enable-linger classbots
# Debian/Ubuntu con Docker del repositorio oficial:
sudo apt-get install -y uidmap dbus-user-session docker-ce-rootless-extras
# Fedora/RHEL/Rocky/Alma: sudo dnf install -y shadow-utils fuse-overlayfs docker-ce-rootless-extras
grep '^classbots:' /etc/subuid /etc/subgid
```

**Comprobación:** `classbots` aparece en `/etc/subuid` y `/etc/subgid`. Si no, ejecuta `sudo usermod --add-subuids 200000-265535 --add-subgids 200000-265535 classbots`.

Desde aquí, todos los comandos se ejecutan **como `classbots` con una sesión de systemd real**. No uses `su` ni `sudo -u`, que no crean `XDG_RUNTIME_DIR`. Usa:

```bash
sudo machinectl shell classbots@ /bin/bash -lc '<comando>'
```

o una sesión SSH directa como `classbots`.

```bash
dockerd-rootless-setuptool.sh install
systemctl --user enable --now docker
echo 'export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock' >> ~/.bashrc
export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock
docker info --format '{{.SecurityOptions}}'
```

**Comprobación:** la salida de `docker info` incluye `rootless`. Si `dockerd-rootless-setuptool.sh` dice que el Docker con root está accesible, es porque `classbots` está en el grupo `docker`: sácalo con `sudo gpasswd -d classbots docker` y repite. No uses `--force`.

## Paso 2 · Archivos

Descarga el paquete publicado con el juego (o usa el zip que te dio la persona) en `/home/classbots`:

```bash
cd ~ && curl -fLO https://classbots.eehub.ing/classbots-aula.zip
unzip -o classbots-aula.zip && cd classbots-aula
ls servidor.js Dockerfile compose.yaml compose.puerto.yaml .env.ejemplo package.json package-lock.json
```

**Comprobación:** existen los siete archivos.

## Paso 3 · Configuración (`.env`)

```bash
cp -n .env.ejemplo .env && chmod 600 .env
```

- `ORIGENES` = `ORIGEN_JUEGO` exacto: con `https://` y sin barra final.
- **Modo túnel:** deja `COMPOSE_PROFILES=tunel`. `TUNNEL_TOKEN` se llena en el paso 5A.
- **Modo proxy:** comenta `COMPOSE_PROFILES` y `TUNNEL_TOKEN`, y descomenta `COMPOSE_FILE=compose.yaml:compose.puerto.yaml`. Si el proxy corre dentro de un contenedor del Docker con root, cambia `127.0.0.1` por la IP del puente en `compose.puerto.yaml`; confírmala con `ip -4 addr show docker0`.

**Comprobación:** `docker compose config --services` muestra `aula` y `tunel` en modo túnel, o solo `aula` en modo proxy. `stat -c %a .env` muestra `600`.

## Paso 4 · Construir el aula

```bash
docker compose up -d --build aula
sleep 35
docker compose ps aula
docker compose exec aula wget -qO- http://127.0.0.1:8787/salud
```

**Comprobación:** el estado es `running (healthy)` y la respuesta es `{"ok":true,"salas":0}`. Si falla, revisa `docker compose logs --tail 50 aula` y reporta el error.

En modo túnel, comprueba además que nada esté expuesto: `ss -ltn | grep 8787` no debe mostrar nada. En modo proxy debe mostrar solo `127.0.0.1:8787` (o la IP del puente), nunca `0.0.0.0` ni `[::]`.

## Paso 5A · Modo túnel: Cloudflare Tunnel en su contenedor

La persona hace esto en el panel de Cloudflare; dale las instrucciones exactas y espera su confirmación:

1. **Zero Trust → Networks → Tunnels → Create a tunnel → Cloudflared**. Nombre: `classbots-aula`. Entorno: **Docker**. Debe copiar **solo el token** (el texto después de `--token`) y no ejecutar el comando que muestra Cloudflare.
2. **Public hostnames → Add a public hostname**:
   - Subdomain y Domain según `DOMINIO`; Path `^/(aula|salud)$`.
   - Service: **HTTP** · URL: **`aula:8787`**. Es el nombre del contenedor en la red interna, **no** `localhost`.
3. Si ya existía un registro `A`/`AAAA` con ese nombre, borrarlo: el túnel crea su CNAME.
4. Pegar el token en `.env` (`TUNNEL_TOKEN=`): ella misma con `nano .env`, o dártelo a ti, que lo escribes sin mostrarlo.

Luego:

```bash
grep -q '^TUNNEL_TOKEN=.\+' .env && echo "token presente"     # no imprimas el token
docker compose up -d
sleep 10
docker compose ps
docker compose logs --tail 30 tunel | grep -Ei 'registered|error'
```

**Comprobación:** `tunel` está `running` y los registros dicen `Registered tunnel connection` (normalmente 4 veces). Si dicen `Unauthorized` o `invalid token`, el token está mal copiado: pide a la persona que lo pegue de nuevo. Si dicen `dial tcp aula:8787`, revisa que la URL del panel sea `aula:8787` y que `aula` esté `healthy`.

## Paso 5B · Modo proxy: proxy HTTPS existente (requiere sudo y confirmación)

Muestra el cambio a la persona antes de aplicarlo. Haz una copia de seguridad de cada archivo que modifiques.

- **Caddy en el sistema:** agrega el bloque de `proxy/Caddyfile` (con `DOMINIO`) al Caddyfile del sistema y ejecuta `sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy`.
- **Nginx en el sistema:** copia `proxy/nginx.conf` a `/etc/nginx/sites-available/classbots-aula` (en RHEL: `/etc/nginx/conf.d/classbots-aula.conf`) con `DOMINIO`. Habilítalo, emite el certificado con `sudo certbot --nginx -d <DOMINIO>` y ejecuta `sudo nginx -t && sudo systemctl reload nginx`. Conserva `Upgrade`/`Connection` y `proxy_read_timeout 1h`.
- **cloudflared ya instalado en el sistema (con `config.yml`):** agrega la regla de `proxy/cloudflared.yml` antes de `http_status:404`. Luego ejecuta `cloudflared tunnel ingress validate`, `cloudflared tunnel route dns <túnel> <DOMINIO>` y `sudo systemctl restart cloudflared`. Si ese túnel se administra desde el panel, dale a la persona los valores (Service `HTTP`, URL `localhost:8787`) y espera su confirmación.
- **Proxy dentro de un contenedor:** apunta el upstream a la IP del puente que pusiste en el paso 3.
- **Traefik u otro:** traduce la plantilla. Lo esencial: solo las rutas `/aula` (WebSocket) y `/salud`, sin tiempo de espera corto para el WebSocket, y la cabecera `X-Forwarded-For` con la IP real.

**DNS (sin túnel):** el registro `A`/`AAAA` de `DOMINIO` debe apuntar a la VPS; compruébalo con `dig +short <DOMINIO>`. Si no apunta, pide a la persona que lo cree.

## Paso 6 · Comprobación final (cualquier modo)

```bash
curl -fsS https://<DOMINIO>/salud
# Handshake de WebSocket con el origen permitido: debe responder 101
curl -sS -o /dev/null -w '%{http_code}\n' --http1.1 \
  -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' \
  -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' -H "Origin: <ORIGEN_JUEGO>" \
  https://<DOMINIO>/aula --max-time 3
# Con otro origen debe responder 403
curl -sS -o /dev/null -w '%{http_code}\n' --http1.1 \
  -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' \
  -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' -H 'Origin: https://otro.ejemplo' \
  https://<DOMINIO>/aula --max-time 3
# Otras rutas no se publican: debe responder 404
curl -sS -o /dev/null -w '%{http_code}\n' https://<DOMINIO>/otra --max-time 5
```

Con el primer handshake, `101` es correcto aunque luego corte por tiempo. Con el segundo, debe salir `403`. Si `/salud` da un error de certificado en modo túnel, `DOMINIO` tiene dos niveles: vuelve a la sección de datos.

Arranque automático: con `linger` y `restart: unless-stopped`, ambos contenedores vuelven tras reiniciar la VPS. No hace falta crear un servicio de systemd.

## Paso 7 · Lo que hace la persona (no el agente)

Díselo al terminar:

1. En GitHub, en *Settings → Secrets and variables → Actions → Variables*, crear `VITE_AULA_URL` con el valor `wss://<DOMINIO>/aula` y volver a publicar el juego.
2. Crear una clase **nueva** en el juego: las anteriores no tienen llave de firma.

## Informe final

Entrega a la persona, **sin el token**:

- modo usado, usuario, ruta y comandos de estado (`docker compose ps`, `docker compose logs -f aula`, `docker compose logs -f tunel`);
- archivos del sistema que cambiaste y sus copias `.bak-classbots` (en modo túnel, ninguno);
- resultados de las comprobaciones de los pasos 4 a 6;
- mantenimiento:

```bash
docker compose pull tunel && docker compose up -d      # actualizar cloudflared
docker run --rm -v classbots-aula_aula-datos:/datos -v "$PWD":/r alpine cp /datos/aula.db /r/aula-$(date +%F).db   # respaldo
```

- si el token se filtra: en Cloudflare, **Tunnels → classbots-aula → Refresh token**; poner el nuevo en `.env` y ejecutar `docker compose up -d`.

## Desinstalar

Como `classbots`, ejecuta `docker compose down` (añade `-v` para borrar también los datos, solo si la persona lo confirma). En modo túnel, la persona borra el túnel `classbots-aula` en Cloudflare. En modo proxy, quita el bloque del proxy y recárgalo.
