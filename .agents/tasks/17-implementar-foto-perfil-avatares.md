# Tarea: Implementar foto de perfil y avatares en Tesorería

## Objetivo

Implementar en la aplicación de Tesorería la posibilidad de cambiar la imagen de perfil para todos los usuarios autenticados, incluyendo roles **ADMIN** y **APODERADO**.

Actualmente, cuando un usuario no tiene foto, la interfaz muestra sus dos iniciales. Ese comportamiento debe mantenerse como **fallback**.

El usuario deberá poder elegir entre:

1. Un avatar predefinido disponible en `public/avatars`.
2. Subir una imagen propia, que debe almacenarse en el bucket de **Google Cloud Storage** que ya utiliza la aplicación.
3. No seleccionar ninguna imagen y continuar utilizando las iniciales actuales.

---

## 1. Revisar implementación existente antes de modificar

Antes de realizar cambios:

- Revisar cómo está implementada actualmente la pantalla de perfil.
- Identificar el componente que renderiza las iniciales del usuario.
- Revisar la entidad/modelo de usuario y los DTO relacionados.
- Revisar la autenticación actual y cómo se obtiene el usuario autenticado.
- Revisar la integración existente con Google Cloud Storage y **reutilizarla**. No crear una segunda configuración de Storage si ya existe una.
- Revisar cómo se exponen actualmente los archivos almacenados en el bucket.
- Mantener la arquitectura, convenciones, manejo de errores y estilos existentes del proyecto.

No realizar refactors generales que no sean necesarios para esta funcionalidad.

---

## 2. Avatares predefinidos

Los avatares predeterminados estarán disponibles en el frontend dentro de:

```text
public/avatars/
```

Ejemplo:

```text
public/
└── avatars/
    ├── avatar-01.png
    ├── avatar-02.png
    ├── avatar-03.png
    ├── avatar-04.png
    └── avatar-05.png
```

La aplicación debe obtener/renderizar esta lista para que el usuario pueda seleccionar uno.

Cuando el usuario elija un avatar predeterminado, guardar una referencia como:

```text
/avatars/avatar-03.png
```

No subir los avatares predeterminados a Google Cloud Storage.

No aceptar desde el cliente cualquier ruta arbitraria como avatar. Validar que el avatar seleccionado pertenezca al catálogo permitido de `public/avatars`.

---

## 3. Foto personalizada

Agregar en la pantalla de perfil una opción para que el usuario pueda seleccionar una imagen desde su dispositivo.

Aceptar únicamente formatos de imagen definidos por la aplicación, preferentemente:

```text
JPG
JPEG
PNG
WEBP
```

Aplicar validaciones tanto en frontend como en backend.

El backend debe ser la autoridad final para validar:

- tipo MIME permitido;
- extensión/formato cuando corresponda;
- tamaño máximo del archivo;
- archivo vacío o inválido.

Usar como tamaño máximo inicial **5 MB**, salvo que el proyecto ya tenga una política común diferente para uploads.

---

## 4. Google Cloud Storage

Las imágenes personalizadas deben almacenarse utilizando la integración existente con Google Cloud Storage.

No utilizar el nombre o email del usuario como identificador de carpeta.

### No usar

```text
avatars/victor/perfil.png
```

### Usar

```text
avatars/users/{userId}/{uuid}.{extension}
```

Ejemplo:

```text
avatars/users/8f29c34a-9d42-4e91-a32d/73f00f90-acde-4a3e-profile.webp
```

El `userId` debe ser el identificador único existente del usuario.

El nombre del objeto debe ser generado por el backend y no debe confiar en el nombre original enviado por el navegador.

Esto debe evitar colisiones y problemas de caché cuando el usuario cambia su foto.

---

## 5. Modelo de datos

Analizar el modelo existente antes de crear una migración.

La solución debe permitir distinguir entre:

```text
INITIALS
PREDEFINED_AVATAR
CUSTOM_IMAGE
```

Una implementación posible es agregar al usuario campos equivalentes a:

```java
private String profileImageUrl;

@Enumerated(EnumType.STRING)
private ProfileImageType profileImageType;
```

Y:

```java
public enum ProfileImageType {
    INITIALS,
    PREDEFINED_AVATAR,
    CUSTOM_IMAGE
}
```

Los nombres exactos deben adaptarse a las convenciones actuales del proyecto.

Si la aplicación utiliza Flyway, crear la migración correspondiente siguiendo la numeración existente. No modificar migraciones históricas ya aplicadas.

### Estados esperados

Sin imagen personalizada:

```text
profileImageType = INITIALS
profileImageUrl = null
```

Avatar predefinido:

```text
profileImageType = PREDEFINED_AVATAR
profileImageUrl = /avatars/avatar-03.png
```

Foto subida por el usuario:

```text
profileImageType = CUSTOM_IMAGE
profileImageUrl = referencia/URL correspondiente al objeto de Google Cloud Storage
```

Si resulta más seguro con la arquitectura existente, almacenar el **object key/path** del bucket en vez de una URL pública permanente y resolver la URL de acceso mediante el mecanismo que ya utilice el proyecto.

---

## 6. Backend

Crear o adaptar endpoints para operar sobre el **usuario autenticado**.

No recibir un `userId` arbitrario desde el frontend para modificar la propia foto de perfil.

Una API posible es:

### Seleccionar avatar

```http
PATCH /api/users/me/avatar
Content-Type: application/json
```

```json
{
  "avatar": "/avatars/avatar-03.png"
}
```

El backend debe validar que el avatar pertenezca al catálogo permitido.

### Subir foto personalizada

```http
POST /api/users/me/profile-image
Content-Type: multipart/form-data
```

Campo:

```text
file
```

Flujo:

```text
Frontend
   ↓
Backend Spring Boot
   ↓
Validación
   ↓
Google Cloud Storage
   ↓
Actualizar usuario en DB
   ↓
Responder perfil actualizado
```

### Volver a iniciales

Agregar una operación que permita eliminar/restablecer la foto y volver al comportamiento original de iniciales. Puede ser, según las convenciones existentes:

```http
DELETE /api/users/me/profile-image
```

Al realizar esta operación:

```text
profileImageType = INITIALS
profileImageUrl = null
```

Si existía una imagen personalizada anterior en Cloud Storage, eliminarla cuando sea seguro hacerlo y cuando no esté referenciada por otro recurso.

---

## 7. Reemplazo de imágenes y limpieza del bucket

Evitar acumular archivos huérfanos cada vez que un usuario cambia su foto.

Al reemplazar una foto personalizada:

1. Subir la nueva imagen.
2. Actualizar correctamente la referencia del usuario.
3. Una vez confirmada la actualización, intentar eliminar la imagen personalizada anterior.

No eliminar archivos de `public/avatars`.

Si falla la eliminación del archivo anterior pero el cambio de perfil fue exitoso, manejar el error según las convenciones de logging del proyecto sin dejar al usuario con el perfil roto.

---

## 8. Perfil devuelto por la API

Actualizar los DTO/responses necesarios para que el frontend pueda conocer como mínimo:

```text
profileImageType
profileImageUrl
```

No romper los contratos existentes innecesariamente.

El perfil debe seguir incluyendo nombre/apellido u otros datos necesarios para calcular las iniciales cuando `profileImageUrl` sea `null`.

---

## 9. Frontend

Modificar la pantalla de perfil de ADMIN y APODERADO reutilizando el mismo componente/lógica siempre que sea posible.

Mostrar:

- imagen/avatar actual;
- botón u opción **Cambiar foto de perfil**;
- galería de avatares predefinidos;
- opción **Subir una foto**;
- opción para volver a usar las iniciales.

Ejemplo conceptual:

```text
             [ Foto actual ]

         Cambiar foto de perfil

 [ Elegir avatar ]   [ Subir una foto ]

 ---------------------------------------

 Avatares

 [1] [2] [3] [4] [5] [6]

 ---------------------------------------

 Subir desde tu dispositivo
 JPG, PNG o WEBP · máximo 5 MB

 [ Seleccionar imagen ]

 [ Usar mis iniciales ]
```

La implementación visual debe respetar el design system y los componentes existentes de Tesorería.

Debe funcionar correctamente en desktop y mobile.

---

## 10. Renderizado global del avatar

Localizar todos los lugares relevantes donde actualmente se muestran las iniciales del usuario, por ejemplo:

- perfil;
- header/navbar;
- menú del usuario;
- sidebar, si corresponde.

Centralizar, si la arquitectura lo permite, el renderizado en un componente reutilizable, por ejemplo `UserAvatar`.

Comportamiento:

```text
profileImageUrl disponible
        ↓
mostrar imagen

profileImageUrl null/no disponible
        ↓
mostrar iniciales actuales
```

Si una imagen no puede cargarse, mostrar las iniciales como fallback para evitar un avatar roto en la interfaz.

---

## 11. Seguridad

La funcionalidad debe cumplir estas condiciones:

- Solo usuarios autenticados pueden modificar su propia imagen.
- ADMIN y APODERADO tienen acceso a la funcionalidad para su propio perfil.
- No permitir modificar la foto de otro usuario pasando otro ID.
- No exponer credenciales de Google Cloud Storage en el frontend.
- No confiar únicamente en las validaciones del frontend.
- Validar tipo y tamaño en backend.
- Generar el object name en backend.
- Evitar path traversal y nombres de objetos construidos directamente desde input del usuario.
- Mantener las reglas de autorización existentes.

---

## 12. Compatibilidad con usuarios existentes

La migración debe ser compatible con todos los usuarios actuales.

Después del deploy, un usuario existente que nunca configuró una imagen debe continuar viendo exactamente sus iniciales actuales.

No requerir migración manual de fotos para usuarios existentes.

---

## 13. Tests

Agregar tests siguiendo la estrategia existente del proyecto.

Cubrir al menos:

- usuario sin foto continúa utilizando iniciales;
- selección válida de avatar predeterminado;
- rechazo de un avatar que no pertenece al catálogo;
- upload de imagen válida;
- rechazo de archivo demasiado grande;
- rechazo de MIME/formato no permitido;
- actualización de foto existente;
- volver de avatar/foto a iniciales;
- usuario autenticado solo modifica su propio perfil;
- comportamiento correcto para ADMIN;
- comportamiento correcto para APODERADO.

No eliminar ni desactivar tests existentes para hacer pasar la implementación.

---

## 14. Criterios de aceptación

La tarea se considera terminada cuando:

- [ ] ADMIN puede cambiar su imagen desde su perfil.
- [ ] APODERADO puede cambiar su imagen desde su perfil.
- [ ] Se pueden seleccionar avatares desde `public/avatars`.
- [ ] Se puede subir una foto personalizada.
- [ ] Las fotos personalizadas se almacenan en el bucket existente de Google Cloud Storage.
- [ ] Los objetos utilizan una ruta basada en el ID único del usuario.
- [ ] El backend valida tipo y tamaño del archivo.
- [ ] La foto seleccionada aparece después de actualizar/refrescar la sesión o perfil.
- [ ] El avatar se actualiza en los lugares relevantes de la interfaz.
- [ ] Se puede volver a las iniciales.
- [ ] Los usuarios existentes continúan viendo sus iniciales si no tienen avatar.
- [ ] No se exponen credenciales de Google Cloud Storage en frontend.
- [ ] Se evita dejar imágenes antiguas innecesarias en el bucket.
- [ ] La funcionalidad cuenta con tests.
- [ ] Los tests existentes continúan pasando.

---

## Importante para la implementación

Primero inspeccionar el código existente y adaptar esta especificación a la arquitectura real de Tesorería.

**No crear servicios, tablas, configuraciones de Google Cloud Storage o componentes duplicados si ya existe una implementación equivalente que pueda reutilizarse.**

Realizar cambios mínimos y focalizados en esta funcionalidad y mantener compatibilidad con el comportamiento actual de las iniciales.
