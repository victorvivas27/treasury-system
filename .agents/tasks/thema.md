# Implementación de tema oscuro y tema claro

## Objetivo

Agregar en la pestaña **Configuración** una opción para cambiar toda la aplicación entre:

* Tema oscuro.
* Tema claro.

Actualmente la aplicación utiliza principalmente una versión oscura.

La nueva versión clara debe ser suave y discreta. No debe utilizar blanco puro en toda la interfaz ni producir un cambio visual demasiado fuerte.

El objetivo es crear un tema claro elegante, cómodo para la vista y coherente con el diseño actual.

---

# Ubicación de la configuración

Dentro de la pestaña:

```text
Configuración
```

Agregar una sección llamada:

```text
Apariencia
```

Dentro de esa sección mostrar una opción:

```text
Tema de la aplicación
```

Opciones disponibles:

```text
Oscuro
Claro
Usar configuración del sistema
```

La opción “Usar configuración del sistema” debe detectar la preferencia del navegador o sistema operativo mediante:

```css
prefers-color-scheme
```

---

# Selector visual

Utilizar un selector moderno y fácil de entender.

Puede implementarse mediante:

* Botones segmentados.
* Cards seleccionables.
* Radio buttons personalizados.
* Toggle con opciones.
* Menú desplegable, solamente si combina mejor con el diseño existente.

Opción recomendada:

```text
[ Oscuro ] [ Claro ] [ Sistema ]
```

Cada opción puede incluir un icono:

```text
Oscuro: luna
Claro: sol
Sistema: monitor
```

La opción activa debe distinguirse claramente mediante:

* Borde.
* Fondo.
* Icono.
* Texto.
* Indicador de selección.

No utilizar solamente el color para indicar cuál está seleccionada.

---

# Comportamiento

Al seleccionar un tema:

1. Aplicar el cambio inmediatamente.
2. No recargar la página.
3. Guardar la selección del usuario.
4. Mantener el tema después de cerrar y abrir la aplicación.
5. Aplicar el tema antes de renderizar la interfaz para evitar parpadeos.
6. Actualizar todos los componentes existentes.

El cambio debe afectar toda la aplicación, incluyendo:

* Menú lateral.
* Barra superior.
* Dashboard.
* Cards.
* Formularios.
* Tablas.
* Modales.
* Drawers.
* Botones.
* Inputs.
* Selectores.
* Calendarios.
* Tooltips.
* Toasts.
* Menús contextuales.
* Paginación.
* Gráficos.
* Pantallas de autenticación.
* Módulo de Tesorería.
* Cuotas.
* CEPA.
* Cuota Solidaria.
* Ingresos.
* Egresos.
* Reportes.
* Configuración.

No deben quedar componentes con colores fijos incompatibles con alguno de los temas.

---

# Persistencia

Guardar la preferencia mediante el mecanismo que ya utilice el proyecto.

Orden recomendado:

1. Preferencia guardada en el perfil del usuario, si existe soporte en backend.
2. `localStorage` como respaldo o primera implementación.
3. Preferencia del sistema si el usuario selecciona “Sistema”.

Clave sugerida:

```text
app-theme
```

Valores posibles:

```text
dark
light
system
```

Ejemplo:

```ts
localStorage.setItem("app-theme", "light");
```

Al iniciar la aplicación:

1. Leer la preferencia guardada.
2. Si es `dark`, aplicar el tema oscuro.
3. Si es `light`, aplicar el tema claro.
4. Si es `system`, detectar la configuración del sistema.
5. Si no existe preferencia, conservar el tema oscuro actual como valor predeterminado.

---

# Tema predeterminado

La aplicación debe continuar utilizando el tema oscuro como opción predeterminada para usuarios que todavía no hayan seleccionado una preferencia.

```text
Tema predeterminado: Oscuro
```

Esto evita modificar repentinamente la experiencia de los usuarios actuales.

---

# Requerimiento principal del tema claro

El tema claro debe ser **apenas claro**.

No utilizar como fondo principal:

```css
#ffffff
```

No diseñar toda la interfaz con blanco puro.

El tema debe utilizar:

* Gris muy claro.
* Tonos neutros suaves.
* Fondos ligeramente cálidos o azulados.
* Cards apenas más claras que el fondo principal.
* Bordes suaves.
* Sombras muy discretas.
* Texto oscuro sin llegar a negro absoluto.

El resultado debe verse claro, pero no brillante ni agresivo.

---

# Paleta conceptual para el tema claro

Usar estos valores solamente como referencia inicial. Adaptarlos a la identidad visual existente.

## Fondo principal

```css
--background: #f1f3f5;
```

Alternativas aceptables:

```css
#f3f4f6
#eef1f4
#f2f2f0
```

No utilizar blanco puro como fondo general.

---

## Fondo del menú lateral

```css
--sidebar-background: #e7eaee;
```

Debe diferenciarse levemente del contenido principal.

---

## Fondo de cards

```css
--card-background: #f8f9fa;
```

Las cards pueden ser ligeramente más claras que el fondo principal, pero sin generar un contraste excesivo.

---

## Fondo de inputs

```css
--input-background: #f5f6f7;
```

---

## Fondo elevado

Para modales, menús y drawers:

```css
--elevated-background: #fafafa;
```

No abusar del blanco puro.

---

## Texto principal

```css
--text-primary: #25282c;
```

No utilizar negro absoluto:

```css
#000000
```

---

## Texto secundario

```css
--text-secondary: #62676d;
```

---

## Bordes

```css
--border-color: #d5d9de;
```

Los bordes deben ser visibles, pero suaves.

---

## Hover

```css
--hover-background: #e8ebef;
```

---

## Elementos seleccionados

Conservar el color principal de la aplicación.

Ejemplo conceptual:

```css
--primary: var(--existing-primary-color);
--primary-soft: color-mix(
  in srgb,
  var(--existing-primary-color) 12%,
  transparent
);
```

No inventar un nuevo color principal si la aplicación ya cuenta con uno.

---

# Tema oscuro

Mantener el tema oscuro actual como base.

Antes de modificarlo:

* Revisar los colores existentes.
* Extraerlos a variables o tokens.
* Evitar alterar innecesariamente su apariencia.
* Corregir únicamente valores que estén escritos directamente en componentes.

La implementación del tema claro no debe degradar ni cambiar sustancialmente el tema oscuro actual.

---

# Variables de diseño

Centralizar todos los colores mediante variables CSS, tokens del sistema de diseño o la solución de temas existente.

Ejemplo conceptual:

```css
:root {
  --background: #f1f3f5;
  --foreground: #25282c;
  --card: #f8f9fa;
  --card-foreground: #25282c;
  --muted: #e8ebef;
  --muted-foreground: #62676d;
  --border: #d5d9de;
  --input: #f5f6f7;
}
```

Tema oscuro:

```css
.dark {
  --background: /* valor oscuro existente */;
  --foreground: /* valor actual */;
  --card: /* valor actual */;
  --card-foreground: /* valor actual */;
  --muted: /* valor actual */;
  --muted-foreground: /* valor actual */;
  --border: /* valor actual */;
  --input: /* valor actual */;
}
```

Adaptar los nombres a la arquitectura actual.

No duplicar paletas dentro de cada componente.

---

# Aplicación del tema

Opción recomendada:

Aplicar una clase en el elemento raíz del documento.

Ejemplo:

```html
<html class="dark">
```

o:

```html
<html class="light">
```

También puede utilizarse:

```html
<html data-theme="dark">
```

Seleccionar una sola estrategia y aplicarla consistentemente.

No mezclar clases, atributos y estilos inline sin necesidad.

---

# Inicialización sin parpadeo

Evitar que al cargar la aplicación aparezca primero un tema y luego cambie al otro.

La preferencia debe aplicarse antes de renderizar la aplicación.

Ejemplo conceptual:

```ts
const savedTheme = localStorage.getItem("app-theme");

const systemPrefersDark = window.matchMedia(
  "(prefers-color-scheme: dark)",
).matches;

const resolvedTheme =
  savedTheme === "system" || !savedTheme
    ? systemPrefersDark
      ? "dark"
      : "light"
    : savedTheme;

document.documentElement.classList.toggle(
  "dark",
  resolvedTheme === "dark",
);
```

Adaptar esta lógica a la estructura existente.

Si el valor predeterminado definido para la aplicación es oscuro, no sustituirlo automáticamente por el tema del sistema cuando todavía no exista una preferencia, salvo que se decida expresamente lo contrario.

---

# Estado global

Crear o reutilizar una solución central para manejar el tema.

Opciones posibles:

* Context de React.
* Hook global.
* Store existente.
* Proveedor de tema ya instalado.
* Solución incluida por la librería UI utilizada.

Ejemplo conceptual:

```ts
type ThemePreference = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";
```

El estado debe exponer:

```ts
themePreference
resolvedTheme
setThemePreference
```

No manejar el tema independientemente en distintos componentes.

---

# Reacción a cambios del sistema

Cuando el usuario tenga seleccionado:

```text
Sistema
```

la aplicación debe reaccionar si el sistema operativo cambia entre modo oscuro y claro.

Utilizar:

```ts
window.matchMedia("(prefers-color-scheme: dark)");
```

Agregar y remover correctamente el listener para evitar fugas de memoria.

Este comportamiento solo debe aplicarse cuando la preferencia sea `system`.

---

# Cards

En tema claro, las cards deben tener:

* Fondo claro suave.
* Borde tenue.
* Sombra ligera.
* Texto oscuro.
* Buena separación respecto al fondo.
* Hover discreto.

Ejemplo conceptual:

```css
.card {
  background: var(--card-background);
  border: 1px solid var(--border-color);
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.06);
}
```

No utilizar sombras oscuras fuertes.

---

# Menú lateral

El sidebar debe conservar su jerarquía visual.

En tema claro:

* Fondo ligeramente más oscuro que el contenido.
* Texto con buen contraste.
* Elemento seleccionado claramente visible.
* Hover suave.
* Iconos legibles.
* Bordes discretos.

No dejar el sidebar completamente blanco si el área principal también es blanca.

---

# Formularios

Inputs, selects y áreas de texto deben adaptarse a ambos temas.

En tema claro:

* Fondo ligeramente distinto al fondo de la card.
* Borde visible.
* Texto oscuro.
* Placeholder con contraste suficiente.
* Estado de foco visible.
* Estado deshabilitado distinguible.
* Mensajes de error legibles.

No utilizar fondos blancos con bordes casi invisibles.

---

# Tablas

En tema claro:

* Cabecera diferenciada suavemente.
* Filas con separación clara.
* Hover discreto.
* Bordes suaves.
* Texto secundario legible.
* Estados positivos y negativos accesibles.

Evitar alternar blanco puro y gris demasiado contrastante.

---

# Modales y drawers

En tema claro:

* Fondo elevado suave.
* Overlay adecuado.
* Bordes visibles.
* Sombra moderada.
* Botones y formularios correctamente adaptados.

El overlay debe funcionar en ambos temas.

Ejemplo conceptual:

```css
background: rgb(0 0 0 / 0.35);
```

Adaptar el nivel de opacidad según el diseño actual.

---

# Colores semánticos

Mantener colores semánticos para:

* Éxito.
* Error.
* Advertencia.
* Información.
* Ingreso.
* Egreso.
* Pago pendiente.
* Pago realizado.

Crear versiones suaves para los fondos.

Ejemplo conceptual:

```text
Verde fuerte: texto o icono.
Verde suave: fondo del estado positivo.

Rojo fuerte: texto o icono.
Rojo suave: fondo de alerta.

Naranja fuerte: texto o icono.
Naranja suave: fondo de advertencia.
```

Los estados no deben depender únicamente del color.

Agregar siempre:

* Texto.
* Icono.
* Etiqueta.
* Badge.

---

# Gráficos

Revisar todos los gráficos del dashboard.

Deben adaptar:

* Fondo.
* Texto.
* Leyendas.
* Líneas de cuadrícula.
* Tooltips.
* Ejes.
* Colores de series.

No dejar texto blanco sobre el tema claro.

No utilizar líneas negras demasiado fuertes.

---

# Logos e imágenes

Revisar:

* Logo.
* Iconos.
* Ilustraciones.
* Imágenes con fondo transparente.
* Favicons, si corresponde.

Si el logo solamente funciona sobre fondo oscuro, agregar una variante para fondo claro o colocarlo sobre una superficie apropiada.

No modificar el archivo original innecesariamente.

---

# Transición entre temas

Agregar una transición breve y discreta.

Ejemplo:

```css
transition:
  background-color 150ms ease,
  color 150ms ease,
  border-color 150ms ease;
```

No agregar transiciones largas.

No aplicar `transition: all` globalmente porque puede afectar rendimiento y producir animaciones no deseadas.

Respetar:

```css
prefers-reduced-motion
```

---

# Accesibilidad

Ambos temas deben cumplir con contraste adecuado.

Revisar especialmente:

* Texto secundario.
* Placeholders.
* Botones deshabilitados.
* Bordes de inputs.
* Badges.
* Estados positivos.
* Estados negativos.
* Links.
* Foco del teclado.
* Tooltips.

El tema claro no debe ser tan tenue que reduzca la legibilidad.

El foco debe permanecer claramente visible en ambos temas.

---

# Pantalla de Configuración

Agregar una card similar a:

```text
Apariencia

Tema de la aplicación

Elige cómo deseas visualizar la plataforma.

[ 🌙 Oscuro ] [ ☀ Claro ] [ 💻 Sistema ]
```

Debajo puede mostrarse una descripción dinámica:

Tema oscuro:

```text
Utiliza colores oscuros y reduce el brillo general de la interfaz.
```

Tema claro:

```text
Utiliza una apariencia clara y suave, evitando fondos blancos intensos.
```

Sistema:

```text
Adapta la aplicación a la configuración de tu dispositivo.
```

---

# Vista previa

Dentro de Configuración se puede agregar una vista previa pequeña.

Ejemplo:

```text
┌───────────────────────────┐
│ Menú      Vista previa    │
│           ┌─────────────┐ │
│           │ Card        │ │
│           │ Texto       │ │
│           └─────────────┘ │
└───────────────────────────┘
```

La vista previa es opcional.

No debe retrasar la implementación principal.

---

# Reglas técnicas

1. No escribir colores directamente en nuevos componentes.
2. Reemplazar colores fijos existentes por variables cuando afecten el cambio de tema.
3. Mantener el tema oscuro actual.
4. Crear un tema claro suave.
5. No utilizar blanco puro como fondo principal.
6. No utilizar negro puro para textos generales.
7. Persistir la preferencia.
8. Aplicar el tema antes del render inicial.
9. Evitar parpadeos.
10. No recargar la página al cambiar el tema.
11. Reutilizar la arquitectura y componentes existentes.
12. Mantener accesibilidad.
13. Mantener diseño responsive.
14. No duplicar lógica de tema.
15. No afectar los cálculos ni reglas de negocio de la aplicación.

---

# Pruebas requeridas

Agregar pruebas para:

* Cambio de oscuro a claro.
* Cambio de claro a oscuro.
* Selección de tema del sistema.
* Persistencia después de recargar.
* Preferencia inexistente.
* Valor inválido en `localStorage`.
* Cambio de configuración del sistema.
* Aplicación del tema en login.
* Aplicación del tema en dashboard.
* Aplicación del tema en Tesorería.
* Aplicación del tema en formularios.
* Aplicación del tema en modales.
* Aplicación del tema en cards.
* Aplicación del tema en tablas.
* Legibilidad de mensajes de error.
* Legibilidad de estados positivos y negativos.
* Navegación por teclado.
* Diseño responsive.
* Ausencia de errores de TypeScript.
* Ausencia de parpadeo visible al iniciar.

---

# Revisión visual obligatoria

Revisar manualmente en tema oscuro y claro:

```text
Login
Registro
Recuperación de contraseña
Dashboard
Menú lateral
Usuarios
Familias
Apoderados
Alumnos
Cursos
Cuota anual
Cuota CEPA
Cuota Solidaria
Ingresos
Egresos
Reportes
Configuración
Modales
Formularios
Tablas
Cards
Notificaciones
```

Corregir cualquier componente que:

* Mantenga fondo oscuro en tema claro.
* Mantenga texto blanco en tema claro.
* Pierda contraste.
* Utilice colores fijos.
* Se vea excesivamente blanco.
* Se vea demasiado brillante.
* No respete el diseño general.

---

# Resultado esperado

Al finalizar, la aplicación debe permitir:

1. Cambiar entre tema oscuro y claro desde Configuración.
2. Utilizar automáticamente el tema del sistema.
3. Mantener la preferencia guardada.
4. Cambiar sin recargar la página.
5. Aplicar el tema en toda la aplicación.
6. Conservar el diseño oscuro actual.
7. Mostrar una versión clara suave y elegante.
8. Evitar fondos blancos intensos.
9. Mantener contraste y accesibilidad.
10. Evitar parpadeos durante la carga.
11. Funcionar en escritorio y dispositivos móviles.
12. No romper ninguna funcionalidad existente.

---

# Instrucción final para el agente

Antes de implementar:

* Revisar qué sistema de estilos utiliza actualmente el proyecto.
* Revisar si existe un proveedor de tema.
* Revisar las variables CSS actuales.
* Revisar si se utiliza Tailwind, CSS Modules, Styled Components, Material UI, Shadcn u otra librería.
* Reutilizar la solución existente cuando sea posible.
* No instalar una dependencia nueva si el proyecto ya puede manejar temas.

Al terminar:

* Informar los archivos modificados.
* Explicar dónde se guarda la preferencia.
* Explicar cómo se resuelve el tema `system`.
* Confirmar que el tema oscuro mantiene su apariencia.
* Confirmar que el tema claro no utiliza blanco puro como fondo principal.
* Confirmar que todas las pantallas fueron revisadas.
* Ejecutar el linter.
* Ejecutar las pruebas.
* Ejecutar la compilación.
* Corregir todos los errores de TypeScript.
