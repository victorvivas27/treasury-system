

## Objetivo

Completar toda la infraestructura necesaria para desplegar automáticamente el proyecto en Google Cloud mediante GitHub Actions utilizando:

- Workload Identity Federation (OIDC)
- Artifact Registry
- Cloud Run

Sin utilizar claves JSON.

---

# Estado actual

Ya está configurado en Google Cloud:

- Proyecto
- Cuenta de servicio
- Workload Identity Federation
- Artifact Registry

No volver a crear estos recursos.

---

# Objetivo de esta tarea

Preparar completamente el repositorio para que un push a main pueda desplegar automáticamente el backend en Cloud Run.

---

# Antes de modificar archivos

1. Revisar nuevamente la estructura del repositorio.
2. Confirmar que el backend sigue estando en /backend.
3. Confirmar que utiliza Gradle.
4. Confirmar que el Dockerfile existente sigue siendo válido.
5. Confirmar que no existen conflictos con los workflows actuales.

Si alguna de estas condiciones cambió, detener la implementación y explicar el motivo.

---

# Cambios requeridos

## 1. Docker

Revisar:

backend/Dockerfile

Corregir únicamente lo necesario para Cloud Run.

Crear:

backend/.dockerignore

---

## 2. Git Ignore

Revisar:

.gitignore

Agregar únicamente exclusiones relacionadas con credenciales de Google si aún no existen.

Ejemplos:

- *service-account*.json
- google-credentials*.json
- application_default_credentials.json

---

## 3. Workflow de despliegue

Crear:

.github/workflows/deploy-backend.yml

Debe:

- ejecutarse en push sobre main
- permitir workflow_dispatch
- autenticarse mediante Workload Identity Federation
- NO utilizar claves JSON
- NO utilizar GCP_SA_KEY
- ejecutar tests
- construir la imagen Docker
- publicar la imagen en Artifact Registry
- desplegar Cloud Run
- desplegar únicamente el backend

Debe utilizar exclusivamente variables GitHub.

No escribir valores reales.

Variables esperadas:

- GCP_PROJECT_ID
- GCP_REGION
- GAR_REPOSITORY
- BACKEND_IMAGE_NAME
- CLOUD_RUN_BACKEND_SERVICE
- WIF_PROVIDER
- DEPLOY_SERVICE_ACCOUNT
- RUNTIME_SERVICE_ACCOUNT

---

## 4. Backend

Verificar:

application-prod.yml

Comprobar:

- PORT
- APP_PROFILE
- variables de entorno

No modificar todavía:

- base de datos
- ddl-auto
- Flyway
- Liquibase

---

## 5. Seguridad

No copiar secretos.

No utilizar:

- DB_PASSWORD
- JWT_SECRET
- GMAIL_APP_PASSWORD
- ADMIN_BOOTSTRAP_KEY

Todos esos secretos serán migrados posteriormente a Secret Manager.

---

## 6. No implementar todavía

No tocar:

- Cloud SQL
- Secret Manager
- Frontend
- Firebase
- Dominio
- HTTPS
- Balanceador
- Escalado
- Monitoreo

---

# Validación

Al finalizar:

- ejecutar tests
- construir el backend
- construir la imagen Docker

No desplegar.

No hacer push.

No publicar imágenes.

---

# Entregables

Mostrar:

## Archivos creados

## Archivos modificados

## Diff resumido

## Resultado de tests

## Resultado del build

## Resultado del build Docker

## Variables GitHub requeridas

## Roles necesarios para:

- DEPLOY_SERVICE_ACCOUNT
- RUNTIME_SERVICE_ACCOUNT

## Bloqueos pendientes

No continuar con otras tareas.

Esperar aprobación antes de modificar la infraestructura restante.
