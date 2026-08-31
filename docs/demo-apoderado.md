# Demo de Usuario Apoderado

Este guion sirve para grabar una presentacion o hacer una demo en vivo desde el punto de vista de un apoderado. La idea es mostrar transparencia, pagos y consulta financiera sin entrar a funciones administrativas.

## Objetivo

Mostrar que el apoderado puede:

- Iniciar sesion con su cuenta.
- Revisar el estado financiero del curso.
- Consultar ingresos, egresos y resumen de stands.
- Gestionar su propia cuota y subir comprobantes.
- Revisar su perfil y vinculacion familiar.

## Recorrido sugerido

1. Abrir la pagina de login.
   - Mensaje: "Entraremos con una cuenta de apoderado, que tiene permisos de consulta y gestion de sus pagos."

2. Iniciar sesion como apoderado.
   - Correo de demo: `apoderado.demo@curso.cl`
   - Clave de demo: `DemoApoderado1!`

3. Ir al Dashboard.
   - Mostrar familias activas, saldo disponible, ingresos, egresos y avance de cuotas.
   - Mensaje: "Esta vista ayuda a las familias a entender rapidamente la situacion del curso."

4. Abrir Tesoreria > Pagos.
   - Mostrar alumno asociado, total anual y progreso.
   - Mostrar datos bancarios y botones para copiar.
   - Mostrar cuotas y subida de comprobante.
   - Mensaje: "El apoderado puede elegir modalidad, transferir y subir comprobante sin escribirle todo manualmente al tesorero."

5. Abrir Tesoreria > Ingresos.
   - Mostrar resumen de ingresos por cuotas y otros ingresos.
   - Revisar pestanas `Todos`, `Cuotas` y `Otros ingresos`.
   - Mensaje: "La familia ve de donde vienen los fondos, pero no puede crear ni anular ingresos."

6. Abrir Tesoreria > Egresos.
   - Mostrar saldo, total recaudado y gastos.
   - Abrir el detalle de un egreso.
   - Mensaje: "La transparencia tambien cubre en que se gasto y que comprobantes existen."

7. Abrir Tesoreria > Resumen de stands.
   - Mostrar evento, stand, ganancia neta, ventas por medio de pago y por producto.
   - Mensaje: "Para eventos del curso, el apoderado puede consultar resultados sin modificar caja ni productos."

8. Abrir Perfil.
   - Mostrar datos de cuenta, alumno vinculado, parentesco, telefono, aportes y estado de cuota.
   - Mensaje: "El apoderado tiene un espacio personal y una lectura directa de su situacion familiar."

9. Cerrar sesion.
   - Mensaje final: "Este recorrido demuestra la experiencia de una familia: informacion clara, pagos trazables y transparencia financiera."

## Tomas recomendadas

- Captura 01: Login.
- Captura 02: Dashboard.
- Captura 03: Pagos con datos bancarios.
- Captura 04: Subida de comprobante.
- Captura 05: Ingresos.
- Captura 06: Detalle de egreso.
- Captura 07: Resumen de stand.
- Captura 08: Perfil familiar.

## Version automatizada

El archivo `frontend/demo/apoderado-demo.spec.ts` usa Playwright para generar capturas y video con datos de ejemplo. Esta variante es ideal para presentaciones porque no depende de la base de datos local ni de correos reales.
