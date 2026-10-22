---
name: community-icons
description: Crear una familia ilimitada de íconos 3D personalizados para Treasury System reutilizando una plantilla maestra inmutable. Únicamente cambia el símbolo central según el concepto solicitado.
---

# Community Icons — Sistema de plantilla maestra

## 1. Objetivo

Crear íconos personalizados para Treasury System mediante un sistema de composición por capas.

Todos los íconos deben compartir exactamente el mismo círculo exterior de personajes 3D.

La única diferencia entre ellos será el objeto ubicado en el centro.

**Fórmula obligatoria:**

ÍCONO FINAL = PLANTILLA MAESTRA + SÍMBOLO CENTRAL

## 2. Plantilla maestra

Archivo de referencia: `plantilla.png`

Contiene cuatro personajes conectados en círculo:

- Morado en la parte superior.
- Rosado a la izquierda.
- Azul/cian a la derecha.
- Amarillo/naranja en la parte inferior.

Esta estructura es INMUTABLE.

No redibujar, regenerar, reinterpretar, deformar ni modificar la plantilla.

Preservar exactamente:

- Píxeles originales.
- Geometría y proporciones.
- Posiciones de los personajes.
- Colores y degradados.
- Iluminación y reflejos.
- Bordes y sombras.
- Transparencia.

La plantilla debe utilizarse como un recurso gráfico fijo.

## 3. Elemento central dinámico

El agente recibirá un nombre de archivo y un concepto.

Ejemplo:

`community-care.png` — Solidaridad y cuidado.

Debe interpretar el concepto y diseñar un símbolo central que lo represente.

Para este ejemplo, el símbolo será un corazón rojo 3D brillante.

Para otro concepto, puede ser un árbol, una estrella, un libro, una familia u otro objeto significativo.

**No reutilizar automáticamente el mismo símbolo para conceptos diferentes.**

## 4. Estilo visual obligatorio del centro

Todos los símbolos centrales deben mantener:

- Estética 3D premium.
- Formas redondeadas.
- Materiales brillantes.
- Volumen y profundidad.
- Reflejos suaves.
- Colores vivos y equilibrados.
- Iluminación superior izquierda.
- Sombras integradas al objeto.
- Bordes limpios.
- Fondo transparente.

No incluir textos, fondos, marcos ni elementos decorativos innecesarios.

## 5. Proceso de creación

Para cada nuevo ícono:

1. Leer el nombre y concepto solicitado.
2. Identificar un símbolo central que comunique ese concepto.
3. Cargar la plantilla maestra sin modificarla.
4. Crear exclusivamente el objeto central como recurso independiente.
5. Ajustar su tamaño al espacio interior disponible.
6. Componer el objeto sobre la plantilla mediante capas.
7. Exportar el ícono completo.
8. Verificar que el círculo exterior permanezca idéntico.

No generar una nueva versión del círculo con IA.

La IA, si se utiliza, solo puede generar el objeto central.

## 6. Restricciones de composición

El objeto central:

- Debe quedar centrado ópticamente.
- No debe tocar las cabezas exteriores.
- No debe cubrir los brazos del círculo.
- Debe conservar márgenes internos.
- Debe ser reconocible a 48–64 px.
- No debe modificar la plantilla.
- Puede tener colores diferentes según su significado.

Mantener el tamaño del lienzo y la posición del círculo constantes en toda la colección.

## 7. Mapa de íconos

| Archivo | Concepto | Símbolo central sugerido |
|---|---|---|
| community-tree.png | Crecer juntos | Árbol multicolor |
| community-families.png | Comunidad y familias | Familia bajo un techo |
| community-care.png | Solidaridad y cuidado | Corazón rojo |
| community-learning.png | Aprendizaje | Libro abierto |
| community-participation.png | Participación | Estrella dorada |
| community-goals.png | Metas compartidas | Bandera de meta |
| community-celebration.png | Celebración y encuentro | Regalo festivo |

Este mapa es extensible.

El agente debe admitir nuevos nombres y conceptos sin modificar el sistema.

## 8. Organización

Guardar los archivos utilizando una estructura equivalente a:

`frontend/src/assets/community-icons/`

Mantener la plantilla original separada de los íconos finales.

No sobrescribirla.

## 9. Entregables por ícono

Para cada concepto solicitado, producir:

- `[nombre].png` — Ícono completo con transparencia.
- `[nombre].webp` — Versión optimizada.
- `[nombre]-center.png` — Símbolo central independiente.

Reutilizar la misma plantilla para todos los resultados.

## 10. Validación automática

Comparar cada resultado con la plantilla maestra.

Fuera de la región central, la diferencia de píxeles debe ser exactamente cero.

Comprobar:

- Transparencia alfa real.
- Ausencia de deformaciones.
- Bordes suaves.
- Posición y escala del centro.
- Consistencia entre íconos.
- Legibilidad en tarjetas del dashboard.

Si no es posible garantizar que la plantilla permanezca intacta, informar la limitación y no sustituirla por una imagen parecida.

## 11. Ejemplo de invocación

Usa `$community-icons` para crear:

`community-care.png` — Solidaridad y cuidado.

Utiliza `plantilla.png` sin modificar un solo píxel de los personajes exteriores.

Diseña exclusivamente un corazón rojo 3D brillante, colócalo en el centro y exporta el resultado con transparencia.

## 12. Principio fundamental

**UNA SOLA PLANTILLA. INFINITOS SÍMBOLOS CENTRALES. UNA MISMA IDENTIDAD VISUAL.**

Nunca regenerar el círculo exterior.

Nunca crear brazos o personajes adicionales.

Nunca modificar la plantilla para adaptarla al objeto.

Siempre adaptar el objeto central al espacio disponible.
