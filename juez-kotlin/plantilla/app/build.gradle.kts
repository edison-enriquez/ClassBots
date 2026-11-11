import java.time.Duration

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.classbots.taller"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.classbots.taller"
        minSdk = 26
        targetSdk = 36
    }
    buildFeatures { compose = true }
    testOptions {
        unitTests {
            isIncludeAndroidResources = true
            all {
                it.maxHeapSize = "1024m"
                // Un ciclo infinito del estudiante no deja colgado al juez
                it.timeout.set(Duration.ofSeconds(60))
                // Las pruebas siempre corren de nuevo: la captura se escribe aparte y no viaja en la caché
                it.outputs.upToDateWhen { false }
                it.outputs.cacheIf { false }
                it.jvmArgs("--add-opens=java.base/java.io=ALL-UNNAMED", "--add-opens=java.base/java.lang=ALL-UNNAMED", "--add-opens=java.base/java.util=ALL-UNNAMED", "--add-exports=java.base/jdk.internal.access=ALL-UNNAMED")
                // En el contenedor del juez no hay internet: Robolectric usa los jars ya descargados
                System.getenv("ROBOLECTRIC_DEPS")?.let { d ->
                    it.systemProperty("robolectric.offline", "true")
                    it.systemProperty("robolectric.dependency.dir", d)
                }
                it.systemProperty("juez.captura", rootProject.file("captura.png").absolutePath)
                it.systemProperty("juez.fuentes", file("src/main/java/com/classbots/taller").absolutePath)
            }
        }
    }
    lint { checkReleaseBuilds = false; abortOnError = false }
}

dependencies {
    val bom = platform("androidx.compose:compose-bom:2026.09.00")
    implementation(bom)
    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")

    testImplementation(bom)
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.17")
    testImplementation("androidx.compose.ui:ui-test-junit4")
    testImplementation("androidx.compose.ui:ui-test-manifest")
}
