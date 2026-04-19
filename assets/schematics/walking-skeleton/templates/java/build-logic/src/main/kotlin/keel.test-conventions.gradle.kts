plugins {
  `java-library`
  id("info.solidsoft.pitest")
}

val libs = the<org.gradle.accessors.dm.LibrariesForLibs>()

dependencies {
  testImplementation(platform(libs.junit.bom))
  testImplementation(libs.junit.jupiter)
  testImplementation(libs.assertj.core)
  testImplementation(libs.archunit)
}

tasks.withType<Test>().configureEach {
  useJUnitPlatform()
  testLogging {
    events("failed")
    showStandardStreams = false
  }
}

pitest {
  junit5PluginVersion.set("1.2.1")
  // project.group is set by the root build.gradle.kts; require it so
  // pitest targets the project's packages rather than the universe.
  targetClasses.set(
    provider {
      val group = project.group.toString()
      require(group.isNotBlank()) {
        "set `group` in the root build.gradle.kts (e.g. allprojects { group = \"com.example\" })"
      }
      listOf("$group.*")
    },
  )
  mutationThreshold.set(75)
  timestampedReports.set(false)
}
