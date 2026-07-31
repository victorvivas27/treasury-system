# Auditoría Completa del Proyecto

## Objetivo

Realiza una auditoría completa del proyecto **sin modificar ningún archivo**.

Antes de emitir cualquier conclusión, analiza **todo el proyecto**, incluyendo:

- Código fuente.
- Archivos de configuración.
- Dependencias.
- Scripts.
- Archivos de infraestructura.
- Archivos de CI/CD.
- Todos los archivos `*.md`.
- Carpeta `.agents` y cualquier otra documentación interna.

## Elementos a revisar

Identifica y documenta los siguientes puntos:

- Código duplicado.
- Código aparentemente sin uso.
- Archivos que ya no se utilizan.
- Dependencias sin uso.
- Dependencias obsoletas o deprecadas.
- Configuraciones duplicadas, inconsistentes o contradictorias.
- Documentación que no coincide con el estado actual del proyecto.
- Referencias a archivos inexistentes.
- Scripts que ya no se utilizan.
- Variables de entorno no utilizadas.
- Carpetas o recursos obsoletos.
- Oportunidades para simplificar la estructura del proyecto.
- Riesgos potenciales al eliminar o modificar cada elemento identificado.

## Formato del informe

Organiza el informe en las siguientes secciones:

### 1. Cambios seguros

Elementos que pueden eliminarse o modificarse con un riesgo mínimo.

Para cada elemento incluye:

- Descripción.
- Ubicación.
- Motivo.
- Recomendación.

---

### 2. Cambios que requieren validación

Elementos que parecen innecesarios, pero cuya eliminación o modificación requiere confirmación.

Para cada elemento incluye:

- Descripción.
- Ubicación.
- Motivo.
- Posible impacto.
- Validación necesaria.

---

### 3. Cambios de alto riesgo

Elementos cuya modificación puede afectar el funcionamiento del proyecto.

Para cada elemento incluye:

- Descripción.
- Ubicación.
- Riesgo.
- Dependencias afectadas.
- Recomendación.

## Restricciones

Durante esta tarea **NO** debes:

- Editar archivos.
- Eliminar archivos.
- Renombrar archivos.
- Mover archivos.
- Crear nuevos archivos.
- Actualizar documentación.
- Corregir código.

Esta tarea es **únicamente de análisis**.

## Resultado esperado

Entrega un informe claro, priorizado y accionable que servirá como base para planificar la limpieza del proyecto en tareas posteriores.
