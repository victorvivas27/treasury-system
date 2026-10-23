# Guía para agentes de Treasury System

Treasury System integra backend Spring Boot, frontend React/Vite, PostgreSQL, pruebas y colecciones Bruno. Administra Alumno, Apoderado, Familia, Usuario/autenticación, Tesorería, Eventos escolares y Stands.

## Reglas generales

- Verificar código y configuración antes de confiar en documentación.
- Mantener el alcance y preservar cambios ajenos.
- No versionar secretos ni archivos `.env`.
- No cambiar contratos, esquema, reglas financieras o autorización sin alinear consumidores y pruebas.
- Alumno y Apoderado usan `codigo` en rutas públicas; Familia usa IDs internos y `familiaId`.
- No añadir dependencias, desplegar, publicar ni hacer push sin autorización.

## Características de los modales

- Ancho máximo de 320 px para editar.
- Ancho máximo de 280 px para confirmar.
- Nunca superar el ancho de la pantalla.
- Campos y botones compactos.
- Fondo bloqueado mientras el modal está abierto.
- Posición automática según la card seleccionada.

## Orden de lectura

1. [Visión general](tasks/01-project-overview.md)
2. [Entorno y base de datos](tasks/02-environment-database.md)
3. [Backend y módulos](tasks/03-backend-modules.md)
4. [Autenticación y seguridad](tasks/04-authentication-security.md)
5. [Frontend](tasks/05-frontend-architecture.md)
6. [Pruebas](tasks/06-testing.md)
7. [Bruno](tasks/07-bruno-api-tests.md)
8. [Quality gates, Docker y CI](tasks/08-quality-operations.md)

Leer siempre `01`, después las áreas afectadas y finalizar con `08`.

La lectura de las reglas de calidad no obliga a ejecutar inmediatamente todas las validaciones. Su ejecución depende de la fase de trabajo y del riesgo del cambio.

## Flujo de trabajo y aprobación

### Fase 1 — Implementación e iteración rápida

Para tareas de diseño, interfaz, estilos, colores, animaciones y ajustes visuales:

- Implementar los cambios solicitados.
- Realizar únicamente las comprobaciones mínimas necesarias para verificar que funcionan.
- No ejecutar automáticamente todas las pruebas, lint, build ni auditorías visuales exhaustivas después de cada ajuste.
- Permitir iteraciones rápidas mientras el usuario evalúa el resultado.
- No repetir pruebas que no aporten información relevante al cambio realizado.
- Presentar el resultado como **pendiente de aprobación visual**.

Durante esta fase, realizar pruebas específicas cuando exista riesgo funcional, de seguridad, pérdida de datos o incompatibilidad.

### Fase 2 — Aprobación del usuario

El diseño solo se considera aprobado cuando el usuario lo confirma expresamente, por ejemplo:

- «OK, me gusta».
- «Aprobado».
- «Así está bien».

No interpretar que el diseño está aprobado simplemente porque la implementación haya terminado.

Si el usuario solicita nuevos ajustes visuales, continuar en la fase de iteración rápida.

### Fase 3 — Validación final

Después de la aprobación:

- Ejecutar las pruebas correspondientes al alcance del cambio.
- Ejecutar lint y build cuando corresponda.
- Verificar accesibilidad, contraste y responsive para cambios de interfaz.
- Revisar posibles regresiones.
- Corregir problemas técnicos sin alterar innecesariamente el diseño aprobado.
- Informar los resultados de las validaciones.

No repetir automáticamente toda la batería de pruebas si basta con validar los cambios afectados.

### Cambios funcionales o críticos

Este flujo de aprobación visual no sustituye las verificaciones necesarias para cambios en:

- Autenticación y autorización.
- Contratos de API.
- Reglas financieras.
- Persistencia y migraciones de datos.
- Seguridad.
- Operaciones que puedan modificar o eliminar información.

En estos casos, ejecutar las pruebas específicas necesarias durante la implementación, sin esperar la aprobación visual.

## Validación principal

Los siguientes comandos constituyen la referencia de validación del proyecto. **No deben ejecutarse todos después de cada ajuste visual.**

```bash
cd backend
./gradlew test
./gradlew pmdMain
./gradlew check

cd ../frontend
pnpm test:run
pnpm lint
pnpm build

cd ..
bash -n scripts/test-full-flow.sh
git diff --check
```

Seleccionar las comprobaciones según el alcance y el riesgo de la tarea. Ejecutar la validación completa cuando el cambio lo justifique, al cerrar una entrega relevante o cuando el usuario lo solicite expresamente.

No ampliar `scripts/test-full-flow.sh` sin una tarea específica: actualmente ejecuta solo Apoderado.

## Viewport de referencia

El viewport principal confirmado de la aplicación es:

- Ancho CSS: 1216 px.
- Alto CSS: 552 px.

La relación de 1.5789 entre píxeles físicos y CSS no modifica estas dimensiones disponibles.

Utilizar 1216 × 552 px como referencia principal para ajustar navbar, imágenes y distribución visual.

No asumir que es el único tamaño admitido: conservar el comportamiento responsive en otras resoluciones.

## Principio de eficiencia

**Implementar → mostrar → recibir comentarios → ajustar → obtener aprobación → validar.**

Priorizar ciclos rápidos durante la evaluación visual, sin omitir comprobaciones críticas ni comprometer la seguridad, la integridad de los datos o la calidad final.
