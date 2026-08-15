# Implementar Skeleton Loaders para datos dinámicos

Quiero mejorar la experiencia de carga de la aplicación de Tesorería.

Actualmente algunas pantallas mezclan:

* títulos;
* botones;
* filtros;
* labels;
* estructura visual fija;
* datos dinámicos obtenidos desde el backend / base de datos.

La implementación NO debe mostrar un loader general que bloquee toda la pantalla.

## Objetivo

Mantener siempre visible la estructura fija de la interfaz y utilizar **Skeleton Loaders solamente en los elementos cuyo contenido depende de una llamada al backend**.

La pantalla debe sentirse estable mientras cargan los datos.

---

## 1. Elementos que deben permanecer visibles

Estos elementos NO deben desaparecer ni convertirse en skeleton:

* títulos de páginas;
* subtítulos;
* botones de acción;
* botón "Agregar";
* botón "Nuevo";
* botones de navegación;
* filtros;
* inputs;
* selectores;
* tabs;
* breadcrumbs;
* iconos estáticos;
* encabezados de cards;
* encabezados de tablas;
* labels;
* estructura general de la página.

Ejemplo:

Si tengo una card:

```text
Saldo disponible

$1.250.000

Ver movimientos
```

el texto:

```text
Saldo disponible
```

y el botón:

```text
Ver movimientos
```

deben mostrarse inmediatamente.

Solamente:

```text
$1.250.000
```

debe mostrarse como skeleton mientras se carga desde la API.

---

## 2. Datos dinámicos

Utilizar skeleton para cualquier contenido que dependa de una llamada HTTP.

Ejemplos:

* saldo;
* ingresos;
* egresos;
* totales;
* cantidad de movimientos;
* estadísticas;
* nombres obtenidos desde backend;
* resultados de tablas;
* gráficos;
* listas;
* indicadores;
* fechas obtenidas desde API;
* datos de cuentas;
* datos de movimientos.

Ejemplo:

```jsx
<h3>Saldo actual</h3>

{isLoading ? (
  <Skeleton width={140} height={32} />
) : (
  <span>{formatCurrency(balance)}</span>
)}
```

---

## 3. No reemplazar componentes completos

Evitar patrones como:

```jsx
if (isLoading) {
  return <Spinner />;
}
```

o:

```jsx
if (isLoading) {
  return <PageSkeleton />;
}
```

cuando la pantalla ya tiene una estructura conocida.

Esto provoca que toda la interfaz desaparezca y luego vuelva a aparecer.

En su lugar:

```jsx
return (
  <Page>
    <Header />

    <Button>Nuevo movimiento</Button>

    <Card>
      <CardTitle>Saldo</CardTitle>

      {isLoading ? (
        <Skeleton />
      ) : (
        <Balance />
      )}
    </Card>
  </Page>
);
```

---

## 4. Tablas

En las tablas mantener siempre visible:

* título;
* filtros;
* botones;
* encabezados de columnas;
* paginación si corresponde.

Mientras cargan los registros, mostrar filas skeleton.

Ejemplo visual:

```text
Movimientos                         + Nuevo movimiento

Fecha       Descripción       Monto       Estado
-------------------------------------------------
████████    ███████████       █████       █████
████████    ███████████       █████       █████
████████    ███████████       █████       █████
████████    ███████████       █████       █████
```

Cuando llegan los datos:

```text
Fecha       Descripción       Monto       Estado
-------------------------------------------------
08/08/26    Transferencia     $50.000     Pagado
07/08/26    Compra insumos    $32.000     Pagado
```

NO reemplazar toda la tabla por un spinner.

---

## 5. Cards del dashboard

Las cards deben mantener su tamaño durante la carga.

Ejemplo:

```text
┌───────────────────────┐
│ Saldo disponible      │
│                       │
│ ████████████          │
│                       │
│ Ver movimientos       │
└───────────────────────┘
```

Después:

```text
┌───────────────────────┐
│ Saldo disponible      │
│                       │
│ $1.250.000            │
│                       │
│ Ver movimientos       │
└───────────────────────┘
```

Esto evita saltos visuales.

---

## 6. Gráficos

Para gráficos que dependen del backend:

Mantener visible:

* título;
* card;
* selector de período;
* filtros.

Mientras cargan los datos, mostrar un skeleton con aproximadamente el mismo alto y ancho que tendrá el gráfico.

Ejemplo:

```jsx
<Card>
  <CardHeader>
    <CardTitle>Ingresos vs egresos</CardTitle>
    <PeriodSelector />
  </CardHeader>

  <CardContent>
    {isLoading ? (
      <Skeleton className="h-[300px] w-full" />
    ) : (
      <Chart data={data} />
    )}
  </CardContent>
</Card>
```

---

## 7. Evitar Layout Shift

El skeleton debe intentar tener:

* mismo ancho;
* mismo alto;
* mismo espacio;

que tendrá el contenido final.

Esto es muy importante.

No hacer:

```text
loading pequeño
↓
contenido final enorme
```

porque genera saltos visuales.

---

## 8. Botones

Los botones deben seguir visibles aunque los datos estén cargando.

Ejemplo:

```text
Movimientos                    + Nuevo movimiento
```

El botón:

```text
+ Nuevo movimiento
```

NO depende de los movimientos obtenidos desde la API.

Por lo tanto debe aparecer inmediatamente.

Solo los registros de movimientos deben mostrar skeleton.

---

## 9. Loading inicial vs actualización

Diferenciar:

### Initial loading

Cuando todavía no existen datos cargados:

```text
mostrar skeleton
```

### Refetch / actualización

Si ya existen datos en pantalla y se está realizando una nueva consulta:

```text
mantener los datos anteriores visibles
```

y opcionalmente mostrar un indicador pequeño de actualización.

NO reemplazar nuevamente todos los datos con skeleton.

Ejemplo deseado:

```text
Saldo

$1.250.000
      ↻ actualizando...
```

en vez de:

```text
Saldo

████████████
```

cada vez que se hace refetch.

---

## 10. Estados que deben manejarse

Cada componente que consume API debe distinguir al menos:

```text
loading
success
empty
error
```

Comportamiento esperado:

### loading

Skeleton.

### success

Datos reales.

### empty

Mensaje de estado vacío.

Ejemplo:

```text
No hay movimientos registrados.
```

### error

Mostrar mensaje de error y posibilidad de reintentar.

Ejemplo:

```text
No pudimos cargar los movimientos.

[ Reintentar ]
```

---

## 11. Crear componentes reutilizables

No repetir skeletons manualmente por toda la aplicación.

Crear componentes reutilizables cuando corresponda.

Ejemplos:

```text
Skeleton
TableSkeleton
CardValueSkeleton
ChartSkeleton
ListSkeleton
```

Ejemplo:

```jsx
<CardValueSkeleton />
```

o:

```jsx
<TableSkeleton rows={5} columns={4} />
```

---

## 12. Si usamos React Query / TanStack Query

Si la aplicación utiliza TanStack Query, distinguir correctamente:

```text
isPending
isLoading
isFetching
```

Usar skeleton principalmente para la carga inicial.

Ejemplo conceptual:

```jsx
const {
  data,
  isPending,
  isFetching,
  isError,
} = useQuery(...);
```

Luego:

```jsx
{isPending ? (
  <Skeleton />
) : (
  <Balance value={data.balance} />
)}
```

Si:

```text
isFetching === true
```

pero ya existen datos, mantener esos datos visibles.

---

# Resultado esperado

Quiero que revises las pantallas que consumen información desde el backend y cambies la experiencia de carga siguiendo esta regla:

> La estructura fija siempre debe permanecer visible. Solo los valores dinámicos provenientes de API/DB deben utilizar skeleton.

No quiero loaders de pantalla completa salvo que realmente sea imposible construir la estructura de la página antes de obtener los datos.

La interfaz debe:

* sentirse rápida;
* no parpadear;
* no desaparecer durante consultas;
* no cambiar bruscamente de tamaño;
* mantener botones y acciones disponibles;
* utilizar skeleton solamente donde realmente falta información.

Antes de modificar código, identifica qué partes de cada pantalla son:

```text
STATIC UI
DYNAMIC DATA
```

y aplica skeleton solamente a `DYNAMIC DATA`.
