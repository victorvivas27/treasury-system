import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  FiAlertTriangle, FiBookOpen, FiCalendar, FiCheckCircle, FiEdit3, FiEye, FiEyeOff,
  FiPlus, FiRefreshCw, FiMail, FiShield, FiTrash2, FiUserPlus, FiUsers, FiXCircle,
} from "react-icons/fi";
import type {
  CreateOrganizationAdminPayload,
  Organization,
  OrganizationAdmin,
} from "@/core/A-domain/entities/organization/Organization";
import { OrganizationRepositoryImpl } from
  "@/core/C-infra/repositories/organization/OrganizationRepositoryImpl";
import { Button } from "@/shared/ui/button/Button";
import { EmptyState } from "@/shared/ui/emptystate/EmptyState";
import { FeedbackState } from "@/shared/ui/feedback/FeedbackState";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import "./AdministrationsPage.css";

const EMPTY_ADMIN: CreateOrganizationAdminPayload = { name: "", email: "", password: "" };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const CURRENT_YEAR = new Date().getFullYear();

const slugify = (value: string) => value.normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 150);

const adminIsAvailable = (admin: OrganizationAdmin) => admin.enabled && admin.accountNonLocked;

export const AdministrationsPage = () => {
  const repository = useMemo(() => new OrganizationRepositoryImpl(), []);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [admins, setAdmins] = useState<Record<number, OrganizationAdmin[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [alert, setAlert] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [initialAdmin, setInitialAdmin] = useState(EMPTY_ADMIN);
  const [adminTarget, setAdminTarget] = useState<Organization | null>(null);
  const [additionalAdmin, setAdditionalAdmin] = useState(EMPTY_ADMIN);
  const [statusTarget, setStatusTarget] = useState<Organization | null>(null);
  const [emailTarget, setEmailTarget] = useState<Organization | null>(null);
  const [emailBranding, setEmailBranding] = useState({ senderName: "", replyToEmail: "" });
  const [courseTarget, setCourseTarget] = useState<Organization | null>(null);
  const [courseForm, setCourseForm] = useState({ name: "", schoolYear: CURRENT_YEAR });
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteName, setDeleteName] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [showInitialPassword, setShowInitialPassword] = useState(false);
  const [showAdditionalPassword, setShowAdditionalPassword] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const listed = await repository.getAll();
      const adminEntries = await Promise.all(listed.map(async organization => [
        organization.id,
        await repository.getAdmins(organization.id),
      ] as const));
      setOrganizations(listed);
      setAdmins(Object.fromEntries(adminEntries));
    } catch {
      setError("No fue posible cargar las administraciones de curso.");
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => { void load(); }, [load]);

  const updateOrganizationName = (value: string) => {
    setOrganizationName(value);
    if (!slugEdited) setSlug(slugify(value));
  };

  const validAdmin = (value: CreateOrganizationAdminPayload) => value.name.trim().length >= 3
    && EMAIL_PATTERN.test(value.email.trim()) && PASSWORD_PATTERN.test(value.password);

  const createAdministration = async (event: FormEvent) => {
    event.preventDefault();
    if (!organizationName.trim() || !slug || !validAdmin(initialAdmin)) {
      setAlert({ type: "error", message: "Completa el curso y usa un administrador válido. La contraseña debe incluir mayúscula, minúscula, número y símbolo." });
      return;
    }
    setSaving(true);
    let created: Organization | null = null;
    try {
      created = await repository.create({
        name: organizationName.trim(), slug, type: "COURSE",
        senderName: organizationName.trim(),
        replyToEmail: initialAdmin.email.trim().toLowerCase(),
      });
      await repository.createAdmin(created.id, {
        name: initialAdmin.name.trim(),
        email: initialAdmin.email.trim().toLowerCase(),
        password: initialAdmin.password,
      });
      setOrganizationName("");
      setSlug("");
      setSlugEdited(false);
      setInitialAdmin(EMPTY_ADMIN);
      setAlert({ type: "success", message: "Administración y administrador creados correctamente." });
      await load();
    } catch {
      await load();
      setAlert({
        type: "error",
        message: created
          ? "El curso fue creado, pero no se pudo crear su administrador. Puedes agregarlo desde la tarjeta del curso."
          : "No fue posible crear la administración. Revisa que el identificador y el correo no estén en uso.",
      });
    } finally {
      setSaving(false);
    }
  };

  const createAdditionalAdmin = async (event: FormEvent) => {
    event.preventDefault();
    if (!adminTarget || !validAdmin(additionalAdmin)) {
      setAlert({ type: "error", message: "Ingresa nombre, correo y una contraseña segura." });
      return;
    }
    setSaving(true);
    try {
      await repository.createAdmin(adminTarget.id, {
        name: additionalAdmin.name.trim(),
        email: additionalAdmin.email.trim().toLowerCase(),
        password: additionalAdmin.password,
      });
      setAdminTarget(null);
      setAdditionalAdmin(EMPTY_ADMIN);
      setAlert({ type: "success", message: "Administrador agregado correctamente." });
      await load();
    } catch {
      setAlert({ type: "error", message: "No se pudo agregar el administrador. Revisa si el correo ya está registrado." });
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async () => {
    if (!statusTarget) return;
    setSaving(true);
    try {
      await repository.setActive(statusTarget.id, !statusTarget.active);
      setAlert({ type: "success", message: statusTarget.active
        ? "Administración desactivada." : "Administración reactivada." });
      setStatusTarget(null);
      await load();
    } catch {
      setAlert({ type: "error", message: "No fue posible cambiar el estado de la administración." });
      setStatusTarget(null);
    } finally {
      setSaving(false);
    }
  };

  const saveEmailBranding = async (event: FormEvent) => {
    event.preventDefault();
    if (!emailTarget || !emailBranding.senderName.trim()
        || !EMAIL_PATTERN.test(emailBranding.replyToEmail.trim())) {
      setAlert({ type: "error", message: "Ingresa un nombre de remitente y un correo de respuesta válido." });
      return;
    }
    setSaving(true);
    try {
      await repository.updateEmailBranding(emailTarget.id, {
        senderName: emailBranding.senderName.trim(),
        replyToEmail: emailBranding.replyToEmail.trim().toLowerCase(),
      });
      setEmailTarget(null);
      setAlert({ type: "success", message: "Configuración de correo actualizada." });
      await load();
    } catch {
      setAlert({ type: "error", message: "No fue posible actualizar el remitente del curso." });
    } finally {
      setSaving(false);
    }
  };

  const saveCourse = async (event: FormEvent) => {
    event.preventDefault();
    if (!courseTarget || !courseForm.name.trim()
        || courseForm.schoolYear < 2000 || courseForm.schoolYear > 2100) return;
    setSaving(true);
    try {
      await repository.updateCourse(courseTarget.id, {
        name: courseForm.name.trim(),
        schoolYear: courseForm.schoolYear,
      });
      setCourseTarget(null);
      setAlert({ type: "success", message: "Nombre y año escolar actualizados correctamente." });
      await load();
    } catch {
      setAlert({ type: "error", message: "No fue posible actualizar el curso y su año escolar." });
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (organization: Organization) => {
    setDeleteTarget(organization);
    setDeleteStep(1);
    setDeleteName("");
    setDeleteConfirmation("");
  };

  const closeDelete = () => {
    if (saving) return;
    setDeleteTarget(null);
    setDeleteStep(1);
    setDeleteName("");
    setDeleteConfirmation("");
  };

  const verifyDeleteName = (event: FormEvent) => {
    event.preventDefault();
    if (!deleteTarget || deleteName !== deleteTarget.name) return;
    setDeleteStep(2);
  };

  const deleteAdministration = async (event: FormEvent) => {
    event.preventDefault();
    if (!deleteTarget || deleteName !== deleteTarget.name
        || deleteConfirmation !== "ELIMINAR") return;
    setSaving(true);
    try {
      await repository.delete(deleteTarget.id, {
        organizationName: deleteName,
        confirmation: deleteConfirmation,
      });
      const deletedName = deleteTarget.name;
      setDeleteTarget(null);
      setDeleteStep(1);
      setDeleteName("");
      setDeleteConfirmation("");
      setAlert({ type: "success", message: `La administración ${deletedName} y todos sus recursos fueron eliminados.` });
      await load();
    } catch {
      setAlert({ type: "error", message: "No fue posible eliminar la administración. No se borró ningún dato parcialmente." });
    } finally {
      setSaving(false);
    }
  };

  const courseOrganizations = organizations.filter(item => item.type === "COURSE");
  const totalAdmins = courseOrganizations.reduce((total, item) => total + (admins[item.id]?.length ?? 0), 0);

  if (error && organizations.length === 0) {
    return <FeedbackState message={error} onRefresh={() => void load()} />;
  }

  return <main className="administrations-page">
    <header className="administrations-header">
      <div>
        <p className="administrations-eyebrow"><FiShield /> Panel de superadministración</p>
        <h1>Administraciones de curso</h1>
        <p>Crea espacios independientes y entrega el acceso a sus administradores.</p>
      </div>
      <Button label={loading ? "Cargando" : "Recargar"} icon={<FiRefreshCw />}
        variant="secondary" loading={loading} onClick={() => void load()} />
    </header>

    <section className="administrations-summary" aria-label="Resumen">
      <article><FiBookOpen /><div><strong>{courseOrganizations.length}</strong><span>Cursos</span></div></article>
      <article><FiCheckCircle /><div><strong>{courseOrganizations.filter(item => item.active).length}</strong><span>Activos</span></div></article>
      <article><FiUsers /><div><strong>{totalAdmins}</strong><span>Administradores</span></div></article>
    </section>

    <section className="administration-create-card">
      <div className="administration-section-heading">
        <span><FiPlus /></span><div><h2>Nueva administración</h2>
          <p>Crea el curso y su primer administrador en un solo paso.</p></div>
      </div>
      <form onSubmit={createAdministration} className="administration-form" autoComplete="off">
        <fieldset>
          <legend>Datos del curso</legend>
          <label>Nombre del curso o administración
            <input value={organizationName} maxLength={80} required
              placeholder="Ej.: 4°A Colegio Los Alerces"
              onChange={event => updateOrganizationName(event.target.value)} />
            <small>El año {CURRENT_YEAR} se asignará automáticamente.</small>
          </label>
          <label>Identificador
            <input value={slug} maxLength={150} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              placeholder="4a-colegio-los-alerces"
              onChange={event => { setSlugEdited(true); setSlug(slugify(event.target.value)); }} />
            <small>Se usa internamente y no puede repetirse.</small>
          </label>
        </fieldset>
        <fieldset>
          <legend>Administrador inicial</legend>
          <label>Nombre completo
            <input value={initialAdmin.name} minLength={3} maxLength={100} required
              autoComplete="name" placeholder="Ej.: Ana Pérez"
              onChange={event => setInitialAdmin(current => ({ ...current, name: event.target.value }))} />
          </label>
          <label>Correo de acceso
            <input value={initialAdmin.email} type="email" maxLength={100} required
              autoComplete="off" name="new-administration-admin-email" placeholder="admin@correo.cl"
              onChange={event => setInitialAdmin(current => ({ ...current, email: event.target.value }))} />
          </label>
          <label>Contraseña temporal
            <span className="administration-password">
              <input value={initialAdmin.password} type={showInitialPassword ? "text" : "password"}
                required autoComplete="new-password" placeholder="Mínimo 8 caracteres"
                onChange={event => setInitialAdmin(current => ({ ...current, password: event.target.value }))} />
              <button type="button" aria-label={showInitialPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowInitialPassword(value => !value)}>
                {showInitialPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </span>
            <small>Mayúscula, minúscula, número y símbolo.</small>
          </label>
        </fieldset>
        <Button type="submit" label={saving ? "Creando" : "Crear administración"}
          icon={<FiUserPlus />} loading={saving} onClick={() => {}} />
      </form>
    </section>

    <section className="administrations-list" aria-labelledby="administrations-list-title">
      <div className="administration-section-heading">
        <span><FiBookOpen /></span><div><h2 id="administrations-list-title">Cursos registrados</h2>
          <p>Consulta sus responsables y controla su acceso al sistema.</p></div>
      </div>
      {!loading && courseOrganizations.length === 0
        ? <EmptyState title="Sin administraciones" message="Crea el primer curso usando el formulario superior." />
        : <div className="administration-grid">{courseOrganizations.map(organization =>
          <article className={`administration-card ${organization.active ? "is-active" : "is-inactive"}`}
            key={organization.id}>
            <header>
              <span className="administration-card-icon"><FiBookOpen /></span>
              <div><h3>{organization.courseName ?? organization.name}</h3>
                <code>{organization.slug} · {organization.schoolYear}</code></div>
              <span className="administration-status">{organization.active ? "Activa" : "Inactiva"}</span>
            </header>
            <div className="administration-admins">
              <h4><FiUsers /> Administradores</h4>
              {(admins[organization.id] ?? []).length === 0
                ? <p className="administration-no-admin">Este curso todavía no tiene administrador.</p>
                : (admins[organization.id] ?? []).map(admin => <div className="administration-admin" key={admin.id}>
                  <span>{admin.name.slice(0, 1)}</span>
                  <div><strong>{admin.name}</strong><small>{admin.email}</small></div>
                  <em className={adminIsAvailable(admin) ? "is-enabled" : "is-disabled"}>
                    {adminIsAvailable(admin) ? "Habilitado" : "Sin acceso"}
                  </em>
                </div>)}
              <div className="administration-email-summary">
                <FiMail /><div><strong>{organization.senderName ?? organization.name}</strong>
                  <small>Respuestas: {organization.replyToEmail ?? "Sin configurar"}</small></div>
              </div>
            </div>
            <footer>
              <button type="button" onClick={() => { setAdditionalAdmin(EMPTY_ADMIN); setAdminTarget(organization); }}
                disabled={!organization.active}><FiUserPlus /> Agregar administrador</button>
              <button type="button" onClick={() => {
                setEmailBranding({ senderName: organization.senderName ?? organization.name,
                  replyToEmail: organization.replyToEmail ?? "" });
                setEmailTarget(organization);
              }}><FiMail /> Configurar correo</button>
              <button type="button" onClick={() => {
                setCourseForm({ name: organization.courseName ?? organization.name,
                  schoolYear: organization.schoolYear });
                setCourseTarget(organization);
              }}><FiEdit3 /> Editar curso y año</button>
              <button type="button" className={organization.active ? "danger" : "success"}
                onClick={() => setStatusTarget(organization)}>
                {organization.active ? <FiXCircle /> : <FiCheckCircle />}
                {organization.active ? "Desactivar" : "Reactivar"}
              </button>
              <button type="button" className="danger administration-delete-button"
                onClick={() => openDelete(organization)}>
                <FiTrash2 /> Eliminar
              </button>
            </footer>
          </article>)}</div>}
    </section>

    {adminTarget && <div className="administration-admin-panel" role="dialog" aria-modal="true"
      aria-labelledby="additional-admin-title">
      <form onSubmit={createAdditionalAdmin}>
        <header><div><p>Nuevo administrador para</p><h2 id="additional-admin-title">{adminTarget.name}</h2></div>
          <button type="button" aria-label="Cerrar" onClick={() => setAdminTarget(null)}><FiXCircle /></button></header>
        <label>Nombre completo<input required minLength={3} maxLength={100} value={additionalAdmin.name}
          onChange={event => setAdditionalAdmin(current => ({ ...current, name: event.target.value }))} /></label>
        <label>Correo<input required type="email" maxLength={100} value={additionalAdmin.email}
          onChange={event => setAdditionalAdmin(current => ({ ...current, email: event.target.value }))} /></label>
        <label>Contraseña temporal<span className="administration-password">
          <input required type={showAdditionalPassword ? "text" : "password"} value={additionalAdmin.password}
            onChange={event => setAdditionalAdmin(current => ({ ...current, password: event.target.value }))} />
          <button type="button" aria-label={showAdditionalPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            onClick={() => setShowAdditionalPassword(value => !value)}>{showAdditionalPassword ? <FiEyeOff /> : <FiEye />}</button>
        </span></label>
        <div className="administration-admin-panel-actions">
          <Button type="submit" label="Crear administrador" icon={<FiUserPlus />} loading={saving} onClick={() => {}} />
          <Button type="button" label="Cancelar" variant="secondary" onClick={() => setAdminTarget(null)} />
        </div>
      </form>
    </div>}

    {emailTarget && <div className="administration-admin-panel" role="dialog" aria-modal="true"
      aria-labelledby="email-branding-title">
      <form onSubmit={saveEmailBranding}>
        <header><div><p>Correo de la administración</p>
          <h2 id="email-branding-title">{emailTarget.name}</h2></div>
          <button type="button" aria-label="Cerrar" onClick={() => setEmailTarget(null)}><FiXCircle /></button>
        </header>
        <p className="administration-email-help">La cuenta Gmail sigue siendo global. Aquí defines el nombre visible y dónde llegarán las respuestas.</p>
        <label>Nombre visible del remitente<input required maxLength={150}
          value={emailBranding.senderName}
          onChange={event => setEmailBranding(current => ({ ...current, senderName: event.target.value }))} /></label>
        <label>Correo para respuestas<input required type="email" maxLength={150}
          value={emailBranding.replyToEmail}
          onChange={event => setEmailBranding(current => ({ ...current, replyToEmail: event.target.value }))} /></label>
        <div className="administration-admin-panel-actions">
          <Button type="submit" label="Guardar configuración" icon={<FiMail />} loading={saving} onClick={() => {}} />
          <Button type="button" label="Cancelar" variant="secondary" onClick={() => setEmailTarget(null)} />
        </div>
      </form>
    </div>}

    {courseTarget && <div className="administration-admin-panel" role="dialog" aria-modal="true"
      aria-labelledby="course-settings-title">
      <form onSubmit={saveCourse}>
        <header><div><p>Configuración reservada al superadministrador</p>
          <h2 id="course-settings-title">Curso y año escolar</h2></div>
          <button type="button" aria-label="Cerrar" onClick={() => setCourseTarget(null)}>
            <FiXCircle />
          </button>
        </header>
        <p className="administration-email-help">El administrador del curso puede cambiar su nombre,
          pero solo tú puedes modificar el año escolar asignado.</p>
        <label>Nombre actual del curso<input required maxLength={80} value={courseForm.name}
          onChange={event => setCourseForm(current => ({ ...current, name: event.target.value }))} /></label>
        <label>Año escolar<span className="administration-year-input">
          <FiCalendar aria-hidden="true" />
          <input required type="number" min={2000} max={2100} value={courseForm.schoolYear}
            onChange={event => setCourseForm(current => ({ ...current,
              schoolYear: Number(event.target.value) }))} />
        </span></label>
        <p className="administration-year-warning"><FiAlertTriangle /> Cambiar el año afecta el período
          que se mostrará como vigente, pero no modifica las fechas ni los movimientos históricos.</p>
        <div className="administration-admin-panel-actions">
          <Button type="submit" label="Guardar curso y año" icon={<FiCalendar />}
            loading={saving} onClick={() => {}} />
          <Button type="button" label="Cancelar" variant="secondary"
            onClick={() => setCourseTarget(null)} />
        </div>
      </form>
    </div>}

    {deleteTarget && <div className="administration-admin-panel administration-delete-panel"
      role="dialog" aria-modal="true" aria-labelledby="delete-administration-title">
      <form onSubmit={deleteStep === 1 ? verifyDeleteName : deleteAdministration}>
        <header>
          <div><p>Verificación {deleteStep} de 2</p>
            <h2 id="delete-administration-title">Eliminar {deleteTarget.name}</h2></div>
          <button type="button" aria-label="Cerrar" disabled={saving} onClick={closeDelete}>
            <FiXCircle />
          </button>
        </header>
        <div className="administration-delete-warning">
          <FiAlertTriangle />
          <div><strong>Esta acción es definitiva</strong>
            <p>Se eliminarán administradores, usuarios, familias, alumnos, apoderados, tesorería, eventos, archivos, notificaciones y toda la información de este curso.</p></div>
        </div>
        {deleteStep === 1 ? <>
          <label>Escribe el nombre exacto para continuar
            <strong className="administration-delete-value">{deleteTarget.name}</strong>
            <input autoFocus required autoComplete="off" value={deleteName}
              onChange={event => setDeleteName(event.target.value)} />
          </label>
          <div className="administration-admin-panel-actions">
            <Button type="button" label="Cancelar" variant="secondary" onClick={closeDelete} />
            <Button type="submit" label="Continuar" variant="danger" icon={<FiAlertTriangle />}
              disabled={deleteName !== deleteTarget.name} onClick={() => {}} />
          </div>
        </> : <>
          <label>Última verificación: escribe <strong>ELIMINAR</strong>
            <input autoFocus required autoComplete="off" value={deleteConfirmation}
              onChange={event => setDeleteConfirmation(event.target.value)} />
          </label>
          <div className="administration-admin-panel-actions">
            <Button type="button" label="Volver" variant="secondary"
              disabled={saving} onClick={() => { setDeleteStep(1); setDeleteConfirmation(""); }} />
            <Button type="submit" label="Eliminar todo definitivamente" variant="danger"
              icon={<FiTrash2 />} loading={saving} disabled={deleteConfirmation !== "ELIMINAR"}
              onClick={() => {}} />
          </div>
        </>}
      </form>
    </div>}

    <ModalConfirm isOpen={Boolean(statusTarget)}
      title={statusTarget?.active ? "Desactivar administración" : "Reactivar administración"}
      message={statusTarget?.active
        ? `Los usuarios de ${statusTarget.name} no podrán ingresar hasta que la reactives.`
        : `Los usuarios de ${statusTarget?.name ?? "este curso"} recuperarán el acceso.`}
      confirmLabel={statusTarget?.active ? "Sí, desactivar" : "Sí, reactivar"}
      confirmVariant={statusTarget?.active ? "danger" : "primary"} isLoading={saving}
      onConfirm={() => void changeStatus()} onCancel={() => setStatusTarget(null)} />
    <ModalAlert isOpen={Boolean(alert)} message={alert?.message ?? ""} type={alert?.type ?? "success"}
      variant={alert?.type === "success" ? "toast" : "modal"} onClose={() => setAlert(null)} />
  </main>;
};
