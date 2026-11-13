import { useLoaderSettings } from '@/presentation/hooks/useLoaderSettings';
import { saveLoaderPreference } from '@/shared/ui/loading/loaderConfiguration';
import { ActionButton } from '@/shared/ui/button/ActionButton';
import { useCallback, useState } from 'react';
import { FiCheck, FiFilm, FiImage, FiPlay, FiSave, FiArrowUp } from 'react-icons/fi';
import { DEFAULT_PAGE_TRANSITION_PREFERENCES, readPageTransitionPreferences,
  type PageTransitionPreferences } from '@/shared/ui/loading/pageTransitionPreferences';
import './InitialLoaderSettings.css';
import { PageEntryVisual } from '@/shared/ui/loading/PageEntryVisual';

export function PageTransitionSettings() {
  const [saved, setSaved] = useState(readPageTransitionPreferences);
  const [draft, setDraft] = useState(saved);
  const [previewing, setPreviewing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const acceptConfiguration = useCallback((value: PageTransitionPreferences) => {
    setSaved(value);
    setDraft(value);
  }, []);
  const configuration = useLoaderSettings('pageTransition', acceptConfiguration);
  const changed = JSON.stringify(draft) !== JSON.stringify(saved);
  const update = (patch: Partial<PageTransitionPreferences>) => {
    setDraft(current => ({ ...current, ...patch }));
    setMessage(''); setError('');
  };
  const save = async () => {
    setSaving(true);
    try {
      const persisted = await saveLoaderPreference('pageTransition', draft);
      setSaved(persisted); setDraft(persisted); setMessage('Preferencia entre páginas guardada.'); setError('');

    } catch { setError('No se pudo guardar la preferencia del curso.'); } finally { setSaving(false); }
  };
  const preview = () => setPreviewing(true);
  return <><article className="appearance-card startup-settings" aria-labelledby="page-transition-settings-title">
    <div className="appearance-heading">
      <div><h2 id="page-transition-settings-title">Transiciones entre páginas</h2><p>Elige y prueba el loader al navegar dentro de la app.</p></div>
      <span className="resolved-theme">Todos los usuarios del curso</span>
    </div>
    <fieldset className="startup-settings__options" disabled={configuration.loading || Boolean(configuration.error) || saving}>
      <legend className="sr-only">Experiencia entre páginas</legend>
      {([
        { value: 'video', label: 'Video', detail: 'Video de fondo y títulos con distintas entradas.', icon: FiFilm },
        { value: 'cinematic', label: 'Cinemática', detail: 'Imágenes de la comunidad y textos en secuencia.', icon: FiImage },
        { value: 'video-light', label: 'Video 02 · Revelado de luz', detail: 'Palabras que se enfocan y un destello sobre la frase final.', icon: FiFilm },
        { value: 'nneo-rising-fill', label: 'Rising Fill', detail: 'Contador de 000 a 100 con relleno ascendente, indicador sincronizado y apertura hacia la app.', icon: FiArrowUp },
      ] as const).map(({ value, label, detail, icon: Icon }) => <label key={value}
        className={`startup-settings__option${draft.variant === value ? ' is-selected' : ''}`}>
        <input type="radio" name="page-transition-variant" value={value} checked={draft.variant === value}
          onChange={() => update({ variant: value, ...(value === 'nneo-rising-fill' ? { durationMs: 0 } : {}) })} />
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
      <label>{draft.variant === 'nneo-rising-fill' ? 'Apertura de paneles' : 'Fundido a la página'} · {(draft.exitMs / 1000).toLocaleString('es-CL')} s
        <input type="range" min={400} max={3000} step={100} value={draft.exitMs}
          onChange={event => update({ exitMs: Number(event.target.value) })}
          aria-label="Duración del fundido entre páginas" aria-valuetext={`${draft.exitMs / 1000} segundos`} />
      </label>
    </div>
    {draft.variant === 'nneo-rising-fill' && <label className="startup-settings__sound">
      <input type="checkbox" checked={draft.soundEnabled === true} onChange={event => update({ soundEnabled: event.target.checked })} />
      Sonido suave al abrir
    </label>}
    <p className="startup-settings__hint">{draft.variant === 'nneo-rising-fill' ? 'Los paneles se abren cuando la página está lista.' : 'El fundido revela la página con la duración elegida.'} La selección se aplica a todos los usuarios del curso.</p>
    <footer className="startup-settings__actions">
      <button type="button" className="startup-settings__reset" onClick={() => update(DEFAULT_PAGE_TRANSITION_PREFERENCES)}>Restablecer</button>
      <button type="button" onClick={preview}><FiPlay aria-hidden="true" /> Probar transición</button>
      <ActionButton type="button" disabled={!changed || configuration.loading || Boolean(configuration.error) || saving} onClick={save}><FiSave aria-hidden="true" /> Guardar transiciones</ActionButton>
    </footer>
    {configuration.loading && <p role="status">Cargando configuración del curso…</p>}
    {configuration.error && <p role="alert">{configuration.error}</p>}
    {message && <p role="status" className="startup-settings__message">{message}</p>}
    {error && <p role="alert">{error}</p>}
  </article>{previewing && <PageEntryVisual ready onExited={() => setPreviewing(false)} preferences={{ ...draft, durationMs: draft.durationMs || 3000 }} />}</>;
}
