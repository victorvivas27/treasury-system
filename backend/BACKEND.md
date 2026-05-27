# 🚀 Backend - Sistema de Tesorería

Guía rápida para desarrollo, ejecución y pruebas del módulo backend desarrollado con Java + Gradle.

> Todos los comandos deben ejecutarse dentro de la carpeta:
>
> ```bash
> backend/
> ```

---

# 📦 1. Desarrollo Local

Para limpiar compilaciones previas y levantar el servicio en modo desarrollo:

```bash
./gradlew clean bootRun
```

## ✅ ¿Qué hace este comando?

- 🧹 Elimina archivos temporales y builds anteriores (`clean`)
- ⚙️ Compila automáticamente los cambios recientes
- 🚀 Inicia la aplicación Spring Boot (`bootRun`)

> ℹ️ No es necesario ejecutar `./gradlew build` antes,
> ya que `bootRun` realiza la compilación automáticamente.

---

# 🧪 2. Testing

## Ejecutar pruebas unitarias

Para correr toda la suite de pruebas:

```bash
./gradlew test
```

## ✅ Resultado esperado

- Ejecución automática de tests unitarios
- Validación del comportamiento del backend
- Generación de reportes de pruebas

---

# 📊 3. Cobertura de Código (JaCoCo)

Para generar el reporte HTML de cobertura y abrirlo automáticamente en Linux:

```bash
./gradlew jacocoTestReport && xdg-open build/reports/jacoco/test/html/index.html
```

## 📁 Ubicación del reporte

```bash
build/reports/jacoco/test/html/index.html
```

## ✅ Incluye

- Cobertura por clase
- Cobertura por método
- Líneas cubiertas/no cubiertas
- Métricas visuales HTML

---

# 🛠️ Requisitos Previos

Antes de ejecutar el proyecto, asegúrate de tener instalado:

- ☕ Java 17+ (o versión requerida por el proyecto)
- 🐘 Gradle Wrapper (`gradlew`)
- 🐧 Linux/macOS o terminal compatible

---

# 📌 Comandos Útiles

| Acción | Comando |
|---|---|
| Iniciar backend | `./gradlew bootRun` |
| Limpiar proyecto | `./gradlew clean` |
| Ejecutar tests | `./gradlew test` |
| Generar cobertura | `./gradlew jacocoTestReport` |
| Build completo | `./gradlew build` |

---

# 🧾 Resumen

- `bootRun` → compila y levanta el backend 🚀
- `test` → ejecuta pruebas unitarias 🧪
- `jacocoTestReport` → genera cobertura HTML 📊
- Todo se ejecuta desde `backend/` 📁


## 🔍 PMD (Análisis Estático de Código)

PMD permite detectar:

- Código duplicado
- Variables innecesarias
- Métodos complejos
- Posibles malas prácticas
- Problemas de mantenibilidad

### Ejecutar análisis PMD

```bash
./gradlew pmdMain
```

### Abrir reporte HTML

```bash
xdg-open build/reports/pmd/main.html
```

> 💡 Compatible con entornos Linux que tengan interfaz gráfica.
> El reporte HTML facilita revisar problemas detectados visualmente.

## 📄 Abrir preview Markdown

 ```
 Ctrl + Shift + V
 ```
