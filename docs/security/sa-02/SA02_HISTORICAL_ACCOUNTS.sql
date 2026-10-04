-- PostgreSQL. Read-only review after V50. Run only with an authorized read-only
-- connection; no mutation, automatic disablement, or inference of illegitimacy.
-- Do not export passwords, token hashes, JWTs or invitation links.
BEGIN TRANSACTION READ ONLY;

WITH review AS (
    SELECT u.id AS user_id, u.code AS user_code, u.correo, u.organization_id,
           o.name AS organization_name, o.type AS organization_type,
           o.course_name, o.school_year, u.created_at,
           u.invited_guardian_id, u.invitation_accepted_at,
           ap.apoderado_id, ap.codigo AS guardian_code, ap.activo AS guardian_active,
           CASE
               WHEN o.id IS NULL THEN 'ORGANIZACION_INEXISTENTE'
               WHEN NOT o.active THEN 'ORGANIZACION_INACTIVA'
               WHEN o.type <> 'COURSE' AND NOT (o.type = 'LEGACY' AND o.slug = 'default')
                   THEN 'ORGANIZACION_NO_ES_CURSO'
               WHEN ap.apoderado_id IS NULL AND EXISTS (
                   SELECT 1 FROM apoderados other
                   WHERE LOWER(TRIM(other.email)) = LOWER(TRIM(u.correo))
                     AND other.organization_id <> u.organization_id
               ) THEN 'APODERADO_SOLO_EN_OTRO_CURSO_ORGANIZACION'
               WHEN ap.apoderado_id IS NULL THEN 'SIN_APODERADO_EN_ORGANIZACION'
               WHEN NOT ap.activo THEN 'APODERADO_INACTIVO'
               WHEN u.invited_guardian_id IS NOT NULL AND u.invited_guardian_id <> ap.apoderado_id
                   THEN 'IDENTIDAD_APODERADO_INCONSISTENTE'
               WHEN u.email_verified_at IS NULL THEN 'BUZON_NO_VERIFICADO'
               WHEN EXISTS (
                   SELECT 1 FROM familia_apoderados fa
                   LEFT JOIN familias f ON f.familia_id = fa.familia_id
                   LEFT JOIN alumnos a ON a.alumno_id = f.alumno_id
                   WHERE fa.apoderado_id = ap.apoderado_id
                     AND (f.familia_id IS NULL OR a.alumno_id IS NULL
                          OR f.organization_id <> u.organization_id
                          OR a.organization_id <> u.organization_id)
               ) THEN 'ASOCIACION_FAMILIAR_INCONSISTENTE'
               WHEN u.invitation_accepted_at IS NULL THEN 'ORIGEN_HISTORICO_REQUIERE_REVISION'
               WHEN NOT EXISTS (
                   SELECT 1 FROM familia_apoderados fa JOIN familias f ON f.familia_id = fa.familia_id
                   WHERE fa.apoderado_id = ap.apoderado_id AND f.activo
                     AND f.organization_id = u.organization_id
               ) THEN 'SIN_FAMILIA_ACTIVA_REVISAR_ASOCIACION'
               ELSE 'SIN_ALERTA_ESTRUCTURAL'
           END AS reason,
           (SELECT COUNT(*) FROM familia_apoderados fa JOIN familias f ON f.familia_id = fa.familia_id
             WHERE fa.apoderado_id = ap.apoderado_id AND f.activo
               AND f.organization_id = u.organization_id) AS active_families
    FROM users u
    LEFT JOIN organizations o ON o.id = u.organization_id
    LEFT JOIN apoderados ap ON ap.organization_id = u.organization_id
        AND LOWER(TRIM(ap.email)) = LOWER(TRIM(u.correo))
    WHERE u.rol = 'USER' AND u.enabled
)
SELECT * FROM review WHERE reason <> 'SIN_ALERTA_ESTRUCTURAL' ORDER BY organization_id, user_id;

-- Separate inventory: these are legitimate administrative roles, not guardian
-- self-enrollments. Confirm role assignments through administrative records.
SELECT u.id AS user_id, u.code, u.rol, u.organization_id, o.name AS organization_name,
       u.enabled, u.account_non_locked
FROM users u LEFT JOIN organizations o ON o.id = u.organization_id
WHERE u.rol IN ('ADMIN', 'SUPER_ADMIN') ORDER BY u.organization_id, u.id;

COMMIT;
