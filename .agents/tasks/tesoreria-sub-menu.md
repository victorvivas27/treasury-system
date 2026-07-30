# Tarea: Crear el nuevo módulo "Tesorería"

## Objetivo

Crear un nuevo módulo llamado **Tesorería** dentro del menú principal de la aplicación.

Por el momento, esta tarea solo contempla la estructura de navegación y la organización del módulo. No se deben implementar aún las funcionalidades internas de cada sección.

---

# Menú

Agregar una nueva opción en el menú lateral:

```text
💰 Tesorería
```

Al expandirla, debe mostrar el siguiente submenú:

```text
💰 Tesorería
   ├── Resumen
   ├── Cuotas
   ├── Pagos
   ├── Ingresos
   ├── Gastos
   ├── Eventos
   └── Reportes
```

---

# Requisitos

* Integrar el nuevo módulo respetando la arquitectura actual del proyecto.
* Mantener el mismo estilo visual del resto del menú.
* Utilizar los mismos componentes de navegación existentes.
* No duplicar código.
* Mantener el comportamiento responsive del menú.
* Respetar permisos o sistema de autorización existente, si corresponde.

---

# Rutas

Crear las rutas necesarias para cada sección.

Ejemplo:

```text
/tesoreria
/tesoreria/resumen
/tesoreria/cuotas
/tesoreria/pagos
/tesoreria/ingresos
/tesoreria/gastos
/tesoreria/eventos
/tesoreria/reportes
```

Adaptar el formato de rutas al estándar utilizado actualmente por el proyecto.

---

# Páginas

Crear la estructura base de cada página.

Cada vista debe incluir:

* Título de la sección.
* Breadcrumb (si el proyecto utiliza uno).
* Contenedor principal.
* Espacio preparado para futuras funcionalidades.

Por ahora pueden mostrarse como una página base indicando el nombre de la sección.

---

# Organización

Mantener una estructura modular similar a:

```text
src/
└── modules/
     └── tesoreria/
          ├── resumen/
          ├── cuotas/
          ├── pagos/
          ├── ingresos/
          ├── gastos/
          ├── eventos/
          ├── reportes/
          ├── routes/
          └── components/
```

Adaptar la ubicación a la arquitectura actual del proyecto.

---

# No implementar todavía

En esta tarea **no** se deben desarrollar:

* Gestión de cuotas.
* Registro de pagos.
* Ingresos.
* Gastos.
* Eventos.
* Reportes.
* Base de datos.
* API.
* Formularios de negocio.

Solo debe quedar preparada la estructura del módulo y la navegación.

---

# Resultado esperado

Al finalizar:

* Existe un nuevo menú **Tesorería**.
* El submenú muestra las siete opciones definidas.
* Todas las rutas funcionan correctamente.
* Cada opción abre su página correspondiente.
* La navegación mantiene el mismo comportamiento que el resto de la aplicación.
* No se rompe ninguna funcionalidad existente.
* La estructura queda lista para comenzar el desarrollo de cada módulo de Tesorería.
