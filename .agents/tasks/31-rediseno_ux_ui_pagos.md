# Rediseño UX/UI — Módulo de Pagos

## Objetivo

Rediseñar por completo la vista **Pagos** del proyecto `treasury-system` para que sea más compacta, clara, moderna y orientada a tareas.

El problema principal de la implementación actual es el exceso de **cards grandes y estáticas**. La pantalla termina siendo una sucesión de rectángulos con mucho espacio vacío, obliga a hacer scroll y hace que información secundaria tenga el mismo peso visual que las acciones importantes.

> **Restricción principal:** NO resolver el rediseño creando nuevas cards gigantes. La reducción de tamaño debe ser estructural, no simplemente cambiar colores o bordes.

---

## 1. Antes de modificar código

El agente debe primero inspeccionar la implementación real de la página de pagos y localizar:

- componente/página principal de Pagos;
- componentes hijos;
- estilos CSS/CSS Modules asociados;
- componentes compartidos `Button`, `Badge`, `Modal`, etc.;
- lógica de cuotas;
- historial de pagos;
- integración de Mercado Pago;
- transferencia bancaria;
- carga y visualización de comprobantes;
- comportamiento responsive existente.

No alterar lógica de negocio, endpoints, DTOs, estados de pago ni integración con Mercado Pago salvo que sea estrictamente necesario para la presentación.

Conservar todas las funcionalidades existentes.

---

# 2. Principio del nuevo diseño

La página debe responder rápidamente estas preguntas:

1. ¿Cuánto cuesta el plan?
2. ¿Cuánto está pagado?
3. ¿Tengo cuotas pendientes?
4. ¿Cuál vence primero?
5. ¿Cómo la pago?
6. ¿Dónde veo un pago/comprobante anterior?

Todo elemento que no ayude directamente a responderlas debe perder protagonismo visual.

La nueva jerarquía será:

**encabezado → resumen compacto → cuotas → detalle bajo demanda → métodos de pago secundarios.**

---

# 3. Layout general

En escritorio, utilizar un único contenedor principal centrado con ancho máximo aproximado de `1180–1280px`.

Evitar una colección de paneles independientes repartidos por toda la pantalla.

Estructura conceptual:

```text
Pagos                                      Año escolar [2026]
Gestiona tus cuotas y pagos

────────────────────────────────────────────────────────────
Cuota anual       Total plan       Pagado        Progreso
$70.000           $30              $30           100% █████
Alumno: Mercado Pago Hijo
────────────────────────────────────────────────────────────

Mis cuotas
[Todas 4] [Pendientes 1] [Pagadas 3]       Métodos de pago

Cuota personalizada   31 dic 2026   $10   Pagada      Ver comprobante
────────────────────────────────────────────────────────────
Cuota personalizada   31 dic 2026   $10   Pagada      Ver comprobante
────────────────────────────────────────────────────────────
Cuota personalizada   31 dic 2026   $10   Pagada      Ver comprobante
────────────────────────────────────────────────────────────
Cuota septiembre      30 sep 2026   $10   Pendiente   [Pagar]
────────────────────────────────────────────────────────────

Transferencia bancaria                     Ver datos →
```

Este esquema es una referencia de jerarquía, no debe copiarse literalmente si la arquitectura existente requiere otra implementación.

---

# 4. Encabezado

Actualmente el título queda separado de varias superficies grandes.

Crear un encabezado sencillo.

### Izquierda

- icono pequeño;
- título `Pagos`;
- subtítulo corto: `Gestiona las cuotas y pagos del alumno.`

### Derecha

Selector de año escolar.

No envolver el selector en otra card.

Altura objetivo del encabezado completo: aproximadamente `60–80px`.

---

# 5. Resumen financiero compacto

Eliminar la card amarilla gigante de **Cuota anual** y la card violeta gigante de progreso.

Reemplazarlas por una única zona de resumen horizontal.

Debe contener:

- Cuota anual 2026 — `$70.000`;
- alumno — `Mercado Pago Hijo`;
- total del plan — `$30`;
- pagado — `$30`;
- porcentaje — `100%`;
- barra de progreso fina.

### Importante

No crear una card individual para cada métrica.

Usar divisores verticales, espaciado y tipografía para establecer jerarquía.

Ejemplo:

```text
Cuota anual 2026      Alumno                Total plan     Pagado
$70.000               Mercado Pago Hijo     $30            $30
                                              ███████████ 100%
```

Puede existir **una sola superficie discreta** alrededor del resumen completo, con altura máxima aproximada de `110–140px` en escritorio.

No usar fondos amarillo/violeta saturados ocupando cientos de píxeles.

---

# 6. Mis cuotas será el centro de la pantalla

Esta es la sección funcional más importante.

Debe ocupar la mayor parte del área útil.

## Desktop

Cambiar las cards individuales de cada cuota por **filas compactas tipo lista/tabla**.

Columnas sugeridas:

```text
Concepto | Vencimiento | Monto | Estado | Acción
```

Ejemplo:

```text
Cuota personalizada   31 dic 2026   $10   ● Pagada      Ver comprobante
Cuota personalizada   31 dic 2026   $10   ● Pagada      Ver comprobante
Cuota septiembre      30 sep 2026   $10   ● Pendiente   Pagar
```

Altura objetivo por fila: `64–76px`.

No utilizar una card de 250–350px para representar una cuota.

### Estados

Usar color de forma semántica:

- verde: pagada;
- amarillo/naranja: pendiente/próxima a vencer;
- rojo: vencida;
- gris/azul tenue: otros estados neutrales.

El estado debe ser un badge pequeño o punto + texto.

No pintar toda la fila de verde/amarillo.

---

# 7. Filtros

Sobre la lista incorporar filtros compactos:

```text
[Todas 4]   [Pendientes 1]   [Pagadas 3]
```

Pueden implementarse como segmented control/chips.

No convertir cada filtro en una card.

El filtro activo puede utilizar el color primario del sistema.

---

# 8. Historial del pago bajo demanda

Actualmente el historial está permanentemente dentro de cada cuota, aumentando mucho la altura.

Eliminar ese comportamiento.

Una cuota pagada debe mostrar inicialmente únicamente:

```text
Cuota personalizada | 31 dic 2026 | $10 | Pagada | Ver comprobante / Detalle
```

El historial completo se muestra únicamente cuando el usuario lo solicita.

Opciones válidas:

- accordion debajo de la fila;
- drawer lateral;
- modal pequeño si el sistema ya posee un patrón apropiado.

Preferencia: **accordion inline** para información corta.

Ejemplo expandido:

```text
Cuota personalizada   31 dic 2026   $10   Pagada     Ocultar detalle

    Pagado con Mercado Pago
    08 sep 2026 · 16:55
    Pago #177965423432
    [Ver comprobante]
```

La expansión pertenece a esa fila y debe distinguirse con un fondo apenas diferente, no mediante otra card grande anidada.

---

# 9. Acción de pago

Para una cuota pendiente, `Pagar` debe ser la acción visual primaria.

Ejemplo:

```text
Cuota septiembre    30 sep 2026    $10    Pendiente    [Pagar $10]
```

Si el pago se realiza mediante Mercado Pago, puede indicarse en el botón o en el siguiente paso.

Evitar repetir un bloque explicativo grande de Mercado Pago antes de que el usuario necesite pagar.

La interfaz debe priorizar la acción, no explicar constantemente el proveedor.

---

# 10. Mercado Pago

Eliminar la card grande actual de `Mercado Pago — Disponible`.

La disponibilidad del método puede mostrarse de forma compacta:

```text
Métodos de pago     Mercado Pago ● Disponible     Transferencia bancaria →
```

O directamente dentro del flujo al pulsar `Pagar`.

La descripción extensa:

> Paga tu cuota anual con Mercado Pago...

no necesita ocupar permanentemente una gran superficie.

Si es necesaria, moverla a:

- tooltip;
- popover;
- pequeño bloque de ayuda;
- modal/drawer del proceso de pago.

---

# 11. Transferencia bancaria

Los datos bancarios no deben ocupar permanentemente una gran card lateral.

Mostrar inicialmente una acción compacta:

```text
Transferencia bancaria                           Ver datos →
```

Al hacer clic abrir un **drawer lateral**.

Contenido:

```text
Transferencia bancaria                         ×

Banco
XXXXXXXX

Tipo de cuenta
XXXXXXXX

N.º de cuenta
88998887                                  [copiar]

Correo
usuario@correo.com                         [copiar]

[Copiar todos los datos]
```

El drawer puede tener `360–420px` de ancho en escritorio.

En móvil debe ocupar prácticamente todo el viewport.

No alterar los datos reales provenientes del backend.

---

# 12. Comprobantes

Para pagos que poseen comprobante:

- mostrar `Ver comprobante` como acción secundaria;
- usar icono de ojo/documento si corresponde;
- conservar el comportamiento existente.

Para una cuota que permita subir comprobante manual:

- `Subir comprobante` debe estar dentro de acciones de la cuota;
- no necesita ocupar una fila adicional permanente;
- puede utilizar menú `⋯` cuando existan varias acciones secundarias.

Ejemplo:

```text
Pendiente   [Pagar]   ⋯
```

Menú:

```text
Subir comprobante
Ver instrucciones
```

---

# 13. Reducir bordes y contenedores

Actualmente existen demasiados elementos con:

- borde completo;
- border-radius;
- fondo propio;
- sombra;
- padding grande.

Esto provoca el efecto de “card dentro de card”.

Aplicar esta regla:

> Si el contenido puede separarse mediante espacio, tipografía o un divisor de 1px, no crear otra card.

Utilizar cards solamente para agrupaciones de primer nivel que realmente lo necesiten.

La lista de cuotas puede compartir **un solo contenedor exterior** y utilizar divisores entre filas.

---

# 14. Sistema de espaciado

Reducir el espacio vertical.

Valores orientativos:

```css
Secciones principales: 24px–32px
Padding contenedor: 20px–24px
Filas: 16px–20px horizontal
Gap entre icono/texto: 8px–12px
Badges: 6px 10px
Botones compactos: 36px–40px de alto
```

Evitar padding vertical de `40–60px` dentro de bloques informativos simples.

---

# 15. Tipografía y jerarquía

No depender de grandes superficies de color para indicar importancia.

Usar tipografía.

Jerarquía sugerida:

```text
Título página        28–32px / semibold-bold
Título sección       18–22px / semibold
Monto principal      28–34px / bold
Monto fila           15–17px / semibold
Texto normal         14–16px
Metadata             12–14px
Badge                 12–13px
```

Evitar utilizar demasiados textos en mayúsculas.

`HISTORIAL DEL PAGO` puede convertirse en `Historial del pago`.

---

# 16. Color

Mantener el dark theme existente.

No rediseñar la identidad completa de la aplicación.

Reducir la cantidad de colores dominantes simultáneos.

### Base

- fondo general oscuro existente;
- superficie secundaria ligeramente más clara;
- borde sutil;
- texto blanco/gris claro.

### Acento

Conservar turquesa/violeta de la aplicación como colores principales.

### Semánticos

- verde únicamente para éxito/pagado;
- amarillo/naranja para pendiente;
- rojo para vencido/error.

Eliminar el enorme bloque amarillo de cuota anual.

No usar un fondo verde completo solamente porque una cuota esté pagada.

---

# 17. Responsive

## Desktop (`>= 1024px`)

Usar filas horizontales.

Toda la información principal debe ser visible sin scroll horizontal.

## Tablet

Reducir columnas secundarias.

Puede combinarse concepto + vencimiento.

## Mobile

No intentar conservar una tabla rígida.

Transformar cada fila en un elemento compacto:

```text
Cuota septiembre                         $10
30 sep 2026
● Pendiente

[Pagar $10]
```

Estas mini superficies móviles pueden tener borde/fondo, pero deben seguir siendo compactas.

No crear cards de altura excesiva.

Los botones de acción principales deben ser fáciles de tocar (`>=44px`).

---

# 18. Estados vacíos

Implementar/ajustar estados compactos para:

- sin cuotas;
- sin cuotas pendientes;
- sin historial;
- sin comprobante;
- error al cargar;
- cargando.

Ejemplo:

```text
✓ No tienes cuotas pendientes
Todos tus pagos están al día.
```

No utilizar una card de gran altura para este mensaje.

---

# 19. Loading

Evitar un spinner gigante en el centro si la página puede conservar su estructura.

Preferir skeletons compactos que imiten:

- resumen;
- filtros;
- 3–4 filas de cuotas.

Evitar layout shift al terminar la carga.

---

# 20. Accesibilidad

Mantener o mejorar:

- contraste AA;
- focus visible;
- navegación por teclado;
- `aria-label` para botones sólo-icono;
- estados que no dependan exclusivamente del color;
- botones reales para acciones;
- tooltips para iconos ambiguos.

El punto verde debe acompañarse de `Pagada`, no utilizarse solo.

---

# 21. Animaciones

Utilizar animaciones discretas.

Permitido:

- hover `150–200ms`;
- apertura de accordion `180–250ms`;
- drawer con transición suave;
- cambio de filtros.

Evitar:

- cards flotando;
- escalados exagerados;
- glow permanente;
- animaciones decorativas continuas;
- movimientos que cambien el layout.

---

# 22. Qué NO hacer

Estas restricciones son obligatorias:

1. **NO crear cards gigantes para sustituir las cards gigantes actuales.**
2. NO hacer una card por cada métrica.
3. NO hacer una card de Mercado Pago de media pantalla.
4. NO dejar los datos bancarios siempre desplegados.
5. NO mostrar permanentemente todo el historial de cada cuota.
6. NO crear una card de 200–300px por cada cuota.
7. NO abusar de gradientes, glow o glassmorphism.
8. NO introducir colores nuevos sin necesidad.
9. NO cambiar la lógica funcional sólo para conseguir el rediseño.
10. NO duplicar componentes existentes si pueden reutilizarse correctamente.
11. NO solucionar el responsive únicamente reduciendo `font-size`.
12. NO ocultar información funcional necesaria.
13. NO modificar la sidebar global salvo ajustes imprescindibles para esta página.

---

# 23. Arquitectura visual deseada

El resultado debe sentirse más cercano a una **pantalla financiera/bancaria compacta** que a un dashboard formado por widgets.

Priorizar:

- densidad moderada;
- escaneo rápido;
- filas;
- divisores;
- estados pequeños;
- acciones claras;
- información secundaria bajo demanda.

La sensación buscada es:

**menos cajas, más estructura.**

---

# 24. Orden recomendado de implementación

1. Auditar los componentes actuales de Pagos.
2. Identificar qué lógica debe conservarse intacta.
3. Crear el nuevo layout principal.
4. Compactar el resumen financiero.
5. Convertir cuotas de cards a lista/filas.
6. Implementar filtros Todas/Pendientes/Pagadas.
7. Mover historial a accordion/detalle bajo demanda.
8. Compactar Mercado Pago.
9. Mover transferencia bancaria a drawer.
10. Ajustar comprobantes y menú de acciones.
11. Implementar responsive.
12. Revisar accesibilidad.
13. Eliminar CSS viejo que haya quedado sin uso.
14. Ejecutar lint/tests/build disponibles.

---

# 25. Criterios de aceptación

El trabajo se considera terminado solamente si:

- la pantalla muestra claramente más información útil por viewport que antes;
- las cuotas ya no son cards grandes individuales en desktop;
- el historial no aparece desplegado por defecto;
- transferencia bancaria no ocupa permanentemente un gran panel;
- Mercado Pago no necesita una card explicativa gigante;
- el resumen financiero ocupa como máximo una fracción pequeña del primer viewport;
- `Mis cuotas` aparece rápidamente y tiene protagonismo;
- pagar una cuota pendiente requiere una acción evidente;
- los pagos realizados siguen permitiendo acceder al comprobante;
- no se rompe ninguna integración existente;
- desktop, tablet y móvil funcionan correctamente;
- no hay overflow horizontal accidental;
- no quedan estilos antiguos sin uso relacionados con las cards reemplazadas;
- el build y las pruebas existentes finalizan correctamente.

---

# 26. Instrucción final para el agente

**No hagas un simple restyling de la página actual. Replantea su composición.**

El objetivo no es tomar cada card actual y hacerla un poco más bonita. El objetivo es reducir drásticamente la cantidad y el tamaño de superficies independientes.

Antes de escribir código, identifica qué información es primaria, secundaria y bajo demanda. Después implementa una interfaz compacta basada principalmente en **resumen horizontal + lista de cuotas + detalles expandibles + drawer para información bancaria**.

Respeta la identidad visual actual del proyecto y reutiliza sus componentes cuando tenga sentido, pero no permitas que componentes existentes obliguen a mantener una UX deficiente.

Al finalizar, entrega un resumen indicando:

- archivos modificados;
- componentes creados/eliminados;
- CSS eliminado;
- comportamiento responsive implementado;
- funcionalidades existentes preservadas;
- tests/build ejecutados y resultado.
