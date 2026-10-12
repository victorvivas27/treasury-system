# Feature 01 — Calendario Académico: Horario de clases

## Rol del agente
Actúa como ingeniero senior full-stack sobre el repositorio existente de **Tesorería Escolar**. Debes **inspeccionar primero** la implementación real y después desarrollar la primera sección del Calendario Académico, siguiendo los patrones existentes. No supongas nombres de archivos, rutas, tablas, roles ni contratos de API sin verificarlos.

## Contexto de negocio confirmado
- Cada **administración corresponde a un único curso**, que progresa con los años (por ejemplo, 2026: 1° Básico A; 2027: 2° Básico A).
- La aplicación **ya gestiona años escolares e historial** dentro de la misma administración. Reutiliza esa capacidad; no crees otro mecanismo de años o cursos.
- Hay una interfaz administrativa accesible desde el **Home/Navbar** para cargar datos y una interfaz de consulta para usuarios.
- El usuario final debe consultar un horario de **lunes a viernes**, con materias por franja horaria, recreos/almuerzos/actividades y **hora de entrada y salida específica de cada día**.
- El Calendario Académico tendrá dos subsecciones: **Horario de clases** (implementar ahora) y **Evaluaciones** (reservar para después, sin implementar CRUD ni datos ficticios).

## Fase 0 — Auditoría obligatoria antes de modificar
1. Identifica la estructura real de frontend/backend, convenciones de arquitectura, rutas, componentes reutilizables, validaciones, migraciones, pruebas y estilos.
2. Localiza el Sidebar de consulta y el Navbar/secciones de administración; verifica cómo funcionan sus desplegables, estados activos, iconos, animaciones, responsive y accesibilidad.
3. Identifica el mecanismo real de administración activa, año escolar activo/histórico, autenticación, autorización y publicación/visibilidad de contenido.
4. Localiza componentes compartidos de botones, formularios, modales, selectores, tablas, toasts y CSS. Evita duplicarlos.
5. Presenta un resumen breve de archivos a tocar y decisiones técnicas. Si surge una incompatibilidad estructural o una decisión de producto bloqueante, detente y pregunta; en caso contrario, continúa.

## Alcance de implementación — Navegación
### Sidebar de usuarios
- Añade una entrada desplegable **Calendario Académico** con **Horario de clases** y **Evaluaciones**.
- Horario de clases navega a una ruta coherente con el router existente.
- Evaluaciones queda claramente identificada como **Próximamente**, sin enlace roto ni pantalla que simule funcionalidad completa. Si el patrón existente requiere una ruta, usa un placeholder honesto.
- Mantén el comportamiento del Sidebar abierto/cerrado, sincronización de iconos y textos, estados activos, navegación por teclado, `aria-expanded`/`aria-controls` cuando aplique, y diseño responsive.
- No rompas los menús ni animaciones existentes.

### Administración
- Incorpora una entrada de **gestión del horario** dentro de la navegación administrativa ya existente (Navbar/Home), respetando su estructura; no crees un segundo panel de administración.
- Restringe las acciones de edición a roles autorizados según las reglas actuales, **en frontend y backend**.

## Alcance de implementación — Modelo y persistencia
- Relaciona los horarios con la **administración existente y su año escolar existente**, utilizando identificadores y relaciones reales del repositorio.
- Modela días de lunes a viernes con **hora de entrada** y **hora de salida** independientes.
- Modela bloques con `dayOfWeek`, `startTime`, `endTime`, `type` (materia, recreo, almuerzo, actividad), nombre/identificador de materia cuando corresponda, orden y color opcional.
- Decide según el dominio existente si conviene catálogo de materias por año o campos embebidos; documenta la decisión y evita duplicaciones.
- Mantén los años anteriores intactos; no sobrescribas 2026 al editar 2027.
- Implementa migraciones y contratos API según las convenciones actuales, sin inventar una capa paralela.
- Si el sistema ya tiene mecanismo de borrador/publicación, reutilízalo. Si no lo tiene, propone una implementación mínima consistente para que el administrador pueda editar sin mostrar datos incompletos; no impongas un flujo complejo sin justificarlo.

## Reglas de negocio y validación
- Horas válidas y `startTime < endTime`.
- `entryTime < exitTime` para cada jornada configurada.
- Todos los bloques deben quedar dentro de la entrada y salida del día.
- No permitir superposición de bloques del mismo día, incluidos recreos.
- Permitir intervalos libres entre bloques (no exigir continuidad).
- Un bloque de materia requiere una materia; recreo/almuerzo no deben requerirla.
- La hora de salida es **un dato propio del día**, no inferido del último bloque; debe mostrarse explícitamente en todas las vistas.
- Validar también en backend, no solo en formulario.
- Evitar edición accidental de años históricos y gestionar estados vacíos.

## Editor administrativo
- Vista de lunes a viernes, con horas de entrada y salida editables por día.
- Alta, edición y eliminación de bloques, materias y recreos/almuerzos/actividades según corresponda.
- Formulario con tipo, materia/actividad, inicio, fin y color opcional.
- Acción de copiar bloques de un día a otro, con confirmación cuando reemplaza contenido.
- Errores claros para solapamientos, bloques fuera de jornada y campos inválidos.
- Estados de carga, guardado, error, éxito y vacío; confirmación de operaciones destructivas.
- Mantener accesibilidad, contraste, focus y estilos del proyecto.

## Consulta de usuarios — Tres vistas
Incorpora un selector visible para alternar, sin duplicar datos, entre:
1. **Semanal resumida:** tarjetas de lunes a viernes con materias, recreos y hora de salida destacada.
2. **Por día:** selector de día y lista cronológica detallada de bloques, entrada y salida.
3. **Tabla semanal:** cuadrícula de días y franjas horarias, con adaptación a móvil (desplazamiento horizontal cuando sea necesario). Debe representar correctamente franjas de duración variable.

- La vista predeterminada es **Semanal resumida**.
- Recuerda la última vista preferida por usuario mediante el mecanismo de preferencias ya existente; si no existe, usa una solución local sencilla y documentada, sin mezclar preferencias con datos académicos.
- Solo mostrar datos del año escolar seleccionado y publicados/visibles conforme al sistema existente.
- Mostrar un estado vacío útil si aún no hay horario cargado.
- No permitir edición desde la vista de usuarios sin permiso.

## Exclusiones expresas
- No implementar evaluaciones, notificaciones, PDFs ni integraciones de calendario externo en esta entrega.
- No modificar lógica financiera, autenticación ni gestión de años escolares salvo integración mínima imprescindible y justificada.
- No rehacer Sidebar, Navbar ni sistema de estilos completo.
- No insertar horarios de ejemplo como datos reales ni simular persistencia.

## Plan de ejecución
1. Auditar y resumir arquitectura/rutas/roles/relaciones.
2. Definir modelo y migración mínima reutilizando el año escolar actual.
3. Implementar backend, autorización y validaciones.
4. Implementar editor administrativo.
5. Implementar Sidebar desplegable y vistas de consulta.
6. Integrar estados, accesibilidad, responsive y persistencia de preferencias.
7. Ejecutar pruebas, typecheck, lint y build disponibles; reparar fallos introducidos.
8. Entregar reporte final con archivos modificados, migraciones, endpoints, pruebas y limitaciones.

## Pruebas y criterios de aceptación
- [ ] El desplegable abre/cierra sin desalinear el Sidebar y marca correctamente la ruta activa.
- [ ] Administración puede crear/editar/eliminar un horario del año activo.
- [ ] Usuarios no autorizados no pueden modificar datos ni llamar exitosamente a endpoints de escritura.
- [ ] Se admiten diferentes horas de entrada y salida por día (p. ej., lunes 12:00–16:00 y viernes 12:00–14:30).
- [ ] Recreos y materias se muestran en orden correcto.
- [ ] Se rechazan superposiciones y bloques fuera del horario del día.
- [ ] La hora de salida aparece en las tres vistas.
- [ ] Las tres vistas consumen los mismos datos persistidos.
- [ ] La preferencia de vista se conserva al volver a la pantalla.
- [ ] Cambiar el año escolar muestra su horario correspondiente sin alterar otros años.
- [ ] No hay enlaces rotos ni funcionalidad falsa en Evaluaciones.
- [ ] Responsive, teclado, focus y contraste verificados.
- [ ] Pruebas existentes y nuevas, lint, typecheck y build pasan, o se reportan con precisión los impedimentos previos.

## Entrega requerida del agente
Al terminar, presenta: resumen de implementación, decisiones de arquitectura, lista de archivos cambiados, instrucciones para ejecutar migraciones, evidencia de pruebas y asuntos pendientes. **No declares terminado algo que no fue probado.**
