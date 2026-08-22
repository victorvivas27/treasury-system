import { useCallback, useEffect, useState, type FormEvent } from "react";
import { FiAward, FiBookOpen, FiCompass, FiEdit2, FiEye, FiEyeOff, FiGift, FiHeart,
  FiMusic, FiPlus, FiSave, FiSmile, FiStar, FiSun, FiTarget, FiTrash2, FiUsers,
  FiX } from "react-icons/fi";
import type { AboutAccent, AboutIcon, AboutSection,
  AboutSectionPayload } from "@/core/A-domain/entities/community/AboutSection";
import { AboutSectionUseCases } from "@/core/B-application/use-cases/community/AboutSectionUseCases";
import { AboutSectionRepositoryImpl } from "@/core/C-infra/repositories/community/AboutSectionRepositoryImpl";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import "./AboutManagementPage.css";

const about = new AboutSectionUseCases(new AboutSectionRepositoryImpl());
const emptyForm: AboutSectionPayload = { title: "", description: "", displayOrder: 0,
  visible: true, icon: "USERS", accentColor: "TURQUOISE", highlightedPhrase: null,
  featured: false };
const iconOptions: Array<{ value: AboutIcon; label: string; icon: typeof FiUsers }> = [
  { value: "USERS", label: "Comunidad", icon: FiUsers },
  { value: "HEART", label: "Corazón", icon: FiHeart },
  { value: "STAR", label: "Estrella", icon: FiStar },
  { value: "BOOK", label: "Historia", icon: FiBookOpen },
  { value: "TARGET", label: "Meta", icon: FiTarget },
  { value: "SMILE", label: "Alegría", icon: FiSmile },
  { value: "AWARD", label: "Logros", icon: FiAward },
  { value: "COMPASS", label: "Nuestro rumbo", icon: FiCompass },
  { value: "GIFT", label: "Celebración", icon: FiGift },
  { value: "MUSIC", label: "Creatividad", icon: FiMusic },
  { value: "SUN", label: "Energía", icon: FiSun },
];
const colorOptions: Array<{ value: AboutAccent; label: string }> = [
  { value: "TURQUOISE", label: "Turquesa" }, { value: "BLUE", label: "Azul" },
  { value: "PURPLE", label: "Morado" }, { value: "ORANGE", label: "Naranjo" },
  { value: "PINK", label: "Rosado" }, { value: "GREEN", label: "Verde" },
  { value: "RED", label: "Rojo" }, { value: "YELLOW", label: "Amarillo" },
  { value: "INDIGO", label: "Índigo" }, { value: "CORAL", label: "Coral" },
  { value: "SKY", label: "Celeste" }, { value: "LIME", label: "Lima" },
];

export const AboutManagementPage = () => {
  const [items, setItems] = useState<AboutSection[]>([]);
  const [form, setForm] = useState<AboutSectionPayload>(emptyForm);
  const [editingId, setEditingId] = useState<number>();
  const [deleteItem, setDeleteItem] = useState<AboutSection>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try { setItems(await about.adminList()); }
    catch { setError("No fue posible cargar el contenido de Lo que nos mueve."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      if (editingId) await about.update(editingId, form); else await about.create(form);
      setMessage(editingId ? "Contenido actualizado correctamente." : "Contenido creado correctamente.");
      setEditingId(undefined); setForm(emptyForm); await load();
    } catch { setError("No fue posible guardar el contenido. Revisa los campos e intenta nuevamente."); }
    finally { setSaving(false); }
  };
  const edit = (item: AboutSection) => {
    setEditingId(item.id); setForm({ title: item.title, description: item.description,
      displayOrder: item.displayOrder, visible: item.visible, icon: item.icon,
      accentColor: item.accentColor, highlightedPhrase: item.highlightedPhrase,
      featured: item.featured });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const remove = async () => {
    if (!deleteItem) return;
    try { await about.delete(deleteItem.id); setMessage("Contenido eliminado correctamente."); await load(); }
    catch { setError("No fue posible eliminar el contenido."); }
    finally { setDeleteItem(undefined); }
  };

  return <section className="about-admin" aria-labelledby="about-admin-title">
    <header><span>Administración de la Home</span><h1 id="about-admin-title">Lo que nos mueve</h1>
      <p>Crea, actualiza, ordena y publica el contenido que verá la comunidad.</p></header>
    <form className="about-admin__form" onSubmit={submit}>
      <div className="about-admin__form-title"><h2>{editingId ? "Editar contenido" : "Nuevo contenido"}</h2>
        {editingId && <button type="button" onClick={() => { setEditingId(undefined); setForm(emptyForm); }}>
          <FiX /> Cancelar edición</button>}</div>
      <label>Título<input required maxLength={120} value={form.title}
        onChange={event => setForm({ ...form, title: event.target.value })} /></label>
      <label>Descripción<textarea required maxLength={2000} rows={5} value={form.description}
        onChange={event => setForm({ ...form, description: event.target.value })} /></label>
      <label>Frase destacada <small>Opcional: una frase breve que le dé personalidad.</small>
        <input maxLength={240} placeholder="Ej.: Juntos hacemos grandes cosas"
          value={form.highlightedPhrase ?? ""} onChange={event => setForm({ ...form,
            highlightedPhrase: event.target.value || null })} /></label>
      <fieldset className="about-admin__icons"><legend>Elige un ícono</legend><div>
        {iconOptions.map(({ value, label, icon: Icon }) => <label key={value}
          className={form.icon === value ? "selected" : ""} title={label}>
          <input type="radio" name="about-icon" value={value} checked={form.icon === value}
            onChange={() => setForm({ ...form, icon: value })} /><Icon /><span>{label}</span>
        </label>)}</div></fieldset>
      <fieldset className="about-admin__colors"><legend>Color de la tarjeta</legend><div>
        {colorOptions.map(({ value, label }) => <label key={value} title={label}
          className={`is-${value.toLowerCase()} ${form.accentColor === value ? "selected" : ""}`}>
          <input type="radio" name="about-color" value={value}
            checked={form.accentColor === value}
            onChange={() => setForm({ ...form, accentColor: value })} /><span />{label}
        </label>)}</div></fieldset>
      <div className="about-admin__form-row"><label>Orden<input required min={0} type="number"
        value={form.displayOrder} onChange={event => setForm({ ...form,
          displayOrder: Number(event.target.value) })} /></label>
        <label className="about-admin__visible"><input type="checkbox" checked={form.visible}
          onChange={event => setForm({ ...form, visible: event.target.checked })} />
          Publicar en la Home</label>
        <label className="about-admin__visible"><input type="checkbox" checked={form.featured}
          onChange={event => setForm({ ...form, featured: event.target.checked })} />
          Mostrar como tarjeta principal</label></div>
      <button className="about-admin__save" type="submit" disabled={saving}>
        {editingId ? <FiSave /> : <FiPlus />}{saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear contenido"}
      </button>
    </form>
    <section className="about-admin__list" aria-label="Contenido existente">
      <div><h2>Contenido creado</h2><span>{items.length} elementos</span></div>
      {loading ? <p>Cargando contenido…</p> : items.length === 0
        ? <p className="about-admin__empty">Aún no hay contenido. Crea el primer bloque.</p>
        : items.map(item => <article key={item.id}>
          <span className={`about-admin__order is-${item.accentColor.toLowerCase()}`}>#{item.displayOrder}</span><div><h3>{item.title}</h3>
            <p>{item.description}</p><small className={item.visible ? "is-visible" : ""}>
              {item.visible ? <FiEye /> : <FiEyeOff />}{item.visible ? "Publicado" : "Oculto"}</small></div>
          <footer><button type="button" onClick={() => edit(item)}><FiEdit2 /> Editar</button>
            <button type="button" className="danger" onClick={() => setDeleteItem(item)}>
              <FiTrash2 /> Eliminar</button></footer>
        </article>)}
    </section>
    <ModalConfirm isOpen={Boolean(deleteItem)} title="Eliminar contenido"
      message={`¿Deseas eliminar “${deleteItem?.title ?? ""}”? Esta acción no se puede deshacer.`}
      confirmLabel="Eliminar" confirmVariant="danger" onConfirm={() => void remove()}
      onCancel={() => setDeleteItem(undefined)} />
    <ModalAlert isOpen={Boolean(message)} type="success" message={message} onClose={() => setMessage("")} />
    <ModalAlert isOpen={Boolean(error)} type="error" message={error} onClose={() => setError("")} />
  </section>;
};
