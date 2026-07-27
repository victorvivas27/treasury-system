# Módulo Tesorería - Primera implementación
## Cuotas Anuales

## Objetivo

Implementar la primera versión del módulo de Tesorería para administrar la cuota anual del colegio.

Esta primera etapa solamente contempla la administración de la cuota anual.

---

# Concepto

Cada año existirá una única cuota anual.

Ejemplo:

Año: 2026

Valor anual:

$70.000

Cada familia podrá elegir una modalidad de pago.

## Modalidades

### 1. Cuota única

La familia paga el monto completo.

Ejemplo:

$70.000

Fecha sugerida de vencimiento:

Abril.

---

### 2. Dos cuotas

La familia paga:

Primera cuota:

Abril

$35.000

Segunda cuota:

Julio

$35.000

---

# Configuración

Debe existir una pantalla donde el tesorero pueda definir:

- Año.
- Valor anual.
- Modalidad permitida.
- Fecha de vencimiento cuota única.
- Fecha de vencimiento primera cuota.
- Fecha de vencimiento segunda cuota.

Ejemplo:

Año:

2026

Monto anual:

70000

Cuota única:

70.000

Vence:

15/04/2026

Primera cuota:

35.000

Vence:

15/04/2026

Segunda cuota:

35.000

Vence:

15/07/2026

---

# Modalidad de cada familia

Cada familia deberá tener configurado cómo pagará.

Valores posibles:

- ANUAL
- DOS_CUOTAS

La modalidad podrá modificarse solamente antes de registrar pagos.

---

# Generación de obligaciones

Cuando se genere el proceso del año:

Para familias con modalidad ANUAL:

Debe generarse una sola obligación.

Ejemplo:

Familia:

Pepito

Concepto:

Cuota anual

Monto:

70000

Estado:

Pendiente

---

Para familias con modalidad DOS_CUOTAS

Debe generar dos obligaciones.

Ejemplo:

Familia:

Juancito

Cuota 1

35000

Pendiente

Cuota 2

35000

Pendiente

---

# Registro de pagos

El tesorero podrá registrar un pago.

Al registrar un pago:

Debe cambiar el estado de la cuota.

Estados posibles:

- Pendiente
- Pagada

Registrar además:

- Fecha de pago.
- Monto pagado.
- Usuario que registró el pago.
- Observaciones (opcional).

---

# Casos de uso

## Caso 1

Pepito

Modalidad:

ANUAL

Estado inicial

| Concepto | Estado |
|----------|---------|
| Cuota anual | Pendiente |

Registra pago.

Resultado

| Concepto | Estado |
|----------|---------|
| Cuota anual | Pagada |

---

## Caso 2

Juancito

Modalidad:

DOS_CUOTAS

Estado inicial

| Concepto | Estado |
|----------|---------|
| Cuota 1 | Pendiente |
| Cuota 2 | Pendiente |

Registra pago de la primera.

Resultado

| Concepto | Estado |
|----------|---------|
| Cuota 1 | Pagada |
| Cuota 2 | Pendiente |

Después registra la segunda.

Resultado

| Concepto | Estado |
|----------|---------|
| Cuota 1 | Pagada |
| Cuota 2 | Pagada |

---

# Consultas

Debe existir una pantalla con filtros.

Filtros:

- Año.
- Curso.
- Familia.
- Modalidad.
- Estado.

---

# Reportes mínimos

## Familias al día

Mostrar todas las familias sin cuotas pendientes.

---

## Familias con deuda

Mostrar familias con al menos una cuota pendiente.

---

## Cuota única pagada

Listado de todas las familias que pagaron la cuota anual completa.

---

## Primera cuota pagada

Listado de familias que pagaron la primera cuota.

---

## Segunda cuota pendiente

Listado de familias que todavía no pagan la segunda cuota.

---

# Dashboard

Mostrar al menos:

Total familias.

Cantidad con cuota única.

Cantidad con pago en dos cuotas.

Cuotas pendientes.

Cuotas pagadas.

Monto recaudado.

Monto pendiente de recaudar.

---

# Reglas

No permitir registrar dos veces el mismo pago.

No permitir pagar la segunda cuota antes de que exista la primera obligación.

No eliminar pagos.

Si un pago fue registrado por error, utilizar un proceso de anulación, nunca eliminar registros.

Toda operación debe quedar auditada.

---

# Resultado esperado

Al finalizar esta primera implementación el sistema debe permitir:

- Configurar la cuota anual.
- Configurar la modalidad de pago por familia.
- Generar automáticamente las obligaciones.
- Registrar pagos.
- Saber quién pagó cuota única.
- Saber quién pagó la primera cuota.
- Saber quién debe la segunda cuota.
- Saber quién está completamente al día.
- Obtener reportes básicos de recaudación.

Esta implementación debe ser modular para permitir agregar posteriormente:

- Cuota CEPA.
- Cuota Solidaria.
- Eventos.
- Talleres.
- Rifas.
- Multas.
- Otros conceptos de cobro.
