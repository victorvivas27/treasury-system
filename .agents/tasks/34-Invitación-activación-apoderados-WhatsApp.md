# TASK #34 — Invitación y activación de apoderados mediante WhatsApp

## Objetivo

Implementar el envío automático de invitaciones por WhatsApp a los apoderados registrados en el sistema, utilizando la API oficial de WhatsApp Business de Meta.

Cada apoderado recibirá una invitación con un enlace seguro que le permitirá acceder a la aplicación web, crear su contraseña personal y activar su cuenta.

## 1. Flujo funcional

1. Un administrador registra o invita a un apoderado desde el sistema.
2. El sistema verifica que el apoderado tenga un número de teléfono válido, normalizado al formato internacional E.164 (+56 9XXXXXXXX para móviles chilenos).
3. El backend genera una invitación única, segura y con fecha de expiración.
4. El backend envía una plantilla de WhatsApp aprobada por Meta, incluyendo el enlace de activación.
5. El apoderado abre el enlace desde WhatsApp.
6. La aplicación web valida el token de invitación.
7. Se presenta un formulario para establecer una contraseña segura y confirmarla.
8. El backend valida la contraseña y activa la cuenta.
9. El token de invitación queda invalidado y no puede reutilizarse.
10. El apoderado puede iniciar sesión con sus credenciales.

No generar contraseñas temporales ni enviarlas por WhatsApp.

## 2. Integración con Meta

Utilizar exclusivamente WhatsApp Cloud API oficial.

Implementar un servicio desacoplado de mensajería, reutilizable para futuras notificaciones.

Configuración mediante variables de entorno:

- WHATSAPP_ENABLED
- WHATSAPP_MODE=test | production
- WHATSAPP_ACCESS_TOKEN
- WHATSAPP_PHONE_NUMBER_ID
- WHATSAPP_BUSINESS_ACCOUNT_ID
- WHATSAPP_TEMPLATE_INVITATION
- WHATSAPP_API_VERSION
- APP_PUBLIC_URL

No incluir credenciales ni tokens en el frontend o repositorio.

En desarrollo utilizar el número de prueba proporcionado por Meta y destinatarios de prueba autorizados.

En producción permitir configurar un número real chileno +56 sin modificar la lógica de negocio.

## 3. Plantilla de WhatsApp

Propuesta de mensaje:

"Hola {{1}}, has sido invitado/a a acceder a {{2}} como apoderado/a.

Para activar tu cuenta y establecer tu contraseña, utiliza el siguiente botón.

Si no esperabas esta invitación, puedes ignorar el mensaje."

Botón: "Activar mi cuenta"

El botón debe abrir una URL HTTPS con un token de activación.

Crear y someter a aprobación una plantilla de categoría Utility, sujeta a la clasificación definitiva de Meta. No enviar mensajes libres fuera de las condiciones permitidas por WhatsApp.

## 4. Seguridad

- Generar tokens criptográficamente seguros y únicos.
- Almacenar únicamente el hash del token en la base de datos.
- Establecer una expiración configurable, inicialmente de 24 horas.
- Invalidar el token después del primer uso exitoso.
- Validar la expiración y el estado de la cuenta desde el backend.
- Utilizar HTTPS obligatoriamente.
- No incluir contraseñas ni datos sensibles en los mensajes.
- Aplicar la política de contraseñas existente del proyecto, utilizando un algoritmo seguro para almacenar sus hashes.
- Evitar que la página de activación exponga tokens en logs, analítica o servicios externos.
- Limitar intentos y reenvíos para prevenir abusos.
- No activar la cuenta hasta completar correctamente el proceso.

## 5. Estados y trazabilidad

Registrar:

- Invitación pendiente.
- Envío solicitado.
- Mensaje aceptado por Meta.
- Mensaje entregado, si existe confirmación.
- Error de envío.
- Invitación expirada.
- Cuenta activada.

Guardar fecha de creación, expiración, activación, identificador del mensaje y errores relevantes.

Implementar webhooks de Meta para actualizar el estado de entrega.

No considerar que un mensaje fue entregado únicamente porque la API aceptó la solicitud.

## 6. Panel administrativo

Incorporar o reutilizar las siguientes funciones:

- Invitar apoderado.
- Consultar estado de invitación.
- Reenviar invitación, con controles de seguridad.
- Identificar cuentas pendientes de activación.
- Mostrar errores de entrega sin exponer credenciales.

Respetar el diseño, permisos y arquitectura existentes.

## 7. Consentimiento

Verificar que existe autorización del apoderado para recibir mensajes por WhatsApp y registrar la fuente y fecha de dicha autorización.

No habilitar envíos masivos a apoderados reales durante las pruebas.

## 8. Entorno de pruebas

Implementar un proveedor de mensajería configurable para que la funcionalidad pueda probarse con Meta Test Number.

Crear pruebas para:

- Invitación válida.
- Token expirado.
- Token utilizado anteriormente.
- Número inválido.
- Error de API de Meta.
- Reenvío de invitación.
- Contraseña inválida.
- Activación correcta.
- Intento de reutilizar una invitación.

Permitir pruebas locales mediante un adaptador simulado cuando no exista acceso a Meta.

## 9. Criterios de aceptación

La tarea se considera terminada cuando:

- El administrador puede generar una invitación.
- El backend puede enviar un mensaje a un destinatario autorizado usando Meta Test Number.
- El enlace de activación abre la aplicación web.
- El apoderado puede establecer su contraseña.
- La cuenta queda activada correctamente.
- El enlace no puede reutilizarse.
- Los errores de envío se registran.
- Los secretos permanecen protegidos.
- El sistema permite cambiar del número de prueba al número de producción mediante configuración.
- Existen pruebas automatizadas del flujo crítico.

## 10. Instrucciones para el agente

Antes de implementar:

1. Revisar la arquitectura actual del proyecto.
2. Identificar el sistema de autenticación y el modelo de apoderados.
3. Reutilizar los mecanismos de invitación y seguridad existentes cuando sea posible.
4. Evitar duplicar usuarios o crear sistemas de autenticación paralelos.
5. Identificar migraciones y cambios necesarios.
6. No asumir nombres de tablas, rutas o frameworks sin revisar el código.

Al finalizar, entregar:

- Resumen de archivos modificados.
- Variables de entorno necesarias.
- Migraciones realizadas.
- Instrucciones para configurar Meta.
- Pruebas ejecutadas y resultados.
- Limitaciones pendientes para producción.

**Restricción:** no activar envíos reales ni contratar números o servicios de pago sin autorización del administrador.
