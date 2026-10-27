# Fase 2 retirada por solicitud del usuario

Se retiró por completo la implementación local de Fase 2 y su adaptación a códigos por correo. La Fase 2 queda cancelada en esta entrega; Fase 3 no iniciada. Las protecciones SUPER_ADMIN de Fase 1 se conservan.

## Estado resultante

- Ingreso previo con correo/contraseña, JWT en memoria y refresh en cookies existentes.
- Sin pantalla OTP, configuración de verificación en perfil, envío de códigos de ingreso ni endpoints MFA añadidos.
- Retirados servicios, guardas, entidades, repositorios, DTO, casos de uso, configuración de cifrado, pruebas y artefactos visuales añadidos exclusivamente por Fase 2. Restaurados los contratos previos de login, JWT y refresh.
- Retiradas V56/V57, nunca desplegadas ni ejecutadas en producción. Se conserva V55, perteneciente a otro trabajo, y las pruebas de esquema esperan V55. No se ejecutó ninguna migración inversa ni se modificó una base persistente. Los contenedores de pruebas son aislados y desechables.
- Se conserva el código TOTP que existía antes de esta fase, tal como estaba; no significa que siga activa la implementación nueva de MFA. Las mejoras de invitaciones por correo, diseño y demás cambios previos ajenos al alcance se preservaron.
- Se retiraron los informes de implementación activa y evidencias específicos de la Fase 2 para evitar presentarlos como estado actual. Este documento registra el retiro.

## Verificación del retiro

- `gradlew check -PexcludeTags=postgres`: **750 pruebas**, cero fallos; PMD y cobertura aprobados.
- Vitest, login/contexto/perfil/rutas/interceptor: **57 pruebas en seis archivos**, cero fallos.
- `pnpm lint`, `pnpm build` y `git diff --check`: aprobados. Persiste el aviso preexistente de `lottie-web` sobre `eval`.
- Búsqueda de referencias: sin consumidores de servicios, rutas, campos o configuración añadidos de MFA en los fuentes activos; sin clases MFA ni V56/V57 en recursos compilados.
- PostgreSQL real aislado: **90 pruebas aprobadas**, cero fallos ni omisiones. SUPER_ADMIN: 40; perfil: 27; sesiones: 13; contraseña/sesiones: 6; reutilización refresh: 4. Se conservaron las pruebas de concurrencia y bloqueo de Fase 1.

[Evidencia resumida del retiro](evidence/phase-2-withdrawal-results.json).

No hubo despliegue ni modificaciones de producción. La comprobación de entrega real de códigos deja de aplicar porque ese flujo fue retirado.
