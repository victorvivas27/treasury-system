
#LABEL authors="vivas"
#=================================================
# ETAPA 1: BUILD
#FROM maven:3.9.6-eclipse-temurin-21 AS builder
FROM eclipse-temurin:17-jdk-jammy AS builder

# Variables para mejorar el caché
WORKDIR /build
#COPY pom.xml .
#RUN mvn dependency:go-offline
COPY gradlew .
COPY gradle ./gradle
COPY build.gradle .
COPY settings.gradle .
RUN chmod +x gradlew
RUN ./gradlew dependencies --no-daemon
COPY src ./src
#RUN mvn clean package -DskipTests
RUN ./gradlew clean bootJar -x test --no-daemon
#==========================================================


#==========================================================
# ETAPA 2: RUNTIME

#FROM eclipse-temurin:21-jammy
FROM eclipse-temurin:17-jre-jammy

# Crear usuario no root por seguridad
RUN groupadd --system appgroup && useradd --system --gid appgroup --create-home victor

USER victor

WORKDIR /app

# Copiamos solo el JAR generado
#COPY --from=builder /build/target/*.jar app.jar
COPY --from=builder /build/build/libs/*.jar app.jar

# Exponemos el puerto de Spring Boot
EXPOSE 5055

# Comando para ejecutar la app
ENTRYPOINT ["java", "-jar", "app.jar"]
#==========================================================