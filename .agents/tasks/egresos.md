# Módulo Tesorería – Sección de Egresos

## Objetivo

Implementar una sección para registrar todo el dinero que sale de Tesorería.

Los egresos pueden tener diferentes causas, por ejemplo:

* Compra de materiales.
* Pago de servicios.
* Actividades escolares.
* Reparaciones.
* Eventos.
* Premios.
* Transporte.
* Decoración.
* Alimentación.
* Otros gastos.

El usuario debe poder escribir libremente el motivo del gasto, ingresar el monto y guardar el registro.

Cada egreso debe mostrarse posteriormente como una card.

El monto de cada egreso debe descontarse del total recaudado para calcular el saldo disponible de Tesorería.

---

# Conceptos principales

El módulo debe diferenciar claramente:

```text
Ingresos
Dinero recibido por cuotas y otros conceptos.

Egresos
Dinero utilizado o pagado por Tesorería.

Saldo disponible
Ingresos totales menos egresos totales.
```

Fórmula:

```text
Saldo disponible = Total recaudado - Total de egresos
```

Ejemplo:

```text
Total recaudado: $1.500.000
Total de egresos: $350.000
Saldo disponible: $1.150.000
```

No modificar el valor histórico del total recaudado.

El total recaudado debe seguir representando todos los ingresos recibidos.

Los egresos deben calcularse y mostrarse por separado.

---

# Nombre de la sección

Utilizar como nombre principal:

```text
Egresos
```

También puede mostrarse un subtítulo:

```text
Pagos realizados por Tesorería
```

No utilizar solamente el nombre “Pagos”, porque puede confundirse con los pagos realizados por las familias.

---

# Formulario para registrar un egreso

Crear un formulario visible mediante:

* Botón “Registrar egreso”.
* Modal.
* Drawer.
* Panel lateral.

El formulario debe incluir los siguientes campos.

## Descripción

Campo obligatorio de texto.

Ejemplo:

```text
Compra de materiales para actividad escolar
```

Debe permitir escribir libremente el motivo del gasto.

Nombre sugerido:

```text
Descripción del egreso
```

---

## Monto

Campo obligatorio y numérico.

Ejemplo:

```text
45000
```

Mostrarlo formateado visualmente:

```text
$45.000
```

Reglas:

* Debe ser mayor que cero.
* No permitir valores negativos.
* No permitir letras.
* No permitir un monto vacío.
* Guardar el monto como valor numérico.
* No utilizar números decimales si el sistema trabaja únicamente con pesos enteros.

---

## Fecha del egreso

Campo obligatorio.

Por defecto debe mostrar la fecha actual.

Debe permitir registrar un gasto realizado en una fecha anterior.

Ejemplo:

```text
15/07/2026
```

---

## Categoría

Campo opcional pero recomendado.

Valores iniciales sugeridos:

```text
Materiales
Servicios
Eventos
Reparaciones
Transporte
Alimentación
Decoración
Premios
Administración
Otros
```

Si se selecciona “Otros”, mantener siempre visible la descripción escrita por el usuario.

No dejar las categorías escritas directamente en múltiples componentes.

Centralizar los valores o permitir configurarlos posteriormente.

---

## Medio de pago

Campo opcional.

Valores sugeridos:

```text
Efectivo
Transferencia
Tarjeta
Otro
```

---

## Responsable o proveedor

Campo opcional.

Ejemplo:

```text
Librería Escolar Ltda.
```

Puede representar:

* Persona que recibió el pago.
* Comercio.
* Proveedor.
* Empresa.
* Responsable de la compra.

---

## Número de comprobante

Campo opcional.

Ejemplo:

```text
Factura 001245
```

Puede utilizarse para guardar:

* Número de boleta.
* Número de factura.
* Número de transferencia.
* Código de operación.
* Identificador del comprobante.

---

## Observaciones

Campo opcional de texto amplio.

Ejemplo:

```text
Compra aprobada en reunión del centro de padres.
```

---

# Acción de guardado

El formulario debe incluir:

```text
Cancelar
Guardar egreso
```

Antes de guardar, validar todos los campos obligatorios.

Al guardar correctamente, mostrar un mensaje como:

```text
El egreso fue registrado correctamente.
```

En caso de error:

```text
No fue posible registrar el egreso. Intenta nuevamente.
```

No mostrar errores técnicos del backend directamente al usuario.

---

# Cards de egresos

Cada egreso registrado debe mostrarse como una card independiente.

La card debe ser limpia, moderna y compacta.

Debe mostrar como mínimo:

* Descripción.
* Monto.
* Fecha.
* Categoría.
* Usuario que registró el egreso.

Ejemplo conceptual:

```text
┌────────────────────────────────────────┐
│ Compra de materiales                   │
│                                        │
│ $45.000                                │
│                                        │
│ Categoría: Materiales                  │
│ Fecha: 15/07/2026                      │
│ Registrado por: Víctor Vivas           │
│                                        │
│ [Ver detalle]                          │
└────────────────────────────────────────┘
```

Otro ejemplo:

```text
┌────────────────────────────────────────┐
│ Pago de transporte para actividad      │
│                                        │
│ $80.000                                │
│                                        │
│ Categoría: Transporte                  │
│ Fecha: 20/07/2026                      │
│ Medio: Transferencia                   │
│                                        │
│ [Ver detalle]                          │
└────────────────────────────────────────┘
```

---

# Diseño visual de las cards

Utilizar:

* Bordes redondeados.
* Sombra suave.
* Espaciado consistente.
* Tipografía clara.
* Monto destacado.
* Diseño responsive.
* Icono relacionado con egresos.
* Colores acordes al diseño existente.

El monto debe mostrarse con un color que represente salida de dinero.

Por ejemplo:

* Rojo suave.
* Naranja.
* Color de egreso definido en el sistema.

No utilizar únicamente el color para comunicar que es un egreso.

También debe mostrarse un texto o icono claro.

Ejemplo:

```text
Egreso: -$45.000
```

---

# Resumen financiero

En la parte superior de la sección mostrar tres cards principales.

## Total recaudado

Mostrar todos los ingresos registrados.

Ejemplo:

```text
Total recaudado
$1.500.000
```

---

## Total de egresos

Mostrar la suma de todos los egresos activos.

Ejemplo:

```text
Total de egresos
$350.000
```

---

## Saldo disponible

Calcular:

```text
Total recaudado - Total de egresos
```

Ejemplo:

```text
Saldo disponible
$1.150.000
```

La card del saldo debe diferenciar visualmente estos casos.

### Saldo positivo

Cuando el saldo sea mayor que cero:

* Mostrar estado positivo.
* Utilizar verde o el color positivo del sistema.

### Saldo igual a cero

Cuando no quede dinero disponible:

* Mostrar un estado neutro o de advertencia.

### Saldo negativo

Cuando los egresos superen los ingresos:

* Mostrar una alerta clara.
* Utilizar rojo o el color de error del sistema.
* Mostrar el texto:

```text
Saldo negativo
```

No impedir automáticamente registrar un egreso mayor al saldo disponible, salvo que las reglas del proyecto lo requieran.

En ese caso, mostrar primero una advertencia y solicitar confirmación.

---

# Confirmación cuando el monto supera el saldo

Si el usuario intenta registrar un egreso superior al saldo disponible, mostrar una advertencia:

```text
El monto del egreso supera el saldo disponible de Tesorería.

Saldo disponible: $50.000
Nuevo egreso: $80.000
Saldo resultante: -$30.000
```

Acciones:

```text
Cancelar
Registrar de todas formas
```

Esta acción debe estar restringida a usuarios con permisos suficientes.

---

# Listado de egresos

Mostrar todos los egresos mediante una grilla de cards.

En escritorio:

* Utilizar dos, tres o cuatro columnas según el espacio disponible.

En dispositivos móviles:

* Mostrar una card por fila.
* Mantener botones táctiles suficientemente grandes.
* No utilizar una tabla horizontal como vista principal.

---

# Filtros

Agregar filtros para encontrar egresos.

Filtros mínimos:

* Año.
* Mes.
* Rango de fechas.
* Categoría.
* Medio de pago.
* Usuario que registró.
* Estado.
* Texto de búsqueda.

El buscador debe buscar por:

* Descripción.
* Responsable o proveedor.
* Número de comprobante.
* Observaciones.

---

# Ordenamiento

Permitir ordenar por:

* Fecha más reciente.
* Fecha más antigua.
* Monto mayor.
* Monto menor.
* Descripción.
* Categoría.

Por defecto:

```text
Fecha más reciente
```

---

# Vista de detalle

Al presionar “Ver detalle”, abrir un modal, drawer o página de detalle.

Mostrar:

* Descripción completa.
* Monto.
* Fecha del egreso.
* Categoría.
* Medio de pago.
* Responsable o proveedor.
* Número de comprobante.
* Observaciones.
* Usuario que lo registró.
* Fecha y hora de creación.
* Historial de modificaciones.
* Estado actual.

---

# Edición de egresos

Un egreso registrado no debe editarse libremente sin control.

Permitir correcciones solamente a usuarios autorizados.

Registrar en auditoría:

* Usuario que modificó.
* Fecha y hora.
* Datos anteriores.
* Datos nuevos.
* Motivo de la modificación.

Antes de guardar una modificación, solicitar:

```text
Motivo de la corrección
```

---

# Anulación de egresos

No eliminar físicamente los egresos.

Si un egreso fue registrado por error, utilizar una acción:

```text
Anular egreso
```

Al anular, solicitar:

* Motivo obligatorio.
* Confirmación.
* Usuario responsable.

Guardar:

* Fecha de anulación.
* Usuario que anuló.
* Motivo.
* Estado anterior.
* Estado nuevo.

Un egreso anulado no debe descontarse del saldo disponible.

Ejemplo:

```text
Egreso registrado: $45.000
Estado: ACTIVO
Se descuenta del saldo.

Egreso anulado: $45.000
Estado: ANULADO
Ya no se descuenta del saldo.
```

La card debe seguir visible con el estado:

```text
Anulado
```

No ocultar completamente el registro.

---

# Estados

Estados sugeridos:

```text
ACTIVE
CANCELLED
```

Visualmente:

```text
Activo
Anulado
```

Solo los egresos activos deben incluirse en:

```text
Total de egresos
Saldo disponible
```

---

# Modelo de datos

Revisar el modelo actual antes de crear nuevas tablas.

Modelo conceptual sugerido:

```text
treasury_expenses
- id
- description
- amount
- expense_date
- category
- payment_method
- recipient
- receipt_number
- notes
- status
- registered_by
- cancelled_at
- cancelled_by
- cancellation_reason
- created_at
- updated_at
```

Tipos sugeridos:

```text
status:
ACTIVE
CANCELLED
```

No guardar montos como texto.

Utilizar un tipo numérico adecuado para valores monetarios.

Evitar cálculos financieros con tipos que puedan generar errores de precisión.

---

# Relación con los ingresos

El módulo debe reutilizar los ingresos ya registrados en Tesorería.

Los ingresos pueden provenir de:

* Cuota anual.
* Primera cuota.
* Segunda cuota.
* Cuota CEPA.
* Cuota Solidaria.
* Otros conceptos futuros.

El total recaudado debe calcularse considerando únicamente pagos válidos y no anulados.

El saldo disponible debe calcularse en el backend:

```text
Total de ingresos válidos
menos
Total de egresos activos
```

No confiar en un saldo calculado solamente en el frontend.

El frontend puede mostrar el resultado, pero el cálculo oficial debe realizarse en el backend.

---

# Año escolar

Cada egreso debe asociarse al año escolar correspondiente.

Ejemplo:

```text
2026
```

Esto permitirá obtener:

* Recaudación del año.
* Egresos del año.
* Saldo del año.
* Reportes históricos.

No mezclar automáticamente egresos de diferentes años.

---

# Endpoints sugeridos

Adaptar los nombres a la arquitectura actual del proyecto.

## Listar egresos

```http
GET /treasury/expenses
```

Filtros posibles:

```text
year
month
dateFrom
dateTo
category
paymentMethod
status
search
sort
```

---

## Crear egreso

```http
POST /treasury/expenses
```

Body de ejemplo:

```json
{
  "description": "Compra de materiales para actividad escolar",
  "amount": 45000,
  "expenseDate": "2026-07-15",
  "category": "MATERIALS",
  "paymentMethod": "TRANSFER",
  "recipient": "Librería Escolar Ltda.",
  "receiptNumber": "Factura 001245",
  "notes": "Compra aprobada previamente",
  "schoolYear": 2026
}
```

---

## Obtener detalle

```http
GET /treasury/expenses/:id
```

---

## Corregir egreso

```http
PATCH /treasury/expenses/:id
```

Body de ejemplo:

```json
{
  "description": "Compra de materiales para jornada escolar",
  "amount": 47000,
  "correctionReason": "Se ingresó un monto incorrecto"
}
```

---

## Anular egreso

```http
PATCH /treasury/expenses/:id/cancel
```

Body:

```json
{
  "reason": "El gasto fue registrado dos veces"
}
```

---

## Resumen financiero

```http
GET /treasury/summary
```

Respuesta conceptual:

```json
{
  "schoolYear": 2026,
  "totalIncome": 1500000,
  "totalExpenses": 350000,
  "availableBalance": 1150000
}
```

---

# Permisos

Revisar los roles existentes.

## Administrador o tesorero

Puede:

* Ver egresos.
* Registrar egresos.
* Consultar detalles.
* Corregir egresos.
* Anular egresos.
* Ver información de auditoría.
* Registrar un egreso que deje saldo negativo, previa confirmación.

## Usuario de consulta

Puede:

* Ver egresos.
* Aplicar filtros.
* Ver el resumen.
* Consultar detalles.

No puede:

* Registrar.
* Editar.
* Anular.
* Modificar fechas.
* Registrar saldo negativo.

---

# Auditoría

Toda operación debe registrar:

* Usuario.
* Fecha.
* Hora.
* Acción realizada.
* Valor anterior.
* Valor nuevo.
* Motivo, cuando corresponda.

Acciones mínimas:

```text
EXPENSE_CREATED
EXPENSE_UPDATED
EXPENSE_CANCELLED
```

No registrar información sensible innecesaria.

---

# Reportes mínimos

Permitir consultar:

1. Total de egresos del año.
2. Egresos por mes.
3. Egresos por categoría.
4. Egresos por medio de pago.
5. Egresos por usuario.
6. Egresos anulados.
7. Ingresos totales.
8. Egresos totales.
9. Saldo disponible.
10. Historial cronológico de movimientos.

Preparar la estructura para agregar posteriormente exportación a:

```text
Excel
PDF
CSV
```

La exportación no es obligatoria en esta primera versión.

---

# Libro de movimientos

Preparar el módulo para mostrar posteriormente una vista unificada de movimientos:

```text
Fecha       Tipo       Descripción                    Monto
10/07/2026  Ingreso    Cuota anual Familia Pérez      +$70.000
15/07/2026  Egreso     Compra de materiales           -$45.000
20/07/2026  Ingreso    Cuota CEPA Familia Soto        +$20.000
22/07/2026  Egreso     Transporte actividad           -$80.000
```

En esta primera implementación, puede mantenerse separada la vista de egresos, pero la arquitectura debe permitir crear más adelante este libro de movimientos.

---

# Pruebas

Agregar pruebas para:

* Registro exitoso de un egreso.
* Monto vacío.
* Monto igual a cero.
* Monto negativo.
* Descripción vacía.
* Fecha inválida.
* Listado de egresos.
* Filtro por año.
* Filtro por categoría.
* Filtro por rango de fechas.
* Ordenamiento por monto.
* Cálculo del total de egresos.
* Cálculo del saldo disponible.
* Egreso superior al saldo disponible.
* Anulación de egreso.
* Egreso anulado excluido del total.
* Usuario sin permisos.
* Auditoría de creación.
* Auditoría de modificación.
* Auditoría de anulación.
* Manejo de errores del backend.

---

# Resultado esperado

Al finalizar, el sistema debe permitir:

1. Registrar cualquier gasto de Tesorería.
2. Escribir libremente el motivo del egreso.
3. Ingresar el monto.
4. Registrar fecha y categoría.
5. Mostrar cada egreso como una card.
6. Ver el total recaudado.
7. Ver el total gastado.
8. Ver el saldo disponible.
9. Descontar automáticamente los egresos activos del monto recaudado.
10. Mostrar una advertencia cuando el saldo quede negativo.
11. Filtrar y ordenar egresos.
12. Consultar el detalle de cada registro.
13. Corregir registros con auditoría.
14. Anular registros sin eliminarlos.
15. Mantener información separada por año escolar.
16. Funcionar correctamente en escritorio y dispositivos móviles.
17. Reutilizar la arquitectura, estilos y componentes existentes.
18. No romper las secciones de cuota anual, CEPA ni Cuota Solidaria.

---

# Revisión final

Antes de terminar:

* Revisar cómo se calculan actualmente los ingresos.
* Reutilizar servicios y modelos existentes.
* No duplicar cálculos financieros.
* Realizar el cálculo oficial del saldo en el backend.
* Revisar permisos y roles.
* Ejecutar pruebas.
* Ejecutar el linter.
* Corregir errores de TypeScript o compilación.
* Revisar el diseño responsive.
* Actualizar la documentación.
* Informar qué archivos fueron creados o modificados.
* Explicar cómo probar el registro y la anulación de egresos.
* Confirmar que el total recaudado no se modifica y que el saldo se calcula restando los egresos.
