# SA-07 — Revocación persistente ante reutilización de refresh

## Corrección

Las dos entradas públicas de `RefreshTokenService.rotate` declaran `noRollbackFor` exclusivamente para `RefreshTokenRejectedException`, una subclase de `DomainException` con el mismo mensaje, campo y estado HTTP de rechazo existentes. Se lanza después de validar CSRF e identidad y ejecutar la política de reutilización. La revocación de familia se confirma antes de devolver el rechazo al controlador.

Se mantiene la transacción y el orden de bloqueo cuenta → token. Usar una transacción independiente para actualizar filas bloqueadas por la transacción exterior podría bloquear la propia revocación. Otros errores conservan el rollback predeterminado; no se aplica una excepción general para `DomainException`.

Se conserva la gracia configurada: una repetición dentro del margen falla sin cerrar la familia; fuera del margen se revoca. La política existente para tokens vencidos o revocados tampoco cambia. No hay cambios de esquema, dependencias ni contratos HTTP.

## Validación

`SA07RefreshReuseIntegrationTest` usa el bean Spring, JPA y H2, sin transacción envolvente del test. Tras capturar la excepción consulta la base de datos: ambas filas de la familia deben estar revocadas, la familia inactiva, el access del sucesor rechazado por HTTP y el refresh sucesor rechazado. Otra familia del mismo usuario sigue funcionando. Se prueban ambas sobrecargas, la gracia y CSRF incorrecto fuera de gracia.

`SA07PostgresRefreshReuseTest` hereda los casos con PostgreSQL 16, Flyway y Hibernate validate; requiere Docker.

```powershell
cd backend
.\gradlew.bat check -PexcludeTags=postgres
.\gradlew.bat test --tests user.SA07PostgresRefreshReuseTest
```

## Alcance

Resultado local: `gradlew.bat check -PexcludeTags=postgres` pasó con 562 pruebas, cero fallos y cero omisiones; incluye los cuatro casos de SA-07. PMD pasó y la cobertura de instrucciones fue 77,93 %, superior al mínimo del 70 %. `git diff --check` pasó.

Con Docker activo, `gradlew.bat test --tests user.SA07PostgresRefreshReuseTest` pasó: cuatro pruebas, cero fallos, errores u omisiones, en PostgreSQL 16.14. Flyway aplicó las 52 migraciones hasta V52 y Hibernate validó el esquema. Queda validada la corrección de SA-07 en PostgreSQL local; esto no certifica el entorno de producción ni cierra los demás hallazgos de la auditoría.

El controlador actual llama directamente a `rotate` sin una transacción exterior. Un futuro consumidor transaccional debe conservar esta regla de rechazo al definir su propia política de rollback; una transacción exterior que revierte siempre puede revertir sus escrituras participantes.

Los diagramas Archify del commit de referencia describen el estado histórico previo a esta reparación y conservan sus recibos de validación. Esta nota documenta la corrección posterior. SA-08 y SA-09 quedan fuera del alcance. No se ha desplegado la reparación.
