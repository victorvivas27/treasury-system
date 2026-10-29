import { lockBodyScroll } from "@/shared/ui/dialog/scrollLock";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserRepositoryImpl } from "@/core/C-infra/repositories/user/UserRepositoryImpl";
import { isAdminRole } from "@/core/A-domain/entities/user/User";
import { useAuth } from "@/presentation/context/AuthContext";
import { useDashboardResource } from "@/presentation/pages/dashboard/dashboardCache";
import { clearProfileCache, getProfileResource } from "./profileCache";
import { ProfileFamilySkeleton } from "@/shared/ui/skeleton/DataSkeletons";
import { UserAvatar } from "@/shared/ui/user-avatar/UserAvatar";
import { profileAvatars } from "virtual:avatar-catalog";
import { FiBookOpen, FiCheck, FiClock, FiEdit2, FiHeart, FiPhone, FiUpload,
  FiLogOut, FiUser, FiUsers, FiX } from "react-icons/fi";
import "./ProfilePage.css";

export { clearProfileCache };

const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const shortDate = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const LOGOUT_COUNTDOWN_MS = 3000;
const LOGOUT_PROGRESS_INTERVAL_MS = 50;
const NAME_PATTERN = /^[A-Za-zÁÉÍÓÚáéíóúñÑ ]{3,100}$/;

const ProfileAvatarOption = ({ avatar, index, disabled, onSelect }: {
  avatar: string; index: number; disabled: boolean; onSelect: () => void;
}) => {
  const [loaded, setLoaded] = useState(false);
  return <button type="button" disabled={disabled} aria-label={`Seleccionar avatar ${index + 1}`}
    className={loaded ? "is-loaded" : "is-loading"} onClick={onSelect}>
    {!loaded && <span className="profile-avatar-option-skeleton" aria-hidden="true" />}
    <img className={loaded ? "is-loaded" : ""} src={avatar} alt=""
      width="56" height="56" loading="lazy" decoding="async" fetchPriority="low"
      onLoad={() => setLoaded(true)} onError={() => setLoaded(true)} />
  </button>;
};

export const ProfilePage = () => {
  const { user, syncUser, logout } = useAuth();
  const navigate = useNavigate();
  const [editingName, setEditingName] = useState(false);
  const editModalRef = useRef<HTMLElement>(null);
  const [nameInput, setNameInput] = useState(user?.nombre ?? "");
  const [nameError, setNameError] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoSuccess, setPhotoSuccess] = useState("");
  const [photoProgress, setPhotoProgress] = useState(0);
  const profileYear = new Date().getFullYear();
  const profileResource = useMemo(() => getProfileResource(user?.correo ?? "anonymous", profileYear),
    [profileYear, user?.correo]);
  const profileState = useDashboardResource(profileResource, false);
  const familyProfile = profileState.data?.familyId ? profileState.data : null;
  const familyLoading = Boolean(user?.correo && !profileState.data && !profileState.error);
  const familyError = profileState.error
    ? "No fue posible cargar los datos familiares. Intenta nuevamente." : "";
  const [reloadProfile, setReloadProfile] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutProgress, setLogoutProgress] = useState(0);
  const logoutTimer = useRef<number | undefined>(undefined);
  const logoutProgressTimer = useRef<number | undefined>(undefined);
  const users = useMemo(() => new UserRepositoryImpl(), []);

  useEffect(() => {
    if (!editingName) setNameInput(user?.nombre ?? "");
  }, [editingName, user?.nombre]);

  useEffect(() => {
    setPhoneInput(familyProfile?.guardianPhone ?? "");
    setPhoneError("");
  }, [editingName, familyProfile?.guardianPhone]);

  const cancelNameEdit = () => {
    if (savingName || savingPhoto) return;
    setNameInput(user?.nombre ?? "");
    setNameError("");
    setPhoneError("");
    setEditingName(false);
  };

  useEffect(() => {
    if (!editingName) return;
    const previousFocus = document.activeElement;
    const unlockScroll = lockBodyScroll();
    const modal = editModalRef.current;
    modal?.querySelector<HTMLButtonElement>(".profile-edit-modal__close")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (modal?.getAttribute("aria-busy") === "true") return;
        event.preventDefault();
        setNameError("");
        setEditingName(false);
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(modal?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled):not([type="file"]), [tabindex="0"]',
      ) ?? []);
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      unlockScroll();
      document.removeEventListener("keydown", handleKey);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [editingName]);

  const saveName = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || savingName || savingPhoto) return;
    const normalizedName = nameInput.trim().replace(/\s+/g, " ");
    const normalizedPhone = phoneInput.replace(/[\s()-]/g, "");
    const phoneChanged = Boolean(familyProfile) && normalizedPhone !==
      (familyProfile?.guardianPhone ?? "").replace(/[\s()-]/g, "");
    setPhoneError("");
    if (!NAME_PATTERN.test(normalizedName)) {
      setNameError("Ingresa entre 3 y 100 letras. Puedes usar espacios y tildes.");
      return;
    }
    if (familyProfile && !/^\+?[0-9]{8,15}$/.test(normalizedPhone)) {
      setPhoneError("Usa entre 8 y 15 dígitos y + opcional al inicio.");
      return;
    }
    if (normalizedName === user.nombre && !phoneChanged) {
      cancelNameEdit();
      return;
    }
    setSavingName(true);
    setNameError("");
    try {
      const updatedUser = await users.updateSelfProfile(user.id, {
        nombre: normalizedName,
        ...(phoneChanged && { telefono: normalizedPhone }),
      });
      syncUser(updatedUser);
      if (phoneChanged && profileState.data) {
        profileResource.set({ ...profileState.data, guardianPhone: normalizedPhone });
      }
      setEditingName(false);
    } catch {
      setNameError("No fue posible actualizar tu perfil. Intenta nuevamente.");
    } finally {
      setSavingName(false);
    }
  };

  const applyPhoto = async (action: () => Promise<NonNullable<typeof user>>) => {
    setSavingPhoto(true); setPhotoProgress(0); setPhotoError(""); setPhotoSuccess("");
    try {
      syncUser(await action());
      setPhotoProgress(100);
      setPhotoSuccess("Foto de perfil actualizada correctamente.");
    }
    catch { setPhotoError("No fue posible actualizar la foto. Revisa el archivo e intenta nuevamente."); }
    finally { setSavingPhoto(false); }
  };

  const uploadPhoto = (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoSuccess("");
      setPhotoError("Usa una imagen JPG, PNG o WEBP de hasta 5 MB."); return;
    }
    void applyPhoto(() => users.uploadProfileImage(file, setPhotoProgress));
  };

  const clearLogoutTimers = () => {
    if (logoutTimer.current !== undefined) {
      window.clearTimeout(logoutTimer.current);
      logoutTimer.current = undefined;
    }
    if (logoutProgressTimer.current !== undefined) {
      window.clearInterval(logoutProgressTimer.current);
      logoutProgressTimer.current = undefined;
    }
  };

  const cancelLogout = () => {
    if (loggingOut) return;
    clearLogoutTimers();
    setLogoutPending(false);
    setLogoutProgress(0);
  };

  const executeLogout = async () => {
    clearLogoutTimers();
    setLogoutPending(false);
    setLogoutProgress(100);
    setLoggingOut(true);
    try {
      await logout();
      navigate("/", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogout = () => {
    if (loggingOut) return;
    if (logoutPending) {
      cancelLogout();
      return;
    }
    setLogoutPending(true);
    setLogoutProgress(0);
    logoutProgressTimer.current = window.setInterval(() => {
      setLogoutProgress(current =>
        Math.min(100, current + (LOGOUT_PROGRESS_INTERVAL_MS / LOGOUT_COUNTDOWN_MS) * 100));
    }, LOGOUT_PROGRESS_INTERVAL_MS);
    logoutTimer.current = window.setTimeout(() => {
      void executeLogout();
    }, LOGOUT_COUNTDOWN_MS);
  };

  useEffect(() => () => clearLogoutTimers(), []);

  useEffect(() => {
    if (user?.correo) void profileResource.load(reloadProfile > 0);
  }, [profileResource, reloadProfile, user?.correo]);

  const name = user?.nombre ?? "Usuario";
  const pending = familyProfile?.obligations.filter(item => item.status === "PENDIENTE") ?? [];
  const pendingAmount = pending.reduce((total, item) => total + item.amount, 0);
  const paymentMode = familyProfile?.mode ?? familyProfile?.obligations[0]?.mode;

  return <main className="profile-page">
    <article className="profile-card" aria-label="Perfil de usuario">
      <section className="profile-identity" aria-label="Identidad">
        <span className="profile-identity-glow" aria-hidden="true" />
        <div className="profile-summary">
          <UserAvatar user={user} className="profile-avatar" />
          <div className="profile-copy">
            <div className="profile-name-row">
              <h1 id="profile-name">{name}</h1>
              <button type="button" className="profile-edit-name"
                onClick={() => { setPhotoError(""); setPhotoSuccess(""); setEditingName(true); }}
                aria-label="Editar perfil">
                <FiEdit2 aria-hidden="true" /> Editar perfil
              </button>
            </div>
            {user?.correo && <p className="profile-username">{user.correo}</p>}
            <span className="profile-role">{isAdminRole(user?.rol) ? "Administrador" : "Usuario"}</span>
          </div>
        </div>
      </section>

      <section className="profile-real-data profile-account-data" aria-label="Datos de la cuenta">
        <div><span>Tu espacio personal</span><h2>Estado de la cuenta</h2></div>
        <div className="profile-account-actions">
          <strong className={`profile-account-status ${user?.enabled ? "is-active" : "is-inactive"}`}>
            {user?.enabled ? <FiCheck /> : <FiX />}{user?.enabled ? "Activa" : "Inactiva"}
          </strong>
          <button type="button" className={`profile-logout-button ${logoutPending ? "is-counting" : ""}`}
            disabled={loggingOut} onClick={handleLogout}>
            <span className="profile-logout-button__progress"
              style={{ width: `${logoutProgress}%` }} aria-hidden="true" />
            <FiLogOut aria-hidden="true" />
            <span>{loggingOut ? "Cerrando..." : logoutPending ? "Cancelar cierre" : "Cerrar sesión"}</span>
          </button>
        </div>
      </section>

      {familyLoading && !familyProfile && <ProfileFamilySkeleton />}

      {!familyLoading && familyError && <section className="profile-family-feedback" role="alert">
        <p>{familyError}</p>
        <button type="button" onClick={() => setReloadProfile(value => value + 1)}>
          Reintentar
        </button>
      </section>}

      {!familyLoading && !familyError && !familyProfile && <section
        className="profile-family-feedback">
        <p>Esta cuenta todavía no tiene una familia vinculada.</p>
      </section>}

      {!familyLoading && familyProfile && <section className="profile-real-data profile-family-data"
        aria-label="Vinculación familiar">
        <header>
          <div><span>Vinculación familiar</span><h2>{familyProfile.familyCode}</h2></div>
          <strong className={`profile-principal-badge ${familyProfile.primaryGuardian
            ? "is-primary" : "is-secondary"}`}>
            {familyProfile.primaryGuardian ? "Apoderado principal" : "Apoderado secundario"}
          </strong>
        </header>
        <dl className="profile-data-grid">
          <div><i><FiUser /></i><dt>Alumno</dt><dd>{familyProfile.studentName}</dd></div>
          <div><i><FiUsers /></i><dt>Parentesco</dt><dd>{familyProfile.relationship}</dd></div>
          <div><i><FiPhone /></i><dt>Teléfono</dt><dd>{familyProfile.guardianPhone}</dd></div>
        </dl>

        {familyProfile.studentMessage?.trim() && <aside className="profile-student-message">
          <span>Información importante del alumno</span>
          <p>{familyProfile.studentMessage}</p>
        </aside>}

        <div className="profile-contribution-statuses">
          {(["CEPA", "SOLIDARIA"] as const).map(type => {
            const payment = type === "CEPA"
              ? familyProfile.cepa
              : familyProfile.solidarity;
            const paid = payment?.status === "PAID";
            return <div className={`profile-contribution-status ${paid ? "is-current" : "has-debt"}`}
              key={type}>
              <i>{type === "CEPA" ? <FiUsers /> : <FiHeart />}</i>
              <span><small>{type === "CEPA" ? "Aporte CEPA" : "Fondo de Apoyo por Fallecimiento"}</small>
                <strong>{paid ? "Pagado" : "Pendiente"}</strong></span>
              <em>{paid ? <FiCheck /> : <FiClock />}</em>
            </div>;
          })}
        </div>

        {paymentMode && <section aria-labelledby="profile-course-fee-title" className={`profile-payment-status ${familyProfile.obligations.length > 0 && pending.length === 0 ? "is-current" : "has-debt"}`}>
          <header className="profile-payment-heading">
            <i className="profile-payment-icon" aria-hidden="true"><FiBookOpen /></i>
            <div><h3 id="profile-course-fee-title">Cuota del curso</h3>
              <span className="profile-payment-mode">{paymentMode === "PERSONALIZADA" ? "Personalizada" : paymentMode === "ANUAL" ? "Cuota única" : "Dos cuotas"}</span>
            </div>
            <strong className="profile-payment-summary">{familyProfile.obligations.length === 0
              ? "Modalidad asignada"
              : pending.length === 0 ? "Al día"
              : `${pending.length} ${pending.length === 1 ? "cuota pendiente" : "cuotas pendientes"}`}</strong>
          </header>
          {familyProfile.obligations.length > 0 && <ul className="profile-course-installments" aria-label="Detalle de cuotas">
            {familyProfile.obligations.map(item => <li key={item.id}>
              <b className="profile-installment-concept">{item.concept}</b>
              <span className="profile-installment-date"><small>Vencimiento</small>
                {item.dueDate ? <time dateTime={item.dueDate}>{shortDate.format(new Date(`${item.dueDate}T00:00:00`))}</time> : <span>Sin fecha</span>}
              </span>
              <strong className="profile-installment-amount">{money.format(item.amount)}</strong>
              <span className={`profile-installment-status ${item.status === "PAGADA" ? "is-paid" : "is-pending"}`}>
                {item.status === "PAGADA" ? <FiCheck aria-hidden="true" /> : <FiClock aria-hidden="true" />}
                {item.status === "PAGADA" ? "Pagada" : "Pendiente"}
              </span>
            </li>)}
          </ul>}
          {pending.length > 0 && <div className="profile-payment-total">
            <span>Total pendiente</span><b>{money.format(pendingAmount)}</b>
          </div>}
        </section>}
      </section>}
    </article>

    {editingName && <div className="profile-edit-backdrop" role="presentation"
      onMouseDown={event => { if (event.target === event.currentTarget) cancelNameEdit(); }}>
      <section ref={editModalRef} className="profile-edit-modal" role="dialog" aria-modal="true"
        aria-busy={savingName || savingPhoto}
        aria-labelledby="profile-edit-title">
        <header>
          <div className="profile-edit-modal__heading">
            <span><FiUser aria-hidden="true" /></span>
            <div><h2 id="profile-edit-title">Editar perfil</h2>
              <p>Actualiza tu información personal.</p></div>
          </div>
          <button type="button" className="profile-edit-modal__close" disabled={savingName || savingPhoto}
            onClick={cancelNameEdit} aria-label="Cerrar edición">
            <FiX aria-hidden="true" />
          </button>
        </header>

        <div className="profile-edit-modal__identity">
          <UserAvatar user={user} className="profile-avatar" />
          <div><strong>{name}</strong><small>{user?.correo}</small></div>
        </div>

        <section className="profile-photo-content" aria-label="Cambiar foto de perfil">
          <div className="profile-edit-section-title">
            <span>Cambiar foto de perfil</span>
            <small>Selecciona un avatar, sube una imagen o usa tus iniciales.</small>
          </div>
          <div><strong>Avatares</strong><div className="profile-avatar-gallery">
            {profileAvatars.map((avatar, index) => <ProfileAvatarOption key={avatar}
              avatar={avatar} index={index} disabled={savingPhoto}
              onSelect={() => void applyPhoto(() => users.selectAvatar(avatar))} />)}
          </div></div>
          <label className="profile-upload-button"><FiUpload /> Subir una foto
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={savingPhoto}
              onChange={event => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                uploadPhoto(file);
              }} /></label>
          <small>JPG, PNG o WEBP · máximo 5 MB</small>
          <button type="button" className="profile-initials-button" disabled={savingPhoto}
            onClick={() => void applyPhoto(() => users.resetProfileImage())}>Usar mis iniciales</button>
          {(savingPhoto || photoSuccess) && <div className="profile-photo-progress"
            role="progressbar" aria-label="Progreso de actualización de foto" aria-valuemin={0}
            aria-valuemax={100} aria-valuenow={photoProgress}>
            <div className="profile-photo-progress__track">
              <span style={{ width: `${photoProgress}%` }} />
            </div>
            <strong>{photoProgress}%</strong>
          </div>}
          {savingPhoto && <p className="profile-photo-feedback is-loading" role="status">
            <span className="profile-photo-spinner" aria-hidden="true" />
            Actualizando foto...
          </p>}
          {!savingPhoto && photoSuccess && <p className="profile-photo-feedback is-success"
            role="status">{photoSuccess}</p>}
          {photoError && <p className="profile-edit-form__error" role="alert">{photoError}</p>}
        </section>

        <form className="profile-edit-form" onSubmit={saveName}>
          <div className="profile-edit-section-title">
            <span>Información personal</span>
            <small>Los cambios se verán en todo el sistema.</small>
          </div>
          <label htmlFor="profile-name-input">Nombre completo</label>
          <input id="profile-name-input" value={nameInput} maxLength={100}
            autoComplete="name" aria-invalid={Boolean(nameError)} aria-describedby={nameError
              ? "profile-name-error" : "profile-name-help"}
            onChange={event => { setNameInput(event.target.value); setNameError(""); }} />
          {nameError
            ? <p id="profile-name-error" className="profile-edit-form__error" role="alert">{nameError}</p>
            : <small id="profile-name-help">Usa entre 3 y 100 letras.</small>}
          {familyProfile && <div className="profile-edit-phone">
            <label htmlFor="profile-phone-input">Teléfono</label>
            <input id="profile-phone-input" type="tel" inputMode="tel" autoComplete="tel"
              value={phoneInput} maxLength={24} placeholder="Ej.: +56912345678"
              disabled={savingName || savingPhoto} aria-invalid={Boolean(phoneError)}
              aria-describedby={phoneError ? "profile-phone-error" : "profile-phone-help"}
              onChange={event => { setPhoneInput(event.target.value); setPhoneError(""); }} />
            {phoneError ? <p id="profile-phone-error" className="profile-edit-form__error" role="alert">{phoneError}</p>
              : <small id="profile-phone-help">Número de contacto de tu apoderado vinculado.</small>}
          </div>}
          <footer>
            <button type="button" className="profile-edit-cancel" disabled={savingName || savingPhoto}
              onClick={cancelNameEdit}>Cancelar</button>
            <button type="submit" className="profile-edit-save" disabled={savingName}>
              {savingName ? "Guardando..." : "Guardar cambios"}
            </button>
          </footer>
        </form>
      </section>
    </div>}

  </main>;
};
