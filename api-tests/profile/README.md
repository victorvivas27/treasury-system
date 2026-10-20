# Edición del teléfono propio

Ejecutar únicamente con backend y cuenta de prueba aislados. La petición modifica
el nombre y teléfono: no usar una cuenta real ni producción.

Definir en Bruno `Url_Base`, `profileUserId`, `profileToken`, `profileName` y
`profilePhone`. El token debe pertenecer al usuario indicado, dentro del curso
del apoderado vinculado. No guardar tokens o credenciales en esta colección.

`PUT /users/{id}/profile` admite `nombre` y `telefono` opcional. Si se omite
`telefono`, conserva el número. Si se incluye, debe tener entre 8 y 15 dígitos,
con `+` opcional al inicio. El teléfono se guarda en el apoderado asociado al
correo del usuario dentro de su curso; la respuesta sigue siendo `UserResponseDTO`.

Tras el PUT, consultar `GET /tesoreria/perfil?year=<año>` para comprobar
`guardianPhone`. La cuenta debe tener familia vinculada para ese detalle.
Las pruebas automáticas de backend cubren persistencia, rechazo de formato
inválido y aislamiento entre cursos con el mismo correo.
