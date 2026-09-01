# Implementación — Centro de Mejoras (Fase 2)

## Objetivo

Extender la funcionalidad **Centro de Mejoras** implementada en la Fase 1 para incorporar un **panel administrativo interno** desde el cual los usuarios autorizados puedan revisar, clasificar, priorizar y gestionar las sugerencias recibidas.

La Fase 2 debe construirse sobre la implementación existente de Fase 1.

**No duplicar entidades, endpoints, servicios, componentes ni lógica existente.**

La implementación debe respetar la arquitectura, seguridad, permisos, estilos y convenciones actuales de `treasury-system`.

---

# 1. Auditoría previa obligatoria

Antes de modificar código:

1. Revisar la implementación real de la Fase 1.
2. Identificar:
   - entidad/modelo de sugerencias;
   - migraciones existentes;
   - DTOs;
   - repositorios;
   - servicios;
   - controladores/endpoints;
   - permisos y roles;
   - componentes frontend;
   - rutas;
   - sistema de tablas/listados;
   - filtros;
   - modales/drawers;
   - paginación;
   - sistema de toast/alerts;
   - sistema de auditoría si existe.
3. Detectar cualquier diferencia entre la especificación original de Fase 1 y la implementación real.
4. Adaptar esta Fase 2 a la arquitectura existente.

No asumir nombres de archivos o clases sin verificarlos primero.

---

# 2. Nueva sección administrativa

Crear una sección interna para usuarios autorizados:

**Gestión de Mejoras**

Nombre alternativo aceptable si encaja mejor con el proyecto:

- Sugerencias
- Centro de Mejoras — Administración
- Gestión de Sugerencias

Debe estar disponible únicamente para roles con permisos administrativos adecuados.

No exponer esta sección a usuarios sin autorización.

---

# 3. Permisos y autorización

Definir claramente quién puede acceder.

## Usuario normal

Puede:

- crear sugerencias;
- consultar sus propias sugerencias;
- consultar el detalle de sus propias sugerencias.

No puede:

- ver sugerencias de otros usuarios;
- cambiar estados;
- establecer prioridad interna;
- añadir notas administrativas;
- acceder al panel interno.

## Administrador autorizado

Puede:

- consultar las sugerencias del ámbito permitido;
- filtrar y buscar;
- cambiar estado;
- establecer prioridad interna;
- agregar notas internas;
- revisar el contexto de origen;
- identificar sugerencias relacionadas.

Los permisos deben resolverse en backend.

No confiar únicamente en ocultar botones o rutas en frontend.

---

# 4. Alcance administrativo

El backend debe respetar el alcance real del administrador según organización, administración, curso y rol.

Un administrador de una organización no debería consultar sugerencias privadas de otra organización salvo que el modelo de permisos existente permita acceso global.

Si existe un rol tipo `SUPER_ADMIN`, `SYSTEM_ADMIN` o equivalente, puede tener alcance global si así funciona actualmente el sistema.

Reutilizar el sistema de autorización existente. No crear reglas paralelas de permisos.

---

# 5. Panel principal

Crear una vista administrativa con tabla/listado profesional.

Mostrar como mínimo:

- ID;
- título;
- categoría;
- usuario;
- organización/administración;
- curso si aplica;
- impacto reportado;
- prioridad interna;
- estado;
- fecha de creación;
- última actualización.

La tabla debe ser responsive y reutilizar componentes existentes.

---

# 6. Búsqueda y filtros

Agregar búsqueda por texto que permita buscar, cuando el backend lo soporte, por:

- título;
- descripción;
- ID de sugerencia;
- nombre/email de usuario.

Agregar filtros combinables por:

- estado;
- categoría;
- impacto reportado;
- prioridad interna;
- rango de fecha;
- organización/administración;
- curso.

Preferir filtros server-side y no cargar todo el dataset en frontend.

---

# 7. Ordenamiento y paginación

Permitir ordenar al menos por:

- fecha de creación;
- fecha de actualización;
- prioridad;
- estado.

Orden inicial recomendado: más recientes primero.

Implementar paginación siguiendo el patrón existente del proyecto.

La API debe soportar:

- página/cursor;
- tamaño de página;
- filtros;
- orden.

Validar límites máximos del tamaño de página.

---

# 8. Prioridad interna

Agregar un nuevo concepto:

**Prioridad administrativa interna**

Valores recomendados:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

Debe ser completamente independiente del `userImpact`.

El impacto es lo que declara el usuario. La prioridad interna representa la evaluación del equipo.

---

# 9. Estados de la sugerencia

Mantener los estados de Fase 1:

```text
RECEIVED
UNDER_REVIEW
PLANNED
IMPLEMENTED
REJECTED
```

Permitir que el administrador modifique el estado.

Registrar correctamente:

- nuevo estado;
- fecha de modificación;
- usuario administrativo que realizó el cambio, si la arquitectura soporta auditoría.

Evitar estados arbitrarios.

---

# 10. Vista de detalle administrativa

Al seleccionar una sugerencia mostrar:

## Datos principales

- ID;
- título;
- descripción;
- categoría;
- checklist/items seleccionados;
- impacto reportado;
- prioridad interna;
- estado.

## Contexto

- usuario;
- rol;
- organización;
- administración;
- curso;
- ruta desde donde fue enviada;
- fecha de creación;
- fecha de actualización.

## Captura

Mostrar la captura adjunta si existe respetando las reglas actuales de acceso a archivos.

---

# 11. Notas internas

Agregar notas administrativas privadas.

Las notas:

- solo deben ser visibles para usuarios administrativos autorizados;
- nunca deben aparecer en `Mis sugerencias` del usuario;
- deben registrar autor;
- fecha;
- contenido.

Modelo conceptual recomendado:

```text
ImprovementSuggestionNote

id
suggestionId
authorUserId
content
createdAt
updatedAt
```

Adaptar al ORM y arquitectura existente.

---

# 12. Historial de cambios

Si el proyecto ya tiene auditoría, utilizarla.

Si no existe, implementar historial mínimo específico para:

- cambio de estado;
- cambio de prioridad.

Ejemplo conceptual:

```text
SuggestionHistory

id
suggestionId
changedBy
field
oldValue
newValue
createdAt
```

No introducir un sistema de auditoría global si no es necesario para completar esta fase.

---

# 13. Sugerencias relacionadas y duplicados

Agregar una forma manual de marcar sugerencias como relacionadas.

Ejemplo:

```text
#124 Más filtros en pagos
#139 Filtrar por método de pago
#151 Filtrar ingresos por fechas
```

Para Fase 2 no utilizar IA ni similitud automática.

Puede implementarse mediante búsqueda y selector.

También se puede permitir marcar una sugerencia como posible duplicado de otra sin eliminar el registro original.

Si esto complica innecesariamente el modelo, priorizar primero relaciones manuales.

---

# 14. Resumen superior

Agregar tarjetas/resumen del panel:

- Total;
- Recibidas;
- En revisión;
- Planificadas;
- Implementadas;
- Críticas.

Los valores deben provenir del backend si el volumen de datos lo requiere.

No calcular estadísticas globales únicamente usando la página visible.

---

# 15. Endpoints administrativos

Crear o ampliar endpoints siguiendo las convenciones actuales.

Conceptualmente se necesita:

```text
GET    /admin/improvement-suggestions
GET    /admin/improvement-suggestions/{id}
PATCH  /admin/improvement-suggestions/{id}/status
PATCH  /admin/improvement-suggestions/{id}/priority
POST   /admin/improvement-suggestions/{id}/notes
GET    /admin/improvement-suggestions/{id}/notes
```

También endpoints para relaciones/duplicados si se implementan.

No copiar estas URLs si el backend utiliza otra convención.

---

# 16. DTOs y validación

No aceptar entidades completas desde frontend.

Crear DTOs específicos para cada mutación, por ejemplo:

```text
UpdateSuggestionStatusRequest
UpdateSuggestionPriorityRequest
CreateSuggestionNoteRequest
```

Validar:

- valores permitidos;
- IDs;
- límites de texto;
- permisos;
- alcance del administrador.

---

# 17. Seguridad

Revisar especialmente:

- autorización administrativa;
- aislamiento entre organizaciones;
- acceso a capturas;
- protección contra IDOR;
- validación de IDs;
- validación de filtros;
- límites de paginación;
- XSS en notas y contenido;
- logs sin información sensible;
- sugerencias inexistentes o fuera de alcance.

Un usuario no debe obtener acceso a otra organización cambiando un ID en la URL.

---

# 18. Navegación frontend

Agregar la sección en el área administrativa apropiada.

Ejemplo conceptual:

```text
Administración
 ├── Usuarios
 ├── Cursos
 ├── ...
 └── Centro de Mejoras
```

No añadirla arbitrariamente al sidebar sin analizar primero la navegación actual y los permisos.

---

# 19. Flujo administrativo esperado

1. El administrador abre Centro de Mejoras.
2. Ve nuevas sugerencias.
3. Filtra por `Recibidas`.
4. Abre una sugerencia.
5. Revisa descripción, contexto y captura.
6. Cambia a `En revisión`.
7. Asigna prioridad.
8. Agrega una nota interna.
9. Relaciona otras sugerencias si corresponde.
10. Regresa al listado.

Evitar recargas completas innecesarias.

---

# 20. Feedback, loading y errores

Usar el sistema existente de Toast/Alert.

Mostrar feedback para:

- estado actualizado;
- prioridad actualizada;
- nota agregada;
- error de operación.

Implementar:

- loading;
- botón disabled durante mutaciones;
- estado vacío;
- error de API;
- permisos insuficientes;
- sugerencia no encontrada.

No usar `alert()`.

---

# 21. Responsive y accesibilidad

Debe funcionar en:

- desktop;
- tablet;
- móvil.

En móvil puede utilizar cards, tabla adaptable o drawer para detalle.

Garantizar:

- navegación con teclado;
- focus visible;
- labels;
- aria-label cuando corresponda;
- contraste correcto;
- estados no comunicados únicamente mediante color.

---

# 22. Base de datos

Evaluar migraciones necesarias para:

- `internalPriority`;
- notas internas;
- historial;
- relaciones entre sugerencias;
- posible duplicado.

Las migraciones deben ser compatibles con datos existentes de Fase 1.

No perder sugerencias ya almacenadas.

---

# 23. Compatibilidad con Fase 1

Después de Fase 2 deben continuar funcionando:

- creación de sugerencias;
- captura automática de contexto;
- subida de captura;
- `Mis sugerencias`;
- acceso desde header;
- acceso desde Dashboard;
- visualización de estado por el usuario.

No romper contratos API existentes sin necesidad.

---

# 24. Tests backend

Agregar tests para:

- administrador autorizado puede listar sugerencias;
- usuario normal no puede acceder al panel;
- aislamiento entre organizaciones;
- búsqueda;
- filtros;
- paginación;
- ordenamiento;
- cambio de estado;
- cambio de prioridad;
- creación de notas;
- notas invisibles para usuarios normales;
- protección contra acceso por ID;
- relaciones si se implementan.

---

# 25. Tests frontend

Cubrir según las herramientas existentes:

- render del panel;
- permisos;
- listado;
- filtros;
- búsqueda;
- paginación;
- detalle;
- cambio de estado;
- cambio de prioridad;
- notas;
- loading;
- errores;
- estado vacío.

No introducir un framework de testing nuevo si ya existe uno.

---

# 26. Fuera de alcance de Fase 2

NO implementar todavía:

- votos públicos;
- roadmap público;
- comentarios públicos;
- ranking de sugerencias;
- IA para clasificación;
- generación automática de tickets;
- integración GitHub/Jira;
- notificaciones email/push;
- chat;
- gamificación.

---

# 27. Criterios de aceptación

La Fase 2 se considera terminada cuando:

- [ ] Existe panel administrativo.
- [ ] Solo usuarios autorizados pueden acceder.
- [ ] Los permisos se validan en backend.
- [ ] Existe listado paginado.
- [ ] Existe búsqueda.
- [ ] Existen filtros combinables.
- [ ] Existe ordenamiento.
- [ ] Existe detalle administrativo.
- [ ] Se puede cambiar estado.
- [ ] Existe prioridad interna independiente del impacto.
- [ ] Se pueden añadir notas internas.
- [ ] Las notas no son visibles para usuarios normales.
- [ ] Se respeta aislamiento entre organizaciones.
- [ ] Las capturas se muestran de forma segura.
- [ ] Existe resumen básico de estados.
- [ ] Se pueden relacionar sugerencias o marcar duplicados si encaja con la arquitectura.
- [ ] UI responsive.
- [ ] Accesibilidad básica cubierta.
- [ ] Tests relevantes pasan.
- [ ] Build y lint finalizan correctamente.
- [ ] Fase 1 sigue funcionando sin regresiones.

---

# 28. Forma de trabajo requerida al agente

Trabajar en este orden:

1. Auditar implementación real de Fase 1.
2. Identificar sistema actual de permisos.
3. Presentar brevemente el plan.
4. Ajustar modelo y migraciones.
5. Implementar backend administrativo.
6. Implementar autorización.
7. Implementar listado, búsqueda y filtros.
8. Implementar detalle.
9. Implementar estado y prioridad.
10. Implementar notas.
11. Implementar relaciones/duplicados si encaja correctamente.
12. Integrar navegación.
13. Agregar tests.
14. Ejecutar build, lint y tests.
15. Revisar seguridad, responsive y accesibilidad.
16. Entregar informe final.

No detenerse después de la auditoría salvo que exista un bloqueo técnico real.

---

# 29. Informe final obligatorio

Al finalizar entregar:

## Arquitectura encontrada

Explicar brevemente cómo estaba implementada Fase 1.

## Archivos creados

Lista exacta.

## Archivos modificados

Lista exacta.

## Base de datos

Migraciones y cambios realizados.

## API

Endpoints administrativos creados/modificados.

## Permisos

Roles/permisos aplicados.

## UI

Pantallas y componentes agregados.

## Seguridad

Controles implementados.

## Tests

Comandos ejecutados y resultados.

## Regresiones

Confirmar que Fase 1 sigue funcionando.

## Pendientes para Fase 3

Enumerar solamente. No implementar Fase 3.

---

# Regla principal

**La Fase 2 debe transformar las sugerencias de Fase 1 en un flujo administrativo real, sin convertir el Centro de Mejoras en un sistema excesivamente complejo. Priorizar seguridad, trazabilidad, claridad y reutilización de la arquitectura existente.**
