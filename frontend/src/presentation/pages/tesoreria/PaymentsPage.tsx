import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FiCheck,
  FiChevronRight,
  FiClipboard,
  FiCreditCard,
  FiDownload,
  FiEdit3,
  FiExternalLink,
  FiEye,
  FiFileText,
  FiHash,
  FiHome,
  FiInfo,
  FiMail,
  FiUpload,
  FiUser,
  FiX,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import { apiClient } from "@/core/D-config/api";
import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { isAdminRole } from "@/core/A-domain/entities/user/User";
import { useAuth } from "@/presentation/context/AuthContext";
import { Skeleton } from "@/shared/ui/skeleton/Skeleton";
import { Tooltip } from "@/shared/ui/tooltip/Tooltip";
import { useMercadoPago } from "@/presentation/hooks/treasury/useMercadoPago";
import "./PaymentsPage.css";

type BankAccount = {
  id?: number;
  schoolYear: number;
  accountHolderName: string;
  accountHolderRut: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  email: string;
};
type Payment = {
  paymentMethod?: string;
  providerPaymentId?: string;
  providerStatus?: string;
  createdAt?: string;
  id: number;
  amount: number;
  status: string;
  paidAt: string | null;
  originalFileName: string | null;
  submittedAt: string | null;
  rejectionReason: string | null;
};
type Installment = {
  installment?: string;
  id: number;
  concept: string;
  amount: number;
  dueDate: string;
  status: string;
  history: Payment[];
};
type MyPayments = {
  schoolYear: number;
  annualAmount?: number | null;
  totalAmount: number;
  allowedMode: "ANUAL" | "DOS_CUOTAS" | "AMBAS";
  studentName: string;
  selectedMode: "ANUAL" | "DOS_CUOTAS" | "PERSONALIZADA" | null;
  paidAmount: number;
  installments: Installment[];
  bankAccount: BankAccount | null;
};
type Review = {
  paymentMethod?: string;
  id: number;
  studentName: string;
  guardianName: string;
  installment: string;
  amount: number;
  status: string;
  submittedAt: string | null;
  rejectionReason: string | null;
};
type InstallmentFilter = "ALL" | "PENDING" | "PAID";
type BankDetailRow = {
  key: string;
  label: string;
  value: string;
  copyLabel: string;
  Icon: IconType;
  numeric?: boolean;
};
type BankEditableKey = Exclude<keyof BankAccount, "id" | "schoolYear">;
type BankFieldConfig = {
  key: BankEditableKey;
  label: string;
  Icon: IconType;
  inputType?: "email" | "text";
};

const base = "/tesoreria/pagos-transferencia";
const mercadoPagoLogoUrl = "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/mercado-pago/default.svg";
const yearNow = new Date().getFullYear();
const treasuryRepository = new TreasuryRepositoryImpl();
const resolveAnnualAmount = async (payments: MyPayments): Promise<MyPayments> => {
  if (typeof payments.annualAmount === "number" && Number.isFinite(payments.annualAmount)) return payments;
  const config = await treasuryRepository.getConfig(payments.schoolYear);
  if (config.year !== payments.schoolYear || typeof config.annualAmount !== "number" || !Number.isFinite(config.annualAmount)) {
    throw new Error("No fue posible consultar el monto de la configuración anual.");
  }
  return { ...payments, annualAmount: config.annualAmount };
};
const money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
const friendly: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_REVISION: "Comprobante enviado",
  PAGADA: "Pagada",
  PENDING: "Pendiente",
  FAILED: "Fallido",
  CANCELLED: "Cancelado",
  PROOF_SUBMITTED: "Comprobante enviado",
  UNDER_REVIEW: "En revisión",
  PAID: "Pagado",
  REJECTED: "Rechazado",
};
const emptyBank = (schoolYear: number): BankAccount => ({
  schoolYear,
  accountHolderName: "",
  accountHolderRut: "",
  bankName: "",
  accountType: "",
  accountNumber: "",
  email: "",
});

const paymentsLoadError = (reason: unknown) => {
  const fallback = "No fue posible cargar tus pagos. Intenta nuevamente.";
  if (typeof reason !== "object" || reason === null || !("response" in reason)) return fallback;
  const response = (reason as { response?: { status?: number; data?: { errors?: Record<string, unknown> } } }).response;
  if (!response) return "No pudimos conectar con el servidor para cargar tus pagos. Revisa la conexión e intenta nuevamente.";
  if (response.status === 401) return "Tu sesión no está disponible. Vuelve a iniciar sesión para consultar tus pagos.";
  if (response.status && response.status >= 400 && response.status < 500) {
    const messages = Object.values(response.data?.errors ?? {}).filter(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    );
    if (messages.length) return messages.join(" ");
  }
  return fallback;
};

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

const bankClipboardText = (account: BankAccount) => [
  `Titular: ${account.accountHolderName.trim()}`,
  `RUT: ${formatChileanRut(account.accountHolderRut)}`,
  `Banco: ${account.bankName.trim()}`,
  `Tipo de cuenta: ${formatBankAccountType(account.accountType)}`,
  `N.º de cuenta: ${account.accountNumber.trim()}`,
  `Correo: ${account.email.trim()}`,
].join("\n");

const formatDueDate = (dueDate: string) =>
  new Date(`${dueDate}T12:00:00`).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });

const formatAttemptDate = (attempt: Payment) => {
  const date = attempt.paidAt ?? attempt.submittedAt ?? attempt.createdAt;
  return date ? new Date(date).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" }) : "Checkout iniciado";
};

const statusClass = (status: string) => `payment-status is-${status.toLowerCase()}`;

export const PaymentsPage = () => {
  const { user } = useAuth();
  const admin = isAdminRole(user?.rol);
  const [params] = useSearchParams();
  const [year, setYear] = useState(() => {
    const value = Number(params.get("year"));
    return Number.isInteger(value) && value >= 2000 && value <= yearNow + 1 ? value : yearNow;
  });
  const [mine, setMine] = useState<MyPayments | null>(null);
  const [bank, setBank] = useState<BankAccount>(emptyBank(yearNow));
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState("");
  const [installmentFilter, setInstallmentFilter] = useState<InstallmentFilter>("ALL");
  const [expandedInstallmentId, setExpandedInstallmentId] = useState<number | null>(null);
  const [bankDrawerOpen, setBankDrawerOpen] = useState(false);
  const [bankConfigOpen, setBankConfigOpen] = useState(false);
  const [adminHistoryOpen, setAdminHistoryOpen] = useState(true);
  const [loadingMine, setLoadingMine] = useState(!admin);
  const [loadingAdmin, setLoadingAdmin] = useState(admin);
  const [changingPlan, setChangingPlan] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadingInstallmentId, setUploadingInstallmentId] = useState<number | null>(null);
  const [copiedBankKey, setCopiedBankKey] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const bankDrawerRef = useRef<HTMLElement>(null);
  const bankConfigRef = useRef<HTMLFormElement>(null);

  const load = useCallback(async () => {
    setError("");
    setChangingPlan(false);
    try {
      if (admin) {
        setLoadingAdmin(true);
        const [setting, review] = await Promise.all([
          apiClient.get<BankAccount>(`${base}/cuenta-bancaria`, { params: { year } }).then(r => r.data).catch(() => emptyBank(year)),
          apiClient.get<Review[]>(`${base}/revision`, { params: { year, status: filter || undefined } }).then(r => r.data).catch(() => []),
        ]);
        setBank(setting);
        setReviews(review);
      } else {
        setLoadingMine(true);
        const [bankResult, paymentsResult] = await Promise.allSettled([
          apiClient.get<BankAccount>(`${base}/cuenta-bancaria`, { params: { year } }).then(response => response.data),
          apiClient.get<MyPayments>(`${base}/mis-pagos`, { params: { year } }).then(response => response.data),
        ]);
        const bankData = bankResult.status === "fulfilled" ? bankResult.value : null;
        setBank(bankData ?? emptyBank(year));
        if (paymentsResult.status === "rejected") {
          setMine(null);
          setError(paymentsLoadError(paymentsResult.reason));
          return;
        }
        const paymentsData = await resolveAnnualAmount(paymentsResult.value);
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

  useEffect(() => {
    if (!bankDrawerOpen) return;
    window.setTimeout(() => bankDrawerRef.current?.focus(), 0);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setBankDrawerOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [bankDrawerOpen]);

  useEffect(() => {
    if (!bankConfigOpen) return;
    window.setTimeout(() => bankConfigRef.current?.focus(), 0);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setBankConfigOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [bankConfigOpen]);

  const mp = useMercadoPago(load, admin);

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2200);
  };
  const flashCopied = (key: string) => {
    setCopiedBankKey(key);
    window.setTimeout(() => setCopiedBankKey(current => current === key ? "" : current), 1800);
  };
  const copy = async (value: string, label: string, key = label) => {
    await navigator.clipboard.writeText(value);
    flashCopied(key);
    flash(`${label} copiado`);
  };
  const copyBank = (account: BankAccount) => {
    void copy(bankClipboardText(account), "Datos", "all");
  };
  const copyAll = () => {
    if (!mine?.bankAccount) return;
    copyBank(mine.bankAccount);
  };
  const downloadBankData = () => {
    if (!mine?.bankAccount) return;
    const blob = new Blob([bankClipboardText(mine.bankAccount)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `datos-transferencia-${year}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const choose = async (mode: "ANUAL" | "DOS_CUOTAS") => {
    setBusy(true);
    setError("");
    try {
      setMine(await resolveAnnualAmount((await apiClient.post<MyPayments>(`${base}/mi-plan`, { year, mode })).data));
      setChangingPlan(false);
      flash("Plan de pago guardado");
    } catch (reason) {
      setError(paymentsLoadError(reason));
    } finally {
      setBusy(false);
    }
  };
  const upload = async (installmentId: number, file?: File) => {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    setUploadingInstallmentId(installmentId);
    try {
      await apiClient.post(`${base}/mis-cuotas/${installmentId}/comprobante`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await load();
      flash("Comprobante enviado");
    } catch {
      setError("No se pudo enviar. Usa un JPG, PNG o PDF dentro del límite permitido.");
    } finally {
      setUploadingInstallmentId(null);
    }
  };
  const saveBank = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      setBank((await apiClient.put<BankAccount>(`${base}/cuenta-bancaria`, bank, { params: { year } })).data);
      setBankConfigOpen(false);
      flash("Datos bancarios guardados");
    } catch {
      setError("Revisa los datos bancarios.");
    } finally {
      setBusy(false);
    }
  };
  const review = async (id: number, approve: boolean) => {
    const reason = approve ? undefined : window.prompt("Motivo del rechazo");
    if (!approve && !reason?.trim()) return;
    setBusy(true);
    try {
      await apiClient.post(`${base}/${id}/${approve ? "aprobar" : "rechazar"}`, approve ? {} : { reason });
      await load();
      flash(approve ? "Pago aprobado" : "Pago rechazado");
    } catch {
      setError("No fue posible revisar el pago.");
    } finally {
      setBusy(false);
    }
  };
  const openProof = async (id: number) => {
    const response = await apiClient.get<Blob>(`${base}/${id}/comprobante`, { responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const personalized = mine?.selectedMode === "PERSONALIZADA";
  const canChangePlan = mine?.allowedMode === "AMBAS" && !personalized && mine.paidAmount === 0
    && mine.installments.every(item => item.status === "PENDIENTE" && item.history.length === 0);
  const showPlanPicker = !mine?.selectedMode || (changingPlan && canChangePlan);
  const planLabel = personalized ? "Cuota personalizada" : mine?.selectedMode === "ANUAL" ? "Pago único" : "Dos cuotas";
  const paymentPercent = mine && mine.totalAmount > 0 ? Math.round((mine.paidAmount / mine.totalAmount) * 100) : 0;
  const pendingAmount = mine ? Math.max(mine.totalAmount - mine.paidAmount, 0) : 0;
  const studentNameLength = mine ? Array.from(mine.studentName).length : 0;
  const studentNameDensity = studentNameLength > 34 ? " is-name-compact" : studentNameLength > 26 ? " is-name-balanced" : "";
  const installments = mine?.installments ?? [];
  const counts = useMemo(() => ({
    all: installments.length,
    pending: installments.filter(item => item.status === "PENDIENTE").length,
    paid: installments.filter(item => item.status === "PAGADA").length,
  }), [installments]);
  const bankRows = useMemo<BankDetailRow[]>(() => {
    if (!mine?.bankAccount) return [];
    return [
      { key: "holder", label: "Titular", value: mine.bankAccount.accountHolderName, copyLabel: "titular", Icon: FiUser },
      { key: "rut", label: "RUT", value: formatChileanRut(mine.bankAccount.accountHolderRut ?? ""), copyLabel: "RUT", Icon: FiFileText, numeric: true },
      { key: "bank", label: "Banco", value: mine.bankAccount.bankName, copyLabel: "banco", Icon: FiHome },
      { key: "type", label: "Tipo de cuenta", value: formatBankAccountType(mine.bankAccount.accountType ?? ""), copyLabel: "tipo de cuenta", Icon: FiCreditCard },
      { key: "number", label: "N.º de cuenta", value: mine.bankAccount.accountNumber, copyLabel: "número de cuenta", Icon: FiHash, numeric: true },
      { key: "email", label: "Correo", value: mine.bankAccount.email, copyLabel: "correo", Icon: FiMail },
    ];
  }, [mine?.bankAccount]);
  const bankFormFields = useMemo<BankFieldConfig[]>(() => [
    { key: "accountHolderName", label: "Titular", Icon: FiUser },
    { key: "accountHolderRut", label: "RUT", Icon: FiFileText },
    { key: "bankName", label: "Banco", Icon: FiHome },
    { key: "accountType", label: "Tipo de cuenta", Icon: FiCreditCard },
    { key: "accountNumber", label: "Número de cuenta", Icon: FiHash },
    { key: "email", label: "Correo", Icon: FiMail, inputType: "email" },
  ], []);
  const adminBankRows = useMemo<BankDetailRow[]>(() => [
    { key: "holder", label: "Titular", value: bank.accountHolderName || "Nombre del titular", copyLabel: "titular", Icon: FiUser },
    { key: "rut", label: "RUT", value: bank.accountHolderRut ? formatChileanRut(bank.accountHolderRut) : "RUT", copyLabel: "RUT", Icon: FiFileText, numeric: true },
    { key: "bank", label: "Banco", value: bank.bankName || "Banco", copyLabel: "banco", Icon: FiHome },
    { key: "type", label: "Tipo de cuenta", value: bank.accountType ? formatBankAccountType(bank.accountType) : "Tipo de cuenta", copyLabel: "tipo de cuenta", Icon: FiCreditCard },
    { key: "number", label: "N.º de cuenta", value: bank.accountNumber || "Número de cuenta", copyLabel: "número de cuenta", Icon: FiHash, numeric: true },
    { key: "email", label: "Correo", value: bank.email || "correo@ejemplo.cl", copyLabel: "correo", Icon: FiMail },
  ], [bank]);
  const filteredInstallments = useMemo(() => {
    const filtered = installments.filter(item => {
      if (installmentFilter === "PENDING") return item.status === "PENDIENTE";
      if (installmentFilter === "PAID") return item.status === "PAGADA";
      return true;
    });
    return [...filtered].sort((left, right) => left.dueDate.localeCompare(right.dueDate));
  }, [installmentFilter, installments]);

  const mercadoPagoStatus = mp.checkingAvailability
    ? "Consultando disponibilidad"
    : mp.availabilityError
      ? "Sin conexión"
      : mp.enabled
        ? "Disponible"
        : "Pendiente de activación";

  const mercadoPagoDetails = <section className="payment-panel mp-availability" aria-label="Mercado Pago para la cuota anual">
    <header>
      <div>
        <h2><span className="mp-brand-icon"><FiCreditCard aria-hidden="true" /></span> Mercado Pago</h2>
        <p>Pago de cuota anual</p>
      </div>
      <span className={`payment-status ${mp.enabled ? "is-paid" : "is-pending"}`}>{mercadoPagoStatus}</span>
    </header>
    <p>{mp.checkingAvailability ? "Estamos comprobando si puedes pagar la cuota anual con Mercado Pago."
      : mp.availabilityError ? "No pudimos consultar Mercado Pago. Vuelve a cargar la página para comprobar su disponibilidad."
      : mp.enabled ? admin ? "Los apoderados pueden pagar su cuota anual desde aquí. Los pagos confirmados aparecerán en el historial."
        : "Paga tu cuota anual con Mercado Pago. Al volver, podrás consultar la confirmación y el historial aquí."
      : admin ? "Falta activar la conexión con Mercado Pago para esta organización. El botón de pago permanecerá deshabilitado hasta completar la activación."
        : "El pago con Mercado Pago aún no está habilitado para tu organización. Puedes seguir usando la transferencia bancaria."}</p>
  </section>;

  const renderBankDrawer = () => !admin && bankDrawerOpen && <div className="bank-drawer-backdrop is-open" onClick={() => setBankDrawerOpen(false)}>
    <aside ref={bankDrawerRef} tabIndex={-1} className="bank-drawer" role="dialog" aria-modal="true"
      aria-labelledby="bank-drawer-title" onClick={event => event.stopPropagation()}>
      <header className="bank-drawer__header">
        <span className="bank-drawer__brand-icon"><FiHome aria-hidden="true" /></span>
        <div><h2 id="bank-drawer-title">Transferencia bancaria</h2><p>Datos configurados para {year}.</p></div>
        <button className="bank-drawer__close" aria-label="Cerrar" onClick={() => setBankDrawerOpen(false)}><FiX aria-hidden="true" /></button>
      </header>
      {mine?.bankAccount ? <>
        <dl className="bank-drawer__details">
          {bankRows.map(({ key, label, value, copyLabel, Icon, numeric }) => {
            const copied = copiedBankKey === key;
            return <div className="bank-drawer__row" key={key}>
              <Icon className="bank-drawer__row-icon" aria-hidden="true" />
              <dt>{label}</dt>
              <dd className={numeric ? "is-tabular" : undefined}>{value}</dd>
              <button className={copied ? "is-copied" : ""} aria-label={copied ? "Copiado" : `Copiar ${copyLabel}`}
                onClick={() => void copy(value, label, key)}>
                {copied ? <FiCheck aria-hidden="true" /> : <FiClipboard aria-hidden="true" />}
                <Tooltip content={copied ? "Copiado" : `Copiar ${copyLabel}`} />
              </button>
            </div>;
          })}
        </dl>
        <div className="bank-drawer__actions">
          <button className="bank-drawer__download" onClick={downloadBankData}><FiDownload aria-hidden="true" /> Descargar datos</button>
          <button className="copy-all bank-drawer__copy" onClick={copyAll}>
            {copiedBankKey === "all" ? <FiCheck aria-hidden="true" /> : <FiClipboard aria-hidden="true" />}
            {copiedBankKey === "all" ? "Datos copiados" : "Copiar todos los datos"}
          </button>
        </div>
        <p className="bank-drawer__hint"><FiInfo aria-hidden="true" /> Usa estos datos para realizar la transferencia. Verifica que estén correctos antes de pagar.</p>
      </> : <p className="bank-drawer__empty">El tesorero aún no configura la cuenta bancaria para {year}.</p>}
    </aside>
  </div>;

  return <main className={`payments-page${admin ? "" : " payments-page--guardian"}`}>
    <header className="payments-head">
      <div><span><FiCreditCard aria-hidden="true" /></span><div><h1>Pagos</h1><p>{admin ? "Gestiona Mercado Pago, transferencias e historial." : "Gestiona las cuotas y pagos del alumno."}</p></div></div>
      <label>Año escolar <select value={year} onChange={event => setYear(Number(event.target.value))}>{[yearNow - 1, yearNow, yearNow + 1].map(value => <option key={value}>{value}</option>)}</select></label>
    </header>
    {(admin || loadingMine || !mine) && mercadoPagoDetails}
    {notice && <div className="payments-toast" role="status"><FiCheck aria-hidden="true" />{notice}</div>}
    {error && <p className="payments-error">{error}</p>}
    {mp.message && <section className="payment-panel mp-return" role="status"><p>{mp.message}</p>{mp.returned && mp.paymentId && mp.canRetryReturn && <button disabled={mp.busy} onClick={() => void mp.retry()}>Actualizar estado del pago</button>}</section>}
    {admin ? loadingAdmin ? <AdminPaymentsSkeleton /> : <>
      <section className="payments-admin-grid">
        <aside className="payment-panel payment-preview"><header className="payment-preview__header"><span><FiCreditCard aria-hidden="true" /></span><div><small>Vista del apoderado</small><h3>Transferencia bancaria</h3></div><button className="payment-preview__edit" type="button" aria-expanded={bankConfigOpen} onClick={() => setBankConfigOpen(current => !current)}><FiEdit3 aria-hidden="true" />{bankConfigOpen ? "Editando" : "Modificar datos"}</button></header><dl className="payment-preview__details">{adminBankRows.map(({ key, label, value, Icon, numeric }) => <div className="payment-preview__row" key={key}><Icon aria-hidden="true" /><dt>{label}</dt><dd className={numeric ? "is-numeric" : undefined}>{value}</dd></div>)}</dl><button className="copy-all payment-preview__copy" disabled={!bank.id} onClick={() => copyBank(bank)}><FiClipboard aria-hidden="true" /> Copiar todos los datos</button></aside>
        <section className={`payment-panel review-panel${adminHistoryOpen ? " is-open" : ""}`}><header><button className="review-panel__toggle" type="button" aria-expanded={adminHistoryOpen} aria-controls="admin-payment-history" onClick={() => setAdminHistoryOpen(current => !current)}><div><h2>Historial de cuotas</h2><p>{reviews.length} movimientos encontrados.</p></div><FiChevronRight aria-hidden="true" /></button></header>
          <div id="admin-payment-history" className="review-panel__content" aria-hidden={!adminHistoryOpen}><div className="review-panel__toolbar"><select aria-label="Filtrar pagos" value={filter} onChange={event => setFilter(event.target.value)}><option value="">Todos</option><option value="PROOF_SUBMITTED">Pendientes de revisión</option><option value="PAID">Pagados</option><option value="REJECTED">Rechazados</option></select></div><div className="review-list">{reviews.length === 0 ? <p className="empty-payments">No hay pagos en este filtro.</p> : reviews.map(item => <article key={item.id}><div><strong>{item.studentName}</strong><span>{item.guardianName} · {item.installment}</span></div><b>{money.format(item.amount)}</b><span className={statusClass(item.status)}>{friendly[item.status] ?? item.status}</span><div className="review-actions">{item.paymentMethod === "MERCADO_PAGO" ? <span>Mercado Pago</span> : <button onClick={() => void openProof(item.id)}><FiExternalLink aria-hidden="true" /> Ver</button>}{item.status === "PROOF_SUBMITTED" && <><button className="approve" disabled={busy} onClick={() => void review(item.id, true)}><FiCheck aria-hidden="true" /> Aprobar</button><button className="reject" disabled={busy} onClick={() => void review(item.id, false)}><FiX aria-hidden="true" /> Rechazar</button></>}</div></article>)}</div></div>
        </section>
      </section>
      {bankConfigOpen && <div className="bank-config-modal-backdrop is-open" onClick={() => setBankConfigOpen(false)}>
        <form ref={bankConfigRef} tabIndex={-1} className="payment-panel bank-form bank-config-modal" role="dialog" aria-modal="true" aria-labelledby="bank-config-title" onSubmit={saveBank} onClick={event => event.stopPropagation()}><header><div><h2 id="bank-config-title">Cuenta para transferencias</h2><p>Estos datos los verán los apoderados.</p></div><div className="bank-form__header-actions"><Link to="/tesoreria/cuotas">Configurar cuota anual <FiExternalLink aria-hidden="true" /></Link><button type="button" aria-label="Cerrar configuración" onClick={() => setBankConfigOpen(false)}><FiX aria-hidden="true" /> Cerrar</button></div></header>
          {bankFormFields.map(({ label, key, Icon, inputType = "text" }) =>
            <label className="bank-form__field" key={key}><span><Icon aria-hidden="true" />{label}</span><input required type={inputType} value={String(bank[key] ?? "")} onChange={event => setBank(current => ({ ...current, [key]: event.target.value }))} /></label>)}
          <button disabled={busy}>Guardar datos</button>
        </form>
      </div>}
    </> : loadingMine ? <GuardianPaymentsSkeleton /> : mine ? <>
      <section className="payment-summary-strip" aria-label={`Cuota anual ${mine.schoolYear}`}>
        <div className="payment-summary-strip__metric"><small>Cuota anual {mine.schoolYear}</small><strong>{typeof mine.annualAmount === "number" && Number.isFinite(mine.annualAmount) ? money.format(mine.annualAmount) : "Monto no disponible"}</strong></div>
        <div className={`payment-summary-strip__metric payment-summary-strip__metric--student${studentNameDensity}`}><small>Alumno</small><h2>{mine.studentName}</h2><span>{planLabel}</span></div>
        <div className="payment-summary-strip__metric"><small>{personalized ? "Total de tu plan" : "Total plan"}</small><strong>{money.format(mine.totalAmount)}</strong></div>
        <div className="payment-summary-strip__progress">
          <div className="payment-progress-head"><small>Avance del plan</small><span>{paymentPercent}%</span></div>
          <progress max={mine.totalAmount} value={mine.paidAmount} aria-label="Avance de pago" aria-valuetext={`${paymentPercent}% pagado`} />
          <div className="payment-progress-meta"><span><small>Pagado</small><strong>{money.format(mine.paidAmount)}</strong></span><span><small>Pendiente</small><strong>{money.format(pendingAmount)}</strong></span></div>
        </div>
      </section>

      {showPlanPicker ? <section className="payment-panel plan-picker"><h2>¿Cómo quieres pagar?</h2><p>Elige cómo pagar. Solo se generarán las cuotas de la modalidad seleccionada.</p><div>{mine.allowedMode !== "DOS_CUOTAS" && <button disabled={busy} onClick={() => void choose("ANUAL")}><strong>Pago único</strong><span>{money.format(mine.totalAmount)}</span><small>Todo el año en un pago</small></button>}{mine.allowedMode !== "ANUAL" && <button disabled={busy} onClick={() => void choose("DOS_CUOTAS")}><strong>Dos cuotas</strong><span>{money.format(Math.round(mine.totalAmount / 2))} + {money.format(mine.totalAmount - Math.round(mine.totalAmount / 2))}</span><small>Paga una cuota y deja la otra pendiente</small></button>}</div>{mine.selectedMode && <button className="plan-picker__cancel" disabled={busy} onClick={() => setChangingPlan(false)}>Volver a mi plan</button>}</section> : <>
        <section className="installments-shell" aria-label="Mis cuotas">
          <header className="installments-shell__header">
            <div><h2>Mis cuotas</h2><p>{counts.pending === 0 ? "No tienes cuotas pendientes." : `${counts.pending} cuota${counts.pending === 1 ? "" : "s"} pendiente${counts.pending === 1 ? "" : "s"}.`}</p></div>
            <div className="installments-shell__actions">
              <button className="payment-bank-shortcut" onClick={() => setBankDrawerOpen(true)}><FiClipboard aria-hidden="true" /> Transferencia bancaria</button>
              {!showPlanPicker && canChangePlan && <button className="payment-change-plan" disabled={busy || mp.busy || uploadingInstallmentId !== null} onClick={() => setChangingPlan(true)}>Cambiar modalidad</button>}
            </div>
          </header>
          <div className="installment-filters" role="group" aria-label="Filtrar cuotas">
            {[
              ["ALL", "Todas", counts.all],
              ["PENDING", "Pendientes", counts.pending],
              ["PAID", "Pagadas", counts.paid],
            ].map(([value, label, count]) => <button key={value} className={installmentFilter === value ? "is-active" : ""} onClick={() => setInstallmentFilter(value as InstallmentFilter)}>{label} <span>{count}</span></button>)}
          </div>
          <div className="installment-table" role="table" aria-label="Listado de cuotas">
            <div className="installment-table__head" role="row">
              <span>Concepto</span><span>Vencimiento</span><span>Monto</span><span>Estado</span><span>Acción</span>
            </div>
            {filteredInstallments.length === 0 ? <div className="installment-empty" role="status"><strong>{installmentFilter === "PENDING" ? "No tienes cuotas pendientes" : "No hay cuotas en este filtro"}</strong><span>{installmentFilter === "PENDING" ? "Todos tus pagos están al día." : "Cambia el filtro para revisar el resto del plan."}</span></div>
              : filteredInstallments.map(item => {
                const expanded = expandedInstallmentId === item.id;
                const canUploadProof = item.status === "PENDIENTE"
                  ? !item.history.some(p => p.paymentMethod === "MERCADO_PAGO" && p.status === "PENDING")
                  : item.status === "PAGADA" && item.history.some(p => p.paymentMethod === "MERCADO_PAGO" && p.status === "PAID" && !p.originalFileName);
                return <article className="installment-row" key={item.id}>
                  <div className="installment-row__main" role="row">
                    <div className="installment-row__concept"><strong>{item.concept}</strong><small>{item.installment ?? planLabel}</small></div>
                    <time dateTime={item.dueDate}>{formatDueDate(item.dueDate)}</time>
                    <b>{money.format(item.amount)}</b>
                    <span className={statusClass(item.status)}><i aria-hidden="true" />{friendly[item.status]}</span>
                    <div className="installment-actions">
                      {item.status === "PENDIENTE" && <button className="mp-checkout" aria-label="Pagar con Mercado Pago" disabled={!mp.enabled || mp.checkingAvailability || mp.busy || uploadingInstallmentId !== null} onClick={() => void mp.checkout(item.id)}><FiCreditCard aria-hidden="true" />{mp.busy ? "Abriendo..." : `Pagar ${money.format(item.amount)}`}</button>}
                      {canUploadProof && <label className="proof-upload"><FiUpload aria-hidden="true" />{uploadingInstallmentId === item.id ? "Enviando..." : "Subir comprobante"}<input type="file" accept="image/jpeg,image/png,application/pdf" disabled={uploadingInstallmentId !== null} onChange={event => void upload(item.id, event.target.files?.[0])} /></label>}
                      {item.history.length > 0 && <button className="detail-toggle" aria-expanded={expanded} onClick={() => setExpandedInstallmentId(expanded ? null : item.id)}>{expanded ? "Ocultar detalle" : "Detalle"} <FiChevronRight aria-hidden="true" /></button>}
                    </div>
                  </div>
                  {expanded && <div className="attempts" aria-label={`Historial del pago de ${item.concept}`}>
                    <small>Historial del pago</small>
                    {item.history.map((attempt, index) => <div className="attempt-row" key={attempt.id}>
                      <div><strong>{attempt.paymentMethod === "MERCADO_PAGO" ? "Pagado con Mercado Pago" : `Intento ${item.history.length - index}`}</strong><span>{friendly[attempt.status] ?? attempt.status} · {formatAttemptDate(attempt)}{attempt.providerPaymentId ? ` · Pago #${attempt.providerPaymentId}` : ""}</span>{attempt.providerStatus === "rejected" && <span>Último intento rechazado</span>}{attempt.rejectionReason && <span>{attempt.rejectionReason}</span>}</div>
                      <div>{attempt.originalFileName && <button onClick={() => void openProof(attempt.id)}><FiEye aria-hidden="true" /> Ver comprobante</button>}{attempt.status !== "PAID" && attempt.providerPaymentId && <button disabled={mp.busy} onClick={() => void mp.retry(attempt.providerPaymentId)}>Actualizar estado</button>}</div>
                    </div>)}
                  </div>}
                </article>;
              })}
          </div>
        </section>

        <section className="payment-methods-bar" aria-label="Métodos de pago">
          <div className="payment-methods-bar__mp">
            <img className="mp-logo-mark" src={mercadoPagoLogoUrl} alt="Mercado Pago" />
            <div><h2>Mercado Pago</h2><b className={mp.enabled ? "is-available" : ""}>{mercadoPagoStatus}</b></div>
          </div>
          <button onClick={() => setBankDrawerOpen(true)}>Ver datos de transferencia <FiChevronRight aria-hidden="true" /></button>
        </section>
      </>}
      {renderBankDrawer()}
    </> : bank.id && <section className="bank-only-state"><aside className="payment-panel payment-preview"><header className="payment-preview__header"><span><FiCreditCard aria-hidden="true" /></span><small>Datos del curso</small></header><div className="payment-preview__identity"><small>Datos para transferir</small><h3>{bank.accountHolderName}</h3><p>{bank.bankName} · {bank.accountType}</p></div><dl><dt>RUT</dt><dd>{bank.accountHolderRut}</dd><dt>Número de cuenta</dt><dd>{bank.accountNumber}</dd><dt>Correo</dt><dd>{bank.email}</dd></dl><button className="copy-all payment-preview__copy" onClick={() => copyBank(bank)}><FiClipboard aria-hidden="true" /> Copiar todos los datos</button></aside><div className="payment-panel bank-only-state__message"><h2>Falta configurar la cuota anual</h2><p>Cuando Tesorería defina el monto y las fechas para {year}, podrás elegir tu modalidad y ver tus cuotas aquí.</p></div></section>}
  </main>;
};

const GuardianPaymentsSkeleton = () => <div className="payments-skeleton" role="status" aria-label="Cargando tus pagos">
  <section className="payment-summary-strip">
    {[0, 1, 2].map(item => <div className="payment-summary-strip__metric" key={item}><Skeleton width="6rem" height=".7rem" /><Skeleton width="8rem" height="1.4rem" /></div>)}
    <div className="payment-summary-strip__progress"><Skeleton width="100%" height=".55rem" /><Skeleton width="7rem" height=".7rem" /></div>
  </section>
  <section className="installments-shell">
    <header className="installments-shell__header"><Skeleton width="8rem" height="1.1rem" /><Skeleton width="9rem" height=".8rem" /></header>
    <div className="installment-filters"><Skeleton width="5rem" height="2rem" /><Skeleton width="7rem" height="2rem" /><Skeleton width="6rem" height="2rem" /></div>
    <div className="installment-table">{[0, 1, 2, 3].map(item => <div className="installment-row__main" key={item}><Skeleton width="9rem" height="1rem" /><Skeleton width="7rem" height="1rem" /><Skeleton width="4rem" height="1rem" /><Skeleton width="5rem" height="1.3rem" /><Skeleton width="7rem" height="2rem" /></div>)}</div>
  </section>
</div>;

const AdminPaymentsSkeleton = () => <div className="payments-skeleton" role="status" aria-label="Cargando pagos">
  <section className="payments-admin-grid">
    <form className="payment-panel bank-form">
      <header><div><Skeleton width="10rem" height="1.1rem" /><Skeleton width="14rem" height=".7rem" /></div></header>
      {[0, 1, 2, 3, 4, 5].map(item => <label key={item}><Skeleton width="4.5rem" height=".65rem" /><Skeleton width="100%" height="2.5rem" /></label>)}
      <Skeleton width="10rem" height="2.4rem" />
    </form>
    <aside className="payment-panel payment-preview"><Skeleton width="8rem" height=".65rem" /><Skeleton width="12rem" height="1.25rem" /><Skeleton width="9rem" height=".75rem" />{[0, 1, 2].map(item => <Skeleton key={item} width="100%" height="2rem" />)}</aside>
  </section>
  <section className="payment-panel review-panel">
    <header><div><Skeleton width="8rem" height="1rem" /><Skeleton width="12rem" height=".7rem" /></div><Skeleton width="9rem" height="2.2rem" /></header>
    <div className="review-list">{[0, 1, 2].map(item => <article key={item}><div><Skeleton width="8rem" height=".9rem" /><Skeleton width="12rem" height=".65rem" /></div><Skeleton width="6rem" height="1rem" /><Skeleton width="5rem" height="1.4rem" /><Skeleton width="8rem" height="2rem" /></article>)}</div>
  </section>
</div>;
