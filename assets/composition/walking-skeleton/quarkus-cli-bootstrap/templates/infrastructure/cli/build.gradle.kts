plugins {
    java
    id("io.quarkus") version "3.16.0"
}

dependencies {
    implementation(enforcedPlatform("io.quarkus.platform:quarkus-bom:3.16.0"))
    implementation("io.quarkus:quarkus-picocli")

    implementation(project(":domain:contract"))
    implementation(project(":domain:core"))

    testImplementation("io.quarkus:quarkus-junit5")
}
