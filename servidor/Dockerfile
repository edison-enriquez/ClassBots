# Servidor del aula en vivo de ClassBots (pensado para Docker en modo rootless)
FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY servidor.js ./
# Carpeta de datos del usuario sin privilegios «node» (el volumen hereda el dueño)
RUN mkdir /datos && chown node:node /datos
USER node
ENV NODE_ENV=production PUERTO=8787 HOST=0.0.0.0 BD=/datos/aula.db
EXPOSE 8787
VOLUME /datos
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8787/salud >/dev/null || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "servidor.js"]
