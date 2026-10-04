# Calidad preexistente fuera del alcance de SA-02

La ejecución final de `pmdMain` informa 19 infracciones. Impiden aprobar `gradlew.bat check`, aunque las pruebas, JaCoCo y bootJar pasan. No se relajaron reglas ni se excluyeron archivos. Los patrones afectados ya existían en HEAD; no se corrigieron indiscriminadamente durante esta remediación.

Rutas relativas a `backend/src/main/java/com/tesoreria/`:

| Archivo | Líneas actuales | Regla | Cantidad |
| --- | --- | --- | --- |
| shared/infrastructure/config/CorsConfig.java | 77 | UseVarargs | 1 |
| shared/infrastructure/performance/DashboardDataSourceInstrumentation.java | 34, 48, 65, 70 | UseProperClassLoader | 4 |
| shared/infrastructure/performance/DashboardDataSourceInstrumentation.java | 78 (dos), 82 | LiteralsFirstInComparisons | 3 |
| shared/infrastructure/performance/DashboardDataSourceInstrumentation.java | 105, 111 | UseVarargs | 2 |
| shared/infrastructure/performance/DashboardPerformanceProbe.java | 155 | GuardLogStatement | 1 |
| shared/infrastructure/performance/DashboardPerformanceProbe.java | 161 | CompareObjectsWithEquals | 1 |
| treasury/application/usecase/TreasuryService.java | 117 | AvoidDuplicateLiterals | 1 |
| treasury/infrastructure/adapter/out/MercadoPagoHttpGateway.java | 60, 96, 106 | GuardLogStatement | 3 |
| user/application/usecase/AccountRecoveryService.java | 220 | AvoidLiteralsInIfCondition | 1 |
| user/application/usecase/AuthService.java | 96 | AvoidLiteralsInIfCondition | 1 |
| user/config/security/JwtAuthenticationFilter.java | 52 | AvoidDuplicateLiterals | 1 |

La infracción de AccountRecoveryService corresponde a la condición preexistente `matches.size() > 1`, conservada para la selección legítima entre cuentas. Su línea cambió al incorporar la autorización de invitaciones.

Frontend: lint termina correctamente con cuatro advertencias preexistentes `no-unused-expressions` en FamiliaPage, AlumnoPage, ApoderadoPage y NotificationContext. Las pruebas completas emiten avisos React `act` en AuthContext; el build emite avisos de `eval` en lottie-web y tamaños de chunks. No se cambiaron estos componentes por ese motivo.

Los informes generados localmente están en `backend/build/reports/pmd/main.html` y `main.xml`. Estos archivos de build no se incorporan al repositorio.
