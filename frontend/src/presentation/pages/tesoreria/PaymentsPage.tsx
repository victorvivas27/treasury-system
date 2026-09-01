import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { FiCheck, FiClipboard, FiCreditCard, FiExternalLink, FiEye, FiUpload, FiX } from "react-icons/fi";
import { apiClient } from "@/core/D-config/api";
import { isAdminRole } from "@/core/A-domain/entities/user/User";
import { useAuth } from "@/presentation/context/AuthContext";
import { Skeleton } from "@/shared/ui/skeleton/Skeleton";
import "./PaymentsPage.css";

type BankAccount = { id?: number; schoolYear: number; accountHolderName: string; accountHolderRut: string;
  bankName: string; accountType: string; accountNumber: string; email: string };
type Payment = { id: number; amount: number; status: string; paidAt: string | null; originalFileName: string | null;
  submittedAt: string | null; rejectionReason: string | null };
type Installment = { id: number; concept: string; amount: number; dueDate: string; status: string; history: Payment[] };
type MyPayments = { schoolYear: number; totalAmount: number; allowedMode: "ANUAL" | "DOS_CUOTAS" | "AMBAS";
  studentName: string; selectedMode: "ANUAL" | "DOS_CUOTAS" | null; paidAmount: number;
  installments: Installment[]; bankAccount: BankAccount | null };
type Review = { id: number; studentName: string; guardianName: string; installment: string; amount: number;
  status: string; submittedAt: string | null; rejectionReason: string | null };

const base = "/tesoreria/pagos-transferencia";
const yearNow = new Date().getFullYear();
const money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
const friendly: Record<string, string> = { PENDIENTE: "Pendiente", EN_REVISION: "Comprobante enviado", PAGADA: "Pagada",
  PROOF_SUBMITTED: "Comprobante enviado", UNDER_REVIEW: "En revisión", PAID: "Pagado", REJECTED: "Rechazado" };
const emptyBank = (schoolYear: number): BankAccount => ({ schoolYear, accountHolderName: "", accountHolderRut: "",
  bankName: "", accountType: "", accountNumber: "", email: "" });

export const formatChileanRut = (rut: string) => {
  const normalizedRut = rut.replace(/[^0-9kK]/g, "").toUpperCase();
  if (normalizedRut.length < 2) return normalizedRut;

  const verificationDigit = normalizedRut.slice(-1);
  const body = normalizedRut.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${body}-${verificationDigit}`;
};

const formatBankAccountType = (accountType: string) => {
  const normalizedType = accountType.trim();
  const typeWithoutPrefix = normalizedType.replace(/^Cuenta(?:\s+de)?\s+/i, "").toLocaleLowerCase("es-CL");
  const bankAccountTypes: Record<string, string> = {
    corriente: "Cuenta Corriente",
    vista: "Cuenta Vista",
    ahorro: "Cuenta de Ahorro",
  };
  return bankAccountTypes[typeWithoutPrefix] ?? normalizedType;
};

export const PaymentsPage = () => {
  const { user } = useAuth();
  const admin = isAdminRole(user?.rol);
  const [year, setYear] = useState(yearNow);
  const [mine, setMine] = useState<MyPayments | null>(null);
  const [bank, setBank] = useState<BankAccount>(emptyBank(yearNow));
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState("");
  const [loadingMine, setLoadingMine] = useState(!admin);
  const [loadingAdmin, setLoadingAdmin] = useState(admin);
  const [busy, setBusy] = useState(false);
  const [uploadingInstallmentId, setUploadingInstallmentId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      if (admin) {
        setLoadingAdmin(true);
        const [setting, review] = await Promise.all([
          apiClient.get<BankAccount>(`${base}/cuenta-bancaria`, { params: { year } }).then(r => r.data).catch(() => emptyBank(year)),
          apiClient.get<Review[]>(`${base}/revision`, { params: { year, status: filter || undefined } }).then(r => r.data).catch(() => []),
        ]);
        setBank(setting); setReviews(review);
      } else {
        setLoadingMine(true);
        const [bankResult, paymentsResult] = await Promise.allSettled([
          apiClient.get<BankAccount>(`${base}/cuenta-bancaria`,
            { params: { year } }).then(response => response.data),
          apiClient.get<MyPayments>(`${base}/mis-pagos`,
            { params: { year } }).then(response => response.data),
        ]);
        const bankData = bankResult.status === "fulfilled" ? bankResult.value : null;
        setBank(bankData ?? emptyBank(year));
        if (paymentsResult.status === "rejected") {
          setMine(null);
          setError("No fue posible cargar la cuota anual de este año.");
          return;
        }
        const paymentsData = paymentsResult.value;
        setMine({ ...paymentsData, bankAccount: bankData ?? paymentsData.bankAccount });
      }
    } catch {
      setMine(null);
      setError("La cuenta bancaria está disponible, pero falta configurar la cuota anual de este año.");
    } finally {
      if (!admin) setLoadingMine(false);
      if (admin) setLoadingAdmin(false);
    }
  }, [admin, filter, year]);
  useEffect(() => { void load(); }, [load]);

  const flash = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 2200); };
  const copy = async (value: string, label: string) => { await navigator.clipboard.writeText(value); flash(`${label} copiado`); };
  const copyBank = (account: BankAccount) => {
    const text = [
      `${account.accountHolderName.trim()} .`,
      formatChileanRut(account.accountHolderRut),
      formatBankAccountType(account.accountType),
      account.accountNumber.trim(),
      account.bankName.trim(),
      account.email.trim(),
    ].join("\n");
    void copy(text, "Datos");
  };
  const copyAll = () => {
    if (!mine?.bankAccount) return;
    copyBank(mine.bankAccount);
  };
  const choose = async (mode: "ANUAL" | "DOS_CUOTAS") => {
    setBusy(true); setError("");
    try { setMine((await apiClient.post<MyPayments>(`${base}/mi-plan`, { year, mode })).data); flash("Plan de pago guardado"); }
    catch { setError("No fue posible guardar el plan."); } finally { setBusy(false); }
  };
  const upload = async (installmentId: number, file?: File) => {
    if (!file) return; const form = new FormData(); form.append("file", file); setUploadingInstallmentId(installmentId);
    try { await apiClient.post(`${base}/mis-cuotas/${installmentId}/comprobante`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }); await load(); flash("Comprobante enviado"); }
    catch { setError("No se pudo enviar. Usa un JPG, PNG o PDF dentro del límite permitido."); } finally { setUploadingInstallmentId(null); }
  };
  const saveBank = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true);
    try { setBank((await apiClient.put<BankAccount>(`${base}/cuenta-bancaria`, bank, { params: { year } })).data); flash("Datos bancarios guardados"); }
    catch { setError("Revisa los datos bancarios."); } finally { setBusy(false); }
  };
  const review = async (id: number, approve: boolean) => {
    const reason = approve ? undefined : window.prompt("Motivo del rechazo"); if (!approve && !reason?.trim()) return;
    setBusy(true);
    try { await apiClient.post(`${base}/${id}/${approve ? "aprobar" : "rechazar"}`, approve ? {} : { reason }); await load(); flash(approve ? "Pago aprobado" : "Pago rechazado"); }
    catch { setError("No fue posible revisar el pago."); } finally { setBusy(false); }
  };
  const openProof = async (id: number) => {
    const response = await apiClient.get<Blob>(`${base}/${id}/comprobante`, { responseType: "blob" });
    const url = URL.createObjectURL(response.data); window.open(url, "_blank", "noopener,noreferrer"); window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return <main className="payments-page">
    <header className="payments-head"><div><span><FiCreditCard /></span><div><h1>Pagos</h1><p>{admin ? "Configura transferencias y revisa comprobantes." : "Gestiona la cuota de curso de forma simple."}</p></div></div>
      <label>Año escolar <select value={year} onChange={event => setYear(Number(event.target.value))}>{[yearNow - 1, yearNow, yearNow + 1].map(value => <option key={value}>{value}</option>)}</select></label></header>
    {notice && <div className="payments-toast" role="status"><FiCheck />{notice}</div>}
    {error && <p className="payments-error">{error}</p>}
    {admin ? loadingAdmin ? <AdminPaymentsSkeleton /> : <>
      <section className="payments-admin-grid">
        <form className="payment-panel bank-form" onSubmit={saveBank}><header><div><h2>Cuenta para transferencias</h2><p>Estos datos los verán los apoderados.</p></div><Link to="/tesoreria/cuotas">Configurar cuota anual <FiExternalLink /></Link></header>
          {[ ["Titular", "accountHolderName"], ["RUT", "accountHolderRut"], ["Banco", "bankName"], ["Tipo de cuenta", "accountType"], ["Número de cuenta", "accountNumber"], ["Correo", "email"] ].map(([label, key]) =>
            <label key={key}>{label}<input required type={key === "email" ? "email" : "text"} value={String(bank[key as keyof BankAccount] ?? "")} onChange={event => setBank(current => ({ ...current, [key]: event.target.value }))} /></label>)}
          <button disabled={busy}>Guardar datos</button>
        </form>
        <aside className="payment-panel payment-preview"><div className="payment-preview__glow" aria-hidden="true" /><header className="payment-preview__header"><span><FiCreditCard /></span><small>Vista del apoderado</small></header><div className="payment-preview__identity"><small>Datos para transferir</small><h3>{bank.accountHolderName || "Nombre del titular"}</h3><p>{bank.bankName || "Banco"} · {bank.accountType || "Tipo de cuenta"}</p></div><dl><dt>RUT</dt><dd>{bank.accountHolderRut || "—"}</dd><dt>Número de cuenta</dt><dd>{bank.accountNumber || "—"}</dd><dt>Correo</dt><dd>{bank.email || "—"}</dd></dl><button className="copy-all payment-preview__copy" disabled={!bank.id} onClick={() => copyBank(bank)}><FiClipboard /> Copiar todos los datos</button></aside>
      </section>
      <section className="payment-panel review-panel"><header><div><h2>Comprobantes</h2><p>{reviews.length} movimientos encontrados.</p></div><select aria-label="Filtrar pagos" value={filter} onChange={event => setFilter(event.target.value)}><option value="">Todos</option><option value="PROOF_SUBMITTED">Pendientes de revisión</option><option value="PAID">Pagados</option><option value="REJECTED">Rechazados</option></select></header>
        <div className="review-list">{reviews.length === 0 ? <p className="empty-payments">No hay comprobantes en este filtro.</p> : reviews.map(item => <article key={item.id}><div><strong>{item.studentName}</strong><span>{item.guardianName} · {item.installment}</span></div><b>{money.format(item.amount)}</b><span className={`payment-status is-${item.status.toLowerCase()}`}>{friendly[item.status] ?? item.status}</span><div className="review-actions"><button onClick={() => void openProof(item.id)}><FiExternalLink /> Ver</button>{item.status === "PROOF_SUBMITTED" && <><button className="approve" disabled={busy} onClick={() => void review(item.id, true)}><FiCheck /> Aprobar</button><button className="reject" disabled={busy} onClick={() => void review(item.id, false)}><FiX /> Rechazar</button></>}</div></article>)}</div>
      </section>
    </> : loadingMine ? <div className="payments-skeleton" role="status"
      aria-label="Cargando tus pagos">
      <section className="payment-hero payment-hero-skeleton">
        <div className="payment-hero__summary">
          <Skeleton width="9rem" height="1.25rem" />
          <Skeleton width="3.5rem" height=".6rem" />
          <Skeleton width="11rem" height="1.5rem" />
          <Skeleton width="7.5rem" height="2rem" />
        </div>
        <div className="payment-progress">
          <Skeleton width="100%" height=".7rem" />
          <Skeleton width="6.5rem" height="1.25rem" />
          <Skeleton width="9rem" height=".6rem" />
          <Skeleton width="100%" height=".5rem" />
        </div>
      </section>
      <div className="guardian-payment-grid">
        <section className="installment-list">
          <header><Skeleton width="7rem" height="1rem" />
            <Skeleton width="5rem" height="1.4rem" /></header>
          {[0, 1].map(item => <article className="installment-card" key={item}>
            <header><div><Skeleton width="6rem" height=".65rem" />
              <Skeleton width="8rem" height="1.3rem" /></div>
              <Skeleton width="5rem" height="1.45rem" /></header>
            <Skeleton width="8rem" height=".65rem" />
            <Skeleton width="9rem" height="2rem" />
          </article>)}
        </section>
        <aside className="payment-panel transfer-data">
          <Skeleton width="9rem" height=".65rem" />
          <Skeleton width="10rem" height="1.25rem" />
          <Skeleton width="7rem" height=".7rem" />
          {[0, 1, 2].map(item => <Skeleton key={item} width="100%" height="2rem" />)}
        </aside>
      </div>
    </div> : mine ? <>
      <section className="payment-hero"><div className="payment-hero__orb" aria-hidden="true" /><div className="payment-hero__summary"><span className="payment-hero__eyebrow"><FiCreditCard /> Cuota de curso {year}</span><small>Alumno</small><h2>{mine.studentName}</h2><div className="payment-hero__amount"><span>Total anual</span><strong>{money.format(mine.totalAmount)}</strong></div></div><div className="payment-progress"><header><span>Progreso del plan</span><b>{mine.totalAmount > 0 ? Math.round((mine.paidAmount / mine.totalAmount) * 100) : 0}%</b></header><strong>{money.format(mine.paidAmount)}</strong><small>de {money.format(mine.totalAmount)} pagados</small><progress max={mine.totalAmount} value={mine.paidAmount} /></div></section>
      {!mine.selectedMode ? <div className="guardian-payment-grid"><section className="payment-panel plan-picker"><h2>¿Cómo quieres pagar?</h2><p>El sistema calculará automáticamente los montos.</p><div>{mine.allowedMode !== "DOS_CUOTAS" && <button disabled={busy} onClick={() => void choose("ANUAL")}><strong>Pago único</strong><span>{money.format(mine.totalAmount)}</span></button>}{mine.allowedMode !== "ANUAL" && <button disabled={busy} onClick={() => void choose("DOS_CUOTAS")}><strong>2 cuotas</strong><span>{money.format(Math.ceil(mine.totalAmount / 2))} aprox.</span></button>}</div></section><aside className="payment-panel transfer-data"><small>Cuenta bancaria configurada</small>{mine.bankAccount ? <><h3>{mine.bankAccount.accountHolderName}</h3><p>{mine.bankAccount.bankName} · {mine.bankAccount.accountType}</p>{[["RUT", mine.bankAccount.accountHolderRut], ["Número de cuenta", mine.bankAccount.accountNumber], ["Correo", mine.bankAccount.email]].map(([label, value]) => <div key={label}><span><small>{label}</small><b>{value}</b></span><button onClick={() => void copy(value, label)}><FiClipboard /> Copiar</button></div>)}<button className="copy-all" onClick={copyAll}><FiClipboard /> Copiar todos los datos</button></> : <p>El tesorero aún no configura la cuenta bancaria para {year}.</p>}</aside></div> : <div className="guardian-payment-grid"><section className="installment-list"><header><h2>Mis cuotas</h2><span>{mine.selectedMode === "ANUAL" ? "Pago único" : "Dos cuotas"}</span></header>{mine.installments.map(item => <article className="installment-card" key={item.id}><header><div><small>{item.concept}</small><strong>{money.format(item.amount)}</strong></div><span className={`payment-status is-${item.status.toLowerCase()}`}>{friendly[item.status]}</span></header><p>Vence el {new Date(`${item.dueDate}T12:00:00`).toLocaleDateString("es-CL")}</p>{item.status === "PENDIENTE" && <label className="proof-upload"><FiUpload />{uploadingInstallmentId === item.id ? "Enviando..." : "Subir comprobante"}<input type="file" accept="image/jpeg,image/png,application/pdf" disabled={uploadingInstallmentId !== null} onChange={event => void upload(item.id, event.target.files?.[0])} /></label>}{item.history.length > 0 && <div className="attempts"><small>Comprobantes</small>{item.history.map((attempt, index) => <button key={attempt.id} onClick={() => void openProof(attempt.id)}><span><FiEye /> Ver comprobante</span><small>Intento {item.history.length - index} · {friendly[attempt.status] ?? attempt.status}{attempt.rejectionReason ? ` — ${attempt.rejectionReason}` : ""}</small></button>)}</div>}</article>)}</section>
        <aside className="payment-panel transfer-data"><small>Datos para transferir</small>{mine.bankAccount ? <><h3>{mine.bankAccount.accountHolderName}</h3><p>{mine.bankAccount.bankName} · {mine.bankAccount.accountType}</p>{[["RUT", mine.bankAccount.accountHolderRut], ["Número de cuenta", mine.bankAccount.accountNumber], ["Correo", mine.bankAccount.email]].map(([label, value]) => <div key={label}><span><small>{label}</small><b>{value}</b></span><button onClick={() => void copy(value, label)}><FiClipboard /> Copiar</button></div>)}<button className="copy-all" onClick={copyAll}><FiClipboard /> Copiar todos los datos</button></> : <p>El tesorero aún no configura la cuenta bancaria.</p>}</aside></div>}
    </> : bank.id && <section className="bank-only-state"><aside className="payment-panel payment-preview"><div className="payment-preview__glow" aria-hidden="true" /><header className="payment-preview__header"><span><FiCreditCard /></span><small>Datos del curso</small></header><div className="payment-preview__identity"><small>Datos para transferir</small><h3>{bank.accountHolderName}</h3><p>{bank.bankName} · {bank.accountType}</p></div><dl><dt>RUT</dt><dd>{bank.accountHolderRut}</dd><dt>Número de cuenta</dt><dd>{bank.accountNumber}</dd><dt>Correo</dt><dd>{bank.email}</dd></dl><button className="copy-all payment-preview__copy" onClick={() => copyBank(bank)}><FiClipboard /> Copiar todos los datos</button></aside><div className="payment-panel bank-only-state__message"><h2>Falta configurar la cuota anual</h2><p>Cuando Tesorería defina el monto y las fechas para {year}, podrás elegir tu modalidad y ver tus cuotas aquí.</p></div></section>}
  </main>;
};

const AdminPaymentsSkeleton = () => <div className="payments-skeleton" role="status"
  aria-label="Cargando pagos">
  <section className="payments-admin-grid">
    <form className="payment-panel bank-form">
      <header><div><Skeleton width="10rem" height="1.1rem" />
        <Skeleton width="14rem" height=".7rem" /></div></header>
      {[0, 1, 2, 3, 4, 5].map(item => <label key={item}>
        <Skeleton width="4.5rem" height=".65rem" />
        <Skeleton width="100%" height="2.5rem" />
      </label>)}
      <Skeleton width="10rem" height="2.4rem" />
    </form>
    <aside className="payment-panel payment-preview">
      <Skeleton width="8rem" height=".65rem" />
      <Skeleton width="12rem" height="1.25rem" />
      <Skeleton width="9rem" height=".75rem" />
      {[0, 1, 2].map(item => <Skeleton key={item} width="100%" height="2rem" />)}
    </aside>
  </section>
  <section className="payment-panel review-panel">
    <header><div><Skeleton width="8rem" height="1rem" />
      <Skeleton width="12rem" height=".7rem" /></div>
      <Skeleton width="9rem" height="2.2rem" /></header>
    <div className="review-list">
      {[0, 1, 2].map(item => <article key={item}>
        <div><Skeleton width="8rem" height=".9rem" />
          <Skeleton width="12rem" height=".65rem" /></div>
        <Skeleton width="6rem" height="1rem" />
        <Skeleton width="5rem" height="1.4rem" />
        <Skeleton width="8rem" height="2rem" />
      </article>)}
    </div>
  </section>
</div>;
