# AGENTS.md

## Rol del agente

Actúa como un agente de desarrollo para este proyecto.

Tu objetivo es implementar cambios manteniendo la arquitectura, estilo, patrones y calidad existentes.

Antes de escribir código, analiza el proyecto y usa los módulos existentes como referencia.

---

## Reglas generales

- Mantener la arquitectura actual del proyecto.
- Respetar la separación entre backend, frontend y api-tests.
- No cambiar la arquitectura sin una razón clara.
- No introducir nuevas librerías sin necesidad.
- No modificar código no relacionado con la tarea.
- No eliminar archivos existentes salvo que la tarea lo pida explícitamente.
- Mantener nombres, estructura de carpetas y convenciones ya usadas.
- Usar el módulo más parecido como referencia antes de crear código nuevo.
- Preferir cambios pequeños, claros y fáciles de revisar.
- Aplicar DRY: no duplicar lógica, validaciones, constantes, mappers ni componentes si ya existe una forma reutilizable.
- Si existe una utilidad, constante, mapper, componente o patrón reutilizable, usarlo antes de crear uno nuevo.
- No crear abstracciones innecesarias.
- Mantener el código simple, legible y testeable.
- No dejar código muerto, comentarios innecesarios ni archivos temporales.
- No romper funcionalidades existentes.
- Si una implementación puede afectar otra área, revisar el impacto antes de modificar.

---

## Reglas de análisis previo

Antes de implementar cualquier tarea:

1. Leer la tarea completa.
2. Identificar qué módulo existente se parece más.
3. Revisar estructura de carpetas del módulo de referencia.
4. Revisar nombres de clases, archivos, métodos y rutas.
5. Revisar cómo se hacen validaciones.
6. Revisar cómo se manejan errores.
7. Revisar cómo se escriben tests.
8. Revisar cómo se conectan backend, frontend y api-tests.
9. Crear el nuevo código siguiendo el patrón existente.
10. Evitar inventar soluciones si ya existe una convención en el proyecto.

---

## Backend

- Mantener arquitectura hexagonal / clean architecture.
- Separar dominio, aplicación, puertos, adaptadores, infraestructura y persistencia.
- No mezclar lógica de negocio en controladores.
- No mezclar lógica de negocio en entidades JPA.
- Los controladores solo deben recibir requests, llamar casos de uso y devolver responses.
- Los servicios de aplicación deben contener la lógica de caso de uso.
- Los modelos de dominio deben proteger sus invariantes.
- Los repositorios deben depender de puertos, no de implementaciones concretas.
- Los DTOs no deben reemplazar modelos de dominio.
- Los mappers deben encargarse de conversiones entre request, response, dominio y persistencia.
- Cada configuración Spring debe tener nombre único. Evitar clases genéricas repetidas como `DomainConfig`.
- Usar nombres específicos, por ejemplo `ApoderadoDomainConfig`, `AlumnoDomainConfig`, `PagoDomainConfig`.

---

## Frontend

- Mantener la estructura actual basada en capas.
- Separar dominio, casos de uso, infraestructura, hooks, páginas y componentes.
- No llamar APIs directamente desde componentes si ya existe repositorio o caso de uso.
- Los componentes deben enfocarse en UI.
- Los hooks deben coordinar estado y casos de uso.
- Los casos de uso deben contener la lógica de aplicación.
- Los repositorios deben manejar comunicación con API.
- Reutilizar componentes compartidos existentes antes de crear nuevos.
- Mantener estilos consistentes con el proyecto.
- No duplicar formularios si puede extraerse lógica común.

---

## API Tests

- Crear pruebas API siguiendo la estructura existente.
- Mantener nombres ordenados y descriptivos.
- Separar happy path, validaciones, errores y listados.
- Reutilizar environments existentes.
- No duplicar configuración si ya existe.
- Cada flujo CRUD debe cubrir create, get, update, list y delete cuando aplique.

---

## Testing

- Todo módulo nuevo debe incluir pruebas.
- Crear tests similares al módulo de referencia.
- Cubrir casos exitosos y casos de error.
- No escribir tests superficiales solo para aumentar cobertura.
- Mantener tests claros, deterministas y fáciles de entender.
- No depender de orden de ejecución entre tests salvo que la herramienta lo requiera.
- Si se cambia una validación, actualizar tests relacionados.
- Antes de terminar, ejecutar pruebas relevantes si el entorno lo permite.

---

## Convenciones de nombres

- Usar nombres coherentes con el idioma del proyecto.
- Si el módulo existente usa español, mantener español.
- Usar nombres explícitos y específicos.
- Evitar nombres genéricos como `Config`, `Service`, `Manager` sin contexto.
- Los nombres de clases Spring deben evitar colisiones de beans.
- Los archivos deben llamarse igual que la clase principal que contienen.

---

## Seguridad y estabilidad

- No exponer secretos, tokens, contraseñas ni credenciales.
- No hardcodear valores sensibles.
- No cambiar configuración de ambientes sin necesidad.
- No modificar Docker, Gradle, package.json o configs globales salvo que la tarea lo requiera.
- No hacer cambios destructivos.
- Si una migración o cambio estructural es necesario, documentarlo.

---

## Flujo de trabajo

Para cada tarea:

1. Leer reglas globales.
2. Leer la tarea específica.
3. Analizar módulos existentes similares.
4. Planificar archivos a crear o modificar.
5. Implementar de forma incremental.
6. Ejecutar tests o indicar qué tests deben ejecutarse.
7. Corregir errores encontrados.
8. Entregar resumen de cambios.

---

- Revisar cobertura de tests, use cases o lógica importante.
- Si existen líneas sin cubrir, agregar los tests faltantes.
- Priorizar cobertura de ramas reales de negocio y manejo de errores.
- No crear tests artificiales solo para aumentar porcentaje.

Comando recomendado:

```bash
cd frontend
pnpm test -- --coverage
```

## Formato de respuesta del agente

Al finalizar una tarea, responder con:

- Archivos creados.
- Archivos modificados.
- Tests ejecutados.
- Errores encontrados y corregidos.
- Pendientes si existen.

---

## Resumen

Este archivo define reglas globales permanentes para el agente.

Las tareas específicas, como crear `Alumno`, `Pago` o `Lista de Pago`, deben ir en archivos separados dentro de:

```txt
.agents/tasks/
```
