# Crear banner ASCII para el backend

## Objetivo

Crear un banner ASCII profesional para el backend que se muestre al iniciar la aplicación Spring Boot.

El texto principal debe ser:

```text
Treasury System
```

## Requisitos

- Generar el banner utilizando caracteres ASCII compatibles con Spring Boot.
- El banner debe ser limpio, legible y profesional.
- Debe verse correctamente en terminales con fuente monoespaciada.
- Mantener un ancho aproximado de entre 80 y 100 caracteres.
- No utilizar caracteres Unicode especiales ni emojis.
- Debe funcionar correctamente dentro de `src/main/resources/banner.txt`.
- El texto principal debe ser claramente **"Treasury System"**.

## Diseño

Debajo del título agrega una línea descriptiva como:

```text
School Treasury Management Platform
```

Y una línea adicional con:

```text
Spring Boot • PostgreSQL • React • JWT
```

## Restricciones

- No modificar ningún otro archivo del proyecto.
- No cambiar la configuración de Spring Boot.
- No modificar `application.properties` ni `application.yml`.
- Crear únicamente el archivo:

```text
backend/src/main/resources/banner.txt
```

## Validación

1. Inicia el backend.
2. Verifica que el banner se visualice correctamente en la consola.
3. Comprueba que no existan caracteres corruptos o problemas de alineación.
4. Ajusta el diseño si es necesario para mantener una apariencia limpia.

## Resultado esperado

Entrega un informe breve indicando:

- Herramienta o fuente ASCII utilizada.
- Vista previa del banner generado.
- Confirmación de que el banner se muestra correctamente al iniciar Spring Boot.
- Confirmación de que no se modificó ningún otro archivo del proyecto.
