# Mercado Pago dentro de Pagos

## Arquitectura identificada

- Ruta existente: `/tesoreria/pagos`, declarada en `frontend/src/presentation/routers/AppRouter.tsx` bajo `ProtectedRoute`.
- Página y estilos: `PaymentsPage.tsx` y `PaymentsPage.css`, con `MainLayout`, tarjetas de cuotas, estados e historial existentes. No se agrega otra página ni entrada de navegación.
- Servicios existentes: `TransferPaymentService` (planes, comprobantes e historial), `TreasuryService` / `TreasuryUseCase` (obligaciones, registro contable, auditoría y reportes). El frontend ya cuenta con `TreasuryRepositoryImpl`.
- Modelos: `AnnualFeeConfig`, `FamilyFeePlan`, `FeeObligation`, `FeePayment`, `GenericPaymentEntity`, `PaymentMethod`, `PaymentStatus` y `ObligationStatus`.
- Endpoints existentes: `/api/v1/tesoreria/pagos-transferencia/{cuenta-bancaria,mis-pagos,mi-plan,revision}`, `/mis-cuotas/{id}/comprobante`, `/{id}/{aprobar,rechazar,comprobante}` y `/api/v1/tesoreria/obligaciones/{id}/pagos`.
- Permisos: `USER`/`ADMIN` pueden consultar y pagar sus propias cuotas, verificando familia y organización. Configuración bancaria y revisión manual son de `ADMIN`. Hibernate aísla los datos por organización.

## Flujo implementado

1. El apoderado elige el plan existente de pago único anual o dos cuotas. Cada obligación queda `PENDIENTE`.
2. La tarjeta **Mercado Pago** aparece siempre al inicio de Pagos, para administradores y apoderados, e indica disponibilidad, activación pendiente o error de conexión. El botón **Pagar con Mercado Pago** aparece en cada cuota pendiente y queda deshabilitado hasta que la organización tenga Mercado Pago configurado. Cada checkout cobra únicamente el monto de la obligación seleccionada, con preferencia e historial independientes.
3. El backend obtiene monto y moneda de la obligación, crea la preferencia de Checkout Pro y guarda su referencia aleatoria en `payments`. Los clics siguientes reutilizan la preferencia.
4. El navegador abre el `init_point` de Mercado Pago. El retorno conserva el año y vuelve a `/tesoreria/pagos`.
5. El backend consulta `GET /v1/payments/{id}`: valida familia, organización, referencia, importe, CLP, cuenta receptora y entorno esperado. Los parámetros `status` del navegador no aprueban pagos.
6. Solo `approved` registra el ingreso mediante `TreasuryUseCase.registerPayment`: actualiza la obligación a `PAGADA`, el intento a `PAID`, la auditoría y la invalidación del resumen contable en una transacción.
7. El historial existente muestra método, fecha, identificador y estado. El retorno consulta hasta 12 veces a intervalos de 5 segundos y ofrece actualización manual. Un intento rechazado conserva la cuota pendiente y permite retomar la misma preferencia.

El webhook verifica HMAC-SHA256 con `data.id` de la URL, `x-request-id` y `x-signature`. Después selecciona únicamente la organización configurada, sin conceder permisos de usuario, y consulta el pago en la API. El contexto se restaura incluso ante errores. Se requiere `spring.jpa.open-in-view=false`, como ya ocurre en todos los perfiles del proyecto.

La cuota se bloquea durante la conciliación y el registro contable para evitar duplicados entre retorno, webhook y registro manual. El índice único del identificador externo evita asociar el mismo cobro a dos registros. Los errores transitorios del webhook no devuelven un éxito falso y permiten los reintentos del proveedor.

Mientras haya un Checkout pendiente se conserva la opción de retomarlo y no se acepta otro comprobante de transferencia para esa cuota. Esta entrega cubre el pago único anual y el pago independiente de cada una de las dos cuotas: no incorpora devoluciones automáticas, contracargos ni varias cuentas receptoras por instancia. Esas operaciones requieren conciliación de Tesorería; un segundo cobro aprobado para la misma cuota devuelve conflicto y no duplica el ingreso.

## Configuración del servidor

Aplicar la migración Flyway `V46__add_mercado_pago_checkout.sql`. No se necesitan nuevas dependencias ni claves en el frontend.

| Variable | Valor |
| --- | --- |
| `MERCADO_PAGO_ACCESS_TOKEN` | Access Token de la cuenta vendedora; mantener en secretos del servidor |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Firma secreta de Webhooks de la misma aplicación |
| `MERCADO_PAGO_ORGANIZATION_ID` | ID interno de la organización receptora |
| `MERCADO_PAGO_COLLECTOR_ID` | ID de la cuenta vendedora de Mercado Pago |
| `MERCADO_PAGO_RETURN_URL` | URL HTTPS absoluta de la página existente, por ejemplo `https://curso.example/tesoreria/pagos` |
| `MERCADO_PAGO_WEBHOOK_URL` | URL HTTPS absoluta pública del webhook, incluyendo el context path del backend |
| `MERCADO_PAGO_TEST_MODE` | `true` por defecto: exige `live_mode=false`; `false` exige pagos reales |

Con el context path actual `/tesoreria`, la URL del webhook tiene la forma `https://api.example/tesoreria/api/v1/tesoreria/pagos/mercado-pago/webhook`. Las URLs configuradas no deben llevar query ni fragmento. El modo de prueba valida el entorno del pago; siempre se usa `init_point`, también al probar con cuentas de prueba de Checkout Pro.

Si falta configuración, o la sesión pertenece a otra organización, el botón no se habilita y los endpoints de cobro responden 503. La sección y las transferencias siguen funcionando.

## Nuevos endpoints

Base interna: `/api/v1/tesoreria/pagos/mercado-pago`.

| Método / ruta | Acceso / contrato |
| --- | --- |
| `GET /disponibilidad` | USER/ADMIN: `{ "enabled": true }` |
| `POST /cuotas/{id}/checkout` | USER/ADMIN, familia propia, cuota pendiente (`ANUAL`, `PRIMERA` o `SEGUNDA`). Sin monto en el cuerpo; devuelve `preferenceId`, `checkoutUrl` |
| `POST /retorno` | USER/ADMIN, familia propia. Cuerpo `{ "paymentId": "..." }`; devuelve `id`, `status`, `providerStatus` |
| `POST /webhook?data.id=...` | Sin JWT, con firma válida obligatoria; solo recibe notificaciones de pagos |

## Verificación antes de activar cobros reales

Configurar una cuenta vendedora de prueba de Chile y otra cuenta compradora de prueba; ambas deben corresponder al flujo de Checkout Pro. Probar aprobación, rechazo, abandono/retorno, recarga, webhook duplicado y webhook sin retorno del navegador. Confirmar una sola fila contable, cuota pagada, total actualizado e historial visible. Probar también otro apoderado y otra organización: no deben poder crear ni conciliar el pago.

La validación local automatizada no ejecuta cobros externos ni sustituye esta prueba con credenciales. La migración debe verificarse en PostgreSQL antes de producción.

Las solicitudes Bruno están en `api-tests/pagos`. Ejecutarlas manualmente contra el entorno de prueba configurado, con `userToken` de un apoderado, `MP_Obligation_Id` de la cuota pendiente seleccionada y `MP_Payment_Id` del cobro de prueba. No contienen credenciales ni ejecutan el cobro: la segunda solicitud crea una preferencia y el comprador completa Checkout Pro antes de probar el retorno.

## Resultado local (7 de septiembre de 2026)

- `gradlew.bat check --continue`: 372 pruebas, cero fallos; cobertura JaCoCo aprobada. El comando termina con error exclusivamente por 15 incidencias PMD preexistentes en instrumentación de rendimiento y autenticación, fuera de los archivos de esta integración.
- PostgreSQL 16 mediante Testcontainers: 46 migraciones Flyway aplicadas, incluida V46, y validación Hibernate aprobada.
- `pnpm test:run`: 398 pruebas aprobadas en la ejecución general. Tras incorporar las pruebas nuevas, la ejecución dirigida de `PaymentsPage`, `useMercadoPago` y `ProtectedRoute` aprobó sus seis casos.
- `pnpm build`, `pnpm lint` y `git diff --check` aprobados. Persisten advertencias previas de Lottie y expresiones sin uso en otras pantallas.
- No se realizaron transacciones en Mercado Pago ni se ejecutaron las solicitudes Bruno contra cuentas externas; requieren la configuración indicada arriba.

Fuentes oficiales consultadas: [Checkout Pro](https://www.mercadopago.cl/developers/es/reference/online-payments/checkout-pro/overview), [firmas Webhook](https://www.mercadopago.cl/developers/es/docs/your-integrations/notifications/webhooks), [guía vigente del proveedor para `init_point`](https://github.com/mercadopago/mercadopago-claude-marketplace/blob/main/plugins/mercadopago/skills/mp-integrate/SKILL.md).
