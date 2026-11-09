import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FiCheck, FiPlus, FiRefreshCw, FiX } from 'react-icons/fi';
import type { CollectionCampaign, CollectionFamily, CollectionMovement, CollectionReceipt } from '@/core/A-domain/entities/treasury/Collection';
import type { ExpenseCategory } from '@/core/A-domain/entities/treasury/Treasury';
import { useDashboardResource } from '../dashboard/dashboardCache';
import { collectionFamilies, collectionResource, collectionUseCases } from './collectionsCache';
import { usePageEntry } from '@/shared/ui/loading/PageTransition';
import { useDialogFocus } from '@/shared/ui/dialog/useDialogFocus';
import { Button } from '@/shared/ui/button/Button';
import { FeedbackState } from '@/shared/ui/feedback/FeedbackState';
import { chileDate, chileTime } from '@/shared/date/chileDateTime';
import './CollectionsPage.css';

const money = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
const statusLabel = { PENDING: 'Pendiente', PARTIAL: 'Abono', PAID: 'Pagado', EXEMPT: 'No participa' };
type Dialog = { kind: 'create' | 'edit' | 'delete' | 'payment' | 'expected' | 'provider' | 'closing' | 'cancel'; family?: CollectionFamily; requestId: string };
const message = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const errors = error.response?.data?.errors;
    if (errors) return Object.values(errors).filter(value => typeof value === 'string').join(' ');
    if (error.response?.data?.detail) return String(error.response.data.detail);
  }
  return 'No se pudo completar la operación. Revisa los datos e intenta nuevamente.';
};

export function CollectionsPage() {
  const [year, setYear] = useState(Math.max(2026, Math.min(2035, new Date().getFullYear())));
  const resource = collectionResource(year);
  const state = useDashboardResource(resource);
  const [selectedId, setSelectedId] = useState<number>();
  const campaign = state.data?.find(item => item.id === selectedId) ?? state.data?.[0];
  const [search, setSearch] = useState('');
  const [onlyPending, setOnlyPending] = useState(false);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const options = useDashboardResource(collectionFamilies, dialog?.kind === 'create');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(chileDate());
  const [dueDate, setDueDate] = useState('');
  const [reference, setReference] = useState('');
  const [receiptFile, setReceiptFile] = useState<File>();
  const [receipts, setReceipts] = useState<CollectionReceipt[]>([]);
  const [receiptError, setReceiptError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [receiptVersion, setReceiptVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setReceipts([]); setReceiptError('');
    if (campaign) void collectionUseCases.receipts(campaign.id).then(value => {
      if (active) setReceipts(value);
    }).catch(() => { if (active) setReceiptError('No pudimos cargar los comprobantes.'); });
    return () => { active = false; };
  }, [campaign?.id, receiptVersion]);
  const downloadReceipt = async (receipt: CollectionReceipt) => {
    if (!campaign || downloading) return;
    setDownloading(true); setReceiptError('');
    try {
      const blob = await collectionUseCases.downloadReceipt(campaign.id, receipt.requestId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = receipt.originalName; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setReceiptError('No pudimos descargar el comprobante. Intenta nuevamente.'); }
    finally { setDownloading(false); }
  };
  const [recipient, setRecipient] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('TRANSPORT');
  const [reason, setReason] = useState('');
  const [familyIds, setFamilyIds] = useState<Set<number>>(new Set());
  const initializedFamilies = useRef(false);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState('');
  const close = () => { if (!submitting.current) { setDialog(null); setError(''); } };
  const dialogRef = useDialogFocus(Boolean(dialog), close, saving);
  usePageEntry(!state.data && !state.error);
  useEffect(() => {
    if (dialog?.kind === 'create' && options.data && !initializedFamilies.current) {
      setFamilyIds(new Set(options.data.map(family => family.familyId)));
      initializedFamilies.current = true;
    }
  }, [dialog?.kind, options.data]);

  const open = (kind: Dialog['kind'], family?: CollectionFamily) => {
    initializedFamilies.current = false;
    setReceiptFile(undefined);
    setError(''); setReference(''); setReason(''); setRecipient(''); setTitle(''); setDueDate('');
    if (kind === 'edit') { setTitle(campaign?.title ?? ''); setDueDate(campaign?.dueDate ?? ''); }
    setAmount(String(kind === 'closing' ? campaign?.collected ?? '' : kind === 'provider' ? campaign?.available ?? ''
      : kind === 'expected' ? family?.expected ?? '' : family?.remaining ?? ''));
    setDate(chileDate()); setDialog({ kind, family, requestId: crypto.randomUUID() });
  };
  const apply = (updated: CollectionCampaign) => {
    const existing = resource.getSnapshot().data ?? [];
    resource.set(existing.some(item => item.id === updated.id) ? existing.map(item => item.id === updated.id ? updated : item) : [updated, ...existing]);
    setSelectedId(updated.id);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!dialog || submitting.current) return;
    submitting.current = true; setSaving(true); setError('');
    try {
      if (dialog.kind === 'delete' && campaign) {
        await collectionUseCases.archive(campaign.id, reason);
        resource.set((resource.getSnapshot().data ?? []).filter(item => item.id !== campaign.id));
        setSelectedId(undefined); setDialog(null); return;
      }
      let updated: CollectionCampaign;
      const payment = { amount: Number(amount), date, reference, requestId: dialog.requestId };
      if (dialog.kind === 'create') {
        updated = await collectionUseCases.create({ year, title, defaultAmount: Number(amount), dueDate: dueDate || null, familyIds: [...familyIds] });
      } else {
        if (!campaign) return;
        if (dialog.kind === 'edit') updated = await collectionUseCases.update(campaign.id, title, dueDate || null);
        else if (dialog.kind === 'closing') updated = await collectionUseCases.postIncome(campaign.id, date, reference);
        else if (dialog.kind === 'provider') updated = await collectionUseCases.disburse(campaign.id, { ...payment, recipient, category });
        else if (dialog.kind === 'expected') updated = await collectionUseCases.expected(campaign.id, dialog.family!.familyId, Number(amount));
        else if (dialog.kind === 'cancel') updated = await collectionUseCases.cancelPayments(campaign.id, dialog.family!.familyId, reason);
        else updated = await collectionUseCases.collect(campaign.id, dialog.family!.familyId, payment, receiptFile);
      }
      apply(updated); setReceiptVersion(value => value + 1); setDialog(null);
    } catch (failure) { setError(message(failure)); void resource.load(true); }
    finally { submitting.current = false; setSaving(false); }
  };
  const firstPayments = new Map<number, CollectionMovement>();
  const registrationTime = (movement: CollectionMovement) => Date.parse(movement.recordedAt || movement.date);
  for (const movement of campaign?.movements ?? []) {
    if (!movement.active || movement.familyId === null) continue;
    const previous = firstPayments.get(movement.familyId);
    if (!previous || registrationTime(movement) < registrationTime(previous)) firstPayments.set(movement.familyId, movement);
  }
  const firstPaymentTime = (family: CollectionFamily) => {
    const payment = firstPayments.get(family.familyId);
    return payment ? registrationTime(payment) : Number.POSITIVE_INFINITY;
  };
  const rows = (campaign?.families ?? []).filter(family => (!onlyPending || family.remaining > 0)
    && `${family.studentName} ${family.guardian ?? ''} ${family.familyCode}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')))
    .sort((a, b) => Number(b.paid > 0) - Number(a.paid > 0)
      || firstPaymentTime(a) - firstPaymentTime(b) || a.familyId - b.familyId);
  const incomeActive = Boolean(campaign?.incomeId && campaign.movements.some(m => m.incomeId === campaign.incomeId && m.active));
  const dialogTitle = dialog?.kind === 'edit' ? 'Editar fondo' : dialog?.kind === 'delete' ? 'Eliminar fondo' : dialog?.kind === 'create' ? 'Nuevo fondo' : dialog?.kind === 'closing' ? 'Cerrar y dar ingreso'
    : dialog?.kind === 'provider' ? 'Pagar al proveedor' : dialog?.kind === 'expected' ? 'Monto de la familia'
      : dialog?.kind === 'cancel' ? 'Corregir cobros' : 'Registrar pago recibido';

  return <main className="collections-page">
    <header className="collections-heading"><div><p className="collections-eyebrow">Tesorería</p>
      <h1>Fondos por actividad</h1></div>
      <div className="collections-actions"><select aria-label="Año de los fondos" value={year} disabled={saving} onChange={e => setYear(Number(e.target.value))}>
        {Array.from({ length: 10 }, (_, index) => 2026 + index).map(value => <option key={value}>{value}</option>)}</select>
        <Button label="Actualizar" icon={<FiRefreshCw />} variant="secondary" size="small" loading={state.loading} onClick={() => { void resource.load(true); }} />
        <Button label="Nuevo fondo" icon={<FiPlus />} size="small" onClick={() => open('create')} /></div>
    </header>
    {state.error && <FeedbackState message="No pudimos cargar los fondos." onRefresh={() => void resource.load(true)} />}
    {state.data?.length === 0 && <div className="collections-empty"><h2>El próximo proyecto comienza aquí</h2>
      <p>Organiza el transporte de un paseo, camisetas o cualquier compra compartida.</p>
      <p>Registra los pagos por familia y da ingreso al total cuando cierres el fondo.</p>
      <Button label="Crear el primer fondo" onClick={() => open('create')} /></div>}
    {!!state.data?.length && <>
      <nav className="collections-campaigns" aria-label="Fondos por actividad">{state.data.map(item =>
        <button key={item.id} type="button" aria-pressed={item.id === campaign?.id} onClick={() => { setSelectedId(item.id); setSearch(''); }}>
          <span>{item.title}</span><small>{item.incomeId ? 'Ingreso registrado' : `${item.families.filter(f => f.status === 'PAID').length}/${item.families.filter(f => f.expected > 0).length} familias`}</small>
        </button>)}</nav>
      {campaign && <section className="collections-detail" aria-labelledby="collection-title">
        <div className="collections-title"><div><p className="collections-eyebrow">{campaign.incomeId ? 'Fondo cerrado' : 'Fondo en curso'}</p>
          <h2 id="collection-title">{campaign.title}</h2>{campaign.dueDate && <p>Fecha objetivo: {campaign.dueDate.split('-').reverse().join('/')}</p>}</div>
          <div className="collections-actions"><Button label="Editar fondo" variant="secondary" size="small" onClick={() => open('edit')} />
            <Button label="Eliminar fondo" variant="secondary" size="small" onClick={() => open('delete')} />
            {!incomeActive && <Button label={campaign.incomeId ? 'Restablecer ingreso' : 'Cerrar y dar ingreso'} size="small"
            disabled={campaign.collected <= 0} onClick={() => open('closing')} />}
            <Button label="Registrar pago al proveedor" variant="secondary" size="small" disabled={!incomeActive || campaign.available <= 0} onClick={() => open('provider')} /></div>
        </div>
        <dl className="collections-totals">{[['Meta', campaign.expected], ['Recaudado', campaign.collected], ['Pendiente', campaign.remaining], ['Pagado al proveedor', campaign.spent],
          [campaign.incomeId ? 'Saldo disponible' : 'Por ingresar a Tesorería', campaign.available]].map(([label, value]) =>
          <div key={String(label)}><dt>{label}</dt><dd>{money(Number(value))}</dd></div>)}</dl>
        <progress className="collections-progress" max={campaign.expected || 1} value={Math.min(campaign.collected, campaign.expected || 1)} aria-label="Avance del fondo" />
        <p className="collections-explanation">{campaign.incomeId ? `Ingreso consolidado #${campaign.incomeId}. Los cobros están cerrados.`
          : 'Los checks controlan lo recibido. Al cerrar el fondo se registra un único ingreso por el total recaudado.'}</p>
        <div className="collections-filters"><input type="search" placeholder="Buscar familia o alumno" aria-label="Buscar familia o alumno" value={search} onChange={e => setSearch(e.target.value)} />
          <label><input type="checkbox" checked={onlyPending} onChange={e => setOnlyPending(e.target.checked)} /> Solo pendientes</label>
          <span>{rows.length} familias · Primer pago registrado arriba</span></div>
        <div className="collections-table"><div className="collections-row collections-row--head" aria-hidden="true"><span>Pagó</span><span>Familia / alumno</span><span>Monto</span><span>Recibido</span><span>Falta</span><span>Estado</span></div>
          {rows.map(family => <div className="collections-row" key={family.familyId}>
            <input type="checkbox" aria-label={`Pagó ${family.studentName}`} checked={family.status === 'PAID'}
              disabled={Boolean(campaign.incomeId) || family.expected === 0} onChange={() => open(family.status === 'PAID' ? 'cancel' : 'payment', family)} />
            <div className="collections-family"><strong>{family.studentName}</strong><small>{family.guardian || family.familyCode} · {family.course}</small>
              {firstPayments.get(family.familyId) && <small>{(() => {
                const payment = firstPayments.get(family.familyId)!;
                return payment.recordedAt
                  ? `Registrado: ${chileDate(new Date(payment.recordedAt)).split('-').reverse().join('/')} · ${chileTime(payment.recordedAt)}`
                  : `Pago: ${payment.date.split('-').reverse().join('/')} · Hora no disponible`;
              })()}</small>}</div>
            <button className="collections-amount" type="button" disabled={Boolean(campaign.incomeId)} aria-label={`Ajustar monto de ${family.studentName}`} onClick={() => open('expected', family)}><small>Monto</small>{money(family.expected)}</button>
            <span className="collections-number"><small>Recibido</small>{money(family.paid)}
              {family.paid > family.expected && <span className="collections-extra">Extra: {money(family.paid - family.expected)}</span>}</span><span className="collections-number"><small>Falta</small>{money(family.remaining)}</span>
            <div className="collections-status" data-status={family.status}><span className="collections-status-pill">{family.status === 'PAID' && <FiCheck aria-hidden="true" />}{statusLabel[family.status]}</span>
              {!campaign.incomeId && ['PARTIAL', 'PAID'].includes(family.status) && <button type="button" aria-label={`Agregar pago de ${family.studentName}`} onClick={() => open('payment', family)}>{family.status === 'PAID' ? 'Agregar pago' : 'Abonar'}</button>}</div>
          </div>)}
          {!rows.length && <p>No hay familias para estos filtros.</p>}
        </div>
        {receiptError && <p className="collections-error" role="alert">{receiptError}
          <button type="button" onClick={() => setReceiptVersion(value => value + 1)}>Reintentar</button></p>}
        <details className="collections-history"><summary>Historial · {campaign.movements.length} movimientos</summary>
          <p>Los cobros individuales son el control del fondo. El ingreso consolidado aparece una sola vez en <Link to="/tesoreria/ingresos">Ingresos</Link> y los pagos al proveedor en <Link to="/tesoreria/gastos">Egresos</Link>.</p>
          {[...campaign.movements].reverse().map(m => <div key={m.requestId}><time>{m.date.split('-').reverse().join('/')}</time>
            <span>{m.incomeId ? `Ingreso consolidado #${m.incomeId}` : m.expenseId ? m.recipient : campaign.families.find(f => f.familyId === m.familyId)?.studentName}
              {m.reference && <small>Referencia: {m.reference}</small>}
              {receipts.filter(receipt => receipt.requestId === m.requestId).map(receipt =>
                <button className="collections-receipt-link" key={receipt.requestId} type="button" disabled={downloading}
                  onClick={() => void downloadReceipt(receipt)}>Descargar comprobante</button>)}
            </span><strong>{money(m.amount)}</strong><small>{m.active ? 'Registrado' : 'Anulado'}</small></div>)}
        </details>
      </section>}
    </>}
    {dialog && <aside className="collections-dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="collection-dialog-title" ref={dialogRef} tabIndex={-1}>
      <form className={`collections-dialog${['create', 'edit'].includes(dialog.kind) ? ' collections-dialog--create' : ''}`} onSubmit={submit}>
        <header><h2 id="collection-dialog-title">{dialogTitle}</h2><button type="button" aria-label="Cerrar" disabled={saving} onClick={close}><FiX /></button></header>
        {dialog.family && <p>{dialog.family.studentName}<small>{dialog.family.guardian || dialog.family.familyCode}</small></p>}
        {['create', 'edit'].includes(dialog.kind) && <>
          <label>Nombre<input required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej.: Transporte del paseo" /></label>
          <label>Fecha objetivo (opcional)<input type="date" value={dueDate} min={`${year}-01-01`} max={`${year}-12-31`} onChange={e => setDueDate(e.target.value)} /></label>
        </>}
        {!['closing', 'cancel', 'edit', 'delete'].includes(dialog.kind) && <label>{dialog.kind === 'create' ? 'Monto sugerido por familia' : dialog.kind === 'expected' ? 'Monto esperado (0 = no participa)' : 'Monto en pesos'}
          <input required type="number" step="1" min={dialog.kind === 'expected' ? dialog.family?.paid || 0 : 1}
            max={dialog.kind === 'provider' ? campaign?.available : 99999999999999}
            value={amount} onChange={e => setAmount(e.target.value)} /></label>}
        {dialog.kind === 'payment' && <p>Puedes registrar un importe mayor al esperado. El extra se sumará al total recibido del fondo.</p>}
        {dialog.kind === 'create' && <fieldset><legend>Familias participantes · {familyIds.size}</legend>
          {options.error ? <Button label="Reintentar familias" variant="secondary" size="small" onClick={() => void collectionFamilies.load(true)} />
            : !options.data ? <p role="status">Cargando familias…</p> : <>
              <label><input type="checkbox" checked={familyIds.size === options.data.length && familyIds.size > 0}
                onChange={e => setFamilyIds(new Set(e.target.checked ? options.data!.map(f => f.familyId) : []))} /> Todas las familias</label>
              <div className="collections-family-picker">{options.data.map(f => <label key={f.familyId}><input type="checkbox" checked={familyIds.has(f.familyId)} onChange={e => setFamilyIds(current => {
                const next = new Set(current); if (e.target.checked) next.add(f.familyId); else next.delete(f.familyId); return next;
              })} /><span>{f.studentName}<small>{f.primaryGuardian || f.familyCode}</small></span></label>)}</div>
              {!options.data.length && <p>No hay familias activas para este curso.</p>}
            </>}
        </fieldset>}
        {dialog.kind === 'closing' && <p>Se registrará <strong>un único ingreso de {money(campaign?.collected ?? 0)}</strong>. Después no podrás modificar los cobros de este fondo.
          {!!campaign?.remaining && <span> Quedan {money(campaign.remaining)} pendientes; esa diferencia no se dará por recibida.</span>}</p>}
        {['payment', 'provider', 'closing'].includes(dialog.kind) && <>
          <label>Fecha<input required type="date" min={`${year}-01-01`} max={chileDate() < `${year}-12-31` ? chileDate() : `${year}-12-31`} value={date} onChange={e => setDate(e.target.value)} /></label>
          <label>Referencia (opcional)<input maxLength={100} value={reference} onChange={e => setReference(e.target.value)} /></label>
        </>}
        {dialog.kind === 'payment' && <label>Adjuntar comprobante (opcional)
          <input type="file" aria-label="Adjuntar comprobante (opcional)" accept="image/jpeg,image/png,application/pdf" disabled={saving}
            onChange={event => {
              const file = event.target.files?.[0];
              if (file && (file.size > 5 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type))) {
                setError('Adjunta un PDF, JPG o PNG de hasta 5 MB.'); setReceiptFile(undefined); event.target.value = ''; return;
              }
              setError(''); setReceiptFile(file);
            }} />
          <small>PDF, JPG o PNG · Hasta 5 MB</small>
        </label>}
        {dialog.kind === 'provider' && <>
          <label>Proveedor<input required maxLength={150} value={recipient} onChange={e => setRecipient(e.target.value)} /></label>
          <label>Categoría<select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)}><option value="TRANSPORT">Transporte</option><option value="MATERIALS">Materiales / camisetas</option><option value="EVENTS">Eventos</option><option value="SERVICES">Servicios</option><option value="OTHER">Otro</option></select></label>
          <p>Se creará un egreso por el monto transferido al proveedor.</p>
        </>}
        {dialog.kind === 'cancel' && <><p>Se anularán los cobros de esta familia en el fondo. Esto corrige el registro; no realiza una transferencia bancaria.</p>
          <label>Motivo<textarea required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label></>}
        {dialog.kind === 'delete' && <><p>Se quitará «{campaign?.title}» de la lista. Su historial se conservará y los ingresos y egresos registrados seguirán en Tesorería. Esta acción no devuelve dinero ni anula movimientos.</p>
          <label>Motivo<textarea required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label></>}
        {error && <p className="collections-error" role="alert">{error}</p>}
        <footer><Button label="Cancelar" variant="secondary" disabled={saving} onClick={close} size="small" />
          <Button type="submit" label={dialog.kind === 'delete' ? 'Eliminar fondo' : dialog.kind === 'closing' ? 'Confirmar ingreso total' : 'Guardar'} loading={saving} disabled={dialog.kind === 'create' && (!options.data || !familyIds.size)} onClick={() => {}} size="small" /></footer>
      </form>
    </aside>}
  </main>;
}
