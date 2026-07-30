Crea un módulo nuevo llamado “Gestión de Stand”, relacionado con el módulo existente de creación de eventos.

No modifiques módulos ni funcionalidades actuales. Este módulo debe funcionar como una sección independiente, pero cada stand debe estar asociado a un evento existente.

## Objetivo

Permitir configurar y administrar las ventas realizadas en un stand durante un evento.

El módulo debe ser completamente genérico y funcionar para cualquier producto: pizzas, café, juguetes, bebidas, rifas u otros.

## Flujo

1. Seleccionar un evento existente.
2. Crear y configurar el stand para ese evento.
3. Cargar los productos que estarán disponibles.
4. Definir variantes, categorías, precios y stock cuando corresponda.
5. Abrir la jornada de venta.
6. Registrar cada compra en tiempo real.
7. Consultar el resumen financiero y cerrar la jornada.

## Configuración del stand

Guardar:

- Evento asociado.
- Nombre del stand.
- Fecha y horario.
- Responsable.
- Fondo inicial.
- Estado: preparación, abierto o cerrado.
- Métodos de pago disponibles.
- Comisiones de débito y crédito.

## Productos

Permitir crear productos específicos para cada stand:

- Nombre.
- Categoría opcional.
- Variante opcional.
- Precio.
- Stock inicial opcional.
- Estado disponible o agotado.

Ejemplos:

- Pizza → Pepperoni → Entera, mitad o porción.
- Café → Chico, mediano o grande.
- Juguete → Auto, muñeca u otra categoría.

No crear campos específicos como “tipo de pizza” o “tamaño de pizza”. Utilizar nombres genéricos y configurables.

## Formulario de venta

Crear una pantalla rápida para registrar ventas a medida que compran los clientes.

Debe incluir:

- Producto.
- Variante, si corresponde.
- Cantidad.
- Precio unitario automático.
- Total automático.
- Método de pago.
- Monto recibido, solo para efectivo.
- Vuelto automático.
- Observación opcional.

Al guardar:

- Registrar fecha y hora.
- Descontar stock si está habilitado.
- Actualizar la tabla de ventas y los totales sin recargar.
- Limpiar el formulario para ingresar la siguiente venta.
- Mostrar una confirmación breve.

Debe permitir agregar varios productos dentro de una misma compra cuando sea necesario.

## Resumen del stand

Calcular automáticamente:

- Total vendido.
- Ventas por método de pago.
- Efectivo esperado en caja.
- Fondo inicial.
- Comisiones.
- Ganancia neta.
- Cantidad de ventas.
- Unidades vendidas.
- Ventas por producto, categoría y variante.
- Productos con poco stock o agotados.

## Requisitos

- Crear frontend, backend, entidades, servicios, endpoints y permisos necesarios siguiendo la arquitectura actual.
- Mantener el diseño y componentes existentes.
- Optimizar el formulario para celular, tablet y escritorio.
- No utilizar datos simulados ni valores hardcodeados.
- No limitar el módulo a un tipo de producto.
- Al cerrar el stand, impedir nuevas ventas salvo que un usuario autorizado vuelva a abrirlo.
