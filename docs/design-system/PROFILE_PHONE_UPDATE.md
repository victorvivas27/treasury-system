# Teléfono en Editar perfil — 2026-10-19

El editor muestra el teléfono cuando el perfil tiene un apoderado/familia
vinculados. Se puede modificar únicamente el número o guardarlo junto al nombre.
Tras guardar, el teléfono visible se actualiza y se invalida la caché del perfil.
Cancelar no modifica el dato. No se añaden recuadros al formulario.

## Contrato y persistencia

`PUT /api/v1/users/{id}/profile` sigue devolviendo `UserResponseDTO` y acepta:

```json
{ "nombre": "Persona Prueba", "telefono": "+56987654321" }
```

`telefono` es opcional: omitirlo conserva el número existente. Si se incluye,
debe tener entre 8 y 15 dígitos y `+` opcional al inicio. La interfaz normaliza
espacios, guiones y paréntesis antes de enviarlo.

El servidor resuelve el apoderado por el correo del usuario autenticado dentro
del tenant actual; el cliente no elige el apoderado. Valida antes de persistir
y guarda nombre/teléfono en la misma transacción. Se mantienen las restricciones
de edición del perfil propio y la exclusión de atributos de seguridad.
No hay cambios de esquema ni teléfono duplicado en la tabla de usuarios.

Capas actualizadas: DTO/controlador, UserUseCase/UserService y configuración,
tipo y repositorio frontend, formulario y estilos del editor. Pruebas en
SA04UserServiceTest, SA04ProfileSecurityIntegrationTest, UserControllerTest,
ProfilePage.test.tsx y userService.test.ts. Petición Bruno y guía en
`api-tests/profile/`, sin credenciales.

## Verificación

- Frontend: 588 pruebas aprobadas (93 archivos); lint y build aprobados con
  advertencias previas.
- Backend específico: 46 pruebas aprobadas y `pmdMain` aprobado.
- Integración H2: persistencia de teléfono, rechazo del formato inválido y
  aislamiento entre dos cursos con el mismo correo.
- `check` completo de backend: no aprobado por falta de Docker. La ejecución
  informó 636 pruebas, 12 fallos de inicialización de PostgreSQL/Testcontainers
  y 38 omitidas. No se afirma validación completa en PostgreSQL ni cobertura.
- Navegador: `node scripts/check-profile-design.mjs --personalizada`, 14
  combinaciones aprobadas de ancho/tema, incluyendo edición de teléfono con API
  simulada y comprobación del dato actualizado. Anchos 320, 375, 390, 430, 768,
  1024 y 1216; desktop exactamente 1216 × 552 px. Capturas en
  `frontend/demo-output/profile-review-personalizada/`.
- Inspección visual de editor móvil y desktop. `git diff --check` aprobado.
- Bruno preparado; no ejecutado contra cuentas reales.
