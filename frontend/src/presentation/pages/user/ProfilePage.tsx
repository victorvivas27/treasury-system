import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/presentation/context/AuthContext";
import "./ProfilePage.css";

const TABS = ["Proyectos", "Guardados"] as const;
type ProfileTab = (typeof TABS)[number];

interface EditableProfile {
  nombre: string;
  username: string;
  bio: string;
}

const CONTENT: Record<ProfileTab, string[]> = {
  Proyectos: ["Control de cuotas", "Portal de familias", "Reporte anual", "Panel de tesorería", "Registro escolar", "Calendario de pagos"],
  Guardados: ["Presupuesto 2026", "Resumen mensual", "Directorio de familias"],
};

export const ProfilePage = () => {
  const { user } = useAuth();
  const initialProfile = useMemo<EditableProfile>(() => ({
    nombre: user?.nombre ?? "Martina Rojas",
    username: user?.correo.split("@")[0] ?? "martina.rojas",
    bio: "Organizo proyectos y finanzas para fortalecer nuestra comunidad.",
  }), [user]);
  const [profile, setProfile] = useState(initialProfile);
  const [draft, setDraft] = useState(initialProfile);
  const [activeTab, setActiveTab] = useState<ProfileTab>("Proyectos");
  const [isEditing, setIsEditing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const initials = profile.nombre.split(/\s+/).slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase()).join("");

  useEffect(() => {
    if (isEditing) nameInputRef.current?.focus();
  }, [isEditing]);

  useEffect(() => {
    if (!showToast) return;
    const timer = window.setTimeout(() => setShowToast(false), 3000);
    return () => window.clearTimeout(timer);
  }, [showToast]);

  const openEditor = () => {
    setDraft(profile);
    setIsEditing(true);
  };

  const saveProfile = (event: FormEvent) => {
    event.preventDefault();
    setProfile({
      nombre: draft.nombre.trim(),
      username: draft.username.trim().replace(/^@/, ""),
      bio: draft.bio.trim(),
    });
    setIsEditing(false);
    setShowToast(true);
  };

  return (
    <main className="profile-page">
      <article className="profile-card" aria-labelledby="profile-name">
        <section className="profile-identity" aria-label="Identidad">
          <div className="profile-summary">
            <div className="profile-avatar" aria-label={`Iniciales de ${profile.nombre}`}>{initials}</div>
            <div className="profile-copy">
              <h1 id="profile-name">{profile.nombre}</h1>
              <p className="profile-username">@{profile.username}</p>
              <p className="profile-bio">{profile.bio}</p>
            </div>
          </div>
          <button className="profile-edit-button" type="button" onClick={openEditor}>Editar Perfil</button>
        </section>

        <section className="profile-stats" aria-label="Métricas del perfil">
          <div><strong>127</strong><span>Proyectos</span></div>
          <div><strong>48</strong><span>Seguidores</span></div>
          <div><strong>23</strong><span>Siguiendo</span></div>
        </section>

        <section className="profile-content" aria-label="Contenido del perfil">
          <div className="profile-tabs" role="tablist" aria-label="Contenido">
            {TABS.map((tab) => (
              <button
                key={tab}
                id={`tab-${tab.toLowerCase()}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls="profile-panel"
                tabIndex={activeTab === tab ? 0 : -1}
                className={activeTab === tab ? "is-active" : ""}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <div id="profile-panel" className="profile-panel" role="tabpanel" aria-labelledby={`tab-${activeTab.toLowerCase()}`}>
            {CONTENT[activeTab].map((title) => (
              <article className="profile-project" key={title}>
                <div className="profile-project-placeholder" aria-hidden="true" />
                <h2>{title}</h2>
                <p>{activeTab === "Proyectos" ? "Proyecto activo" : "Guardado para después"}</p>
              </article>
            ))}
          </div>
        </section>
      </article>

      {isEditing && (
        <div
          className="profile-modal-overlay"
          onMouseDown={() => setIsEditing(false)}
          onKeyDown={(event) => event.key === "Escape" && setIsEditing(false)}
        >
          <section
            className="profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="edit-profile-title">Editar perfil</h2>
            <form onSubmit={saveProfile}>
              <label htmlFor="profile-edit-name">Nombre</label>
              <input ref={nameInputRef} id="profile-edit-name" value={draft.nombre}
                onChange={(event) => setDraft({ ...draft, nombre: event.target.value })} required maxLength={100} />
              <label htmlFor="profile-edit-username">@usuario</label>
              <input id="profile-edit-username" value={draft.username}
                onChange={(event) => setDraft({ ...draft, username: event.target.value })} required maxLength={40} />
              <label htmlFor="profile-edit-bio">Bio</label>
              <textarea id="profile-edit-bio" value={draft.bio}
                onChange={(event) => setDraft({ ...draft, bio: event.target.value })} rows={3} maxLength={160} />
              <div className="profile-modal-actions">
                <button type="button" className="profile-cancel-button" onClick={() => setIsEditing(false)}>Cancelar</button>
                <button type="submit" className="profile-save-button">Guardar cambios</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showToast && <div className="profile-toast" role="status" aria-live="polite">Perfil actualizado correctamente</div>}
    </main>
  );
};
