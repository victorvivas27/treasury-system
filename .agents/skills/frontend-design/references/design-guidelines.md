# Guía visual y checklist — Treasury System

## Dashboard financiero
- Destacar indicadores esenciales con unidades, periodo y contexto; no inventar cifras.
- Gráficos Recharts con títulos, leyendas, tooltips comprensibles y alternativas legibles.
- Evitar tarjetas gigantes que obliguen a desplazar el contenido en 1216 × 552.
- Mostrar estados de carga, sin datos y error.

## Tablas administrativas
- Encabezados claros, alineación numérica a la derecha, formato consistente de moneda y fecha.
- Búsqueda y filtros visibles, paginación comprensible, acciones de fila reconocibles.
- En móvil, priorizar columnas o permitir scroll horizontal dentro de la tabla, nunca truncar información crítica silenciosamente.
- No modificar el cálculo de totales ni ordenamientos funcionales existentes.

## Formularios
- Etiquetas persistentes, errores próximos al campo, estados deshabilitado/cargando y confirmación explícita.
- Mantener navegación por teclado y foco tras acciones.
- Evitar eliminar validaciones existentes o cambiar nombres de campos enviados a la API.

## Modales
- Edición: max-width 320px. Confirmación: max-width 280px.
- Limitar ancho al viewport, bloquear fondo, preservar comportamiento de posición contextual.
- Comprobar foco, Escape cuando corresponda, scroll interno si la altura disponible es insuficiente.

## Eventos, stands y tesorería
- Separar visualmente importes, cantidades, fechas, estados y acciones irreversibles.
- Diferenciar información confirmada de pendiente; nunca inferir éxito de una transacción.
- Mantener confirmaciones para acciones destructivas y trazabilidad visible cuando exista.

## Checklist de revisión
- [ ] Se leyeron las reglas del repositorio y se revisó el estado de git.
- [ ] Se reutilizaron componentes/tokens existentes.
- [ ] No cambió la lógica financiera ni la autenticación.
- [ ] No se alteraron contratos ni rutas.
- [ ] Se revisaron carga, vacío, error, validación y éxito según aplique.
- [ ] Se comprobó 1216 × 552 y adaptación a tamaños menores.
- [ ] No hay overflow inesperado ni controles ocultos.
- [ ] Se revisaron teclado, foco, etiquetas y contraste.
- [ ] Se respetaron los límites de ancho de modales.
- [ ] Se ejecutaron las validaciones pertinentes o se documentó por qué no.
- [ ] No se hizo commit, push ni deploy sin autorización.

## Matriz responsive de validación
| Contexto | Viewport CSS | Revisión |
| --- | --- | --- |
| Desktop de referencia | 1216 × 552 | Navbar, dashboard, densidad, scroll vertical |
| Tablet | 768 × 1024 | Navegación, columnas, formularios y gráficos |
| Móvil | 390 × 844 | Acciones prioritarias, tablas, menús y modales |
| Móvil pequeño | 360 × 640 | Espacios mínimos, teclado, scroll y textos largos |

Estos viewports son casos de prueba, no breakpoints obligatorios. Verificar tamaños intermedios y evitar scroll horizontal global; permitir scroll localizado donde preserve la información. No cambiar reglas de negocio para simplificar pantallas.
