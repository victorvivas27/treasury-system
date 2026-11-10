import { ActionButton } from '@/shared/ui/button/ActionButton';
import { useState } from 'react';
import { FiCheck, FiFilm, FiImage, FiPlay, FiSave } from 'react-icons/fi';
import { DEFAULT_PAGE_TRANSITION_PREFERENCES, readPageTransitionPreferences, PAGE_TRANSITION_PREFERENCES_KEY,
  type PageTransitionPreferences } from '@/shared/ui/loading/pageTransitionPreferences';
import './InitialLoaderSettings.css';
import { PageEntryVisual } from '@/shared/ui/loading/PageEntryVisual';

export function PageTransitionSettings() {
  const [saved, setSaved] = useState(readPageTransitionPreferences);
  const [draft, setDraft] = useState(saved);
  const [previewing, setPreviewing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const changed = JSON.stringify(draft) !== JSON.stringify(saved);
  const update = (patch: Partial<PageTransitionPreferences>) => {
    setDraft(current => ({ ...current, ...patch }));
    setMessage(''); setError('');
  };
  const save = () => {
    try {
      localStorage.setItem(PAGE_TRANSITION_PREFERENCES_KEY, JSON.stringify(draft));
      setSaved({ ...draft }); setMessage('Preferencia entre páginas guardada.'); setError('');

    } catch { setError('No se pudo guardar la preferencia en este navegador.'); }
  };
  const preview = () => setPreviewing(true);
  return <><article className="appearance-card startup-settings" aria-labelledby="page-transition-settings-title">
    <div className="appearance-heading">
      <div><h2 id="page-transition-settings-title">Transiciones entre páginas</h2><p>Elige y prueba el loader al navegar dentro de la app.</p></div>
      <span className="resolved-theme">Este navegador</span>
    </div>
    <fieldset className="startup-settings__options">
      <legend className="sr-only">Experiencia entre páginas</legend>
      {([
        { value: 'video', label: 'Video', detail: 'Video de fondo y títulos con distintas entradas.', icon: FiFilm },
        { value: 'cinematic', label: 'Cinemática', detail: 'Imágenes de la comunidad y textos en secuencia.', icon: FiImage },
        { value: 'video-light', label: 'Video 02 · Revelado de luz', detail: 'Palabras que se enfocan y un destello sobre la frase final.', icon: FiFilm },
      ] as const).map(({ value, label, detail, icon: Icon }) => <label key={value}
        className={`startup-settings__option${draft.variant === value ? ' is-selected' : ''}`}>
        <input type="radio" name="page-transition-variant" value={value} checked={draft.variant === value}
          onChange={() => update({ variant: value })} />
        <Icon aria-hidden="true" />
        <span><strong>{label}</strong><small>{detail}</small></span>
        {draft.variant === value && <FiCheck className="startup-settings__check" aria-hidden="true" />}
      </label>)}
    </fieldset>
    <div className="startup-settings__controls">
      <label>Tiempo mínimo entre páginas
        <select value={draft.durationMs} onChange={event => update({ durationMs: Number(event.target.value) })}>
          {[0, 3000, 5000, 10000, 15000, 20000].map(value => <option key={value} value={value}>
            {value === 0 ? 'Solo mientras carga' : `${value / 1000} segundos`}
          </option>)}
        </select>
      </label>
      <label>Fundido a la página · {(draft.exitMs / 1000).toLocaleString('es-CL')} s
        <input type="range" min={400} max={3000} step={100} value={draft.exitMs}
          onChange={event => update({ exitMs: Number(event.target.value) })}
          aria-label="Duración del fundido entre páginas" aria-valuetext={`${draft.exitMs / 1000} segundos`} />
      </label>
    </div>
    <p className="startup-settings__hint">El fundido revela la página con la duración elegida en cualquiera de las tres variantes. Los ajustes se guardan en este navegador.</p>
    <footer className="startup-settings__actions">
      <button type="button" className="startup-settings__reset" onClick={() => update(DEFAULT_PAGE_TRANSITION_PREFERENCES)}>Restablecer</button>
      <button type="button" onClick={preview}><FiPlay aria-hidden="true" /> Probar transición</button>
      <ActionButton type="button" disabled={!changed} onClick={save}><FiSave aria-hidden="true" /> Guardar transiciones</ActionButton>
    </footer>
    {message && <p role="status" className="startup-settings__message">{message}</p>}
    {error && <p role="alert">{error}</p>}
  </article>{previewing && <PageEntryVisual ready onExited={() => setPreviewing(false)} preferences={{ ...draft, durationMs: draft.durationMs || 3000 }} />}</>;
}
