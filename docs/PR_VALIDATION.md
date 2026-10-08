# Una sola ejecución para validar los PR

`00-pr-validation.yml` es el único workflow disparado por los PR hacia `dev` y
`main`, incluidos los PR creados por Release Please. En Actions aparece como
**PR Validation**. Cuando GitHub exige autorización para un PR creado por el bot,
se aprueba esta ejecución y sus jobs se ejecutan dentro de ella.

Las cinco comprobaciones se conservan como workflows reutilizables. La selección
por archivos ejecuta frontend, backend, Bruno y versionado según corresponda;
commits y título del PR siempre se validan. Un cambio de workflows ejecuta todas
las áreas. El resultado **PR validation result** falla si falla o se cancela una
comprobación necesaria.

Para PR de `dev` a `main` dentro del mismo repositorio, el título se sincroniza
con la primera línea del último commit de `dev` antes de validarlo. También se
actualiza al añadir commits. Los otros PR conservan su título. El job que cambia
el título tiene permiso de escritura sobre PR y no descarga ni ejecuta código
del repositorio; la validación de commits mantiene permisos de solo lectura.
Si el último commit tiene un título sin prefijo convencional (por ejemplo un
merge), se antepone `chore:` para mantener un título válido.

GitHub puede exigir otra aprobación si el bot añade un nuevo commit. Este cambio
agrupa las ejecuciones por actualización, sin eliminar la aprobación de GitHub.
Las ejecuciones de push, el proceso de release y los despliegues siguen usando
sus triggers existentes.

Si se configuran checks obligatorios en las reglas de rama, usar el nuevo check
**PR validation result**. Los nombres de los jobs reutilizados aparecen anidados
bajo PR Validation, por lo que no deben mantenerse checks antiguos que ya no
se disparan por PR.

## Validación local

Usando las herramientas temporales del workflow de versionado:

```sh
node scripts/test-versioning.cjs
node --test scripts/test-auto-release.cjs scripts/test-pr-validation.cjs
```
