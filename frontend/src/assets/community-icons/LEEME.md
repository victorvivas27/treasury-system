# Iconos de la comunidad

Coloca aquí los iconos exportados por tu diseñador. Cuando estén listos, pide: «Revisa los iconos de community-icons e intégralos».

## Archivos esperados

| Nombre de archivo | Uso |
|---|---|
| `community-tree.png` | Bienvenida: Cada familia hace la diferencia. |
| `community-families.png` | Comunidad y familias. |
| `community-care.png` | Solidaridad y cuidado. |
| `community-participation.png` | Participación y aporte de cada familia. |
| `community-learning.png` | Aprender juntos. |
| `community-goals.png` | Metas compartidas. |
| `community-joy.png` | Alegría compartida. |
| `community-achievements.png` | Logros del curso. |
| `community-direction.png` | Nuestro rumbo. |
| `community-celebration.png` | Celebración y encuentro. |
| `community-creativity.png` | Creatividad. |
| `community-growth.png` | Crecer juntos. |

No necesitas completarlos todos a la vez. Si usas otros nombres, indica qué representa cada archivo y se revisará su correspondencia con los textos reales de las cards antes de integrarlo.

## Cómo exportarlos

- Un icono por archivo PNG con transparencia alfa real, sin fondo ni recuadro.
- Preferentemente 1024 × 1024 px, con el objeto centrado y márgenes similares.
- Sin texto ni patrón de cuadros incrustado.
- Conservar la misma perspectiva, iluminación y materiales 3D en toda la colección.
- Evitar márgenes transparentes excesivos: el objeto debe ocupar una proporción similar en cada imagen.

Depositar imágenes aquí no cambia la aplicación automáticamente. Primero se revisan visualmente y después se conectan a la bienvenida, las cards, los diálogos y el selector del editor, manteniendo las claves de datos existentes.

El lineamiento completo está en [community-icons/SKILL.md](../../../../.agents/skills/community-icons/SKILL.md).

## Plantilla maestra obligatoria

**Ruta oficial:** `crs/assets/community-icons/pantilla.webp`

Esta imagen es la base inmutable para generar todos los íconos comunitarios de Treasury System.

### Reglas

1. Cargar siempre `crs/assets/community-icons/pantilla.webp`.
2. No regenerar ni redibujar el círculo exterior.
3. Conservar exactamente sus personajes, posiciones, colores, proporciones, sombras y reflejos.
4. Crear únicamente el símbolo 3D central correspondiente al concepto solicitado.
5. Insertar el símbolo central mediante composición por capas.
6. Mantener la transparencia original.
7. Guardar cada nuevo ícono en `crs/assets/community-icons/`.
8. Nunca sobrescribir `pantilla.webp`.
9. Verificar que todos los píxeles exteriores al área central permanezcan idénticos.

### Ejemplo de uso

Usa `$community-icons` para crear:

**Archivo:** `community-care.png`
**Concepto:** Solidaridad y cuidado
**Símbolo central:** Corazón rojo 3D brillante

**Plantilla:** `crs/assets/community-icons/pantilla.webp`

**Salida:** `crs/assets/community-icons/community-care.png`

Conserva el círculo exterior exactamente como aparece en la plantilla. Modifica exclusivamente el contenido central.

### Regla permanente

Para cualquier nuevo ícono, reutilizar siempre la misma plantilla maestra. Solo cambiar el objeto central según el significado solicitado.

