# Módulo Tesorería – Cuota CEPA y Cuota Solidaria

## Objetivo

Implementar dentro del módulo de Tesorería una sección para controlar dos aportes adicionales:

1. Cuota CEPA.
2. Cuota Solidaria.

En esta primera versión no se administrarán cuotas parciales, vencimientos, abonos ni pagos en varias partes.

Para cada familia solamente se debe registrar si pagó o no pagó cada aporte.

---

# Alcance

Cada familia debe mostrar dos estados independientes:

* Estado de Cuota CEPA.
* Estado de Cuota Solidaria.

Valores posibles:

```text
PAGADA
PENDIENTE
```

No utilizar un único estado general para ambas cuotas.

Una familia puede tener, por ejemplo:

```text
Cuota CEPA: PAGADA
Cuota Solidaria: PENDIENTE
```

---

# Configuración anual

Las cuotas deben estar asociadas a un año escolar.

Ejemplo:

```text
Año: 2026
Cuota CEPA: Activa
Cuota Solidaria: Activa
```

El sistema debe permitir configurar, al menos:

* Año escolar.
* Nombre del aporte.
* Estado activo o inactivo.
* Monto referencial opcional.
* Observación opcional.

Aunque en esta primera versión solo interesa registrar si la familia pagó, es recomendable guardar un monto configurable para futuras ampliaciones y reportes.

Ejemplo:

```text
Cuota CEPA 2026: $20.000
Cuota Solidaria 2026: $10.000
```

No dejar los montos escritos directamente en el código.

---

# Vista principal

Crear una pantalla dentro de Tesorería con un título similar a:

```text
Cuota CEPA y Cuota Solidaria
```

La pantalla debe mostrar una colección de mini cards, una por cada familia.

Cada mini card debe mostrar claramente:

* Nombre de la familia.
* Apoderado principal, si está disponible.
* Curso o cursos asociados, si están disponibles.
* Estado de Cuota CEPA.
* Estado de Cuota Solidaria.
* Acción para registrar o modificar el estado.

Ejemplo conceptual:

```text
Familia Pérez González

CEPA
Pagada

Solidaria
Pendiente
```

---

# Diseño de las mini cards

Las mini cards deben ser visualmente limpias, modernas y compactas.

Cada familia debe mostrarse dentro de una tarjeta con:

* Bordes redondeados.
* Sombra suave.
* Espaciado consistente.
* Buena jerarquía visual.
* Diseño responsive.
* Integración con los colores y componentes existentes del proyecto.

No inventar una nueva identidad visual si el sistema ya tiene componentes, colores, iconos o estilos definidos.

---

# Estados visuales

Cada cuota debe mostrarse como un bloque o indicador independiente dentro de la card.

## Estado positivo

Cuando la cuota esté pagada:

* Usar color verde o el color positivo ya definido por el sistema.
* Mostrar un icono de confirmación.
* Mostrar el texto:

```text
Pagada
```

Ejemplo conceptual:

```text
✓ CEPA pagada
```

## Estado negativo

Cuando la cuota esté pendiente:

* Usar color rojo suave, naranja o el color de alerta definido por el sistema.
* Mostrar un icono de pendiente o advertencia.
* Mostrar el texto:

```text
Pendiente
```

Ejemplo conceptual:

```text
! CEPA pendiente
```

No depender únicamente del color. El estado siempre debe incluir texto e icono para mejorar la accesibilidad.

---

# Ejemplo visual de una card

```text
┌────────────────────────────────────┐
│ Familia Pérez González             │
│ 4° Básico                          │
│                                    │
│ [✓ CEPA pagada]                    │
│ [! Solidaria pendiente]            │
│                                    │
│              [Gestionar pagos]     │
└────────────────────────────────────┘
```

Otro ejemplo:

```text
┌────────────────────────────────────┐
│ Familia Soto Muñoz                 │
│ 6° Básico                          │
│                                    │
│ [✓ CEPA pagada]                    │
│ [✓ Solidaria pagada]               │
│                                    │
│              [Gestionar pagos]     │
└────────────────────────────────────┘
```

---

# Interacción

Al seleccionar una mini card o presionar el botón de acción, abrir un modal, drawer o panel lateral.

El panel debe permitir gestionar cada cuota por separado.

Ejemplo:

```text
Familia Pérez González

Cuota CEPA
Estado actual: Pendiente
[Marcar como pagada]

Cuota Solidaria
Estado actual: Pagada
[Marcar como pendiente]
```

Antes de guardar un cambio, mostrar claramente qué estado se modificará.

---

# Registro de pago

Al marcar una cuota como pagada, guardar:

* Identificador de la familia.
* Año escolar.
* Tipo de cuota.
* Estado pagada.
* Fecha del pago.
* Fecha y hora de registro.
* Usuario que registró el cambio.
* Observación opcional.

Tipos de cuota:

```text
CEPA
SOLIDARIA
```

Ejemplo:

```text
Familia: Pérez González
Año: 2026
Tipo: CEPA
Estado: PAGADA
Fecha de pago: 10/04/2026
Registrado por: Usuario tesorero
```

La fecha de pago puede inicializarse con la fecha actual, pero debe poder modificarse si se está registrando un pago anterior.

---

# Cambio de estado

Si una cuota fue marcada como pagada por error, no eliminar el registro directamente.

Debe existir una acción controlada para corregir o anular el pago.

Ejemplo:

```text
Anular registro de pago
```

Al anular, solicitar:

* Motivo de la anulación.
* Confirmación del usuario.

Registrar:

* Usuario que anuló.
* Fecha y hora.
* Motivo.
* Estado anterior.
* Estado nuevo.

Toda modificación debe ser auditable.

---

# Modelo de datos

Revisar el modelo actual antes de crear nuevas tablas.

Se puede implementar mediante una tabla reutilizable para aportes familiares.

Ejemplo conceptual:

```text
family_contributions
- id
- family_id
- school_year
- contribution_type
- status
- amount
- payment_date
- registered_by
- notes
- cancelled_at
- cancelled_by
- cancellation_reason
- created_at
- updated_at
```

Valores para `contribution_type`:

```text
CEPA
SOLIDARIA
```

Valores para `status`:

```text
PENDING
PAID
CANCELLED
```

No crear una columna separada del tipo:

```text
cepa_paid
solidarity_paid
```

Preferir una estructura reutilizable para poder agregar otros aportes en el futuro.

---

# Reglas de negocio

1. Cada familia puede tener un solo registro activo de Cuota CEPA por año.
2. Cada familia puede tener un solo registro activo de Cuota Solidaria por año.
3. El estado de CEPA es independiente del estado de Cuota Solidaria.
4. No permitir registros duplicados para la misma familia, año y tipo de cuota.
5. No eliminar físicamente pagos registrados.
6. Las correcciones deben realizarse mediante anulación.
7. Toda acción debe registrar al usuario responsable.
8. No permitir modificar información de años cerrados, salvo que exista permiso especial.
9. La pantalla debe mostrar claramente cuando todavía no existe un registro.
10. Si no existe un registro, considerar visualmente el estado como pendiente, pero crear el registro solo cuando corresponda según la arquitectura del proyecto.

---

# Filtros

Agregar filtros en la pantalla principal.

Filtros mínimos:

* Año escolar.
* Curso.
* Familia.
* Estado CEPA.
* Estado Cuota Solidaria.

Valores de estado:

```text
Todos
Pagada
Pendiente
```

Agregar también un buscador por:

* Nombre de familia.
* Nombre del apoderado.
* Nombre del alumno.

---

# Ordenamiento

Permitir ordenar al menos por:

* Nombre de familia.
* Curso.
* Estado CEPA.
* Estado Cuota Solidaria.

Por defecto, mostrar primero las familias que tienen pagos pendientes.

---

# Resumen superior

En la parte superior de la pantalla mostrar indicadores generales.

Ejemplo:

```text
Total de familias: 100
CEPA pagada: 72
CEPA pendiente: 28
Solidaria pagada: 64
Solidaria pendiente: 36
```

Mostrar estos indicadores mediante cards pequeñas o métricas visuales.

También se puede mostrar:

```text
Familias completamente al día: 58
Familias con algún aporte pendiente: 42
```

Una familia está completamente al día cuando:

```text
CEPA = PAGADA
y
SOLIDARIA = PAGADA
```

---

# Vista de estados

La pantalla debe permitir identificar fácilmente estos cuatro casos:

## Caso 1: todo pagado

```text
CEPA: Pagada
Solidaria: Pagada
```

La card puede mostrar un borde, badge o indicador general positivo.

## Caso 2: solo CEPA pagada

```text
CEPA: Pagada
Solidaria: Pendiente
```

## Caso 3: solo Solidaria pagada

```text
CEPA: Pendiente
Solidaria: Pagada
```

## Caso 4: todo pendiente

```text
CEPA: Pendiente
Solidaria: Pendiente
```

La card puede mostrar un indicador general de atención, sin ocultar los estados individuales.

---

# Acciones rápidas

Evaluar la posibilidad de agregar acciones rápidas directamente en cada mini card.

Ejemplo:

```text
[Marcar CEPA pagada]
[Marcar Solidaria pagada]
```

Estas acciones deben solicitar confirmación antes de registrar el pago.

No recargar toda la página después de cambiar un estado.

Actualizar inmediatamente:

* Card de la familia.
* Contadores superiores.
* Filtros activos.
* Resumen general.

---

# Vista móvil

En pantallas pequeñas:

* Mostrar una card por fila.
* Mantener botones táctiles suficientemente grandes.
* Evitar tablas horizontales.
* Mantener visibles los dos estados.
* No reducir el texto hasta hacerlo ilegible.

En pantallas medianas o grandes:

* Utilizar una grilla de dos, tres o cuatro columnas según el espacio disponible.

---

# Accesibilidad

Implementar:

* Texto visible además del color.
* Iconos con etiqueta accesible.
* Contraste adecuado.
* Navegación mediante teclado.
* Foco visible.
* Botones con nombres claros.
* Mensajes de éxito y error comprensibles.

No utilizar solamente círculos verdes o rojos sin explicación.

---

# Mensajes al usuario

Al registrar un pago:

```text
La Cuota CEPA de la familia Pérez González fue marcada como pagada.
```

Al registrar la Cuota Solidaria:

```text
La Cuota Solidaria de la familia Pérez González fue marcada como pagada.
```

Al anular:

```text
El registro de pago fue anulado correctamente.
```

En caso de error:

```text
No fue posible actualizar el estado. Intenta nuevamente.
```

No mostrar errores técnicos del backend directamente al usuario.

---

# Endpoints sugeridos

Adaptar los endpoints a la arquitectura actual.

Ejemplos:

```http
GET /treasury/contributions
```

Permite listar los estados de CEPA y Cuota Solidaria por familia.

Filtros sugeridos:

```text
year
courseId
familyId
cepaStatus
solidarityStatus
search
```

Registrar pago:

```http
POST /treasury/contributions
```

Body de ejemplo:

```json
{
  "familyId": "family-id",
  "schoolYear": 2026,
  "contributionType": "CEPA",
  "paymentDate": "2026-04-10",
  "notes": "Pago recibido por transferencia"
}
```

Anular pago:

```http
PATCH /treasury/contributions/:id/cancel
```

Body:

```json
{
  "reason": "Pago registrado en la familia equivocada"
}
```

Consultar resumen:

```http
GET /treasury/contributions/summary
```

---

# Permisos

Revisar el sistema actual de roles.

Como mínimo:

## Tesorero o administrador

Puede:

* Ver estados.
* Registrar pagos.
* Anular pagos.
* Agregar observaciones.
* Consultar reportes.

## Usuario de consulta

Puede:

* Ver estados.
* Aplicar filtros.
* Consultar información.

No puede:

* Registrar pagos.
* Anular pagos.
* Modificar fechas.

---

# Reportes mínimos

Implementar listados o filtros para obtener:

1. Familias con CEPA pagada.
2. Familias con CEPA pendiente.
3. Familias con Cuota Solidaria pagada.
4. Familias con Cuota Solidaria pendiente.
5. Familias con ambos aportes pagados.
6. Familias con al menos un aporte pendiente.

Permitir exportación más adelante, pero dejar la estructura preparada para agregar:

```text
Excel
PDF
CSV
```

La exportación no es obligatoria en esta primera implementación salvo que el proyecto ya tenga esa funcionalidad.

---

# Pruebas

Agregar pruebas para:

* Listado de familias.
* Familia sin registros previos.
* Registro exitoso de CEPA.
* Registro exitoso de Cuota Solidaria.
* Intento de registro duplicado.
* Estados independientes.
* Anulación de pago.
* Usuario sin permisos.
* Filtros por año.
* Filtros por curso.
* Filtros por estado.
* Actualización de contadores.
* Manejo de errores del backend.

---

# Resultado esperado

Al finalizar esta implementación, el sistema debe permitir:

1. Ver todas las familias mediante mini cards.
2. Identificar visualmente si pagaron CEPA.
3. Identificar visualmente si pagaron la Cuota Solidaria.
4. Mostrar estados positivos y pendientes con colores, texto e iconos.
5. Registrar cada pago de forma independiente.
6. Corregir pagos mediante anulación.
7. Filtrar familias por curso, año y estado.
8. Ver cuántas familias pagaron cada aporte.
9. Ver cuántas familias tienen pagos pendientes.
10. Mantener auditoría de todas las operaciones.
11. Funcionar correctamente en escritorio y dispositivos móviles.
12. Reutilizar la arquitectura, componentes y estilos existentes.

---

# Revisión final

Antes de finalizar:

* Revisar las entidades actuales de Familia, Alumno, Curso y Usuario.
* Reutilizar componentes existentes.
* No duplicar servicios ni lógica.
* Revisar permisos y roles.
* Ejecutar pruebas.
* Ejecutar el linter.
* Corregir errores de TypeScript o compilación.
* Actualizar la documentación.
* Informar qué archivos fueron creados o modificados.
* Explicar cómo probar CEPA y Cuota Solidaria.
* Confirmar que no se rompió el módulo de cuota anual ya implementado.
