# Servidor del aula en vivo de ClassBots

Node.js + WebSocket + SQLite (`node:sqlite`, sin módulos nativos). Una sala por clase; guarda y reenvía sobres **cifrados para la clase**, que no puede leer. El profesor entra firmando un reto con la llave de firma de la clase.

> ¿Lo va a instalar un agente? Pídele que siga [`AGENTS.md`](AGENTS.md): trae los datos que debe preguntar, las comprobaciones de cada paso y lo que no debe tocar.
>
> Descarga directa de esta carpeta: `https://classbots.eehub.ing/classbots-aula.zip` (se publica con el juego).

## Cómo queda

```
navegador ──wss──▶ Cloudflare ──túnel──▶ [contenedor tunel] ──red interna──▶ [contenedor aula :8787]
```

- Los dos contenedores corren con **Docker rootless** y un usuario sin privilegios (`classbots`). Pueden convivir con el Docker normal que ya tengas: son daemons distintos.
- **El aula no publica ningún puerto** y su red interna no tiene salida a internet. La única entrada es el túnel, que solo hace conexiones de salida hacia Cloudflare: no hay que abrir puertos en el firewall ni gestionar certificados.
- El túnel es **solo del aula**, con su propio token. Si se filtra, lo revocas sin tocar tus otros servicios.

¿No usas Cloudflare? Mira [Sin Cloudflare: con tu propio proxy](#sin-cloudflare-con-tu-propio-proxy).

## 1. Docker rootless

```bash
# Como root o con sudo
sudo apt-get install -y uidmap dbus-user-session docker-ce-rootless-extras
sudo useradd -m -s /bin/bash classbots
sudo loginctl enable-linger classbots        # sus contenedores arrancan con la VPS

# Como classbots, con una sesión real (no con «su»)
sudo machinectl shell classbots@
dockerd-rootless-setuptool.sh install
systemctl --user enable --now docker
echo 'export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock' >> ~/.bashrc && source ~/.bashrc
```

## 2. El túnel en Cloudflare

1. En Zero Trust, ve a **Networks → Tunnels → Create a tunnel → Cloudflared**, ponle un nombre (`classbots-aula`) y elige **Docker** como entorno. Copia **solo el token**: el texto largo que va después de `--token`. No ejecutes el comando que te muestra; el contenedor ya está en `compose.yaml`.
2. En **Public hostnames → Add a public hostname**, llena:
   - Subdomain: `aula` · Domain: `eehub.ing` · Path: `^/(aula|salud)$`
   - Service: **HTTP** · URL: `aula:8787`, el nombre del contenedor en la red interna, no `localhost`.
3. Usa un subdominio de **un solo nivel** (`aula.eehub.ing`). El certificado gratuito de Cloudflare cubre `*.eehub.ing`, pero no `*.classbots.eehub.ing`. Si ya existía un registro `A` con ese nombre, bórralo: el túnel crea su propio CNAME.

## 3. Instalar y arrancar

```bash
curl -LO https://classbots.eehub.ing/classbots-aula.zip && unzip classbots-aula.zip && cd classbots-aula
cp .env.ejemplo .env && chmod 600 .env
nano .env                                    # pega el token en TUNNEL_TOKEN= y revisa ORIGENES
docker compose up -d --build
docker compose ps                            # aula «healthy» y tunel «running»
docker compose logs tunel | grep -i registered   # «Registered tunnel connection»
curl -s https://aula.eehub.ing/salud         # {"ok":true,"salas":0}
```

Los WebSockets pasan por el túnel sin configuración extra. El servidor envía un ping cada 30 s, así que Cloudflare no corta las conexiones por inactividad.

Ambos contenedores van endurecidos: usuarios sin privilegios dentro de la imagen, sistema de archivos de solo lectura (salvo el volumen de datos del aula), `cap_drop: ALL`, `no-new-privileges` y límites de memoria y procesos.

## 4. Conectar el juego

En GitHub: *Settings → Secrets and variables → Actions → Variables*, crea `VITE_AULA_URL` = `wss://aula.eehub.ing/aula` y vuelve a publicar. Las clases **nuevas** traerán esa dirección; también se puede escribir a mano al crear la clase. Las clases creadas antes de esta versión no tienen llave de firma: crea una nueva para usar el aula en vivo.

## Sin Cloudflare: con tu propio proxy

En `.env`, comenta `COMPOSE_PROFILES` y `TUNNEL_TOKEN`, y descomenta `COMPOSE_FILE=compose.yaml:compose.puerto.yaml`. Así no arranca el túnel y el aula escucha en `127.0.0.1:8787` para que tu proxy con HTTPS le pase el tráfico:

- **Caddy:** [`proxy/Caddyfile`](proxy/Caddyfile) (certificado automático).
- **Nginx:** [`proxy/nginx.conf`](proxy/nginx.conf) y `sudo certbot --nginx -d <tu subdominio>`.
- **cloudflared ya instalado en el host:** agrega la regla de [`proxy/cloudflared.yml`](proxy/cloudflared.yml) a su `config.yml` con `service: http://localhost:8787`.
- Si tu proxy corre **dentro de un contenedor** del Docker normal, cambia `127.0.0.1` por `172.17.0.1` en `compose.puerto.yaml` y apunta el proxy a esa IP.

En este modo, comprueba el arranque con `curl -s http://127.0.0.1:8787/salud`.

## Variables (`.env`)

| Variable | Por defecto | |
|---|---|---|
| `COMPOSE_PROFILES` | `tunel` | arranca el contenedor de Cloudflare Tunnel |
| `TUNNEL_TOKEN` | — | token del túnel del aula |
| `COMPOSE_FILE` | — | `compose.yaml:compose.puerto.yaml` para el modo con proxy propio |
| `ORIGENES` | `https://classbots.eehub.ing` | páginas que pueden conectarse, separadas por comas |
| `MAX_ALUMNOS` | `300` | por clase |
| `DIAS_RETENCION` | `180` | se borran los sobres más viejos |

## Operación

```bash
docker compose ps                     # estado
docker compose logs -f aula           # registros (sin contenido de los estudiantes)
docker compose pull tunel && docker compose up -d     # actualizar cloudflared
docker compose up -d --build          # actualizar el aula tras cambiar los archivos
docker run --rm -v classbots-aula_aula-datos:/datos -v "$PWD":/r alpine cp /datos/aula.db /r/aula-$(date +%F).db   # respaldo
```

Si el token se filtra, en el panel de Cloudflare ve a **Tunnels → classbots-aula → Refresh token**, pon el nuevo token en `.env` y ejecuta `docker compose up -d`.

## Protocolo (JSON por WebSocket en `/aula`)

1. Servidor → `{t:'reto', reto}`.
2. Estudiante → `{t:'hola', rol:'estudiante', clase:{id,pub,firma}, alumno}`; profesor → lo mismo con `rol:'profesor'` y `firma` = ECDSA-P256-SHA256 de `classbots-aula|<id>|<reto>`.
3. Estudiante → `{t:'sobre', clave:'vivo'|'archivo', sobre, n}` (se guarda el último por clave) ← `{t:'ack', clave, n}`.
4. Profesor ← `historial`, `sobre`, `presencia`; → `{t:'mensaje', para:<alumno>|'*', texto}`.

Límites: 1 MiB por mensaje, 4 mensajes/s sostenidos por conexión, 300 estudiantes por clase.

## Pruebas

```bash
npm ci && npm test     # Node ≥ 22.13
```
