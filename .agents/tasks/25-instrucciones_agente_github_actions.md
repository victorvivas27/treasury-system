# Instrucciones para la Optimización de GitHub Actions y Configuración de Reportes HTML

Este documento contiene las instrucciones necesarias para corregir las advertencias (*warnings*) en los workflows de GitHub Actions de este proyecto y para implementar la visualización de reportes detallados en el navegador mediante GitHub Pages.

---

## Parte 1: Resolución de Warnings en GitHub Actions

### 1. Actualización de Acciones Depreciadas (Node.js 20 & Action Versions)
#### Diagnóstico
GitHub Actions ha comenzado la transición hacia los ejecutores de Node.js 24. Las acciones actuales (`actions/checkout@v4`, `actions/setup-java@v4`, `actions/upload-artifact@v4`) tienen dependencias internas en Node.js 20 o han sido sucedidas por versiones más recientes diseñadas para Node.js 24.

#### Instrucciones de Solución
* **Actualización de `actions/setup-java`**:
  * Localizar en los archivos de workflow (`.github/workflows/*.yml`) las referencias a `actions/setup-java@v4`.
  * Actualizar la versión de la acción de `@v4` a `@v5`.
* **Actualización de `actions/checkout` y `actions/upload-artifact`**:
  * Verificar en las versiones de los workflows si se están utilizando tags fijos o subvenciones.
  * Asegurarse de utilizar la versión estable más reciente disponible en el GitHub Marketplace para cada una de estas acciones (`actions/checkout@v4` o superior que soporte Node.js 24 nativamente, y `actions/upload-artifact@v4`).

---

### 2. Configuración del Tiempo de Retención de Artefactos (*Retention Days*)
#### Diagnóstico
El valor configurado para `retention-days` en el paso de subida de artefactos (`actions/upload-artifact`) supera el límite de días permitido por la configuración de la organización o del repositorio de GitHub. Por este motivo, el sistema fuerza automáticamente la retención a 1 día.

#### Instrucciones de Solución
* Revisar los parámetros de configuración en el paso `actions/upload-artifact` dentro de los archivos YAML.
* Modificar el atributo `retention-days` para que sea **1** (o remover la línea para utilizar el valor por defecto ajustado por las políticas del repositorio).
* Alternativamente, si se requiere una retención mayor, ajustar primero las políticas de retención en la configuración global del repositorio (*Settings > Actions > General > Artifact and log settings*).

---

## Parte 2: Visualización de Reportes de Backend y Frontend en el Navegador

Actualmente, los reportes se descargan como carpetas comprimidas (artefactos ZIP). Para poder examinarlos directamente desde el navegador mediante un enlace web interactivo, se debe implementar **GitHub Pages**.

---

### 1. Configuración de Cobertura y Reportes en Backend y Frontend
#### Requisitos del Frontend
* Configurar la herramienta de pruebas (ej. Jest, Vitest, Cypress) para generar reportes en formato **HTML** interactivo (además de los reportes LCOV o JSON).
* Asegurar que la salida del reporte se guarde en un directorio específico (por ejemplo, `coverage/frontend`).

#### Requisitos del Backend
* Configurar la herramienta de pruebas/cobertura del Backend (ej. JaCoCo para Java/Gradle/Maven, o equivalente) para que genere un reporte en formato HTML.
* Asegurar que el reporte final HTML se expurgue en un directorio específico (por ejemplo, `build/reports/jacoco/test/html` o `coverage/backend`).

---

### 2. Creación del Workflow de Despliegue de Reportes a GitHub Pages
#### Pasos de Ejecución
1. **Consolidación de Reportes**:
   * En el workflow de CI/CD, agregar un paso tras la ejecución de pruebas que recopile los reportes HTML generados tanto por el Backend como por el Frontend.
   * Estructurar los archivos en una carpeta unificada (por ejemplo, `public/`), colocando los reportes en subcarpetas dedicadas:
     * `public/frontend/`
     * `public/backend/`

2. **Creación de una Página Indice (`index.html`)**:
   * Generar o incluir un archivo `index.html` en la raíz de la carpeta `public/`.
   * Diseñar este panel con una interfaz limpia e intuitiva que contenga enlaces hacia los reportes individuales de Frontend y Backend.

3. **Publicación en GitHub Pages**:
   * Utilizar la acción oficial de publicación en GitHub Pages (`actions/deploy-pages@v4` junto con `actions/upload-pages-artifact@v3`).
   * Configurar el evento de despliegue para que se active únicamente tras finalizar con éxito las pruebas en la rama principal (`main` o `master`).

---

### 3. Habilitación de GitHub Pages en el Repositorio
#### Instrucciones
1. Ir a la pestaña **Settings** del repositorio en GitHub.
2. Navegar a la sección **Pages** (en el menú lateral izquierdo).
3. En la sección **Build and deployment > Source**, seleccionar la opción **GitHub Actions**.
4. Una vez ejecutado el workflow, GitHub proporcionará una URL pública (ejemplo: `https://<usuario>.github.io/<repositorio>/`) donde se podrá visualizar el panel de reportes interactivo directamente desde cualquier navegador.
