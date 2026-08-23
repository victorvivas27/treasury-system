# Tarea: Implementar módulo de Pagos y Transferencias

## Objetivo

Implementar una nueva sección **Pagos** dentro de la aplicación.

La primera versión del módulo debe permitir que:

1. El tesorero configure los datos bancarios donde recibirá las transferencias.
2. Al comenzar el año escolar se configure el valor total de la cuota de curso.
3. El apoderado pueda elegir entre:
   - Pago único.
   - Pago en 2 cuotas.
4. El apoderado pueda realizar una transferencia bancaria.
5. El apoderado pueda subir el comprobante de transferencia.
6. El tesorero pueda revisar el comprobante y aprobar o rechazar el pago.
7. La arquitectura quede preparada para incorporar posteriormente pasarelas de pago como **Mercado Pago**, sin rehacer el modelo de pagos.

---

# 1. Principio de arquitectura

No modelar el sistema suponiendo que todos los pagos serán transferencias bancarias.

Separar claramente:

- La deuda u obligación del apoderado.
- La cuota o vencimiento.
- El pago realizado.
- El método de pago utilizado.
- El comprobante de una transferencia.

Un `Payment` debe ser una entidad genérica.

Métodos iniciales/futuros:

```text
BANK_TRANSFER
MERCADO_PAGO
```

No acoplar `Installment`, `PaymentPlan` ni la cuota anual a una transferencia bancaria específica.

---

# 2. Configuración bancaria del curso

Crear una configuración donde el tesorero pueda ingresar los datos para recibir transferencias.

Campos sugeridos:

```text
id
courseId
schoolYear
accountHolderName
accountHolderRut
bankName
accountType
accountNumber
email
createdAt
updatedAt
```

Ejemplo:

```text
Titular: Juan Pérez
RUT: 12.345.678-9
Banco: Banco Estado
Tipo de cuenta: Cuenta RUT
Número de cuenta: 12345678
Correo: tesorero@email.com
```

La configuración debe poder modificarse.

---

# 3. Copiar datos de transferencia

En la pantalla del apoderado mostrar los datos bancarios de forma clara.

Agregar:

```text
Copiar datos de transferencia
```

Este botón debe copiar todos los datos al portapapeles usando un formato consistente y simple.

Ejemplo:

```text
Titular: Juan Pérez
RUT: 12.345.678-9
Banco: Banco Estado
Tipo de cuenta: Cuenta RUT
N° de cuenta: 12345678
Correo: tesorero@email.com
Monto: $30.000
```

Algunas aplicaciones bancarias pueden detectar datos existentes en el portapapeles y ofrecer autocompletar campos.

No asumir que todos los bancos soportan esta función.

También agregar botón de copiar individual para:

- RUT
- Número de cuenta
- Correo
- Monto

Ejemplo:

```text
RUT                [Copiar]
Número de cuenta   [Copiar]
Correo             [Copiar]
Monto              [Copiar]
```

Mostrar feedback visual breve:

```text
Datos copiados
```

o:

```text
Número de cuenta copiado
```

---

# 4. Configuración de cuota anual

El tesorero debe poder crear una configuración de cuota para un año escolar.

Ejemplo:

```text
Año escolar: 2026
Cuota anual: $60.000
```

Campos sugeridos:

```text
CourseFee
---------
id
courseId
schoolYear
totalAmount
currency
status
createdAt
updatedAt
```

Estados sugeridos:

```text
DRAFT
ACTIVE
CLOSED
```

Solo debe existir una configuración activa de cuota por curso y año escolar.

---

# 5. Opciones de pago

Para la primera versión permitir:

```text
Pago único
2 cuotas
```

El tesorero debe poder configurar si ambas opciones están disponibles.

Ejemplo:

```text
Cuota anual: $60.000

Opciones:

Pago único
$60.000

2 cuotas
Cuota 1: $30.000
Cuota 2: $30.000
```

Los montos deben calcularse desde el backend.

No confiar en valores enviados por el frontend.

---

# 6. Elección del apoderado

Cuando el apoderado entra por primera vez a Pagos debe seleccionar su modalidad.

Ejemplo UI:

```text
Cuota de curso 2026

Total anual
$60.000

¿Cómo quieres pagar?

( ) Pago único
    $60.000

( ) 2 cuotas
    $30.000 cada una

[Continuar]
```

Una vez confirmada la elección, crear un `PaymentPlan`.

Entidad sugerida:

```text
PaymentPlan
-----------
id
guardianId
studentId
courseFeeId
planType
totalAmount
status
createdAt
updatedAt
```

Tipos:

```text
SINGLE_PAYMENT
TWO_INSTALLMENTS
```

Estados:

```text
ACTIVE
COMPLETED
CANCELLED
```

---

# 7. Generación de cuotas

Después de elegir el plan, crear las obligaciones correspondientes.

Entidad:

```text
Installment
-----------
id
paymentPlanId
installmentNumber
amount
dueDate
status
createdAt
updatedAt
```

Estados sugeridos:

```text
PENDING
PAYMENT_SUBMITTED
PAID
OVERDUE
CANCELLED
```

Ejemplo para 2 cuotas:

```text
Cuota 1
Monto: $30.000
Vencimiento: 30/04/2026
Estado: Pendiente

Cuota 2
Monto: $30.000
Vencimiento: 31/07/2026
Estado: Pendiente
```

---

# 8. Entidad Payment

Crear una entidad genérica para representar cualquier intento o pago.

```text
Payment
-------
id
installmentId
amount
currency
paymentMethod
status
paidAt
externalReference
createdAt
updatedAt
```

Métodos:

```text
BANK_TRANSFER
MERCADO_PAGO
```

Estados sugeridos:

```text
PENDING
PROOF_SUBMITTED
UNDER_REVIEW
PAID
REJECTED
FAILED
CANCELLED
```

No usar estados específicos de Mercado Pago directamente como estado principal del dominio.

---

# 9. Transferencias bancarias

Crear una entidad específica para información asociada a una transferencia.

```text
BankTransferPayment
-------------------
id
paymentId
proofUrl
originalFileName
submittedAt
reviewedBy
reviewedAt
rejectionReason
createdAt
updatedAt
```

La transferencia debe estar asociada a `Payment`.

No guardar `proofUrl` directamente en `Installment`.

---

# 10. Subida del comprobante

En una cuota pendiente mostrar:

```text
Cuota 1
$30.000

Datos para transferencia
...

[Copiar datos de transferencia]

Después de realizar la transferencia:

[Subir comprobante]
```

Aceptar inicialmente:

```text
image/jpeg
image/png
application/pdf
```

Aplicar límites de tamaño.

Utilizar el servicio de almacenamiento de archivos/imágenes ya disponible en el proyecto cuando sea apropiado.

No almacenar archivos binarios directamente en PostgreSQL.

---

# 11. Flujo de envío

Cuando el apoderado sube el comprobante:

```text
Installment.status = PAYMENT_SUBMITTED
Payment.status = PROOF_SUBMITTED
```

Registrar:

```text
submittedAt
```

Mostrar al apoderado:

```text
Comprobante enviado

Tu pago está pendiente de revisión por el tesorero.
```

El apoderado debe poder visualizar el comprobante enviado.

---

# 12. Panel del tesorero

Crear dentro de Pagos una vista administrativa.

Debe permitir filtrar:

```text
Pendientes de revisión
Pagados
Rechazados
Todos
```

Mostrar:

```text
Alumno
Apoderado
Cuota
Monto
Fecha de envío
Estado
```

Al abrir un pago:

```text
Alumno: ...
Apoderado: ...
Cuota: 1 de 2
Monto esperado: $30.000
Método: Transferencia
Fecha enviada: ...
```

Mostrar el comprobante.

Acciones:

```text
[Aprobar pago]
[Rechazar]
```

---

# 13. Aprobar pago

Al aprobar:

```text
Payment.status = PAID
Installment.status = PAID
Payment.paidAt = now()
BankTransferPayment.reviewedAt = now()
BankTransferPayment.reviewedBy = currentUser
```

Si todas las cuotas del `PaymentPlan` están pagadas:

```text
PaymentPlan.status = COMPLETED
```

La operación debe ser transaccional.

---

# 14. Rechazar pago

Al rechazar debe ser obligatorio ingresar un motivo.

Ejemplo:

```text
El monto transferido no corresponde al valor de la cuota.
```

Actualizar:

```text
Payment.status = REJECTED
Installment.status = PENDING
BankTransferPayment.reviewedAt = now()
BankTransferPayment.reviewedBy = currentUser
BankTransferPayment.rejectionReason = motivo
```

Permitir que el apoderado vuelva a enviar un comprobante.

Idealmente conservar historial de intentos de pago.

No sobrescribir silenciosamente un pago rechazado.

---

# 15. Historial de pagos

El sistema debe conservar historial.

Ejemplo:

```text
Cuota 1

Intento 1
Transferencia
REJECTED

Intento 2
Transferencia
PAID
```

Nunca eliminar pagos anteriores por crear un nuevo intento.

---

# 16. Pantalla principal del apoderado

Ejemplo:

```text
Pagos

Cuota de curso 2026

Total
$60.000

Plan seleccionado
2 cuotas

Progreso
$30.000 / $60.000 pagados

--------------------------------

Cuota 1
$30.000
PAGADA

Pagada el 15/04/2026

--------------------------------

Cuota 2
$30.000
PENDIENTE

Vence 31/07/2026

[Pagar / Ver datos de transferencia]
```

---

# 17. Seguridad

Verificar permisos siempre desde backend.

Apoderado:

- Solo puede visualizar su propia información.
- Solo puede subir comprobantes para sus cuotas.
- No puede aprobar pagos.
- No puede modificar montos.
- No puede modificar estados.

Tesorero/administrador:

- Puede configurar datos bancarios.
- Puede configurar cuota anual.
- Puede consultar pagos del curso que administra.
- Puede aprobar o rechazar comprobantes.

No confiar en IDs recibidos del frontend sin validar pertenencia y autorización.

---

# 18. Validaciones importantes

Implementar como mínimo:

- `amount > 0`
- Año escolar válido.
- No crear dos planes activos para el mismo alumno/cuota anual.
- No permitir pagar una cuota cancelada.
- No permitir aprobar dos veces el mismo pago.
- No permitir cambiar manualmente desde frontend el monto esperado.
- No permitir comprobantes sin una cuota válida.
- Validar tipo MIME y tamaño del archivo.
- Las operaciones de aprobación/rechazo deben ser idempotentes cuando corresponda.

---

# 19. API sugerida

Las rutas deben adaptarse a las convenciones existentes del proyecto.

Ejemplo conceptual:

```text
ADMIN / TESORERO

GET    /api/payments/settings
PUT    /api/payments/settings/bank-account

GET    /api/course-fees
POST   /api/course-fees
PUT    /api/course-fees/{id}

GET    /api/payments/review
GET    /api/payments/{paymentId}
POST   /api/payments/{paymentId}/approve
POST   /api/payments/{paymentId}/reject


APODERADO

GET    /api/my/payments
GET    /api/my/payment-plan

POST   /api/my/payment-plan

GET    /api/my/installments/{id}
POST   /api/my/installments/{id}/bank-transfer
POST   /api/my/installments/{id}/bank-transfer/proof
```

No es obligatorio utilizar exactamente estas rutas si el proyecto ya posee una convención distinta.

Mantener consistencia con el backend existente.

---

# 20. Preparación para Mercado Pago

La integración con Mercado Pago NO forma parte de esta primera implementación.

Sin embargo, la arquitectura debe permitir incorporarlo posteriormente.

En el futuro podría existir:

```text
MercadoPagoPayment
------------------
id
paymentId
mercadoPagoPaymentId
preferenceId
merchantOrderId
rawStatus
createdAt
updatedAt
```

Flujo futuro:

```text
Installment
   |
Payment
   |
paymentMethod = MERCADO_PAGO
   |
MercadoPagoPayment
```

Mercado Pago confirmará el pago mediante webhook.

El webhook actualizará el mismo `Payment` genérico:

```text
Payment.status = PAID
```

y posteriormente:

```text
Installment.status = PAID
```

Por esta razón, evitar cualquier lógica donde `Installment` dependa directamente de `BankTransferPayment`.

---

# 21. Base de datos y migraciones

Crear migraciones Flyway para las nuevas tablas.

No utilizar cambios manuales de esquema en producción.

Revisar nombres y relaciones existentes antes de crear las migraciones.

Agregar índices para consultas frecuentes, especialmente:

```text
guardianId
studentId
courseFeeId
paymentPlanId
installmentId
payment.status
installment.status
schoolYear
```

Agregar constraints de integridad donde corresponda.

---

# 22. Backend

Mantener las prácticas existentes del proyecto:

- Java 21
- Spring Boot
- Gradle
- PostgreSQL
- Flyway
- DTOs
- Servicios
- Repositories
- Controllers
- Manejo centralizado de errores
- Validaciones
- Seguridad existente

No introducir una arquitectura paralela innecesaria.

Antes de implementar, revisar cómo están modelados actualmente:

```text
User
Guardian / Apoderado
Student / Alumno
Course / Curso
Roles
ImageStorageService
```

Reutilizar entidades y servicios existentes en lugar de duplicarlos.

---

# 23. Frontend

Crear sección:

```text
Pagos
```

Separar vistas según rol.

## Apoderado

Debe poder:

- Ver cuota anual.
- Elegir plan.
- Ver cuotas.
- Ver vencimientos.
- Ver estado.
- Ver datos bancarios.
- Copiar datos.
- Subir comprobante.
- Ver comprobante.
- Ver rechazo y motivo.
- Reintentar.

## Tesorero

Debe poder:

- Configurar datos bancarios.
- Configurar cuota anual.
- Configurar fechas de vencimiento.
- Ver pagos enviados.
- Abrir comprobantes.
- Aprobar.
- Rechazar.
- Consultar historial.

Mantener diseño responsive para:

- Desktop.
- Tablet.
- Móvil.

---

# 24. UX importante

Evitar exponer términos técnicos al usuario.

Mostrar estados amigables.

Ejemplo:

```text
PENDING
→ Pendiente

PROOF_SUBMITTED
→ Comprobante enviado

UNDER_REVIEW
→ En revisión

PAID
→ Pagado

REJECTED
→ Rechazado

OVERDUE
→ Vencido
```

Para datos bancarios ofrecer una experiencia simple de copiar.

Ejemplo:

```text
Datos para transferir

Juan Pérez
Banco Estado
Cuenta RUT
12.345.678-9
12345678
tesorero@email.com

Monto a transferir
$30.000

[Copiar todos los datos]
```

---

# 25. No implementar todavía

No integrar en esta tarea:

- Mercado Pago.
- Webhooks de Mercado Pago.
- Tarjetas de crédito.
- Débito automático.
- Webpay.
- Conciliación bancaria automática.

Solo dejar el dominio preparado para poder agregarlos posteriormente.

---

# 26. Criterios de aceptación

La tarea estará terminada cuando:

1. El tesorero pueda configurar su cuenta bancaria.
2. El tesorero pueda configurar la cuota anual.
3. Se pueda permitir pago único o 2 cuotas.
4. El apoderado pueda seleccionar un plan.
5. Se creen correctamente las cuotas.
6. El apoderado pueda visualizar los datos de transferencia.
7. Exista botón para copiar todos los datos.
8. Existan botones para copiar datos individuales.
9. El apoderado pueda subir comprobante.
10. El tesorero pueda visualizarlo.
11. El tesorero pueda aprobarlo.
12. El tesorero pueda rechazarlo indicando motivo.
13. El apoderado pueda visualizar el estado.
14. Se conserve historial de intentos.
15. Los permisos se validen en backend.
16. Existan migraciones Flyway.
17. Existan tests de las reglas principales.
18. La arquitectura no quede acoplada a transferencias bancarias.
19. Agregar Mercado Pago posteriormente no requiera rediseñar `PaymentPlan`, `Installment` o `Payment`.

---

# 27. Instrucción final para el agente

Antes de escribir código:

1. Analizar la estructura actual del monorepo.
2. Revisar entidades, seguridad, roles y relaciones existentes.
3. Identificar cómo se representa actualmente:
   - curso,
   - alumno,
   - apoderado,
   - tesorero.
4. Revisar convenciones del backend y frontend.
5. Reutilizar componentes existentes.
6. Proponer únicamente los cambios necesarios.
7. Implementar backend, migraciones, frontend y tests.
8. No romper funcionalidades existentes.
9. Ejecutar tests y build antes de finalizar.
10. Documentar brevemente los endpoints y decisiones de arquitectura implementadas.

La prioridad es que la primera versión de pagos por transferencia sea sencilla para el usuario, pero que el dominio quede correctamente diseñado para incorporar Mercado Pago y otros medios de pago posteriormente.
