# Módulo Tesorería – Ingresos Extraordinarios

## Objetivo

Implementar una sección para registrar ingresos de Tesorería que no provengan directamente de las cuotas de las familias.

Actualmente el sistema ya registra ingresos provenientes de:

* Cuota anual.
* Primera cuota.
* Segunda cuota.

Además de esos pagos, Tesorería puede recibir dinero por muchas otras razones.

Ejemplos:

* Rifas.
* Bingos.
* Donaciones.
* Ventas.
* Eventos.
* Actividades escolares.
* Kermés.
* Aportes voluntarios.
* Subvenciones.
* Recaudaciones especiales.
* Devoluciones de dinero.
* Intereses.
* Otros conceptos.

La nueva sección debe permitir escribir libremente el motivo del ingreso, ingresar el monto y guardar el registro.

Cada ingreso extraordinario debe mostrarse como una card.

Todos los ingresos válidos deben sumarse al total recaudado de Tesorería.

---

# Conceptos financieros

El sistema debe distinguir claramente:

```text
Ingresos por cuotas
Dinero recibido mediante las cuotas registradas para las familias.

Ingresos extraordinarios
Dinero recibido por otros conceptos.

Ingresos totales
Suma de los ingresos por cuotas y los ingresos extraordinarios.

Egresos
Dinero utilizado o pagado por Tesorería.

Saldo disponible
Ingresos totales menos egresos totales.
```

Fórmulas:

```text
Ingresos totales =
Ingresos por cuotas
+
Ingresos extraordinarios
```

```text
Saldo disponible =
Ingresos totales
-
Egresos totales
```

Ejemplo:

```text
Ingresos por cuotas: $1.500.000
Ingresos extraordinarios: $300.000
Ingresos totales: $1.800.000
Egresos: $450.000
Saldo disponible: $1.350.000
```

El cálculo oficial debe realizarse en el backend.

---

# Nombre de la sección

Utilizar como nombre principal:

```text
Ingresos
```

Dentro de esta sección, diferenciar:

```text
Ingresos por cuotas
Ingresos extraordinarios
```

También puede utilizarse como subtítulo:

```text
Otros ingresos de Tesorería
```

---

# Alcance de esta primera implementación

Esta primera versión debe permitir:

1. Registrar un ingreso extraordinario.
2. Escribir libremente la descripción.
3. Ingresar el monto.
4. Seleccionar la fecha.
5. Seleccionar una categoría.
6. Mostrar el ingreso como una card.
7. Incluirlo en el total recaudado.
8. Consultar su detalle.
9. Corregirlo mediante un proceso controlado.
10. Anularlo sin eliminarlo físicamente.

---

# Formulario para registrar un ingreso

Crear un botón principal:

```text
Registrar ingreso
```

Al presionarlo, abrir:

* Modal.
* Drawer.
* Panel lateral.

Reutilizar los componentes existentes del proyecto.

---

# Campos del formulario

## Descripción

Campo obligatorio de texto libre.

Etiqueta sugerida:

```text
Descripción del ingreso
```

Ejemplos:

```text
Recaudación de rifa escolar
```

```text
Donación recibida de empresa local
```

```text
Venta de alimentos en actividad escolar
```

Reglas:

* No permitir una descripción vacía.
* Eliminar espacios innecesarios al inicio y al final.
* Definir un largo máximo razonable.
* Mostrar mensaje de validación comprensible.

---

## Monto

Campo obligatorio y numérico.

Ejemplo:

```text
150000
```

Mostrar visualmente:

```text
$150.000
```

Reglas:

* Debe ser mayor que cero.
* No permitir números negativos.
* No permitir letras.
* No permitir un valor vacío.
* Guardar el monto como valor numérico.
* Utilizar pesos enteros si el sistema no trabaja con centavos.
* No guardar montos como texto.
* Evitar tipos numéricos que provoquen errores de precisión.

---

## Fecha del ingreso

Campo obligatorio.

Por defecto:

```text
Fecha actual
```

Debe permitir registrar ingresos recibidos anteriormente.

Ejemplo:

```text
20/07/2026
```

La fecha del ingreso puede ser diferente de la fecha en la que el usuario realiza el registro.

---

## Categoría

Campo recomendado.

Categorías iniciales sugeridas:

```text
Rifa
Bingo
Donación
Venta
Evento
Actividad escolar
Aporte voluntario
Subvención
Devolución
Intereses
Otros
```

Utilizar códigos internos estables.

Ejemplo:

```text
RAFFLE
BINGO
DONATION
SALE
EVENT
SCHOOL_ACTIVITY
VOLUNTARY_CONTRIBUTION
GRANT
REFUND
INTEREST
OTHER
```

No duplicar estas categorías en distintos archivos.

Centralizar las opciones o permitir que puedan configurarse posteriormente.

---

## Origen del ingreso

Campo opcional.

Permite registrar quién entregó o generó el dinero.

Ejemplos:

```text
Familias de 4° Básico
```

```text
Empresa Colaboradora Ltda.
```

```text
Recaudación de la comunidad escolar
```

Nombre sugerido:

```text
Origen o responsable
```

---

## Medio de recepción

Campo opcional.

Valores sugeridos:

```text
Efectivo
Transferencia
Depósito
Tarjeta
Otro
```

Códigos internos sugeridos:

```text
CASH
TRANSFER
DEPOSIT
CARD
OTHER
```

---

## Número de comprobante

Campo opcional.

Permite guardar:

* Número de transferencia.
* Número de depósito.
* Número de recibo.
* Identificador de la operación.
* Número de comprobante interno.

Ejemplo:

```text
Transferencia 458721
```

---

## Curso relacionado

Campo opcional.

Debe permitir asociar el ingreso a un curso cuando corresponda.

Ejemplo:

```text
Rifa organizada por 5° Básico
```

No todos los ingresos deben estar asociados a un curso.

La relación debe ser opcional.

---

## Familia relacionada

Campo opcional.

Puede utilizarse cuando el ingreso extraordinario proviene de una familia específica, pero no corresponde a una cuota.

Ejemplo:

```text
Donación adicional de Familia Pérez
```

No utilizar este campo para registrar las cuotas normales.

Los pagos de cuotas deben continuar administrándose desde sus módulos correspondientes.

---

## Observaciones

Campo opcional de texto amplio.

Ejemplo:

```text
Recaudación obtenida durante la jornada del aniversario escolar.
```

---

# Guardado

El formulario debe incluir:

```text
Cancelar
Guardar ingreso
```

Antes de guardar:

* Validar campos obligatorios.
* Mostrar claramente el monto.
* Evitar envíos duplicados.
* Deshabilitar temporalmente el botón mientras se procesa la solicitud.

Mensaje de éxito:

```text
El ingreso fue registrado correctamente.
```

Mensaje de error:

```text
No fue posible registrar el ingreso. Intenta nuevamente.
```

No mostrar directamente errores técnicos del backend.

---

# Cards de ingresos

Cada ingreso extraordinario registrado debe mostrarse como una card.

La card debe mostrar como mínimo:

* Descripción.
* Monto.
* Fecha.
* Categoría.
* Origen o responsable.
* Usuario que registró el ingreso.
* Estado.

Ejemplo conceptual:

```text
┌────────────────────────────────────────┐
│ Recaudación de rifa escolar            │
│                                        │
│ +$150.000                              │
│                                        │
│ Categoría: Rifa                        │
│ Fecha: 20/07/2026                      │
│ Origen: Comunidad escolar              │
│ Registrado por: Víctor Vivas           │
│                                        │
│ [Ver detalle]                          │
└────────────────────────────────────────┘
```

Otro ejemplo:

```text
┌────────────────────────────────────────┐
│ Donación empresa colaboradora          │
│                                        │
│ +$300.000                              │
│                                        │
│ Categoría: Donación                    │
│ Fecha: 22/07/2026                      │
│ Medio: Transferencia                   │
│                                        │
│ [Ver detalle]                          │
└────────────────────────────────────────┘
```

---

# Diseño visual

Las cards deben utilizar:

* Bordes redondeados.
* Sombra suave.
* Espaciado consistente.
* Tipografía clara.
* Diseño responsive.
* Icono de ingreso.
* Monto destacado.
* Componentes y colores existentes.

Los ingresos deben mostrarse con un color positivo.

Por ejemplo:

* Verde.
* Azul positivo.
* Color de ingreso definido en el sistema.

No depender únicamente del color.

Mostrar también el signo positivo:

```text
+$150.000
```

y un texto o icono asociado a ingreso.

---

# Resumen financiero

En la parte superior de la sección mostrar cards de resumen.

## Ingresos por cuotas

Mostrar la suma de todos los pagos válidos provenientes de cuotas.

Ejemplo:

```text
Ingresos por cuotas
$1.500.000
```

Debe incluir, según corresponda:

* Cuota anual.
* Primera cuota.
* Segunda cuota.
* Cuota CEPA.
* Cuota Solidaria.

Solo deben considerarse pagos válidos y no anulados.

---

## Otros ingresos

Mostrar la suma de los ingresos extraordinarios activos.

Ejemplo:

```text
Otros ingresos
$300.000
```

---

## Ingresos totales

Calcular:

```text
Ingresos por cuotas + Otros ingresos
```

Ejemplo:

```text
Ingresos totales
$1.800.000
```

---

## Total de egresos

Mostrar:

```text
Total de egresos
$450.000
```

---

## Saldo disponible

Calcular:

```text
Ingresos totales - Egresos totales
```

Ejemplo:

```text
Saldo disponible
$1.350.000
```

Estos valores deben provenir del backend.

---

# No duplicar ingresos de cuotas

Los pagos de cuotas ya registrados no deben duplicarse en la tabla de ingresos extraordinarios.

Ejemplo incorrecto:

```text
Pago cuota anual Familia Pérez
```

Este pago ya existe en el módulo de cuotas y no debe volver a registrarse manualmente como otro ingreso.

El sistema debe diferenciar el origen de los ingresos:

```text
COURSE_FEE
CEPA
SOLIDARITY
OTHER_INCOME
```

O una estructura equivalente según la arquitectura existente.

---

# Vista unificada de ingresos

La pantalla puede incluir pestañas o filtros:

```text
Todos
Cuotas
Otros ingresos
```

## Pestaña Todos

Mostrar:

* Pagos de cuotas.
* Ingresos extraordinarios.

## Pestaña Cuotas

Mostrar solo los ingresos provenientes de cuotas.

## Pestaña Otros ingresos

Mostrar solo los registros creados manualmente desde esta sección.

Los ingresos por cuotas pueden mostrarse como cards de solo lectura.

Los ingresos extraordinarios pueden mostrar acciones de detalle, corrección y anulación según permisos.

---

# Filtros

Agregar filtros mínimos:

* Año escolar.
* Mes.
* Rango de fechas.
* Tipo de ingreso.
* Categoría.
* Curso.
* Medio de recepción.
* Estado.
* Usuario que registró.
* Texto de búsqueda.

Valores para tipo de ingreso:

```text
Todos
Cuotas
Otros ingresos
```

El buscador debe buscar por:

* Descripción.
* Origen.
* Responsable.
* Comprobante.
* Observaciones.
* Familia relacionada.
* Curso relacionado.

---

# Ordenamiento

Permitir ordenar por:

* Fecha más reciente.
* Fecha más antigua.
* Monto mayor.
* Monto menor.
* Descripción.
* Categoría.

Orden predeterminado:

```text
Fecha más reciente
```

---

# Detalle del ingreso

Al seleccionar una card, abrir un modal, drawer o página de detalle.

Mostrar:

* Tipo de ingreso.
* Descripción.
* Monto.
* Fecha del ingreso.
* Categoría.
* Origen o responsable.
* Medio de recepción.
* Comprobante.
* Curso relacionado.
* Familia relacionada.
* Observaciones.
* Usuario que registró.
* Fecha y hora de creación.
* Estado actual.
* Historial de cambios.

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

Solo los ingresos activos deben incluirse en los cálculos financieros.

Los ingresos anulados deben continuar visibles para mantener el historial.

---

# Corrección de ingresos

Un ingreso no debe editarse libremente sin auditoría.

Permitir corregir únicamente a usuarios autorizados.

Antes de confirmar una corrección, solicitar:

```text
Motivo de la corrección
```

Registrar:

* Usuario que modificó.
* Fecha y hora.
* Valores anteriores.
* Valores nuevos.
* Motivo de la corrección.

Una modificación del monto debe actualizar inmediatamente:

* Otros ingresos.
* Ingresos totales.
* Saldo disponible.
* Cards de resumen.

---

# Anulación

No eliminar físicamente un ingreso.

Agregar una acción:

```text
Anular ingreso
```

Al anular, solicitar:

* Motivo obligatorio.
* Confirmación.
* Usuario responsable.

Guardar:

* Fecha y hora de anulación.
* Usuario que anuló.
* Motivo.
* Estado anterior.
* Estado nuevo.

Un ingreso anulado no debe sumarse al total recaudado.

Ejemplo:

```text
Ingreso activo: $150.000
Se suma a los ingresos.

Ingreso anulado: $150.000
No se suma a los ingresos.
```

La card debe seguir visible con una indicación clara:

```text
Anulado
```

---

# Modelo de datos

Revisar primero la arquitectura actual y evitar tablas duplicadas.

Modelo conceptual sugerido:

```text
treasury_incomes
- id
- description
- amount
- income_date
- category
- source
- payment_method
- receipt_number
- school_year
- course_id
- family_id
- notes
- status
- registered_by
- cancelled_at
- cancelled_by
- cancellation_reason
- created_at
- updated_at
```

Campos opcionales:

```text
course_id
family_id
receipt_number
source
notes
```

Valores sugeridos para `status`:

```text
ACTIVE
CANCELLED
```

No guardar montos como texto.

---

# Arquitectura recomendada de movimientos

Preparar la arquitectura para manejar todos los movimientos financieros de forma unificada.

Conceptualmente:

```text
Movimiento de Tesorería
- Tipo: INGRESO o EGRESO
- Origen
- Descripción
- Monto
- Fecha
- Estado
```

Tipos principales:

```text
INCOME
EXPENSE
```

Origen del ingreso:

```text
ANNUAL_FEE
INSTALLMENT_ONE
INSTALLMENT_TWO
CEPA
SOLIDARITY
OTHER
```

Esto permitirá construir posteriormente un libro de caja completo.

No es obligatorio migrar todos los módulos en esta etapa si eso puede romper la implementación existente.

Sin embargo, las nuevas entidades y servicios deben quedar preparados para integrarse en una vista unificada.

---

# Libro de movimientos

La arquitectura debe permitir una vista futura como:

```text
Fecha       Tipo       Descripción                       Monto
10/04/2026  Ingreso    Cuota anual Familia Pérez         +$70.000
15/04/2026  Ingreso    Cuota CEPA Familia Soto           +$20.000
20/07/2026  Ingreso    Recaudación de rifa               +$150.000
22/07/2026  Egreso     Compra de materiales              -$45.000
25/07/2026  Egreso     Transporte actividad              -$80.000
```

El saldo acumulado puede incorporarse posteriormente.

---

# Endpoints sugeridos

Adaptar los nombres a la arquitectura del proyecto.

## Listar ingresos

```http
GET /treasury/incomes
```

Filtros posibles:

```text
year
month
dateFrom
dateTo
incomeType
category
courseId
familyId
paymentMethod
status
search
sort
```

---

## Crear ingreso extraordinario

```http
POST /treasury/incomes
```

Body de ejemplo:

```json
{
  "description": "Recaudación de rifa escolar",
  "amount": 150000,
  "incomeDate": "2026-07-20",
  "category": "RAFFLE",
  "source": "Comunidad escolar",
  "paymentMethod": "CASH",
  "receiptNumber": null,
  "schoolYear": 2026,
  "courseId": null,
  "familyId": null,
  "notes": "Actividad realizada durante la jornada escolar"
}
```

Este endpoint debe utilizarse únicamente para ingresos extraordinarios.

Los pagos de cuotas deben continuar utilizando sus endpoints existentes.

---

## Consultar detalle

```http
GET /treasury/incomes/:id
```

---

## Corregir ingreso

```http
PATCH /treasury/incomes/:id
```

Body de ejemplo:

```json
{
  "description": "Recaudación total de rifa escolar",
  "amount": 155000,
  "correctionReason": "Se agregó una rendición recibida posteriormente"
}
```

---

## Anular ingreso

```http
PATCH /treasury/incomes/:id/cancel
```

Body:

```json
{
  "reason": "El ingreso fue registrado dos veces"
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
  "feeIncome": 1500000,
  "otherIncome": 300000,
  "totalIncome": 1800000,
  "totalExpenses": 450000,
  "availableBalance": 1350000
}
```

No calcular estos totales únicamente en el frontend.

---

# Permisos

Revisar los roles existentes.

## Administrador o tesorero

Puede:

* Ver todos los ingresos.
* Registrar ingresos extraordinarios.
* Consultar detalles.
* Corregir ingresos.
* Anular ingresos.
* Consultar auditoría.
* Aplicar filtros.
* Ver resúmenes financieros.

## Usuario de consulta

Puede:

* Ver ingresos.
* Ver resumen.
* Aplicar filtros.
* Consultar detalles.

No puede:

* Crear ingresos.
* Modificar ingresos.
* Anular ingresos.

---

# Auditoría

Registrar toda operación relevante.

Acciones sugeridas:

```text
INCOME_CREATED
INCOME_UPDATED
INCOME_CANCELLED
```

Guardar:

* Usuario.
* Fecha.
* Hora.
* Acción.
* Valores anteriores.
* Valores nuevos.
* Motivo de corrección o anulación.

---

# Reglas de negocio

1. Todo ingreso debe tener descripción.
2. Todo ingreso debe tener monto mayor que cero.
3. Todo ingreso debe tener fecha.
4. Todo ingreso debe estar asociado a un año escolar.
5. Los ingresos anulados no deben incluirse en los totales.
6. No eliminar registros físicamente.
7. No duplicar pagos provenientes de cuotas.
8. Los ingresos extraordinarios deben tener origen `OTHER` o equivalente.
9. Toda modificación debe quedar auditada.
10. El total de ingresos debe calcularse en el backend.
11. El saldo disponible debe recalcularse después de cada creación, corrección o anulación.
12. Los ingresos de distintos años no deben mezclarse automáticamente.
13. No permitir que un usuario sin permisos registre o modifique ingresos.
14. Evitar registros duplicados por doble clic o reenvío de la solicitud.
15. Utilizar transacciones cuando una operación modifique múltiples registros.

---

# Diseño responsive

En escritorio:

* Mostrar las cards en una grilla.
* Usar dos, tres o cuatro columnas según el espacio.
* Mantener los filtros visibles o fácilmente accesibles.

En dispositivos móviles:

* Mostrar una card por fila.
* Usar botones táctiles grandes.
* Evitar tablas horizontales.
* Mantener visible el monto, la fecha y la categoría.
* Utilizar modal o drawer adaptado a pantallas pequeñas.

---

# Accesibilidad

Implementar:

* Texto visible además del color.
* Contraste adecuado.
* Etiquetas en todos los campos.
* Navegación mediante teclado.
* Foco visible.
* Mensajes de error claros.
* Iconos con nombre accesible.
* Botones con acciones descriptivas.

No mostrar únicamente una cifra verde sin explicar que se trata de un ingreso.

---

# Pruebas

Agregar pruebas para:

* Registro exitoso de ingreso extraordinario.
* Descripción vacía.
* Monto vacío.
* Monto igual a cero.
* Monto negativo.
* Fecha inválida.
* Año escolar vacío.
* Listado de ingresos.
* Filtro por año.
* Filtro por categoría.
* Filtro por rango de fechas.
* Filtro por tipo de ingreso.
* Ordenamiento por fecha.
* Ordenamiento por monto.
* Corrección de ingreso.
* Anulación de ingreso.
* Ingreso anulado excluido del total.
* Suma de ingresos por cuotas.
* Suma de ingresos extraordinarios.
* Cálculo de ingresos totales.
* Cálculo del saldo disponible.
* Prevención de duplicados.
* Usuario sin permisos.
* Auditoría de creación.
* Auditoría de modificación.
* Auditoría de anulación.
* Manejo de errores del backend.
* Actualización de cards de resumen.
* Visualización responsive.

---

# Casos de uso

## Caso 1: ingreso por rifa

Se registra:

```text
Descripción: Recaudación de rifa escolar
Monto: $150.000
Categoría: Rifa
Fecha: 20/07/2026
```

Resultado:

```text
Otros ingresos aumenta en $150.000.
Ingresos totales aumenta en $150.000.
Saldo disponible aumenta en $150.000.
```

---

## Caso 2: donación

Se registra:

```text
Descripción: Donación de empresa colaboradora
Monto: $300.000
Categoría: Donación
Medio: Transferencia
```

Resultado:

```text
El ingreso se muestra como una card.
Se suma al total recaudado.
Se guarda quién lo registró.
```

---

## Caso 3: anulación

Se registró por error:

```text
Ingreso: $100.000
```

Posteriormente se anula.

Resultado:

```text
El registro continúa visible.
El estado cambia a Anulado.
Los $100.000 dejan de formar parte de los ingresos totales.
El saldo disponible se recalcula.
```

---

## Caso 4: cuota existente

Una familia paga su cuota anual de:

```text
$70.000
```

Resultado:

```text
El pago aparece dentro de ingresos por cuotas.
No se crea otro ingreso extraordinario.
No se duplica el monto.
```

---

# Resultado esperado

Al finalizar esta implementación, el sistema debe permitir:

1. Registrar ingresos distintos de las cuotas.
2. Escribir libremente la causa del ingreso.
3. Ingresar el monto.
4. Registrar fecha, categoría y origen.
5. Mostrar cada ingreso como una card.
6. Diferenciar ingresos por cuotas de otros ingresos.
7. Calcular ingresos por cuotas.
8. Calcular ingresos extraordinarios.
9. Calcular ingresos totales.
10. Restar los egresos para obtener el saldo disponible.
11. Filtrar y ordenar ingresos.
12. Consultar el detalle.
13. Corregir registros con auditoría.
14. Anular registros sin eliminarlos.
15. Excluir ingresos anulados de los totales.
16. Evitar duplicar pagos de cuotas.
17. Mantener información separada por año escolar.
18. Funcionar correctamente en escritorio y móvil.
19. Reutilizar componentes, estilos y servicios existentes.
20. No romper las secciones de cuotas ni egresos.

---

# Revisión final

Antes de finalizar:

* Revisar cómo se registran actualmente los pagos de cuotas.
* Identificar todos los tipos de ingresos existentes.
* Evitar duplicar datos.
* Reutilizar modelos, servicios y componentes.
* Centralizar los cálculos financieros en el backend.
* Revisar permisos.
* Agregar auditoría.
* Ejecutar pruebas.
* Ejecutar el linter.
* Corregir errores de TypeScript.
* Verificar la compilación.
* Revisar el diseño responsive.
* Actualizar la documentación.
* Informar qué archivos fueron creados o modificados.
* Explicar cómo registrar, corregir y anular un ingreso.
* Confirmar que los ingresos extraordinarios se suman al total recaudado.
* Confirmar que los ingresos anulados no se incluyen en los totales.
* Confirmar que los pagos de cuotas no se duplican.
* Confirmar que el saldo disponible corresponde a ingresos totales menos egresos.
