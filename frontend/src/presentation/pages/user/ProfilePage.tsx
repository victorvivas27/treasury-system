import { useEffect, useMemo, useState } from "react";
import type { TreasuryProfile } from "@/core/A-domain/entities/treasury/Treasury";
import { TreasuryUseCases } from "@/core/B-application/use-cases/treasury/TreasuryUseCases";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { useAuth } from "@/presentation/context/AuthContext";
import { Skeleton } from "@/shared/ui/skeleton/Skeleton";
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

export const ProfilePage = () => {
  const { user } = useAuth();
  const [familyProfile, setFamilyProfile] = useState<TreasuryProfile | null>(null);
  const [familyLoading, setFamilyLoading] = useState(true);
  const [familyError, setFamilyError] = useState("");
  const [reloadProfile, setReloadProfile] = useState(0);
  const treasury = useMemo(() => new TreasuryUseCases(new TreasuryRepositoryImpl()), []);

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
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const profile = await treasury.profile(currentYear);
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
  const initials = name.split(/\s+/).slice(0, 2)
    .map(part => part.charAt(0).toUpperCase()).join("");
  const pending = familyProfile?.obligations.filter(item => item.status === "PENDIENTE") ?? [];
  const pendingAmount = pending.reduce((total, item) => total + item.amount, 0);
  const paymentMode = familyProfile?.mode ?? familyProfile?.obligations[0]?.mode;

  return <main className="profile-page">
    <article className="profile-card" aria-labelledby="profile-name">
      <section className="profile-identity" aria-label="Identidad">
        <div className="profile-summary">
          <div className="profile-avatar" aria-label={`Iniciales de ${name}`}>{initials}</div>
          <div className="profile-copy">
            <h1 id="profile-name">{name}</h1>
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

      {familyLoading && <section className="profile-real-data profile-family-data"
        aria-label="Cargando vinculación familiar" role="status">
        <header><div><span>Vinculación familiar</span>
          <Skeleton width="8rem" height="1.2rem" /></div></header>
        <dl className="profile-data-grid">
          {["Alumno", "Parentesco", "Teléfono"].map(label => <div key={label}>
            <dt>{label}</dt><dd><Skeleton width="7rem" height=".8rem" /></dd></div>)}
        </dl>
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
  </main>;
};
