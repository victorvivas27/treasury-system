# PERFORMANCE_NAVIGATION_AUDIT.md

## 1. Objetivo

Realizar una auditoría de rendimiento de navegación real de la aplicación `treasury-system`.

Entorno de producción y credenciales

La URL de producción y las credenciales necesarias para realizar las pruebas E2E ya se encuentran configuradas en el archivo .env del frontend.

Utilizar exclusivamente las siguientes variables de entorno:

PERF_BASE_URL
PERF_USERNAME
PERF_PASSWORD

No solicitar al usuario nuevamente la URL, usuario o contraseña.

No hardcodear ninguno de estos valores en Playwright, tests, scripts o archivos de configuración.

No mostrar ni copiar el contenido real del .env.

No imprimir credenciales, contraseñas, tokens, cookies ni headers de autorización en logs, traces o reportes.

Los tests deben obtener toda esta configuración desde las variables de entorno existentes en el frontend.

Antes de ejecutar la auditoría, verificar únicamente que las variables requeridas existen. Si existen, continuar con la prueba sin revelar sus valores.
```

El objetivo de esta tarea es medir cuánto demora un usuario autenticado en navegar por las diferentes secciones de la aplicación y cuánto tarda cada pantalla en mostrar sus datos.

Ejemplos:

```text
Dashboard
→ ¿Cuánto demora en cargar completamente?

Alumnos
→ ¿Cuánto demora en mostrar los alumnos?

Apoderados
→ ¿Cuánto demora en mostrar los apoderados?

Tesorería
→ ¿Cuánto demora en mostrar sus datos?

Resumen / Estado
→ ¿Cuánto demora en mostrar la información?
```

También se deben descubrir y medir los demás módulos principales disponibles en la navegación de la aplicación.

Esta primera tarea es de:

**AUDITORÍA + MEDICIÓN + DIAGNÓSTICO**

NO es todavía una tarea de optimización.

---

# 2. Preguntas que debe responder la auditoría

Al finalizar necesito poder responder objetivamente:

1. ¿Cuánto tarda cada pantalla en producción?
2. ¿Cuáles son las pantallas más lentas?
3. ¿Qué endpoints se ejecutan al entrar en cada pantalla?
4. ¿Cuál es el endpoint más lento de cada pantalla?
5. ¿Cuánto tarda cada endpoint?
6. ¿La pantalla está esperando principalmente al backend/API?
7. ¿La API termina rápido pero React tarda en mostrar los datos?
8. ¿Existen requests duplicadas o innecesarias?
9. ¿Existen endpoints que transfieren cantidades grandes de datos?
10. ¿Hay diferencias importantes entre primera carga y cargas posteriores?
11. ¿Qué módulos deben investigarse posteriormente en backend/Neon?

NO concluir que Neon o Google Cloud son responsables sin evidencia.

---

# 3. REGLA PRINCIPAL

## PRIMERO MEDIR. NO OPTIMIZAR.

Durante esta tarea NO:

- modificar queries SQL;
- crear índices;
- cambiar configuración de Neon;
- cambiar recursos de Google Cloud;
- cambiar configuración de producción;
- modificar lógica del backend;
- modificar lógica del frontend;
- modificar paginación;
- realizar refactors;
- intentar solucionar automáticamente los problemas encontrados.

Primero obtener evidencia.

Después se realizará otra tarea específica de optimización.

---

# 4. SEGURIDAD EN PRODUCCIÓN

Las pruebas se ejecutarán contra una aplicación real de producción.

Por lo tanto deben ser conservadoras.

## PROHIBIDO

No:

- crear alumnos;
- eliminar alumnos;
- modificar alumnos;
- crear apoderados;
- modificar apoderados;
- eliminar apoderados;
- crear movimientos;
- modificar movimientos;
- eliminar movimientos;
- crear administraciones;
- modificar administraciones;
- eliminar administraciones;
- realizar operaciones financieras;
- enviar mensajes;
- enviar emails;
- modificar configuraciones;
- ejecutar acciones destructivas;
- realizar pruebas de carga agresivas.

La prueba debe ser principalmente:

**LOGIN + NAVEGACIÓN + LECTURA**

---

# 5. NO HACER STRESS TEST TODAVÍA

Esta tarea NO debe simular:

```text
50 usuarios
100 usuarios
500 usuarios
```

No utilizar producción para realizar stress testing.

Inicialmente utilizar:

```text
1 usuario
navegación secuencial
```

El objetivo actual es medir la experiencia de navegación de un usuario real.

Las pruebas de concurrencia se diseñarán posteriormente y en un entorno apropiado.

---

# 6. VARIABLES DE ENTORNO

Las credenciales estarán disponibles mediante variables de entorno.

Esperar:

```text
PERF_BASE_URL
PERF_USERNAME
PERF_PASSWORD
```

La URL esperada de producción es:

```text
https://tesoreriaescolar.app/
```

Pero los tests deben utilizar:

```text
PERF_BASE_URL
```

y NO hardcodear la URL dentro de los tests cuando no sea necesario.

---

# 7. PROTECCIÓN DE CREDENCIALES

PROHIBIDO:

- imprimir `PERF_PASSWORD`;
- imprimir tokens;
- imprimir JWT;
- guardar cookies en reportes;
- mostrar Authorization headers;
- guardar secretos en screenshots;
- escribir credenciales en Markdown;
- escribir credenciales en JSON;
- escribir credenciales en logs;
- incluir credenciales en commits.

Verificar que los archivos de entorno sensibles estén ignorados por Git.

No mostrar el contenido completo de `.env`.

Si se necesita documentación, utilizar únicamente nombres de variables:

```text
PERF_BASE_URL=
PERF_USERNAME=
PERF_PASSWORD=
```

sin valores sensibles.

---

# 8. INSPECCIONAR EL PROYECTO ANTES DE PROGRAMAR

Antes de crear las pruebas, analizar la arquitectura real de `treasury-system`.

Identificar:

- framework frontend;
- router;
- estructura de páginas;
- Sidebar;
- menú principal;
- sistema de autenticación;
- servicios HTTP;
- API client;
- Axios/fetch;
- interceptores;
- hooks;
- React Query/TanStack Query si existe;
- loaders;
- skeletons;
- tablas;
- estados de carga;
- manejo de errores.

No asumir rutas ni endpoints.

Obtenerlos del código real.

---

# 9. CREAR MAPA PANTALLA → ENDPOINTS

Antes de ejecutar las mediciones, construir automáticamente un mapa.

Ejemplo conceptual:

```text
Dashboard
/dashboard
├── GET /api/...
├── GET /api/...
└── GET /api/...

Alumnos
/students
├── GET /api/...
└── GET /api/...

Apoderados
/guardians
├── GET /api/...
└── GET /api/...

Tesorería
/treasury
├── GET /api/...
└── GET /api/...
```

Estos son solamente ejemplos.

Utilizar las rutas y endpoints REALES encontrados en el proyecto.

---

# 10. PANTALLAS MÍNIMAS A INVESTIGAR

Localizar como mínimo:

- Dashboard
- Alumnos
- Apoderados
- Tesorería
- Resumen / Estado de Tesorería
- Administraciones

Además:

inspeccionar el Sidebar/menu y descubrir automáticamente las demás secciones principales que utiliza normalmente un usuario.

Incluirlas cuando puedan probarse únicamente mediante navegación/lectura.

---

# 11. HERRAMIENTA PRINCIPAL

Utilizar:

**Playwright**

Primero verificar si Playwright ya existe en el proyecto.

Si existe:

reutilizar la configuración existente cuando sea apropiado.

Si no existe:

configurarlo siguiendo la arquitectura actual del proyecto.

No introducir dependencias innecesarias.

---

# 12. SIMULAR NAVEGACIÓN REAL

La prueba debe comportarse como un usuario.

Después del login:

```text
Login
↓
Dashboard
↓
clic Sidebar → Alumnos
↓
esperar datos reales
↓
clic Sidebar → Apoderados
↓
esperar datos reales
↓
clic Sidebar → Tesorería
↓
esperar datos reales
↓
clic → Resumen/Estado
↓
esperar datos reales
↓
continuar módulos
```

Preferir hacer clic sobre la navegación real de la aplicación.

No limitar la prueba a ejecutar:

```javascript
page.goto("/students")
```

para cada módulo.

Queremos medir la navegación SPA real.

---

# 13. LOGIN

Realizar login mediante:

```text
PERF_USERNAME
PERF_PASSWORD
```

Nunca hardcodear credenciales.

Una vez autenticado, utilizar `storageState` de Playwright si resulta apropiado para reutilizar la sesión.

La medición de login debe mantenerse separada de las mediciones de las páginas internas.

---

# 14. NO MEDIR SOLAMENTE page.goto()

Esta aplicación es una SPA.

Por lo tanto:

`page.goto()` terminado NO significa que la pantalla terminó de cargar sus datos.

Tampoco utilizar `networkidle` como único criterio.

Necesitamos medir:

> desde que el usuario hace clic en una sección hasta que los datos útiles de esa sección están realmente visibles.

---

# 15. DEFINIR "DATA VISIBLE" POR PANTALLA

Inspeccionar cada componente y determinar una condición confiable.

Ejemplo:

## Alumnos

Considerar cargado cuando:

- termina el endpoint crítico;
- desaparece loader/skeleton;
- tabla/listado está visible.

## Apoderados

Considerar cargado cuando:

- termina la carga principal;
- desaparece estado loading;
- datos están renderizados.

## Dashboard

Considerar cargado cuando:

- endpoints críticos finalizan;
- cards/indicadores principales muestran información.

## Tesorería

Identificar en el código qué elementos representan que los datos están listos.

NO utilizar delays arbitrarios como:

```javascript
waitForTimeout(5000)
```

para determinar que una página cargó.

Esperar condiciones reales.

---

# 16. MEDICIÓN PRINCIPAL

Para cada navegación registrar:

```text
navigation_start
main_request_start
main_request_end
data_visible
navigation_complete
```

Calcular:

### Tiempo total

```text
navigation_start
→
data_visible
```

### Tiempo API

```text
main_request_start
→
main_request_end
```

### Tiempo posterior a API

```text
main_request_end
→
data_visible
```

Esto permitirá diferenciar backend de frontend.

---

# 17. CAPTURAR REQUESTS XHR/FETCH

Durante cada navegación registrar las requests relacionadas con la pantalla.

Por cada request registrar:

- método;
- path;
- status HTTP;
- duración;
- tamaño aproximado de respuesta cuando sea posible;
- inicio;
- finalización.

Preferir almacenar el path sanitizado y no información sensible de query strings cuando corresponda.

---

# 18. DETECTAR REQUESTS DUPLICADAS

Además de tiempos, detectar si una navegación produce requests potencialmente duplicadas.

Ejemplo:

```text
GET /api/students
GET /api/students
GET /api/students
```

Registrar:

```text
Potential duplicate request
GET /api/students
count: 3
```

No modificar el código todavía.

Solamente reportarlo.

---

# 19. MEDIR TAMAÑO DE RESPUESTAS

Cuando sea técnicamente posible registrar aproximadamente:

```text
GET /api/students

duration:
2100 ms

response:
4.8 MB
```

Esto es importante porque producción contiene mayor volumen de datos.

Una respuesta muy grande puede explicar parte de la degradación.

---

# 20. REPETIR LAS PRUEBAS

No sacar conclusiones de una única ejecución.

Ejecutar inicialmente:

```text
5 mediciones por pantalla
```

de manera secuencial.

Permitir configurar:

```text
PERF_ITERATIONS
```

Ejemplo:

```text
PERF_ITERATIONS=5
```

---

# 21. MÉTRICAS ESTADÍSTICAS

Por pantalla calcular:

- min;
- promedio;
- mediana / p50;
- p95;
- máximo.

Ejemplo:

```text
ALUMNOS

samples: 5

min:     1.91 s
average: 2.31 s
p50:     2.28 s
p95:     2.71 s
max:     2.74 s
```

No utilizar solamente el promedio.

---

# 22. COLD VS WARM

Diferenciar cuando sea posible:

## COLD

Primera entrada a la pantalla.

## WARM

Entradas posteriores.

Ejemplo:

```text
Alumnos

cold:
3.42 s

warm p50:
1.87 s
```

Una diferencia grande debe aparecer en el informe.

---

# 23. RESULTADO POR PANTALLA

Generar algo equivalente a:

```text
==================================================
ALUMNOS
==================================================

Route:
/students

Samples:
5

Navigation p50:
2480 ms

Navigation p95:
2910 ms

Slowest request:
GET /api/students

Request p50:
2086 ms

Approximate API share:
84 %

Render after API:
184 ms

Response size:
4.8 MB

Duplicate requests:
0

Classification:
SLOW

Probable layer:
BACKEND/API
```

---

# 24. CLASIFICACIÓN INICIAL

Utilizar thresholds configurables.

Valores iniciales orientativos:

```text
< 1000 ms
FAST

1000–2000 ms
ACCEPTABLE

2000–3000 ms
SLOW

> 3000 ms
CRITICAL
```

No tratar estos valores como requisitos funcionales definitivos.

Son únicamente clasificación inicial para la auditoría.

---

# 25. IDENTIFICAR QUÉ PARTE ESTÁ LENTA

Ejemplo:

```text
Pantalla:
Alumnos

Total:
2480 ms

API:
2080 ms

Render posterior:
180 ms
```

Conclusión válida:

```text
La mayor parte de la navegación se consume esperando la API.
Se recomienda investigar posteriormente el backend/DB de este endpoint.
```

NO concluir:

```text
Neon es lento.
```

Todavía no tenemos evidencia suficiente para eso.

---

# 26. OTRO CASO

Si encontramos:

```text
Pantalla:
Dashboard

Total:
3100 ms

APIs:
420 ms

Tiempo posterior:
2500 ms
```

la conclusión puede ser:

```text
El backend responde relativamente rápido.

La mayor parte del tiempo ocurre después de recibir los datos.

Probable cuello de botella frontend/renderizado.
```

---

# 27. SCREENSHOTS

Capturar screenshot cuando:

- una navegación falla;
- una pantalla supera threshold crítico;
- no se detecta correctamente `data_visible`.

Utilizar nombres sanitizados.

Ejemplo:

```text
reports/screenshots/
students-critical.png
treasury-critical.png
```

No capturar deliberadamente información sensible.

---

# 28. PLAYWRIGHT TRACE

Activar Trace de Playwright para diagnóstico.

Preferentemente:

```text
retain-on-failure
```

o equivalente.

También permitir activar trazas completas mediante configuración para una ejecución diagnóstica.

Las trazas pueden contener información sensible de producción.

Por lo tanto:

- mantenerlas fuera de Git;
- no subirlas automáticamente;
- no incluir cookies/tokens en reportes Markdown;
- no compartirlas externamente.

---

# 29. ESTRUCTURA

Crear una estructura limpia.

Ejemplo orientativo:

```text
performance/
├── config/
├── helpers/
├── navigation/
├── reports/
├── screenshots/
└── README.md
```

Adaptarla al proyecto real.

No crear estructura innecesariamente compleja.

---

# 30. REPORTE JSON

Generar:

```text
performance-report.json
```

Ejemplo conceptual:

```json
{
  "environment": "production",
  "samples": 5,
  "screens": [
    {
      "name": "Alumnos",
      "route": "/students",
      "navigation": {
        "p50": 2480,
        "p95": 2910
      },
      "slowestRequest": {
        "method": "GET",
        "path": "/api/students",
        "p50": 2086
      },
      "classification": "SLOW",
      "probableLayer": "BACKEND_API"
    }
  ]
}
```

NO incluir secretos.

---

# 31. REPORTE MARKDOWN

Generar:

```text
PERFORMANCE_REPORT.md
```

Debe comenzar con un resumen ejecutivo.

Ejemplo:

```text
Performance Navigation Audit

Environment:
Production

Base URL:
https://tesoreriaescolar.app/

Mode:
Single authenticated user

Iterations:
5

Screens tested:
12
```

---

# 32. RANKING DE PANTALLAS

Ordenar las pantallas de más lenta a más rápida.

Ejemplo:

| # | Pantalla | p50 | p95 | API más lenta | Clasificación |
|---|---|---:|---:|---|---|
| 1 | Tesorería | 3.84 s | 4.21 s | /api/... | CRITICAL |
| 2 | Alumnos | 2.48 s | 2.91 s | /api/... | SLOW |
| 3 | Apoderados | 1.92 s | 2.14 s | /api/... | ACCEPTABLE |
| 4 | Dashboard | 1.31 s | 1.58 s | /api/... | ACCEPTABLE |

Utilizar datos reales obtenidos por las pruebas.

---

# 33. RANKING DE ENDPOINTS

Generar también:

```text
TOP SLOWEST ENDPOINTS
```

Ejemplo:

| # | Endpoint | Pantalla | p50 | p95 | Response size |
|---|---|---|---:|---:|---:|
| 1 | GET /api/... | Tesorería | 3.1 s | 3.5 s | 2.1 MB |
| 2 | GET /api/... | Alumnos | 2.0 s | 2.4 s | 4.8 MB |

Esto será especialmente importante para la siguiente auditoría.

---

# 34. OBSERVAR VOLUMEN DE DATOS

Debido a que producción posee más información que local, prestar especial atención a:

- endpoints sin paginación;
- respuestas JSON grandes;
- tablas con muchos registros;
- requests que devuelven colecciones completas;
- múltiples endpoints que devuelven los mismos datos;
- tiempos que crecen proporcionalmente al volumen.

REPORTAR.

NO solucionar todavía.

---

# 35. COMPARACIÓN CON LOCAL

La suite debe quedar preparada para posteriormente ejecutar:

```text
PERF_BASE_URL=http://localhost:...
```

utilizando exactamente las mismas pruebas.

Esto permitirá comparar:

```text
LOCAL vs PRODUCTION
```

Ejemplo futuro:

| Pantalla | Local p50 | Prod p50 | Factor |
|---|---:|---:|---:|
| Dashboard | 420 ms | 1.35 s | 3.2x |
| Alumnos | 510 ms | 2.48 s | 4.9x |
| Apoderados | 470 ms | 1.92 s | 4.1x |
| Tesorería | 630 ms | 3.14 s | 5.0x |

No falsear esta comparación si local todavía no fue ejecutado.

---

# 36. NO CONFUNDIR CORRELACIÓN CON CAUSA

Una API lenta NO demuestra automáticamente que Neon sea lento.

Por ejemplo:

```text
GET /api/students
2.5 segundos
```

puede deberse a:

- backend;
- múltiples queries;
- N+1;
- Neon;
- falta de índices;
- procesamiento Java;
- serialización;
- transferencia de muchos datos;
- latencia de red;
- configuración de infraestructura.

Esta auditoría debe identificar el endpoint.

La siguiente auditoría determinará la causa interna.

---

# 37. SIGUIENTE FASE

Después de esta tarea podremos tomar los endpoints lentos y medir:

```text
Browser
↓
Google Cloud / Backend
↓
Controller
↓
Service
↓
Repository
↓
SQL
↓
Neon PostgreSQL
```

Entonces podremos determinar realmente si el problema está en:

```text
Neon
vs
Backend
vs
Google Cloud
vs
Frontend
vs
Volumen de datos
```

NO realizar esta segunda fase todavía.

---

# 38. ENTREGABLES OBLIGATORIOS

Al finalizar entregar:

1. Suite Playwright funcional.

2. Sistema de autenticación mediante variables de entorno.

3. Mapa:

```text
Pantalla → endpoints
```

4. Medición de navegación por pantalla.

5. Medición de requests por pantalla.

6. Detección de requests lentas.

7. Detección de requests potencialmente duplicadas.

8. Tamaño de respuestas cuando sea posible.

9. Estadísticas min/average/p50/p95/max.

10. Diferenciación cold/warm cuando sea posible.

11. Ranking de pantallas.

12. Ranking de endpoints.

13. Reporte JSON.

14. `PERFORMANCE_REPORT.md`.

15. README explicando cómo repetir la auditoría.

16. Lista exacta de archivos creados/modificados.

---

# 39. ANTES DE EJECUTAR CONTRA PRODUCCIÓN

Antes de iniciar navegación automatizada verificar:

- `PERF_BASE_URL` existe;
- `PERF_USERNAME` existe;
- `PERF_PASSWORD` existe;
- las credenciales NO se imprimen;
- la URL corresponde al entorno esperado;
- la prueba es de lectura;
- no existen acciones destructivas en el flujo;
- se utilizará solamente 1 usuario;
- no se realizará stress testing.

Si alguna de estas condiciones de seguridad no puede garantizarse:

DETENERSE y explicar el problema antes de ejecutar.

---

# 40. EJECUCIÓN

Ejecutar primero una prueba mínima:

```text
Login
→ Dashboard
→ Alumnos
→ Apoderados
→ Tesorería
```

Una sola iteración.

Verificar que:

- login funciona;
- navegación funciona;
- mediciones funcionan;
- no se modificaron datos;
- no existen errores inesperados.

Solamente después ejecutar las 5 muestras configuradas.

---

# 41. CRITERIO DE ÉXITO

La tarea estará terminada cuando el reporte pueda responder con evidencia:

```text
¿Cuánto tarda Dashboard?

¿Cuánto tarda Alumnos?

¿Cuánto tarda Apoderados?

¿Cuánto tarda Tesorería?

¿Cuáles son las 5 pantallas más lentas?

¿Cuáles son los 5 endpoints más lentos?

¿Qué porcentaje aproximado del tiempo se consume esperando APIs?

¿Qué pantallas parecen tener problemas de frontend?

¿Qué endpoints debemos investigar posteriormente en backend/Neon?

¿Hay respuestas excesivamente grandes?

¿Hay requests potencialmente duplicadas?

¿Existe diferencia importante entre cold y warm?
```

---

# 42. INSTRUCCIÓN FINAL AL AGENTE

No quiero que intentes demostrar que Neon es lento ni que Google Cloud es lento.

Quiero que lo descubras mediante mediciones.

Primero inspecciona la aplicación.

Después construye el mapa de navegación y endpoints.

Después implementa Playwright.

Después realiza una ejecución mínima segura.

Después ejecuta las mediciones.

Finalmente genera `PERFORMANCE_REPORT.md`.

Cuando tengas el informe:

**DETENTE.**

No optimices todavía.

Presenta los resultados y recomienda qué endpoints deberían pasar a una segunda auditoría de backend + PostgreSQL/Neon.
