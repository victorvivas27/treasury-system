import { useEffect, useMemo, useState } from "react";
import type { TreasuryProfile } from "@/core/A-domain/entities/treasury/Treasury";
import { TreasuryUseCases } from "@/core/B-application/use-cases/treasury/TreasuryUseCases";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { UserRepositoryImpl } from "@/core/C-infra/repositories/user/UserRepositoryImpl";
import { useAuth } from "@/presentation/context/AuthContext";
import { Skeleton } from "@/shared/ui/skeleton/Skeleton";
import { UserAvatar } from "@/shared/ui/user-avatar/UserAvatar";
import { FiEdit2, FiUpload, FiUser, FiX } from "react-icons/fi";
import "./ProfilePage.css";

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

const PROFILE_CACHE_TTL_MS = 60_000;
type ProfileCacheEntry = { data: TreasuryProfile; expiresAt: number };
const profileCache = new Map<string, ProfileCacheEntry>();
const PROFILE_AVATARS = Array.from({ length: 6 }, (_, index) =>
  `/avatars/avatar-${String(index + 1).padStart(2, "0")}.png`);
const NAME_PATTERN = /^[A-Za-zÁÉÍÓÚáéíóúñÑ ]{3,100}$/;

export const clearProfileCache = () => profileCache.clear();

const ProfileAvatarOption = ({ avatar, index, disabled, onSelect }: {
  avatar: string; index: number; disabled: boolean; onSelect: () => void;
}) => {
  const [loaded, setLoaded] = useState(false);
  return <button type="button" disabled={disabled} aria-label={`Seleccionar avatar ${index + 1}`}
    className={loaded ? "is-loaded" : "is-loading"} onClick={onSelect}>
    {!loaded && <span className="profile-avatar-option-skeleton" aria-hidden="true" />}
    <img className={loaded ? "is-loaded" : ""} src={avatar} alt=""
      onLoad={() => setLoaded(true)} onError={() => setLoaded(true)} />
  </button>;
};

const loadCachedProfile = async (key: string, load: () => Promise<TreasuryProfile>,
  forceRefresh: boolean) => {
  const cached = profileCache.get(key);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.data;

  const data = await load();
  profileCache.set(key, { data, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS });
  return data;
};

export const ProfilePage = () => {
  const { user, syncUser } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.nombre ?? "");
  const [nameError, setNameError] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoSuccess, setPhotoSuccess] = useState("");
  const [photoProgress, setPhotoProgress] = useState(0);
  const [familyProfile, setFamilyProfile] = useState<TreasuryProfile | null>(null);
  const [familyLoading, setFamilyLoading] = useState(true);
  const [familyError, setFamilyError] = useState("");
  const [reloadProfile, setReloadProfile] = useState(0);
  const treasury = useMemo(() => new TreasuryUseCases(new TreasuryRepositoryImpl()), []);
  const users = useMemo(() => new UserRepositoryImpl(), []);

  useEffect(() => {
    if (!editingName) setNameInput(user?.nombre ?? "");
  }, [editingName, user?.nombre]);

  const cancelNameEdit = () => {
    setNameInput(user?.nombre ?? "");
    setNameError("");
    setEditingName(false);
  };

  const saveName = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    const normalizedName = nameInput.trim().replace(/\s+/g, " ");
    if (!NAME_PATTERN.test(normalizedName)) {
      setNameError("Ingresa entre 3 y 100 letras. Puedes usar espacios y tildes.");
      return;
    }
    if (normalizedName === user.nombre) {
      cancelNameEdit();
      return;
    }
    setSavingName(true);
    setNameError("");
    try {
      const updatedUser = await users.update(user.id, {
        nombre: normalizedName, correo: user.correo, rol: user.rol,
        enabled: user.enabled, accountNonLocked: user.accountNonLocked,
      });
      syncUser(updatedUser);
      setEditingName(false);
    } catch {
      setNameError("No fue posible actualizar tu nombre. Intenta nuevamente.");
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

  useEffect(() => {
    let active = true;
    const loadFamilyProfile = async () => {
      if (!user?.correo) {
        setFamilyLoading(false);
        return;
      }
      setFamilyLoading(true);
      setFamilyError("");
      const currentYear = new Date().getFullYear();
      const cacheKey = `${user.correo}:${currentYear}`;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const profile = await loadCachedProfile(cacheKey,
            () => treasury.profile(currentYear), reloadProfile > 0);
          if (active) setFamilyProfile(profile.familyId ? profile : null);
          if (active) setFamilyLoading(false);
          return;
        } catch {
          if (attempt === 0) {
            await new Promise(resolve => window.setTimeout(resolve, 600));
            continue;
          }
          if (active) {
            setFamilyProfile(null);
            setFamilyError("No fue posible cargar los datos familiares. Intenta nuevamente.");
          }
        }
      }
      if (active) setFamilyLoading(false);
    };
    void loadFamilyProfile();
    return () => { active = false; };
  }, [reloadProfile, treasury, user?.correo]);

  const name = user?.nombre ?? "Usuario";
  const pending = familyProfile?.obligations.filter(item => item.status === "PENDIENTE") ?? [];
  const pendingAmount = pending.reduce((total, item) => total + item.amount, 0);
  const paymentMode = familyProfile?.mode ?? familyProfile?.obligations[0]?.mode;

  return <main className="profile-page">
    <article className="profile-card" aria-label="Perfil de usuario">
      <section className="profile-identity" aria-label="Identidad">
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
            <span className="profile-role">{user?.rol === "ADMIN" ? "Administrador" : "Usuario"}</span>
          </div>
        </div>
      </section>

      <section className="profile-real-data" aria-label="Datos de la cuenta">
        <h2>Estado de la cuenta</h2>
        <strong className={`profile-account-status ${user?.enabled ? "is-active" : "is-inactive"}`}>
          {user?.enabled ? "Activa" : "Inactiva"}
        </strong>
      </section>

      {familyLoading && <section className="profile-real-data profile-family-data profile-family-skeleton"
        aria-label="Cargando vinculación familiar" role="status">
        <header><div><span>Vinculación familiar</span>
          <Skeleton width="6rem" height="1rem" /></div>
          <Skeleton className="profile-badge-skeleton" /></header>
        <dl className="profile-data-grid">
          {["Alumno", "Parentesco", "Teléfono"].map(label => <div key={label}>
            <dt>{label}</dt><dd><Skeleton width={label === "Alumno" ? "72%" : "58%"}
              height=".74rem" /></dd></div>)}
        </dl>
        <aside className="profile-student-message profile-student-message-skeleton">
          <Skeleton width="11rem" height=".6rem" />
          <Skeleton width="78%" height=".72rem" />
        </aside>
        <div className="profile-contribution-statuses">
          {["cepa", "solidarity"].map(type =>
            <div className="profile-contribution-status profile-contribution-skeleton" key={type}>
              <Skeleton width="5.5rem" height=".56rem" />
              <Skeleton width="3.2rem" height=".65rem" />
            </div>)}
        </div>
        <div className="profile-payment-status profile-payment-skeleton">
          <div><Skeleton width="8.5rem" height=".62rem" />
            <Skeleton width="6rem" height=".8rem" />
            <div className="profile-course-installments">
              {[0, 1].map(item => <span key={item}>
                <Skeleton width="4.5rem" height=".62rem" />
                <Skeleton width="3.8rem" height=".58rem" />
                <Skeleton width="3.5rem" height=".58rem" />
                <Skeleton width="3rem" height=".56rem" />
              </span>)}
            </div>
          </div>
        </div>
      </section>}

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
          <div><dt>Alumno</dt><dd>{familyProfile.studentName}</dd></div>
          <div><dt>Parentesco</dt><dd>{familyProfile.relationship}</dd></div>
          <div><dt>Teléfono</dt><dd>{familyProfile.guardianPhone}</dd></div>
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
              <span>{type === "CEPA" ? "Aporte CEPA" : "Aporte solidario"}</span>
              <strong>{paid ? "Pagado" : "Pendiente"}</strong>
            </div>;
          })}
        </div>

        {paymentMode && <div className={`profile-payment-status ${familyProfile.obligations.length > 0 && pending.length === 0 ? "is-current" : "has-debt"}`}>
          <div>
            <span>Cuota del curso · {paymentMode === "ANUAL" ? "Cuota única" : "Dos cuotas"}</span>
            <strong>{familyProfile.obligations.length === 0
              ? "Modalidad asignada"
              : pending.length === 0 ? "Al día"
              : `${pending.length} ${pending.length === 1 ? "cuota pendiente" : "cuotas pendientes"}`}</strong>
            {familyProfile.obligations.length > 0 && <div className="profile-course-installments">
              {familyProfile.obligations.map(item => <span key={item.id}>
                <b>{item.concept}</b>
                <small>{item.dueDate
                  ? shortDate.format(new Date(`${item.dueDate}T00:00:00`))
                  : "Sin fecha"}</small>
                <small>{money.format(item.amount)}</small>
                <em className={item.status === "PAGADA" ? "is-paid" : "is-pending"}>
                  {item.status === "PAGADA" ? "Pagada" : "Pendiente"}
                </em>
              </span>)}
            </div>}
          </div>
          {pending.length > 0 && <div className="profile-payment-total">
            <span>Total cuota</span><b>{money.format(pendingAmount)}</b>
          </div>}
        </div>}
      </section>}
    </article>

    {editingName && <div className="profile-edit-backdrop" role="presentation"
      onMouseDown={event => { if (event.target === event.currentTarget) cancelNameEdit(); }}>
      <section className="profile-edit-modal" role="dialog" aria-modal="true"
        aria-labelledby="profile-edit-title">
        <header>
          <div className="profile-edit-modal__heading">
            <span><FiUser aria-hidden="true" /></span>
            <div><h2 id="profile-edit-title">Editar perfil</h2>
              <p>Actualiza tu información personal.</p></div>
          </div>
          <button type="button" className="profile-edit-modal__close" disabled={savingName}
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
            {PROFILE_AVATARS.map((avatar, index) => <ProfileAvatarOption key={avatar}
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
          <small>JPG, PNG o WEBP \u00b7 m\u00e1ximo 5 MB</small>
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
          <input id="profile-name-input" value={nameInput} autoFocus maxLength={100}
            autoComplete="name" aria-invalid={Boolean(nameError)} aria-describedby={nameError
              ? "profile-name-error" : "profile-name-help"}
            onChange={event => { setNameInput(event.target.value); setNameError(""); }} />
          {nameError
            ? <p id="profile-name-error" className="profile-edit-form__error" role="alert">{nameError}</p>
            : <small id="profile-name-help">Usa entre 3 y 100 letras.</small>}
          <footer>
            <button type="button" className="profile-edit-cancel" disabled={savingName}
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
