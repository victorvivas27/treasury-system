# SA-06 — Revocación al cambiar o recuperar contraseña

## Implementación

Cambio por ID, cambio por correo y restablecimiento (incluida aceptación de invitaciones) revocan todas las filas REFRESH_TOKEN del usuario. Contraseña, consumo del código, marca users.sessions_revoked_at y revocación se guardan en la misma transacción. Un fallo de validación o entrega del correo revierte esas escrituras.

Los flujos bloquean primero la cuenta y luego el token, igual que emisión y rotación. La búsqueda inicial por correo o código obtiene solamente el ID para cargar credenciales después del bloqueo. Una renovación que termina primero queda revocada por el cambio; si el cambio se confirma primero, se rechaza.

Las familias revocadas invalidan sus access tokens mediante la consulta persistente existente. Los JWT sin familia consultan la marca persistida por userId en HTTP y al conectar WebSocket. Una nueva sesión con familia funciona inmediatamente, incluso en el mismo segundo del cambio. La revocación de contraseña ya no escribe en el mapa local.

V51 añade una columna nullable TIMESTAMP WITH TIME ZONE. MapStruct conserva la marca entre dominio y persistencia; el DTO público no permite modificarla. Los contratos HTTP se conservan. Todas las sesiones anteriores deben iniciar sesión nuevamente.

## Pruebas

SA06PasswordSessionIntegrationTest usa servicios Spring y transacciones reales en H2. Cubre los tres flujos, dos familias, cuentas con correo compartido, rechazo del refresh anterior, JWT sin familia, una instancia nueva del servicio de revocación, sesión nueva inmediata, código de recuperación de un uso, contraseña actual incorrecta, rollback por correo fallido y renovación concurrente esperando el commit.

SA06PostgresPasswordSessionTest hereda la suite con PostgreSQL 16, Flyway y Hibernate validate. Requiere Docker.

```powershell
cd backend
.\gradlew.bat check -PexcludeTags=postgres
.\gradlew.bat test --tests user.SA06PostgresPasswordSessionTest
```

## Límites

La reconexión WebSocket valida la marca persistente. Revalidar conexiones STOMP ya abiertas corresponde a SA-09. El rollback de la revocación por reutilización corresponde a SA-07. Este cambio no los declara cerrados.

Con Docker disponible, las 6 pruebas de SA-06 pasaron también en PostgreSQL 16 con Flyway y Hibernate validate. La reparación no está desplegada.
## Resultado local

- Las 6 pruebas de integración de SA-06 y las 235 pruebas de autenticación/notificaciones pasaron en la versión final.
- `gradlew.bat check` pasó completo con Docker: 654 pruebas, sin fallos ni omisiones, incluyendo PostgreSQL. PMD sin violaciones y cobertura de instrucciones del 77,34 %, superior al mínimo del 70 %.
- En una corrección posterior solicitada el 2026-10-09 se resolvieron los 18 avisos preexistentes. `pmdMain` pasó sin violaciones, manteniendo las reglas y exclusiones existentes.
- PostgreSQL/Flyway validado con Docker: las 6 pruebas de SA-06 pasaron. La prueba de segundo arranque de SA-02 se actualizó para esperar V51, añadida por esta reparación.
