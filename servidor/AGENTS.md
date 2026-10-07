# Instrucciones para un agente: instalar el servidor del aula en vivo de ClassBots

Este documento es para un agente (Claude Code u otro) con acceso a una terminal en la VPS. Sigue los pasos en orden. **Cada paso tiene una comprobación**: no avances si falla. Las personas pueden leer `README.md`.

## Objetivo

El servidor (Node.js + WebSocket + SQLite) corre en Docker **rootless** con el usuario sin privilegios `classbots` y escucha solo en `127.0.0.1:8787`. El proxy HTTPS que ya existe en la VPS publica `wss://<DOMINIO>/aula` hacia ese puerto.

## Datos que debes pedir a la persona antes de empezar

Pregúntalos todos juntos y no los inventes:

| Dato | Ejemplo | Uso |
|---|---|---|
| `DOMINIO` | `aula.eehub.ing` | Subdominio público del aula (con Cloudflare, de un solo nivel) |
| `ORIGEN_JUEGO` | `https://classbots.eehub.ing` | Única página que puede conectarse (`ORIGENES`) |
| Proxy existente | Caddy, Nginx, Traefik, Cloudflare Tunnel (`cloudflared`) o ninguno | Paso 5 |
| ¿El proxy corre dentro de un contenedor? | sí / no | Paso 5 |
| Permiso para usar `sudo` | sí / no | Pasos 1 y 5 |

## Reglas

- **No toques** los contenedores, redes, volúmenes ni la configuración del Docker que ya existe (el normal, con root). Este servicio usa un Docker rootless aparte.
- No publiques el puerto 8787 hacia internet: debe quedar en `127.0.0.1`. No abras puertos nuevos en el firewall: el tráfico entra por el 443 del proxy.
- No desactives TLS, SELinux ni AppArmor, y no corras el contenedor como root ni con `--privileged`.
- No copies ni muestres llaves, contraseñas de clase ni el contenido de `aula.db`. El servidor solo guarda datos cifrados, pero igual son de estudiantes.
- Antes de modificar un archivo de configuración del sistema (proxy, DNS), haz una copia `*.bak-classbots` y muéstrale a la persona el cambio.
- Si un comando falla dos veces con el mismo error, detente y explica el error; no improvises alternativas que cambien la seguridad.

## Paso 0 · Reconocimiento (solo lectura)

```bash
cat /etc/os-release | head -3
docker version --format '{{.Server.Version}}' 2>/dev/null || echo "sin docker"
id classbots 2>/dev/null || echo "sin usuario classbots"
ss -ltnp | grep -E ':(80|443|8787)\b' || true
systemctl is-active caddy nginx 2>/dev/null; docker ps --format '{{.Names}} {{.Image}} {{.Ports}}' 2>/dev/null | grep -Ei 'caddy|nginx|traefik' || true
```

**Comprobación:** el puerto 8787 está libre. Si está ocupado, detente y pregunta qué puerto usar; cámbialo en `compose.yaml` (`127.0.0.1:<puerto>:8787`) y en la configuración del proxy.

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

Descarga el paquete publicado con el juego (o usa el zip que te dio la persona) en `/home/classbots`, con dueño `classbots`:

```bash
cd ~ && curl -fLO https://classbots.eehub.ing/classbots-aula.zip
unzip -o classbots-aula.zip && cd classbots-aula
ls servidor.js Dockerfile compose.yaml package.json package-lock.json
```

**Comprobación:** existen los cinco archivos.

## Paso 3 · Configuración

En `compose.yaml`, pon `ORIGENES` con el `ORIGEN_JUEGO` exacto: con `https://` y sin barra final. Si el proxy corre dentro de un contenedor del Docker con root (paso 5, caso C), cambia también `ports` por la IP del puente: `"172.17.0.1:8787:8787"`. Confírmala con `ip -4 addr show docker0`.

No cambies `read_only`, `cap_drop`, `security_opt` ni `user`.

## Paso 4 · Construir y arrancar

```bash
docker compose up -d --build
sleep 5
docker compose ps
curl -fsS http://127.0.0.1:8787/salud
```

**Comprobación:** `curl` devuelve `{"ok":true,"salas":0}` y el estado es `running (healthy)` (el healthcheck puede tardar 30 s). Si falla, revisa `docker compose logs --tail 50` y reporta el error.

Prueba de que no está expuesto:

```bash
ss -ltn | grep 8787    # debe mostrar 127.0.0.1:8787 (o 172.17.0.1:8787), nunca 0.0.0.0 ni [::]
```

Arranque automático: con `linger` y `restart: unless-stopped`, el contenedor vuelve tras reiniciar la VPS. No hace falta crear un servicio de systemd.

## Paso 5 · Proxy HTTPS (requiere sudo y confirmación)

Muestra el cambio a la persona antes de aplicarlo. Haz una copia de seguridad de cada archivo que modifiques.

- **A · Caddy en el sistema:** agrega el bloque de `proxy/Caddyfile` (con `DOMINIO`) al Caddyfile del sistema y luego ejecuta `sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy`.
- **B · Nginx en el sistema:** copia `proxy/nginx.conf` a `/etc/nginx/sites-available/classbots-aula` (en RHEL: `/etc/nginx/conf.d/classbots-aula.conf`) con `DOMINIO`. Habilítalo, emite el certificado con `sudo certbot --nginx -d <DOMINIO>` y ejecuta `sudo nginx -t && sudo systemctl reload nginx`. Conserva las cabeceras `Upgrade`/`Connection` y `proxy_read_timeout 1h`.
- **C · Proxy en un contenedor (Docker con root):** apunta el upstream a `172.17.0.1:8787` (o a `host.docker.internal:8787` si el contenedor lo define) en lugar de `127.0.0.1`. Usa la configuración de la plantilla correspondiente.
- **E · Cloudflare Tunnel (`cloudflared`):** no instales Caddy, Nginx ni certbot, y no abras puertos.
  - Antes de nada, comprueba que `DOMINIO` tenga **un solo nivel** bajo la zona (por ejemplo `aula.eehub.ing`, no `api.classbots.eehub.ing`), porque el certificado gratuito de Cloudflare no cubre dos niveles. Si tiene dos niveles, detente y propón a la persona uno de un nivel.
  - Averigua el tipo de túnel con `cloudflared tunnel list` y `ls /etc/cloudflared ~/.cloudflared 2>/dev/null`. Si hay `config.yml` con `ingress:`, el túnel se administra con archivo. Si el servicio arranca con `--token`, se administra desde el panel.
  - **Túnel con archivo:** haz una copia `config.yml.bak-classbots`. Agrega la regla de `proxy/cloudflared.yml` (`hostname: <DOMINIO>`, `path: ^/(aula|salud)$`, `service: http://localhost:8787`) antes de la regla final `http_status:404`. Luego ejecuta `cloudflared tunnel ingress validate`, `cloudflared tunnel route dns <túnel> <DOMINIO>` y `sudo systemctl restart cloudflared`.
  - **Túnel del panel:** no puedes cambiarlo desde la terminal sin un token de API. Dale a la persona estos valores para *Public hostname*: subdominio, dominio, Path `^/(aula|salud)$`, Service `HTTP`, URL `localhost:8787`. Espera su confirmación.
  - Si `cloudflared` corre en un contenedor, usa `172.17.0.1:8787` como en el caso C.
  - Si ya existe un registro `A` o `AAAA` con ese nombre, la persona debe borrarlo para que el túnel cree su CNAME.
- **D · Traefik u otro:** traduce la plantilla. Lo esencial: solo las rutas `/aula` (WebSocket) y `/salud`, sin tiempo de espera corto para el WebSocket, y la cabecera `X-Forwarded-For` con la IP real.

**DNS:** el registro `A`/`AAAA` de `DOMINIO` debe apuntar a la VPS. Compruébalo con `dig +short <DOMINIO>`. Si no apunta, pide a la persona que lo cree; no lo modifiques tú salvo que te lo pida. En Cloudflare puede ir con proxy naranja, porque los WebSockets funcionan.

**Comprobación final (desde la VPS):**

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
```

Con el primer `curl`, `101` es correcto aunque luego corte por tiempo. Con el segundo, debe salir `403`.

## Paso 6 · Lo que hace la persona (no el agente)

Díselo al terminar:

1. En GitHub, en *Settings → Secrets and variables → Actions → Variables*, crear `VITE_AULA_URL` con el valor `wss://<DOMINIO>/aula` y volver a publicar el juego.
2. Crear una clase **nueva** en el juego: las anteriores no tienen llave de firma.

## Informe final

Entrega a la persona:

- usuario, ruta y comandos para ver el estado (`docker compose ps`, `docker compose logs -f`);
- archivos del sistema que cambiaste y sus copias `.bak-classbots`;
- resultados de las comprobaciones de los pasos 4 y 5;
- el comando de respaldo:

```bash
docker run --rm -v classbots-aula_aula-datos:/datos -v "$PWD":/r alpine cp /datos/aula.db /r/aula-$(date +%F).db
```

## Desinstalar

Como `classbots`, ejecuta `docker compose down` (añade `-v` para borrar también los datos, solo si la persona lo confirma). Luego quita el bloque del proxy y recarga el proxy.
