# SA-02 — Pertenencia al curso en registro público

Este informe conserva la primera corrección como antecedente. El diseño vigente elimina la autoinscripción y se documenta en [SA-02-CIERRE.md](../../../SA-02-CIERRE.md). Las conclusiones históricas de este archivo no describen el flujo final.

Fecha: 2026-10-03.

El registro público requiere que el correo pertenezca a un apoderado activo previamente registrado por la administración en el curso seleccionado. La verificación del buzón sigue siendo obligatoria. Seleccionar un curso público no acredita pertenencia.

La consulta SQL usa explícitamente `organization_id`, `activo` y el correo normalizado; no depende del tenant de la sesión anónima. Se comprueba antes de guardar la cuenta o enviar su enlace, al consumir EMAIL_VERIFICATION (incluidos enlaces anteriores al cambio) y al aceptar ACCOUNT_INVITATION. La invitación rechazada no cambia la contraseña ni activa la cuenta. Un apoderado de otro curso o inactivo recibe 403.

El frontend explica qué correo utilizar y recomienda contactar a la administración si falla el registro. No cambia el cuerpo de la API ni el esquema de datos.

## Validación

- Tests unitarios de registro autorizado, rechazo sin persistencia/envío, verificación autorizada, enlace antiguo sin pertenencia e invitación de un apoderado retirado.
- Spring/MockMvc y H2: consulta sin autenticación, comparación de correo sin distinguir mayúsculas, aislamiento entre cursos, apoderado inactivo y rechazo HTTP de las tres situaciones no autorizadas.
- `pnpm exec vitest run src/presentation/pages/auth/RegisterPage.test.tsx`: 3 pruebas aprobadas.
- `pnpm lint`, `pnpm exec tsc -b` y `pnpm build`: aprobados. Advertencias de lint en archivos ajenos y de build en lottie-web.
- La suite completa inicial encontró cinco pruebas PostgreSQL que necesitan Docker, no disponible en el entorno.
- `gradlew.bat check -PexcludeTags=postgres`: 432 pruebas aprobadas y verificación de cobertura JaCoCo aprobada. `check` falla en PMD por 20 infracciones en código preexistente; ninguna corresponde a las líneas incorporadas por SA-02. La infracción señalada en AccountRecoveryService corresponde a `matches.size() > 1`, que ya existía antes del cambio.

## Alcance operativo

Esta corrección impide nuevas altas y activaciones sin pertenencia. No bloquea automáticamente cuentas ya activadas antes del cambio: la administración debe revisar las cuentas existentes sin apoderado activo del mismo curso, distinguir cuentas administrativas legítimas y deshabilitar las altas indebidas. No se modificaron datos productivos ni se desplegó.

La consulta se verificó en H2; la ejecución de pruebas PostgreSQL queda pendiente de un entorno con Docker. No se considera una verificación independiente ni un cierre de remediación en producción.
