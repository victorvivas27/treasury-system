import { useCallback, useEffect, useMemo, useState } from "react";
import { FiLoader, FiSave, FiTrash2, FiUsers } from "react-icons/fi";
import type { Apoderado } from "@/core/A-domain/entities/apoderado/Apoderado";
import type { BoardMember, BoardRole } from "@/core/A-domain/entities/community/BoardMember";
import { ApoderadoRepositoryImpl } from "@/core/C-infra/repositories/apoderado/ApoderadoRepositoryImpl";
import { courseBoard } from "@/core/C-infra/repositories/community/CourseBoardRepository";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import "./BoardManagementPage.css";

const slots: { role: BoardRole; position: number; label: string }[] = [
  { role: "PRESIDENTE", position: 1, label: "Presidente/a" },
  { role: "VICEPRESIDENTE", position: 1, label: "Vicepresidente/a" },
  { role: "SECRETARIA", position: 1, label: "Secretario/a" },
  { role: "TESORERO", position: 1, label: "Tesorero/a" },
  { role: "PASTORAL", position: 1, label: "Pastoral 1" },
  { role: "PASTORAL", position: 2, label: "Pastoral 2" },
  { role: "COORDINADOR_DEPORTIVO", position: 1, label: "Coordinador/a deportivo/a" },
];
const parentsRepository = new ApoderadoRepositoryImpl();

export const BoardManagementPage = () => {
  const year = new Date().getFullYear();
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [parents, setParents] = useState<Apoderado[]>([]);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<{ key: string; action: "save" | "remove" } | null>(null);
  const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const [board, parentPage] = await Promise.all([courseBoard.list(year), parentsRepository.getAll(0, 500)]);
      setMembers(board); setParents(parentPage.content);
      setSelection(Object.fromEntries(board.map(item => [`${item.role}-${item.positionNumber}`, item.apoderadoCodigo])));
    } catch { setError("No fue posible cargar la directiva o la lista de apoderados."); }
  }, [year]);
  useEffect(() => { void load(); }, [load]);
  const assignedCodes = useMemo(() => new Set(members.map(item => item.apoderadoCodigo)), [members]);
  const save = async (role: BoardRole, position: number) => {
    if (pending) return;
    const key = `${role}-${position}`; const code = selection[key];
    if (!code) { setError("Selecciona un apoderado para el cargo."); return; }
    setPending({ key, action: "save" });
    try { await courseBoard.assign(role, position, code, year); await load(); setMessage("Directiva actualizada."); }
    catch { setError("No fue posible asignar el cargo. El apoderado puede estar asignado en otro cargo."); }
    finally { setPending(null); }
  };
  const remove = async (member?: BoardMember) => {
    if (!member || pending) return;
    setPending({ key: `${member.role}-${member.positionNumber}`, action: "remove" });
    try { await courseBoard.delete(member.id); await load(); setMessage("Integrante quitado de la directiva."); }
    catch { setError("No fue posible quitar al integrante."); }
    finally { setPending(null); }
  };
  return <section className="board-admin">
    <header><span>Administración de la Home</span><h1>Directiva del curso</h1>
      <p>Selecciona los representantes del año {year} desde la lista de apoderados.</p></header>
    <div className="board-admin__grid">{slots.map(slot => {
      const key = `${slot.role}-${slot.position}`;
      const saving = pending?.key === key && pending.action === "save";
      const removing = pending?.key === key && pending.action === "remove";
      const member = members.find(item => item.role === slot.role && item.positionNumber === slot.position);
      return <article key={key}><FiUsers aria-hidden="true" /><div><h2>{slot.label}</h2>
        <p>{member ? `${member.nombre} · ${member.email}` : "Cargo sin asignar"}</p></div>
        <select aria-label={`Apoderado para ${slot.label}`} value={selection[key] ?? ""} disabled={Boolean(pending)}
          onChange={event => setSelection(current => ({ ...current, [key]: event.target.value }))}>
          <option value="">Seleccionar apoderado</option>
          {parents.map(parent => <option key={parent.codigo} value={parent.codigo}
            disabled={assignedCodes.has(parent.codigo) && parent.codigo !== member?.apoderadoCodigo}>
            {parent.nombre} — {parent.email}</option>)}</select>
        <footer><button type="button" disabled={Boolean(pending)} aria-busy={saving}
          onClick={() => void save(slot.role, slot.position)}>
          {saving ? <FiLoader className="board-admin__spinner" aria-hidden="true" /> : <FiSave aria-hidden="true" />}
          {saving ? "Guardando…" : "Guardar"}</button>
          {member && <button type="button" className="is-danger" disabled={Boolean(pending)} aria-busy={removing}
            onClick={() => void remove(member)}>
            {removing ? <FiLoader className="board-admin__spinner" aria-hidden="true" /> : <FiTrash2 aria-hidden="true" />}
            {removing ? "Quitando…" : "Quitar"}</button>}</footer>
        {pending?.key === key && <p className="board-admin__status" role="status">
          {saving ? "Guardando asignación, espera un momento…" : "Quitando integrante, espera un momento…"}
        </p>}</article>;
    })}</div>
    <ModalAlert isOpen={Boolean(message)} type="success" variant="toast" autoCloseTime={3000}
      message={message} onClose={() => setMessage("")} />
    <ModalAlert isOpen={Boolean(error)} type="error" message={error} onClose={() => setError("")} />
  </section>;
};
