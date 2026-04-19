import net.ltgt.gradle.errorprone.errorprone

plugins {
  `java-library`
  id("net.ltgt.errorprone")
}

val libs = the<org.gradle.accessors.dm.LibrariesForLibs>()

dependencies {
  compileOnly(libs.jspecify)
  errorprone(libs.errorprone.core)
  errorprone(libs.nullaway)
}

tasks.withType<JavaCompile>().configureEach {
  options.errorprone {
    error("NullAway")
    option("NullAway:AnnotatedPackages", project.group.toString())
  }
}
