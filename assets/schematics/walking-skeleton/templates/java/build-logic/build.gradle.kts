plugins {
  `kotlin-dsl`
}

repositories {
  gradlePluginPortal()
  mavenCentral()
}

dependencies {
  // Error Prone gradle plugin is applied from inside the quality
  // convention; we depend on the marker artifact so the Kotlin DSL
  // compile step resolves the `errorprone { … }` extension.
  implementation("net.ltgt.gradle:gradle-errorprone-plugin:4.1.0")
}
