SELECT COUNT(*) AS organizations FROM organizations;
SELECT COUNT(*) AS users FROM users;
SELECT COUNT(*) AS users_without_organization FROM users WHERE organization_id IS NULL;
SELECT COUNT(*) AS alumnos_without_organization FROM alumnos WHERE organization_id IS NULL;
SELECT COUNT(*) AS familias_without_organization FROM familias WHERE organization_id IS NULL;
SELECT COUNT(*) AS expenses_without_organization FROM treasury_expenses WHERE organization_id IS NULL;
SELECT COUNT(*) AS incomes_without_organization FROM treasury_incomes WHERE organization_id IS NULL;
SELECT COUNT(*) AS events_without_organization FROM school_events WHERE organization_id IS NULL;
