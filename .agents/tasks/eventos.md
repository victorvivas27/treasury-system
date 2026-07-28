# Módulo Tesorería – Eventos Escolares

## Primera implementación: Fiesta de la Familia

## Objetivo

Implementmentar una sección de **Eventos**.

El primer evento será:

```text
Fiesta de la Familia
```

La Fiesta de la Familia se realiza todos los años y participan tres cursos.

Cada curso instala un stand y vende un producto o servicio. El tipo de stand puede cambiar cada año.

Ejemplo:

```text
Curso A: Stand de hamburguesas
Curso B: Stand de juegos
Curso C: Stand de pastelería
```

Todo el dinero recaudado durante el evento se considera una recaudación general.

La recaudación bruta total se divide en partes iguales entre los tres cursos.

Antes de calcular la ganancia final, se deben descontar los gastos realizados por cada curso.

Un curso puede tener gastos y otro curso puede no tenerlos.

La ganancia neta final correspondiente a cada curso debe transferirse a las arcas o saldo propio de ese curso.

---

# Conceptos principales

El evento debe manejar los siguientes conceptos por separado:

```text
Recaudación bruta
Total de dinero obtenido durante el evento.

Gastos comunes
Gastos generales que corresponden a todo el evento.

Gastos por curso
Gastos realizados específicamente por cada curso.

Parte bruta por curso
Monto que corresponde a cada curso antes de descontar sus gastos.

Ganancia neta por curso
Parte bruta del curso menos sus gastos propios y la parte correspondiente de los gastos comunes.

Transferencia al curso
Movimiento mediante el cual la ganancia neta pasa a las arcas del curso.
```

---

# Regla principal de distribución

La recaudación neta común debe dividirse en partes iguales entre los tres cursos participantes.

Fórmula general:

```text
Recaudación distribuible =
Recaudación bruta total
-
Gastos comunes del evento
```

```text
Parte bruta por curso =
Recaudación distribuible
÷
Cantidad de cursos participantes
```

Después, para cada curso:

```text
Ganancia neta del curso =
Parte bruta por curso
-
Gastos propios del curso
```

---

# Ejemplo completo

Participan tres cursos:

```text
1° Básico
2° Básico
3° Básico
```

Recaudación bruta total:

```text
$900.000
```

Gastos comunes:

```text
$60.000
```

Recaudación distribuible:

```text
$900.000 - $60.000 = $840.000
```

Parte bruta para cada curso:

```text
$840.000 ÷ 3 = $280.000
```

Gastos propios:

```text
1° Básico: $40.000
2° Básico: $0
3° Básico: $25.000
```

Resultado:

```text
1° Básico:
$280.000 - $40.000 = $240.000

2° Básico:
$280.000 - $0 = $280.000

3° Básico:
$280.000 - $25.000 = $255.000
```

Transferencias finales:

```text
Arcas de 1° Básico: +$240.000
Arcas de 2° Básico: +$280.000
Arcas de 3° Básico: +$255.000
```

---

# Importante sobre los gastos

Los gastos no deben descontarse directamente del total de otro curso.

Cada curso debe responder solamente por sus gastos específicos.

Ejemplo:

Si un curso gastó $50.000 y otro curso no tuvo gastos:

```text
El primer curso recibe:
Su parte igual menos $50.000.

El segundo curso recibe:
Su parte igual completa.
```

Esto permite que la distribución inicial sea igualitaria, pero que el resultado neto de cada curso sea diferente según sus gastos.

---

# Tipos de gastos

El evento debe permitir dos tipos de gastos.

## 1. Gasto propio de un curso

Es un gasto asociado únicamente a un curso.

Ejemplos:

* Ingredientes para el stand.
* Decoración del stand.
* Materiales.
* Premios.
* Utensilios.
* Carteles.
* Mesas.
* Vasos.
* Servilletas.
* Elementos para juegos.

Este gasto se descuenta solamente de la parte correspondiente a ese curso.

---

## 2. Gasto común del evento

Es un gasto que corresponde a toda la Fiesta de la Familia.

Ejemplos:

* Arriendo general.
* Sonido.
* Seguridad.
* Permisos.
* Limpieza.
* Publicidad.
* Decoración general.
* Electricidad.
* Escenario.

Los gastos comunes deben descontarse de la recaudación total antes de dividirla entre los cursos.

---

# Creación del evento

Agregar una pantalla para crear y configurar cada edición anual del evento.

Campos:

* Nombre del evento.
* Año escolar.
* Fecha del evento.
* Descripción opcional.
* Estado.
* Cursos participantes.
* Tipo de stand de cada curso.
* Observaciones.

Ejemplo:

```text
Nombre: Fiesta de la Familia
Año: 2026
Fecha: 15/09/2026
Participantes: 1°, 2° y 3° Básico
```

Estados posibles:

```text
BORRADOR
EN_PREPARACION
REALIZADO
EN_LIQUIDACION
CERRADO
CANCELADO
```

Visualmente:

```text
Borrador
En preparación
Realizado
En liquidación
Cerrado
Cancelado
```

---

# Cursos participantes

No dejar fijado en el código que siempre serán exactamente los mismos tres cursos.

Para cada edición del evento, permitir seleccionar los cursos participantes.

Aunque inicialmente participen tres cursos, la arquitectura debe admitir otra cantidad en años futuros.

La división debe realizarse según:

```text
Cantidad real de cursos participantes
```

Ejemplo:

```text
Recaudación distribuible ÷ 3
```

No escribir directamente:

```text
monto / 3
```

Utilizar:

```text
monto / cantidadDeCursosParticipantes
```

---

# Stand de cada curso

Cada curso participante debe tener su propio stand.

Guardar:

* Curso.
* Nombre del stand.
* Tipo de stand.
* Descripción.
* Responsable opcional.
* Observaciones.

Ejemplo:

```text
Curso: 1° Básico
Stand: Hamburguesas
Descripción: Venta de hamburguesas y bebidas
```

Otro ejemplo:

```text
Curso: 2° Básico
Stand: Juegos
Descripción: Juegos con premios
```

El nombre y tipo de stand pueden cambiar cada año.

No crear una lista fija e inmodificable.

---

# Registro de gastos previos

Desde la creación del evento hasta el día de la fiesta, debe ser posible registrar gastos.

Agregar un botón:

```text
Registrar gasto
```

Campos:

* Descripción.
* Monto.
* Fecha.
* Tipo de gasto.
* Curso relacionado, cuando sea un gasto de curso.
* Categoría.
* Responsable o proveedor.
* Medio de pago.
* Número de comprobante.
* Observaciones.

Tipo de gasto:

```text
Gasto común
Gasto de curso
```

Si se selecciona:

```text
Gasto de curso
```

el curso debe ser obligatorio.

Si se selecciona:

```text
Gasto común
```

no debe asociarse a un curso específico.

---

# Ejemplo de gasto de curso

```text
Descripción: Compra de ingredientes
Monto: $45.000
Fecha: 10/09/2026
Tipo: Gasto de curso
Curso: 1° Básico
Stand: Hamburguesas
```

Este monto debe descontarse solamente de la ganancia del 1° Básico.

---

# Ejemplo de gasto común

```text
Descripción: Contratación de equipo de sonido
Monto: $90.000
Fecha: 12/09/2026
Tipo: Gasto común
```

Este monto se descuenta de la recaudación general antes de realizar la división.

---

# Cards de gastos

Cada gasto debe mostrarse como una card.

La card debe mostrar:

* Descripción.
* Monto.
* Fecha.
* Tipo de gasto.
* Curso relacionado, si corresponde.
* Categoría.
* Estado.
* Usuario que registró.

Ejemplo:

```text
┌──────────────────────────────────────┐
│ Compra de ingredientes               │
│                                      │
│ -$45.000                             │
│                                      │
│ Curso: 1° Básico                     │
│ Stand: Hamburguesas                  │
│ Fecha: 10/09/2026                    │
│ Estado: Activo                       │
│                                      │
│ [Ver detalle]                        │
└──────────────────────────────────────┘
```

Para un gasto común:

```text
┌──────────────────────────────────────┐
│ Equipo de sonido                     │
│                                      │
│ -$90.000                             │
│                                      │
│ Tipo: Gasto común                    │
│ Fecha: 12/09/2026                    │
│ Estado: Activo                       │
│                                      │
│ [Ver detalle]                        │
└──────────────────────────────────────┘
```

---

# Registro de la recaudación

Después de realizarse la Fiesta de la Familia, debe registrarse la recaudación bruta total.

Agregar una acción:

```text
Registrar recaudación
```

Campos:

* Monto total recaudado.
* Fecha.
* Descripción.
* Medio de ingreso.
* Número de comprobante o cierre de caja.
* Observaciones.

Ejemplo:

```text
Descripción: Recaudación total Fiesta de la Familia 2026
Monto: $900.000
Fecha: 15/09/2026
```

En esta primera implementación, la recaudación se registra como un monto general del evento.

No es necesario registrar cuánto vendió individualmente cada stand, porque la regla acordada es dividir toda la recaudación en partes iguales.

Sin embargo, la arquitectura debe permitir agregar posteriormente recaudaciones por stand si se necesita mayor detalle.

---

# Card de resumen del evento

En la pantalla del evento mostrar una card principal con:

* Nombre.
* Año.
* Fecha.
* Estado.
* Cantidad de cursos.
* Total recaudado.
* Gastos comunes.
* Gastos de cursos.
* Ganancia neta total.
* Monto pendiente de distribuir.
* Estado de la liquidación.

Ejemplo:

```text
Fiesta de la Familia 2026

Recaudación bruta:       $900.000
Gastos comunes:          -$60.000
Gastos de cursos:        -$65.000
Ganancia neta total:     $775.000
Cursos participantes:    3
Estado:                  En liquidación
```

La ganancia neta total del evento es:

```text
Recaudación bruta
-
Gastos comunes
-
Suma de gastos propios de los cursos
```

---

# Cards por curso

Mostrar una card para cada curso participante.

Debe incluir:

* Nombre del curso.
* Nombre del stand.
* Parte bruta.
* Gastos propios.
* Ganancia neta.
* Estado de transferencia.
* Acción para ver detalle.

Ejemplo:

```text
┌──────────────────────────────────────┐
│ 1° Básico                            │
│ Stand: Hamburguesas                  │
│                                      │
│ Parte bruta:          $280.000       │
│ Gastos propios:       -$40.000       │
│ Ganancia neta:        $240.000       │
│                                      │
│ Transferencia: Pendiente             │
│                                      │
│ [Ver detalle]                        │
└──────────────────────────────────────┘
```

Otro ejemplo:

```text
┌──────────────────────────────────────┐
│ 2° Básico                            │
│ Stand: Juegos                        │
│                                      │
│ Parte bruta:          $280.000       │
│ Gastos propios:       $0             │
│ Ganancia neta:        $280.000       │
│                                      │
│ Transferencia: Realizada             │
│                                      │
│ [Ver detalle]                        │
└──────────────────────────────────────┘
```

---

# Cálculo de liquidación

Agregar una acción:

```text
Calcular distribución
```

El cálculo debe realizarse en el backend.

El backend debe:

1. Obtener la recaudación bruta activa.
2. Sumar todos los gastos comunes activos.
3. Restar los gastos comunes.
4. Contar los cursos participantes.
5. Dividir la recaudación distribuible en partes iguales.
6. Sumar los gastos propios de cada curso.
7. Restar a cada curso sus gastos propios.
8. Mostrar el resultado preliminar.
9. No realizar todavía la transferencia.
10. Permitir revisión antes de confirmar.

---

# Vista previa antes de confirmar

Antes de cerrar el evento, mostrar una liquidación preliminar.

Ejemplo:

```text
Fiesta de la Familia 2026

Recaudación bruta: $900.000
Gastos comunes: $60.000
Monto distribuible: $840.000
Cursos participantes: 3
Parte bruta por curso: $280.000
```

Detalle:

```text
1° Básico
Parte bruta: $280.000
Gastos propios: $40.000
Neto: $240.000

2° Básico
Parte bruta: $280.000
Gastos propios: $0
Neto: $280.000

3° Básico
Parte bruta: $280.000
Gastos propios: $25.000
Neto: $255.000
```

Acciones:

```text
Volver
Guardar borrador
Confirmar liquidación
```

---

# Transferencia a las arcas de los cursos

Una vez confirmada la liquidación, la ganancia neta de cada curso debe pasar a sus arcas.

Esto debe generar un movimiento de ingreso para cada curso.

Ejemplo:

```text
Curso: 1° Básico
Tipo: Ingreso de evento
Origen: Fiesta de la Familia 2026
Monto: $240.000
```

```text
Curso: 2° Básico
Tipo: Ingreso de evento
Origen: Fiesta de la Familia 2026
Monto: $280.000
```

```text
Curso: 3° Básico
Tipo: Ingreso de evento
Origen: Fiesta de la Familia 2026
Monto: $255.000
```

Origen sugerido:

```text
EVENT_PROFIT
```

Cada movimiento debe estar relacionado con:

* Evento.
* Liquidación.
* Curso.
* Año escolar.

---

# No duplicar transferencias

La confirmación debe ser idempotente.

No permitir que el usuario presione dos veces y genere dos ingresos para el mismo curso.

Cada curso debe tener como máximo una transferencia activa por liquidación.

Crear una restricción única equivalente a:

```text
event_settlement_id + course_id
```

Si la solicitud se repite, devolver el resultado existente y no crear otro movimiento.

---

# Estados de transferencia

Valores sugeridos:

```text
PENDING
TRANSFERRED
CANCELLED
```

Visualmente:

```text
Pendiente
Transferida
Anulada
```

No marcar el evento como cerrado hasta que todas las transferencias hayan sido realizadas correctamente.

---

# Cierre del evento

El evento solamente puede cerrarse cuando:

* Existe una recaudación bruta válida.
* Hay al menos un curso participante.
* Todos los gastos fueron revisados.
* La liquidación fue confirmada.
* Todas las transferencias fueron registradas.
* No existen errores pendientes.

Al cerrar:

```text
Estado del evento: CERRADO
```

Después del cierre:

* No permitir registrar nuevos gastos normalmente.
* No permitir modificar la recaudación.
* No permitir cambiar los cursos.
* No permitir recalcular libremente.
* Permitir solamente correcciones mediante un proceso especial y auditado.

---

# Manejo de diferencias por división

Puede ocurrir que el monto no sea divisible exactamente por la cantidad de cursos.

Ejemplo:

```text
$100.000 ÷ 3 = $33.333,333...
```

Como el sistema trabaja con pesos enteros, definir una regla explícita.

Regla recomendada:

1. Dividir utilizando montos enteros.
2. Asignar la parte base igual a todos los cursos.
3. Registrar el resto como remanente del evento.
4. No asignar el peso restante arbitrariamente a un curso.
5. Permitir que el tesorero decida cómo resolver el remanente antes del cierre.

Ejemplo:

```text
Recaudación distribuible: $100.000
Parte base: $33.333 por curso
Total distribuido: $99.999
Remanente: $1
```

Mostrar:

```text
Remanente pendiente de asignación: $1
```

El evento no debe cerrarse hasta resolver el remanente.

Alternativamente, el sistema puede permitir asignarlo a un fondo general, pero debe registrarse explícitamente.

---

# Caso de ganancia negativa de un curso

Puede ocurrir que los gastos propios de un curso superen su parte bruta.

Ejemplo:

```text
Parte bruta: $100.000
Gastos propios: $120.000
Ganancia neta: -$20.000
```

En este caso:

* Mostrar una alerta.
* No realizar automáticamente una transferencia negativa.
* Marcar al curso con saldo pendiente.
* Solicitar una resolución antes de cerrar el evento.

Opciones futuras:

* Cubrir la diferencia desde las arcas del curso.
* Cubrirla desde un fondo general.
* Repartirla entre los cursos, solamente con autorización.
* Registrar un ajuste.

En esta primera implementación, no redistribuir automáticamente la pérdida entre los otros cursos.

---

# Edición y anulación de gastos

No eliminar físicamente los gastos.

Si un gasto fue registrado por error, utilizar:

```text
Anular gasto
```

Solicitar:

* Motivo.
* Confirmación.
* Usuario responsable.

Un gasto anulado:

* Debe continuar visible.
* No debe incluirse en los cálculos.
* Debe mantener historial de auditoría.

Si la liquidación ya fue confirmada, no permitir anular o modificar gastos sin re
