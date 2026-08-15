# Tarea: Convertir el Sistema de Tesorería en una PWA instalable

## Objetivo

Convertir el frontend actual del **Sistema de Tesorería** en una **Progressive Web App (PWA)** para que navegadores como Google Chrome la reconozcan como una aplicación instalable.

La aplicación debe poder instalarse en escritorio y dispositivos móviles, abrirse en modo independiente y conservar toda la funcionalidad actual.

## Requisitos generales

- No cambiar la lógica funcional existente.
- No romper autenticación, navegación, rutas ni llamadas al backend.
- Mantener compatibilidad con el despliegue actual en Netlify.
- Mantener compatibilidad con el backend desplegado en Google Cloud Run.
- La PWA debe funcionar correctamente en producción mediante HTTPS.
- No modificar innecesariamente componentes que no estén relacionados con esta tarea.

## 1. Crear el Web App Manifest

Crear un archivo:

`public/manifest.webmanifest`

Usar una configuración similar a esta:

```json
{
  "id": "/",
  "name": "Sistema de Tesorería",
  "short_name": "Tesorería",
  "description": "Sistema de gestión de tesorería",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#080d19",
  "theme_color": "#080d19",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

Ajustar colores si el proyecto ya tiene variables o colores oficiales definidos.

## 2. Crear los iconos de instalación

Usar el logo actual del Sistema de Tesorería para generar, como mínimo:

- `public/icons/icon-192.png`
- `public/icons/icon-512.png`

Si es posible, agregar también versiones `maskable` para Android.

Ejemplo:

```json
{
  "src": "/icons/icon-512-maskable.png",
  "sizes": "512x512",
  "type": "image/png",
  "purpose": "maskable"
}
```

Los iconos no deben quedar deformados, cortados ni con baja resolución.

## 3. Vincular el Manifest al HTML

En el archivo HTML principal agregar o verificar:

```html
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#080d19">
```

Agregar también los metadatos necesarios para dispositivos Apple/iPhone si todavía no existen:

```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Tesorería">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
```

## 4. Implementar Service Worker

Agregar un Service Worker compatible con la arquitectura actual del frontend.

Debe:

- Cachear únicamente recursos estáticos seguros del frontend.
- Permitir que la aplicación cargue correctamente después de una actualización.
- Evitar que versiones antiguas queden bloqueadas indefinidamente en caché.
- Limpiar cachés antiguas cuando se publique una nueva versión.
- No interferir con las rutas internas del frontend.
- No romper el funcionamiento de Netlify.

## 5. Seguridad del Service Worker

Esto es crítico.

NO cachear:

- Respuestas autenticadas.
- Tokens JWT.
- Cookies.
- Información financiera.
- Datos de usuarios.
- Datos de apoderados.
- Gastos.
- Recaudaciones.
- Notificaciones privadas.
- Respuestas del backend.
- Endpoints `/api/*`.
- Requests hacia Google Cloud Run.
- Requests `POST`, `PUT`, `PATCH` o `DELETE`.

Para endpoints del backend, usar siempre la red normalmente.

El Service Worker debe limitar el caché principalmente a archivos como:

- HTML base cuando corresponda.
- JavaScript compilado.
- CSS.
- Fuentes.
- Logos.
- Iconos.
- Imágenes estáticas públicas.

## 6. Registro del Service Worker

Registrar el Service Worker desde el punto de entrada adecuado del frontend.

El registro debe ejecutarse únicamente en entornos compatibles y no debe provocar errores en desarrollo.

Ejemplo conceptual:

```javascript
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js");
  });
}
```

Adaptar la implementación al framework y estructura reales del proyecto.

## 7. Instalación desde Chrome

La configuración final debe permitir que Chrome reconozca la aplicación como instalable.

Comprobar que:

- El manifest se carga sin errores.
- Los iconos se cargan correctamente.
- `start_url` funciona.
- `scope` funciona.
- `display` es `standalone`.
- La aplicación funciona mediante HTTPS.
- El Service Worker se registra correctamente.
- Chrome puede ofrecer la opción de instalar la aplicación.

## 8. Comportamiento al instalarla

Después de instalarse:

- Debe aparecer con el nombre `Sistema de Tesorería` o `Tesorería`.
- Debe utilizar el logo oficial como icono.
- Debe abrirse en una ventana independiente.
- No debe mostrarse como una pestaña normal de Chrome cuando se inicia desde el icono instalado.
- Debe iniciar en la ruta correcta.
- Login y logout deben seguir funcionando.
- Todas las rutas internas deben funcionar.
- Las llamadas al backend deben seguir funcionando normalmente.

## 9. Netlify

Revisar que la configuración PWA sea compatible con Netlify.

No eliminar ni romper las reglas existentes de redirección necesarias para una SPA.

Si el proyecto utiliza React Router u otro router del lado cliente, conservar la redirección hacia `index.html`.

El Service Worker, manifest e iconos deben servirse correctamente desde la raíz pública.

## 10. Actualizaciones de la aplicación

Implementar una estrategia segura para que cuando se publique una nueva versión en Netlify:

- El usuario reciba los archivos nuevos.
- No permanezca indefinidamente una versión antigua.
- Se eliminen caches obsoletos.
- No se pierdan sesiones ni datos por una actualización incorrecta.

No implementar actualizaciones agresivas que puedan interrumpir una operación que el usuario esté realizando.

## 11. Verificación final

Antes de dar la tarea por terminada, comprobar:

1. La aplicación compila correctamente.
2. No hay errores nuevos de TypeScript/JavaScript.
3. No hay errores del Service Worker en consola.
4. `manifest.webmanifest` responde correctamente.
5. Los iconos existen y se visualizan.
6. Chrome DevTools > Application > Manifest reconoce la aplicación.
7. Chrome DevTools > Application > Service Workers muestra el Service Worker activo.
8. La app puede instalarse en Chrome de escritorio.
9. La app puede agregarse a la pantalla de inicio en Android.
10. En iPhone/Safari puede utilizarse “Agregar a pantalla de inicio”.
11. Login funciona después de instalarla.
12. Logout funciona después de instalarla.
13. Las llamadas al backend continúan funcionando.
14. Ninguna respuesta privada del backend queda almacenada en Cache Storage.

## 12. Resultado esperado

El Sistema de Tesorería seguirá siendo una aplicación web desplegada en Netlify, pero además será reconocido como una PWA instalable.

El usuario podrá instalarla y abrirla desde un icono como una aplicación independiente, sin necesidad de crear una aplicación nativa ni cambiar el backend actual.

## Importante

Antes de modificar archivos, revisar la estructura real del frontend y utilizar las herramientas o librerías PWA que correspondan al stack actual.

Si el proyecto usa Vite, evaluar una integración compatible con Vite en lugar de implementar una solución manual innecesariamente.

No asumir tecnologías que no estén presentes en el repositorio.

Al finalizar, indicar claramente:

- Qué archivos fueron creados.
- Qué archivos fueron modificados.
- Cómo probar la instalación localmente.
- Cómo comprobar la instalación en producción.
- Qué estrategia de caché fue implementada.
- Confirmar explícitamente que los datos privados y las llamadas `/api/*` no se almacenan en caché.
