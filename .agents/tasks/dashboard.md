Trabaja sobre la página `/dashboard` que ya existe en el proyecto.

La aplicación ya está aproximadamente un 60 % desarrollada y cuenta con un diseño visual definido. No debes crear una página nueva desde cero ni cambiar el estilo general de la aplicación.

## Objetivo

Completar y mejorar el dashboard existente utilizando los datos reales de la aplicación, respetando completamente:

* La estructura actual del proyecto.
* El diseño visual existente.
* Los colores, tipografías y espaciados actuales.
* Los componentes reutilizables.
* El layout general.
* La navegación existente.
* El modo claro u oscuro, si existe.
* La arquitectura actual del frontend y backend.

## Antes de modificar

Primero revisa:

1. La implementación actual de `/dashboard`.
2. Los componentes ya utilizados en otras páginas.
3. El sistema de estilos del proyecto.
4. Las entidades y modelos del backend.
5. Los endpoints existentes.
6. Los servicios del frontend.
7. El sistema de autenticación y permisos.
8. Los datos reales disponibles para estadísticas.

No inventes información, estados, categorías ni métricas que no existan en la aplicación.

## Diseño

El dashboard debe verse como una parte natural de la aplicación.

No introduzcas un diseño genérico o diferente.

Debes reutilizar:

* Cards existentes.
* Botones existentes.
* Inputs y selects existentes.
* Tablas existentes.
* Componentes de loading.
* Componentes de error.
* Iconos ya utilizados.
* Variables CSS, tema o design system actual.
* Componentes de layout actuales.

Si ya existen gráficos, reutiliza la misma librería y configuración.

Si no existe una librería de gráficos, instala una opción compatible con React y Vite, preferentemente Recharts.

## Dashboard

Analiza los datos de la aplicación y agrega únicamente los gráficos e indicadores que tengan sentido para el negocio.

El dashboard puede incluir:

### Indicadores principales

Agregar tarjetas con métricas reales, por ejemplo:

* Total de registros.
* Registros activos.
* Registros pendientes.
* Registros completados.
* Registros creados hoy.
* Registros creados este mes.

Los nombres deben adaptarse a las entidades reales del proyecto.

### Evolución en el tiempo

Agregar un gráfico de líneas o áreas con la evolución de la entidad principal.

Debe utilizar fechas reales de creación, actualización, finalización o la fecha más relevante disponible.

Agregar filtros de período solo si son compatibles con los datos existentes:

* 7 días.
* 30 días.
* 3 meses.
* 12 meses.

### Distribución por estado

Agregar un gráfico de barras, dona o pie que muestre la distribución según los estados reales de la aplicación.

No crear estados nuevos.

### Distribución por categoría

Si los datos tienen categorías, tipos, áreas, departamentos, productos, servicios u otra clasificación, mostrar un gráfico con las categorías principales.

Ordenar de mayor a menor.

### Actividad reciente

Mostrar una tabla o lista con los últimos movimientos o registros.

Reutilizar el componente de tabla o lista existente en la aplicación.

Debe incluir un enlace o acción para abrir el detalle, utilizando las rutas actuales del proyecto.

## Backend

Revisa primero si el backend ya tiene endpoints que permitan obtener estos datos.

Reutiliza los endpoints existentes cuando sea posible.

Solo si faltan estadísticas necesarias, crea endpoints específicos en Spring Boot, siguiendo la arquitectura actual del proyecto.

Ejemplo de ruta:

```text
/api/dashboard
```

El endpoint puede devolver toda la información necesaria en una sola respuesta para evitar múltiples peticiones innecesarias.

Ejemplo de estructura:

```json
{
  "summary": {},
  "trend": [],
  "byStatus": [],
  "byCategory": [],
  "recentActivity": []
}
```

Adapta los nombres y propiedades a las entidades reales del proyecto.

## Calidad

La implementación debe incluir:

* Loading o skeleton.
* Manejo de errores.
* Estado vacío.
* Diseño responsive.
* Tooltips en los gráficos.
* Formato correcto de fechas y números.
* Código reutilizable.
* Tipado correcto si el proyecto utiliza TypeScript.
* Sin datos mock en la versión final.
* Sin romper funcionalidades existentes.

## Restricciones

* No crear otra ruta `/dashboard`.
* No reemplazar completamente la página actual.
* No modificar el diseño general de la aplicación.
* No duplicar componentes existentes.
* No cambiar la arquitectura sin necesidad.
* No eliminar código funcional.
* No usar datos inventados.
* No dejar datos hardcodeados.
* No modificar otras páginas salvo que sea estrictamente necesario para integrar el dashboard.

## Resultado esperado

Completa el `/dashboard` existente, siguiendo exactamente el diseño actual de la aplicación y mostrando gráficos, indicadores y actividad reciente basados en los datos reales disponibles.

Al finalizar, indica:

1. Qué archivos modificaste.
2. Qué componentes reutilizaste.
3. Qué métricas agregaste.
4. Qué endpoints utilizaste o creaste.
5. Qué decisiones tomaste según los datos encontrados.
