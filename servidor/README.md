# Servidor del aula en vivo de ClassBots

Node.js + WebSocket + SQLite (`node:sqlite`, sin módulos nativos). Una sala por clase; guarda y reenvía sobres **cifrados para la clase**, que no puede leer. El profesor entra firmando un reto con la llave de firma de la clase.

> ¿Lo va a instalar un agente? Pídele que siga [`AGENTS.md`](AGENTS.md): trae los datos que debe preguntar, las comprobaciones de cada paso y lo que no debe tocar.
>
> Descarga directa de esta carpeta: `https://classbots.eehub.ing/classbots-aula.zip` (se publica con el juego).

## Instalación con Docker rootless

Todo corre con un usuario sin privilegios (`classbots`). Puede convivir con el Docker normal que ya tengas: son daemons distintos.

```bash
# 1. Usuario dedicado (como root o con sudo)
sudo apt-get install -y uidmap dbus-user-session docker-ce-rootless-extras
sudo useradd -m -s /bin/bash classbots
sudo loginctl enable-linger classbots        # sus servicios arrancan con la VPS

# 2. Docker rootless para ese usuario (entrar con una sesión real, no con «su»)
sudo machinectl shell classbots@
dockerd-rootless-setuptool.sh install
systemctl --user enable --now docker
echo 'export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock' >> ~/.bashrc && source ~/.bashrc

# 3. Código y arranque
curl -LO https://classbots.eehub.ing/classbots-aula.zip && unzip classbots-aula.zip && cd classbots-aula
docker compose up -d --build
curl -s http://127.0.0.1:8787/salud           # {"ok":true,"salas":0}
```

En `compose.yaml` ajusta `ORIGENES` (de dónde se permite conectar; por defecto `https://classbots.eehub.ing`) y `DIAS_RETENCION`.

El contenedor ya va endurecido: usuario `node` sin privilegios dentro de la imagen, sistema de archivos de solo lectura (salvo el volumen de datos), `cap_drop: ALL`, `no-new-privileges`, límites de memoria y procesos, y solo escucha en `127.0.0.1`.

## Proxy con HTTPS

El servidor escucha en `127.0.0.1:8787`; el proxy que ya tengas le pasa `wss://api.classbots.eehub.ing/aula`.

- **Caddy:** [`proxy/Caddyfile`](proxy/Caddyfile) (certificado automático).
- **Nginx:** [`proxy/nginx.conf`](proxy/nginx.conf) y `sudo certbot --nginx -d api.classbots.eehub.ing`.
- Si tu proxy corre **dentro de un contenedor** del Docker normal, `127.0.0.1` es el del contenedor: publica el aula en la IP del puente (`"172.17.0.1:8787:8787"` en `ports`) y apunta el proxy ahí, o usa `network_mode: host` en el proxy.

Crea el registro DNS `api.classbots` → IP de la VPS (en Cloudflare, con la nube gris o con WebSockets activos).

### Con Cloudflare Tunnel (cloudflared)

Si la VPS publica sus servicios con `cloudflared`, no hace falta Caddy, Nginx ni certificados: el túnel sale de la VPS hacia Cloudflare y Cloudflare pone el HTTPS.

- **Usa un subdominio de un solo nivel**, como `aula.eehub.ing`. El certificado gratuito de Cloudflare cubre `*.eehub.ing`, pero no `*.classbots.eehub.ing`: con `api.classbots.eehub.ing` el navegador daría error de certificado, salvo que pagues Advanced Certificate Manager.
- **Túnel administrado desde el panel** (Zero Trust → Networks → Tunnels → tu túnel → *Public hostnames* → *Add a public hostname*):
  - Subdomain: `aula` · Domain: `eehub.ing` · Path: `^/(aula|salud)$`
  - Service: `HTTP` · URL: `localhost:8787`
  Cloudflare crea solo el registro DNS (un CNAME al túnel). Si ya existía un registro `A` con ese nombre, bórralo antes.
- **Túnel con archivo** (`config.yml`): agrega la regla de [`proxy/cloudflared.yml`](proxy/cloudflared.yml) antes de la regla final `http_status:404`. Luego ejecuta `cloudflared tunnel route dns <túnel> aula.eehub.ing` y `sudo systemctl restart cloudflared`.
- Si `cloudflared` corre **en un contenedor** del Docker normal, `localhost` es el del contenedor: usa `http://172.17.0.1:8787` y publica el aula en esa IP (`"172.17.0.1:8787:8787"` en `ports`), o corre el contenedor de cloudflared con `network_mode: host`.
- Los WebSockets pasan por el túnel sin configuración extra. El servidor envía un ping cada 30 s, así que Cloudflare no corta las conexiones por inactividad.

En ese caso la variable del juego es `VITE_AULA_URL` = `wss://aula.eehub.ing/aula`.

## Conectar el juego

En GitHub: *Settings → Secrets and variables → Actions → Variables*, crea `VITE_AULA_URL` = `wss://api.classbots.eehub.ing/aula` y vuelve a publicar. Las clases **nuevas** traerán esa dirección; también se puede escribir a mano al crear la clase. Las clases creadas antes de esta versión no tienen llave de firma: crea una nueva para usar el aula en vivo.

## Variables

| Variable | Por defecto | |
|---|---|---|
| `PUERTO` | `8787` | |
| `HOST` | `0.0.0.0` (en el contenedor) | |
| `BD` | `/datos/aula.db` | SQLite |
| `ORIGENES` | (todas) | lista separada por comas |
| `MAX_ALUMNOS` | `300` | por clase |
| `DIAS_RETENCION` | `180` | se borran los sobres más viejos |

## Protocolo (JSON por WebSocket en `/aula`)

1. Servidor → `{t:'reto', reto}`.
2. Estudiante → `{t:'hola', rol:'estudiante', clase:{id,pub,firma}, alumno}`; profesor → lo mismo con `rol:'profesor'` y `firma` = ECDSA-P256-SHA256 de `classbots-aula|<id>|<reto>`.
3. Estudiante → `{t:'sobre', clave:'vivo'|'archivo', sobre, n}` (se guarda el último por clave) ← `{t:'ack', clave, n}`.
4. Profesor ← `historial`, `sobre`, `presencia`; → `{t:'mensaje', para:<alumno>|'*', texto}`.

Límites: 1 MiB por mensaje, 4 mensajes/s sostenidos por conexión, 300 estudiantes por clase.

## Respaldos

```bash
docker run --rm -v classbots-aula_aula-datos:/datos -v "$PWD":/r alpine cp /datos/aula.db /r/aula-$(date +%F).db
```

## Pruebas

```bash
npm ci && npm test     # Node ≥ 22.13
```
