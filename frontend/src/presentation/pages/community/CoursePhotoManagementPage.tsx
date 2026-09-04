import { useCallback, useEffect, useState } from "react";
import { FiCamera, FiSave, FiTrash2, FiUpload } from "react-icons/fi";
import type { CoursePhoto } from "@/core/A-domain/entities/community/CoursePhoto";
import { coursePhotos } from "@/core/C-infra/repositories/community/CoursePhotoRepository";
import { ModalAlert } from "@/shared/ui/modalalert/ModalAler";
import { ModalConfirm } from "@/shared/ui/modalconfirm/ModalConfirm";
import "./CoursePhotoManagementPage.css";

export const CoursePhotoManagementPage = () => {
  const [photos, setPhotos] = useState<CoursePhoto[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<number, string>>({});
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deletePhoto, setDeletePhoto] = useState<CoursePhoto>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { setPhotos(await coursePhotos.list()); } catch { setError("No fue posible cargar la galería."); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    let active = true;
    const urls: string[] = [];
    void Promise.all(photos.map(async photo => {
      const url = await coursePhotos.loadImageUrl(photo); urls.push(url); return [photo.id, url] as const;
    })).then(entries => { if (active) setPhotoUrls(Object.fromEntries(entries)); })
      .catch(() => { if (active) setPhotoUrls({}); });
    return () => { active = false; urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [photos]);

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try { await coursePhotos.upload(file, caption); setCaption(""); setMessage("Foto agregada a la galería."); await load(); }
    catch { setError("No fue posible subir la foto. Usa JPG, PNG o WEBP y revisa que aún haya espacio."); }
    finally { setUploading(false); }
  };
  const save = async (photo: CoursePhoto) => {
    try { await coursePhotos.update(photo.id, photo.caption ?? "", photo.displayOrder); setMessage("Foto actualizada."); await load(); }
    catch { setError("No fue posible actualizar la foto."); }
  };
  const remove = async () => {
    if (!deletePhoto) return;
    try { await coursePhotos.delete(deletePhoto.id); setMessage("Foto eliminada."); await load(); }
    catch { setError("No fue posible eliminar la foto."); }
    finally { setDeletePhoto(undefined); }
  };

  return <section className="course-photo-admin">
    <header><span>Administración de la Home</span><h1>Fotos del curso</h1>
      <p>Publica recuerdos para la galería de “Nuestros momentos”.</p></header>
    <section className="course-photo-admin__upload">
      <FiCamera aria-hidden="true" /><div><h2>Nueva foto</h2><p>{photos.length} fotos publicadas</p></div>
      <label className="course-photo-admin__caption-field">
        <input value={caption} maxLength={160} placeholder="Descripción breve (opcional)"
          onChange={event => setCaption(event.target.value)} disabled={uploading} />
        <small>{caption.length}/160 caracteres</small>
      </label>
      <label className={uploading ? "is-disabled" : ""}><FiUpload />
        {uploading ? "Subiendo…" : "Seleccionar imagen"}<input type="file" accept="image/jpeg,image/png,image/webp"
          disabled={uploading} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }} /></label>
    </section>
    <div className="course-photo-admin__grid">
      {photos.map(photo => <article key={photo.id}>
        <img src={photoUrls[photo.id]} alt={photo.caption || "Foto del curso"} />
        <label>Descripción<input maxLength={160} value={photo.caption ?? ""}
          onChange={event => setPhotos(current => current.map(item => item.id === photo.id ? { ...item, caption: event.target.value } : item))} />
          <small>{(photo.caption ?? "").length}/160 caracteres</small></label>
        <label>Posición<input type="number" min={0} value={photo.displayOrder}
          onChange={event => setPhotos(current => current.map(item => item.id === photo.id ? { ...item, displayOrder: Number(event.target.value) } : item))} /></label>
        <footer><button onClick={() => void save(photo)}><FiSave /> Guardar</button>
          <button className="is-danger" onClick={() => setDeletePhoto(photo)}><FiTrash2 /> Eliminar</button></footer>
      </article>)}
      {photos.length === 0 && <p className="course-photo-admin__empty">Aún no hay fotos publicadas.</p>}
    </div>
    <ModalConfirm isOpen={Boolean(deletePhoto)} title="Eliminar foto" message="¿Deseas eliminar esta foto de la galería y del almacenamiento?"
      confirmLabel="Eliminar" confirmVariant="danger" onConfirm={() => void remove()} onCancel={() => setDeletePhoto(undefined)} />
    <ModalAlert isOpen={Boolean(message)} type="success" message={message} onClose={() => setMessage("")} />
    <ModalAlert isOpen={Boolean(error)} type="error" message={error} onClose={() => setError("")} />
  </section>;
};
