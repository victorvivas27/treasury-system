# Implementación — Centro de Mejoras (Fase 1)

## Objetivo

Implementar en `treasury-system` la primera fase de un **Centro de Mejoras** para que los usuarios puedan enviar sugerencias, problemas o necesidades directamente desde el contexto donde están trabajando.

La implementación debe respetar la arquitectura, patrones, componentes compartidos, estilos, seguridad y convenciones que YA existen en el proyecto. **No crear una arquitectura paralela ni duplicar componentes existentes.**

---

## 1. Antes de modificar código — Auditoría obligatoria

Antes de implementar:

1. Analiza la arquitectura actual del frontend y backend.
2. Localiza:
   - sistema de autenticación y usuario actual;
   - organizaciones/administraciones/cursos;
   - routing;
   - layout principal;
   - header/navbar;
   - dashboard/home;
   - componentes `Button`, `Modal`, inputs, textarea, select, uploader, toast/alert;
   - sistema de permisos/roles;
   - servicios/API;
   - entidades, DTOs, repositorios y migraciones;
   - almacenamiento actual de archivos/imágenes;
   - sistema de estilos/tokens/variables CSS.
3. Reutiliza componentes y patrones existentes siempre que sea posible.
4. No cambies funcionalidades no relacionadas.
5. Si encuentras inconsistencias arquitectónicas, documenta primero el problema y elige la solución que mejor encaje con la arquitectura existente.

---

# 2. Funcionalidad principal

Crear una nueva funcionalidad denominada:

**Centro de Mejoras**

Debe permitir al usuario enviar una sugerencia desde cualquier zona autenticada relevante de la aplicación.

No debe aparecer en Login.

---

# 3. Acceso rápido

Agregar un acceso discreto y consistente en el área autenticada.

Preferencia:

- icono tipo bombilla;
- tooltip: `Centro de Mejoras`;
- integrado en el header/navbar existente;
- debe respetar estados hover/focus;
- accesible por teclado;
- responsive.

No usar emojis como icono final si el proyecto utiliza `react-icons` u otra librería de iconos.

Al pulsarlo debe abrirse el formulario del Centro de Mejoras.

La solución puede ser Modal/Drawer si encaja con la arquitectura actual. Evitar crear una página completa únicamente para el formulario si el sistema ya dispone de un modal apropiado.

---

# 4. Formulario

## Paso 1 — Categoría

Mostrar categorías visuales compactas:

- Pagos
- Alumnos
- Reportes
- Interfaz / Experiencia de usuario
- Rendimiento
- Cursos / Administración
- Otra

Utilizar tarjetas, botones seleccionables o el patrón visual que mejor coincida con los componentes existentes.

Solo debe poder seleccionarse una categoría principal.

---

## Paso 2 — Problemas frecuentes

Después de seleccionar una categoría, mostrar opciones rápidas relacionadas.

Ejemplos generales:

- Más filtros
- Exportar información
- Acciones masivas
- Simplificar esta pantalla
- Mejorar búsqueda
- Mejorar visualización móvil
- Otro

Estas opciones pueden variar según la categoría.

El usuario puede seleccionar una o varias.

Debe existir:

`Tengo otra idea`

para permitir continuar sin seleccionar una opción predefinida.

---

## Paso 3 — Información

### Título

Campo obligatorio.

Label:

`Resume tu sugerencia`

Placeholder orientativo:

`Ej: Poder filtrar pagos por fecha y método de pago`

Aplicar límites razonables de longitud tanto en frontend como backend.

### Descripción

Textarea obligatorio.

Label:

`Cuéntanos qué necesitas y cómo te ayudaría`

Debe permitir explicar el caso con suficiente detalle.

Aplicar límites razonables y validación.

---

# 5. Impacto indicado por el usuario

Agregar selector:

### Sería útil
Me ayudaría a trabajar mejor.

### Me dificulta trabajar
Actualmente me genera trabajo adicional o molestias.

### Me impide continuar
El problema bloquea una tarea importante.

IMPORTANTE:

Esto representa el **impacto reportado por el usuario**, no la prioridad interna del equipo.

No mezclar este valor con una futura prioridad administrativa.

---

# 6. Captura de pantalla

Permitir adjuntar opcionalmente una captura.

Inicialmente admitir únicamente formatos de imagen seguros que el proyecto/backend pueda validar correctamente.

Validar:

- MIME/type real cuando sea posible;
- extensión;
- tamaño máximo;
- cantidad máxima de archivos;
- errores de subida.

Para V1 puede limitarse a **una captura**.

No almacenar imágenes directamente como Base64 dentro de la tabla de sugerencias.

Reutilizar el mecanismo de almacenamiento de archivos existente. Si el proyecto todavía no tiene uno adecuado, analizar la arquitectura antes de introducir uno nuevo y documentar la decisión.

---

# 7. Contexto automático

Una parte fundamental de esta funcionalidad es que el usuario NO tenga que explicar manualmente desde dónde envía la sugerencia.

Capturar automáticamente, cuando estén disponibles y sea apropiado:

- usuario autenticado;
- organización/administración;
- curso;
- rol;
- ruta actual;
- fecha/hora;
- categoría;
- opciones rápidas seleccionadas.

No confiar en IDs sensibles enviados libremente por el frontend cuando puedan obtenerse o validarse desde el contexto autenticado del backend.

El backend debe comprobar que el usuario realmente pertenece/tiene acceso al contexto relacionado.

---

# 8. Persistencia

Crear la entidad/modelo correspondiente siguiendo las convenciones actuales del backend.

Nombre sugerido:

`ImprovementSuggestion`

o el equivalente coherente con el idioma/naming actual del proyecto.

Campos conceptuales:

```text
id
userId
organizationId / administrationId (nullable si corresponde)
courseId (nullable)
category
selectedItems
title
description
userImpact
screenshotUrl (nullable)
sourceRoute
status
createdAt
updatedAt
```

Adaptar nombres y tipos a la arquitectura real.

No copiar esta estructura literalmente si contradice los patrones existentes.

---

# 9. Estados

Para V1 utilizar estados simples:

```text
RECEIVED
UNDER_REVIEW
PLANNED
IMPLEMENTED
REJECTED
```

Estado inicial:

`RECEIVED`

El usuario normal NO puede modificar el estado.

Preparar el modelo para que posteriormente pueda existir un panel administrativo.

---

# 10. API

Crear los endpoints/servicios necesarios siguiendo la arquitectura actual.

Como mínimo V1 necesita:

### Crear sugerencia

Permite al usuario autenticado crear una sugerencia.

### Obtener mis sugerencias

Devuelve exclusivamente las sugerencias pertenecientes al usuario autenticado.

Nunca aceptar un `userId` arbitrario para decidir qué sugerencias devolver.

Derivar la identidad del contexto autenticado.

Implementar:

- validaciones;
- manejo consistente de errores;
- autorización;
- DTOs;
- sanitización/normalización cuando corresponda;
- límites de longitud;
- tratamiento seguro del archivo.

---

# 11. Mis sugerencias

Crear una vista/sección accesible desde el Centro de Mejoras:

**Mis sugerencias**

Mostrar como mínimo:

- título;
- categoría;
- fecha;
- estado;
- impacto.

Estados visuales comprensibles:

- Recibida
- En revisión
- Planificada
- Implementada
- Descartada

El usuario debe poder abrir una sugerencia para consultar sus detalles.

En V1 no necesita editarla ni eliminarla salvo que la arquitectura/producto actual tenga una razón clara para permitirlo.

---

# 12. Confirmación después de enviar

Después de una creación correcta:

1. cerrar/resetear correctamente el formulario según el patrón UX existente;
2. mostrar feedback de éxito mediante Toast/Alert existente;
3. informar el identificador de la sugerencia si es apropiado.

Ejemplo conceptual:

`Gracias. Tu sugerencia #123 fue enviada correctamente.`

No utilizar `alert()` del navegador.

---

# 13. Dashboard/Home

Agregar un acceso secundario discreto en el Dashboard/Home autenticado.

Texto sugerido:

**¿Cómo podemos mejorar?**

Descripción:

`Comparte una idea o cuéntanos qué podemos hacer más fácil.`

CTA:

`Enviar sugerencia`

Debe abrir el mismo flujo del Centro de Mejoras.

NO duplicar formularios ni lógica.

---

# 14. UX/UI

La nueva funcionalidad debe parecer parte nativa de Treasury System.

Requisitos:

- reutilizar design system existente;
- respetar variables CSS/tokens;
- responsive;
- dark/light theme si el proyecto los soporta;
- estados hover/focus/disabled/loading;
- contraste correcto;
- navegación mediante teclado;
- labels asociados correctamente;
- mensajes de validación claros;
- evitar animaciones agresivas;
- evitar CSS duplicado;
- no introducir estilos globales innecesarios.

No crear componentes genéricos duplicados si ya existen `Button`, `Modal`, `Input`, etc.

---

# 15. Seguridad

Revisar especialmente:

- autenticación obligatoria;
- autorización por organización/curso;
- validación backend independiente del frontend;
- uploads seguros;
- evitar XSS mediante contenido introducido por usuarios;
- evitar confiar en `userId`, rol u organización enviados por cliente;
- límites de payload;
- nombres de archivo;
- MIME types;
- acceso a capturas almacenadas.

No exponer información de otros usuarios mediante el endpoint `Mis sugerencias`.

---

# 16. Fuera de alcance de Fase 1

NO implementar todavía:

- votos;
- roadmap público;
- comentarios entre usuarios;
- sugerencias públicas;
- ranking;
- notificaciones;
- IA para clasificar sugerencias;
- panel administrativo completo;
- prioridad interna editable;
- asignación de tickets;
- integración con GitHub/Jira;
- chat.

La arquitectura puede quedar preparada para evolucionar, pero no sobrediseñar V1.

---

# 17. Tests

Agregar los tests apropiados según las herramientas ya existentes en el repositorio.

Como mínimo comprobar:

### Backend

- usuario autenticado puede crear sugerencia válida;
- usuario no autenticado no puede crear;
- validación de campos obligatorios;
- validación de longitudes;
- validación del impacto/categoría;
- usuario solo obtiene sus propias sugerencias;
- contexto organización/curso no puede falsificarse;
- upload inválido es rechazado.

### Frontend

Probar los flujos relevantes según el framework de testing existente:

- apertura del Centro de Mejoras;
- selección de categoría;
- validación;
- loading;
- error;
- envío correcto;
- listado de Mis sugerencias.

No introducir un framework de testing nuevo si ya existe uno.

---

# 18. Criterios de aceptación

La Fase 1 se considera terminada cuando:

- [ ] Existe acceso al Centro de Mejoras desde el área autenticada.
- [ ] No aparece en Login.
- [ ] Existe acceso secundario desde Home/Dashboard.
- [ ] Se puede seleccionar categoría.
- [ ] Existen opciones rápidas contextuales.
- [ ] Se puede introducir título y descripción.
- [ ] Se puede indicar impacto.
- [ ] Se puede adjuntar una captura opcional.
- [ ] Se captura automáticamente el contexto disponible.
- [ ] La sugerencia se persiste correctamente.
- [ ] Existe `Mis sugerencias`.
- [ ] Un usuario nunca puede consultar sugerencias privadas de otro.
- [ ] Los estados se muestran correctamente.
- [ ] Existe feedback visual después del envío.
- [ ] La UI es responsive.
- [ ] Se reutilizan componentes existentes.
- [ ] No se rompe ninguna funcionalidad actual.
- [ ] Los tests relevantes pasan.
- [ ] Build frontend y backend finalizan correctamente.

---

# 19. Forma de trabajo requerida al agente

Trabaja en este orden:

1. Auditar arquitectura y localizar archivos afectados.
2. Presentar brevemente el plan de implementación.
3. Implementar backend/modelo/migración.
4. Implementar servicios/API.
5. Implementar frontend.
6. Integrar acceso en Header y Dashboard.
7. Implementar `Mis sugerencias`.
8. Agregar tests.
9. Ejecutar tests/build/lint disponibles.
10. Revisar seguridad, responsive y accesibilidad.
11. Entregar resumen final.

No detenerse después de la auditoría salvo que exista una decisión arquitectónica realmente bloqueante.

Si aparece un problema menor, resolverlo siguiendo los patrones del repositorio.

---

# 20. Informe final obligatorio

Al finalizar indicar:

### Archivos creados
Lista exacta.

### Archivos modificados
Lista exacta.

### Base de datos
Migraciones/tablas/campos agregados.

### API
Endpoints agregados.

### UI
Componentes y accesos agregados.

### Seguridad
Validaciones y controles implementados.

### Tests ejecutados
Comandos y resultados.

### Pendientes para Fase 2
Solo enumerar recomendaciones; **no implementarlas**.

---

## Regla principal

**No quiero una implementación aislada que simplemente “funcione”. Quiero que el Centro de Mejoras quede integrado correctamente con la arquitectura existente de Treasury System, reutilizando sus componentes, seguridad, estilos, servicios y convenciones.**
