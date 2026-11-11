# Juez de Kotlin de ClassBots: JDK 21 + Android SDK + Gradle ya calentado.
# La misma imagen sirve para la api (MODO=api) y el worker (MODO=worker).
FROM node:22-bookworm-slim AS node

FROM eclipse-temurin:21-jdk-noble
COPY --from=node /usr/local/bin/node /usr/local/bin/node
RUN apt-get update && apt-get install -y --no-install-recommends unzip curl ca-certificates && rm -rf /var/lib/apt/lists/* \
 && useradd -m -u 10001 -s /bin/bash juez

# Android SDK: solo lo que pide la plantilla
ENV ANDROID_HOME=/opt/android-sdk
ARG CMDLINE=https://dl.google.com/android/repository/commandlinetools-linux-15859902_latest.zip
RUN mkdir -p $ANDROID_HOME/cmdline-tools && cd /tmp && curl -fsSLo c.zip $CMDLINE && unzip -q c.zip && rm c.zip \
 && mv cmdline-tools $ANDROID_HOME/cmdline-tools/latest \
 && yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses >/dev/null \
 && $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "platforms;android-37.0" "build-tools;36.0.0" >/dev/null \
 && chown -R juez:juez $ANDROID_HOME

# Android simulado por Robolectric (SDK 36), para correr sin internet
ENV ROBOLECTRIC_DEPS=/opt/robolectric
ARG ALL=16-robolectric-13921718-i7
RUN mkdir -p $ROBOLECTRIC_DEPS && curl -fsSLo $ROBOLECTRIC_DEPS/android-all-instrumented-$ALL.jar \
    https://repo1.maven.org/maven2/org/robolectric/android-all-instrumented/$ALL/android-all-instrumented-$ALL.jar

WORKDIR /app
COPY --chown=juez:juez plantilla ./plantilla
COPY --chown=juez:juez retos ./retos
COPY --chown=juez:juez servidor.mjs probar-retos.mjs ./
USER juez
ENV GRADLE_USER_HOME=/home/juez/.gradle ANDROID_USER_HOME=/home/juez/.android

# Calentar: una pasada con internet para bajar dependencias, y otra sin internet que
# comprueba que cada reto pasa con su solución (si falla, la imagen no se construye)
RUN cp -r plantilla /tmp/c && cd /tmp/c \
 && cp /app/retos/kotlin-piloto/solucion/*.kt /app/retos/kotlin-piloto/fijos/*.kt app/src/main/java/com/classbots/taller/ \
 && cp /app/retos/kotlin-piloto/pruebas/*.kt app/src/test/java/com/classbots/taller/ \
 && ./gradlew testDebugUnitTest --console=plain -q \
 && cd /app && TRABAJO=/tmp/t node probar-retos.mjs \
 && /tmp/c/gradlew -p /tmp/c --stop && rm -rf /tmp/c /tmp/t

# Casa de Gradle inmutable. Las dependencias pasan a una caché de solo lectura (GRADLE_RO_DEP_CACHE) y el
# resto (wrapper, transformaciones) a /opt/casa-gradle; el worker copia eso a un tmpfs al arrancar, así que
# nada de lo que deje un estudiante sobrevive a un reinicio. Todo queda de root y el contenedor es read_only.
USER root
RUN mkdir -p /opt/gradle-ro/caches \
 && mv /home/juez/.gradle/caches/modules-2 /opt/gradle-ro/caches/ \
 && find /opt/gradle-ro/caches/modules-2 \( -name '*.lock' -o -name 'gc.properties' \) -delete \
 && rm -rf /home/juez/.gradle/daemon /home/juez/.gradle/caches/build-cache-1 \
 && mv /home/juez/.gradle /opt/casa-gradle && mkdir /home/juez/.gradle && chown juez:juez /home/juez/.gradle \
 && chown -R root:root /opt/gradle-ro /opt/casa-gradle /app && chmod -R a+rX,go-w /opt/gradle-ro /opt/casa-gradle /app
USER juez
ENV GRADLE_RO_DEP_CACHE=/opt/gradle-ro/caches CASA_BASE=/opt/casa-gradle

# Segunda comprobación, ya como corre el worker: casa copiada, caché de solo lectura y --offline
RUN GRADLE_USER_HOME=/tmp/casa TRABAJO=/tmp/t node probar-retos.mjs \
 && GRADLE_USER_HOME=/tmp/casa /tmp/t/slot1/gradlew -p /tmp/t/slot1 --stop \
 && du -sh /opt/casa-gradle /opt/gradle-ro && rm -rf /tmp/casa /tmp/t

ENV NODE_ENV=production HOST=0.0.0.0 PLANTILLA=/app/plantilla RETOS=/app/retos TRABAJO=/trabajo
CMD ["node", "servidor.mjs"]
