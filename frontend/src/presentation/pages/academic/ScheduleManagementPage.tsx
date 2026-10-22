import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { FiCalendar } from "react-icons/fi";
import { DAYS, TYPES, blockDurationLabel, orderedBlocks, timeLabel, validateSchedule } from "@/core/A-domain/entities/academic/Schedule";
import type { Schedule, ScheduleBlock, ScheduleDay } from "@/core/A-domain/entities/academic/Schedule";
import { useSchedule } from "@/presentation/hooks/academic/useSchedule";
import { Button } from "@/shared/ui/button/Button";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { ScheduleSkeleton } from "./ScheduleSkeleton";
import { ScheduleFilter } from "./ScheduleFilter";
import { ScheduleTimeSelect } from "./ScheduleTimeSelect";
import { scheduleCardColor, scheduleIngress } from "./scheduleCards";
import { ScheduleDayProgress } from "./ScheduleDayProgress";
import { ScheduleColorPalette } from "./ScheduleColorPalette";
import "./Schedule.css";

interface Confirmation { message: string; action: () => void; anchor?: { top: number; left: number }; deleteStep?: 1 | 2; deleteYear?: number }
export function ScheduleManagementPage() {
  const data = useSchedule(true);
  const stickyTitle = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const title = stickyTitle.current;
    if (!title) return;
    const updateHeight = () => title.parentElement?.style.setProperty("--schedule-title-height", `${title.getBoundingClientRect().height}px`);
    updateHeight();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateHeight);
    observer.observe(title);
    return () => observer.disconnect();
  }, []);
  const [selectedDay, setSelectedDay] = useState(1);
  const [draft, setDraft] = useState<Schedule>({ days: [] });
  const [dirty, setDirty] = useState(false);
  const [validation, setValidation] = useState("");
  const [copyTarget, setCopyTarget] = useState<Record<number, number>>({});
  const [openBlock, setOpenBlock] = useState<string | null>(null);
  const [activeSave, setActiveSave] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<"success" | "failed" | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [deleteText, setDeleteText] = useState("");
  const validationNotice = useRef<HTMLParagraphElement | null>(null);
  const preservedDraft = useRef<{ schedule: Schedule; dirty: boolean } | null>(null);
  useEffect(() => {
    if (saveResult !== "success" || !activeSave?.startsWith("day:")) return;
    const timer = window.setTimeout(() => setSaveResult(null), 4000);
    return () => window.clearTimeout(timer);
  }, [saveResult, activeSave]);
  useEffect(() => {
    if (validation || data.error || saveResult === "failed") validationNotice.current?.focus();
  }, [validation, data.error, saveResult]);
  useEffect(() => {
    const preserved = preservedDraft.current;
    preservedDraft.current = null;
    setDraft(preserved?.schedule ?? data.schedule);
    setDirty(preserved?.dirty ?? false);
    setValidation(""); setOpenBlock(null);
  }, [data.schedule]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  useEffect(() => {
    if (confirmation?.deleteStep === 2) {
      document.querySelector<HTMLElement>(".schedule-confirm input")?.focus();
    }
  }, [confirmation]);
  const change = (days: ScheduleDay[]) => { setDraft({ days }); setDirty(true); setValidation(""); if (saveResult !== "success") setSaveResult(null); };
  const updateDay = (day: ScheduleDay) => change([...draft.days.filter(value => value.dayOfWeek !== day.dayOfWeek), day].sort((a, b) => a.dayOfWeek - b.dayOfWeek));
  const updateBlock = (day: ScheduleDay, index: number, block: ScheduleBlock) =>
    updateDay({ ...day, blocks: day.blocks.map((value, position) => position === index ? block : value) });
  const ask = (message: string, action: () => void, deletion: Pick<Confirmation, "deleteStep" | "deleteYear"> = {}) => {
    const rect = (document.activeElement as HTMLElement)?.getBoundingClientRect();
    setConfirmation({ message, action, ...deletion, anchor: rect ? {
      top: Math.max(12, Math.min(rect.top, window.innerHeight - 280)),
      left: Math.max(12, Math.min(rect.left, window.innerWidth - 292)),
    } : undefined });
  };
  const save = async (publish: boolean, source = publish ? "publish" : "draft") => {
    if (data.saving) return;
    setActiveSave(source); setSaveResult(null); setValidation("");
    const dayNumber = source.startsWith("day:") ? Number(source.slice(4)) : null;
    const day = draft.days.find(value => value.dayOfWeek === dayNumber);
    const payload = day ? { days: [...data.schedule.days.filter(value => value.dayOfWeek !== dayNumber), day]
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek) } : draft;
    const error = validateSchedule(payload, publish);
    if (error) { setValidation(error); return; }
    const normalize = (value: ScheduleDay[]) => JSON.stringify(value, (_, item: unknown) =>
      typeof item === "string" && /^\d{2}:\d{2}:00$/.test(item) ? timeLabel(item) : item);
    const otherChanges = day ? normalize(draft.days.filter(value => value.dayOfWeek !== dayNumber)) !==
      normalize(data.schedule.days.filter(value => value.dayOfWeek !== dayNumber)) : false;
    if (day) preservedDraft.current = { schedule: draft, dirty: otherChanges };
    const saved = await data.save(payload, publish);
    if (saved) { setDirty(otherChanges); setOpenBlock(null); setSaveResult("success"); if (publish) setPublishSuccess(true); }
    else { preservedDraft.current = null; setSaveResult("failed"); }
  };
  const copy = (source: ScheduleDay) => {
    const target = copyTarget[source.dayOfWeek];
    if (!target || target === source.dayOfWeek) return;
    const action = () => updateDay({ ...source, dayOfWeek: target,
      blocks: source.blocks.map(block => ({ ...block, dayOfWeek: target })) });
    if (draft.days.some(day => day.dayOfWeek === target)) ask("Se reemplazarán la jornada y los bloques del día de destino. ¿Continuar?", action);
    else action();
  };
  const requestDelete = () => {
    const year = data.year;
    if (year === undefined) return;
    setDeleteText("");
    ask(`Se eliminará TODO el horario del año ${year}: todas las jornadas de lunes a viernes, sus materias y actividades, el borrador y la versión publicada. Esta acción no se puede deshacer.`, () => {
      ask(`Confirmación final: el horario completo de ${year} dejará de estar disponible para los usuarios.`, () => {
        if (data.year === year) { setActiveSave("delete"); setValidation(""); setSaveResult(null); void data.remove(); }
      }, { deleteStep: 2, deleteYear: year });
    }, { deleteStep: 1, deleteYear: year });
  };
  return <section className="schedule-page schedule-page--management">
    <header ref={stickyTitle} className="schedule-management-heading"><h1>Gestión del horario</h1><Link className="schedule-manage-link" to="/calendario/horario-clases">
      <FiCalendar aria-hidden="true" /><span>Consultar horario publicado</span>
    </Link></header>
    <p>Guarda cada jornada mientras la configuras. Al terminar, publica el horario para que los usuarios lo vean. Publicar requiere configurar las cinco jornadas.</p>
    <div className="schedule-filters">
    <ScheduleFilter label="Año escolar" loading={data.loading}><select disabled={data.loading || data.saving} value={data.year ?? ""} onChange={event => {
      const year = Number(event.target.value);
      if (dirty) ask("Hay cambios sin guardar. ¿Descartarlos para cambiar de año?", () => data.setYear(year));
      else data.setYear(year);
    }}>{data.periods.map(period => <option key={period.schoolYear} value={period.schoolYear}>
      {period.schoolYear} · {period.course}{period.editable ? "" : " · Histórico"}
    </option>)}</select></ScheduleFilter>
    </div>
    {(validation || data.error) && !activeSave?.startsWith("day:") && activeSave !== "publish" && <p role="alert" ref={validationNotice} tabIndex={-1}>{validation || data.error}</p>}
    {data.message && !activeSave?.startsWith("day:") && activeSave !== "publish" && <p role="status">{data.message}</p>}
    {data.loading ? <ScheduleSkeleton dayNumber={selectedDay} /> : <>
      {!data.periods.length && <p>No hay períodos escolares disponibles.</p>}
      {!data.editable && data.periods.length > 0 && <p>Este año histórico es de solo lectura.</p>}
      {!draft.days.length && <p>Sin horario cargado. Configura cada jornada para comenzar.</p>}
      <div className="schedule-day-selector" role="group" aria-label="Seleccionar día">
        {["Lun", "Mar", "Mié", "Jue", "Vie"].map((label, index) => <button type="button" key={label}
          aria-label={DAYS[index]} aria-pressed={selectedDay === index + 1}
          onClick={() => { if (selectedDay !== index + 1) { setSelectedDay(index + 1); setOpenBlock(null); } }}>{label}</button>)}
      </div>
      <fieldset disabled={!data.editable || data.saving || data.loadFailed} aria-label="Editor del horario">
        <div className="schedule-week">{DAYS.map((name, index) => {
          const number = index + 1;
          if (number !== selectedDay) return null;
          const day = draft.days.find(value => value.dayOfWeek === number);
          const ingress = day ? scheduleIngress(day) : null;
          return <article className="schedule-day schedule-daily-editor" key={`${data.year}:${name}`} aria-label={`Jornada · ${name}`}>
            <div className="schedule-daily-heading"><h2>{name}</h2><span>Salida <strong>{day ? timeLabel(day.exitTime) || "--:--" : "--:--"}</strong></span></div>
            {!day ? <Button label="Configurar jornada" onClick={() => updateDay({ dayOfWeek: number, entryTime: "", exitTime: "", blocks: [] })} /> : <>
              {ingress && <div className="schedule-ingress schedule-editor-block" style={{ "--schedule-type-color": "#64748b" } as CSSProperties}>
                <span className="schedule-ingress-time">{ingress.start} – {ingress.end}</span><strong>Ingreso</strong>
              </div>}
              {orderedBlocks(day).sort((a, b) => {
                const pending = (block: ScheduleBlock) => !block.startTime || !block.endTime ||
                  ((block.type === "SUBJECT" || block.type === "ACTIVITY" || block.type === "EVENT") && !block.name?.trim());
                return Number(pending(a)) - Number(pending(b));
              }).map(block => {
                const position = day.blocks.indexOf(block);
                const blockKey = `${number}:${position}`;
                const expanded = openBlock === blockKey;
                const typeName = TYPES[block.type];
                const needsName = block.type === "SUBJECT" || block.type === "ACTIVITY" || block.type === "EVENT";
                return <div className={`schedule-editor-block schedule-editor-block--${block.type.toLowerCase()}`} key={position} style={{ "--schedule-type-color": scheduleCardColor(block) } as CSSProperties}>
                  <button type="button" className="schedule-block-summary" aria-expanded={expanded}
                    aria-controls={`schedule-block-${number}-${position}`} aria-label={`Editar ${name} bloque ${position + 1}`}
                    onClick={() => setOpenBlock(expanded ? null : blockKey)}>
                    <span className="schedule-block-dot" aria-hidden="true" style={{ backgroundColor: block.color ?? undefined }} />
                    {needsName && <span className="schedule-block-summary-type">{typeName}</span>}
                    <span className="schedule-block-summary-name" title={needsName ? block.name?.trim() || typeName : typeName}>{needsName ? block.name?.trim() || typeName : typeName}</span>
                    <span className="schedule-block-summary-time">{timeLabel(block.startTime) || "--:--"} – {timeLabel(block.endTime) || "--:--"}{blockDurationLabel(block) && <small className="schedule-block-duration">{blockDurationLabel(block)}</small>}</span>
                    <span className="schedule-block-summary-action">{expanded ? "Cerrar" : "Editar"}</span>
                  </button>
                  {expanded && <div className="schedule-block-fields" id={`schedule-block-${number}-${position}`}>
                  <span className="schedule-block-badge">{typeName}</span>
                  <label className="schedule-block-type">Tipo<select aria-label={`Tipo · ${name} bloque ${position + 1}`} value={block.type} onChange={event => {
                    const type = event.target.value as ScheduleBlock["type"];
                    updateBlock(day, position, { ...block, type, name: type === "SUBJECT" || type === "ACTIVITY" || type === "EVENT" ? block.name : null });
                  }}>
                    {Object.entries(TYPES).map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select></label>
                  {needsName && <label className="schedule-block-name">{typeName}<input maxLength={100} value={block.name ?? ""} aria-label={`Nombre ${name} bloque ${position + 1}`}
                    onChange={event => updateBlock(day, position, { ...block, name: event.target.value })} /></label>}
                  <label className="schedule-block-time">Inicio<ScheduleTimeSelect value={timeLabel(block.startTime)} label={`Inicio ${name} bloque ${position + 1}`}
                    onChange={value => updateBlock(day, position, { ...block, startTime: value })} /></label>
                  <label className="schedule-block-time">Fin<ScheduleTimeSelect value={timeLabel(block.endTime)} label={`Fin ${name} bloque ${position + 1}`}
                    onChange={value => updateBlock(day, position, { ...block, endTime: value })} /></label>
                  {blockDurationLabel(block) && <span className="schedule-block-duration-field">Duración: {blockDurationLabel(block)}</span>}
                  <div className="schedule-block-color-actions">
                  <ScheduleColorPalette label={`Color ${name} bloque ${position + 1}`}
                    value={block.color} onChange={color => updateBlock(day, position, { ...block, color })} />
                  <Button label="Quitar color" variant="secondary" onClick={() => updateBlock(day, position, { ...block, color: null })} />
                  <Button label="Eliminar bloque" variant="danger" onClick={() => ask("¿Eliminar este bloque del borrador?", () =>
                    { updateDay({ ...day, blocks: day.blocks.filter((_, item) => item !== position) }); setOpenBlock(null); })} />
                  </div>
                  </div>}
                </div>;
              })}
              <div className="schedule-day-times">
                <label>Entrada<ScheduleTimeSelect label={`Entrada · ${name}`} value={timeLabel(day.entryTime)} onChange={value => updateDay({ ...day, entryTime: value })} /></label>
                <label>Salida<ScheduleTimeSelect label={`Salida · ${name}`} value={timeLabel(day.exitTime)} onChange={value => updateDay({ ...day, exitTime: value })} /></label>
              </div>
              <ScheduleDayProgress day={day} name={name} />
              <Button label="Añadir bloque" onClick={() => { updateDay({ ...day, blocks: [...day.blocks, {
                dayOfWeek: number, startTime: "", endTime: "", type: "SUBJECT", name: "", order: day.blocks.length, color: null,
              }] }); setOpenBlock(`${number}:${day.blocks.length}`); }} />
              <label className="schedule-copy-target">Copiar {name} a<select value={copyTarget[number] ?? ""} onChange={event => setCopyTarget({ ...copyTarget, [number]: Number(event.target.value) })}>
                <option value="">Seleccionar día</option>{DAYS.map((target, targetIndex) => targetIndex !== index &&
                  <option key={target} value={targetIndex + 1}>{target}</option>)}</select></label>
              <div className="schedule-day-actions">
              <Button label="Copiar jornada" disabled={!copyTarget[number]} onClick={() => copy(day)} />
              <Button label="Eliminar" ariaLabel={`Eliminar jornada · ${name}`} variant="danger" onClick={() => ask("¿Eliminar esta jornada y sus bloques del borrador?", () =>
                change(draft.days.filter(value => value.dayOfWeek !== number)))} />
              <Button label="Guardar" ariaLabel={`Guardar jornada · ${name}`} loading={data.saving && activeSave === `day:${number}`} onClick={() => { void save(false, `day:${number}`); }} />
              </div>
              <div className="schedule-day-feedback-slot">
              {activeSave === `day:${number}` && (validation || data.error || saveResult) && <p
                className={`schedule-save-feedback ${saveResult === "success" ? "is-success" : "is-error"}`}
                ref={validationNotice} tabIndex={-1}
                role={validation || data.error || saveResult === "failed" ? "alert" : "status"}>
                {validation || data.error || (saveResult === "success" ? `${name} guardado como borrador.` : "No se pudo guardar. Inténtalo de nuevo.")}
              </p>}
              </div>
            </>}
          </article>;
        })}</div>
        {activeSave === "publish" && (validation || data.error || saveResult === "failed") && <p
          className="schedule-save-feedback is-error" role="alert" ref={validationNotice} tabIndex={-1}>
          {validation || data.error || "No se pudo publicar el horario. Inténtalo de nuevo."}
        </p>}
        {activeSave && !activeSave.startsWith("day:") && activeSave !== "publish" && saveResult === "success" && <p className="schedule-save-feedback is-success" role="status">
          Borrador guardado.
        </p>}
        {activeSave && !activeSave.startsWith("day:") && saveResult === "failed" && activeSave !== "publish" && !data.error && <p className="schedule-save-feedback is-error" role="alert">No se pudo guardar. Inténtalo de nuevo.</p>}
      </fieldset>
      {data.error && <Button label="Reintentar carga" onClick={data.retry} />}
    </>}
    <div className="schedule-actions">
      <Button label="Publicar horario" loading={data.pendingAction === "publish"}
        disabled={data.loading || data.saving || !data.editable || data.loadFailed}
        onClick={() => ask("El horario actual reemplazará la versión publicada para este año. ¿Publicar?", () => { void save(true); })} />
      <Button label={`Eliminar todo el horario de ${data.year ?? "este año"}`} variant="danger" loading={data.pendingAction === "delete"}
        disabled={data.loading || data.saving || !data.editable || data.loadFailed || data.year === undefined} onClick={requestDelete} />
    </div>
    <ModalAlert isOpen={publishSuccess} type="success" variant="toast" autoCloseTime={2000} message="Horario publicado."
      onClose={() => setPublishSuccess(false)} />
    <ModalConfirm isOpen={Boolean(confirmation)} message={confirmation?.message ?? ""} compact
      title={confirmation?.deleteStep ? `Eliminar horario ${confirmation.deleteYear} · ${confirmation.deleteStep}/2` : undefined}
      confirmLabel={confirmation?.deleteStep === 1 ? "Continuar" : confirmation?.deleteStep === 2 ? "Eliminar definitivamente" : "Confirmar"}
      confirmVariant={confirmation?.deleteStep ? "danger" : "primary"}
      confirmDisabled={confirmation?.deleteStep === 2 && (deleteText !== `ELIMINAR ${confirmation.deleteYear}` || data.year !== confirmation.deleteYear)}
      containerClassName="schedule-confirm" anchor={confirmation?.anchor}
      onCancel={() => { setConfirmation(null); setDeleteText(""); }} onConfirm={() => {
        if (confirmation?.deleteStep === 2 && (deleteText !== `ELIMINAR ${confirmation.deleteYear}` || data.year !== confirmation.deleteYear)) return;
        const action = confirmation?.action; setConfirmation(null); action?.();
      }}>
      {confirmation?.deleteStep === 2 && <label className="schedule-delete-check">Escribe ELIMINAR {confirmation.deleteYear}
        <input value={deleteText} onChange={event => setDeleteText(event.target.value)} autoComplete="off" spellCheck={false} />
      </label>}
    </ModalConfirm>
  </section>;
}
