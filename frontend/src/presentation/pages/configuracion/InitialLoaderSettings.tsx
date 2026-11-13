import { useLoaderSettings } from '@/presentation/hooks/useLoaderSettings';
import { saveLoaderPreference } from '@/shared/ui/loading/loaderConfiguration';
import { ActionButton } from '@/shared/ui/button/ActionButton';
import { useCallback, useState } from 'react';
import { FiCheck, FiFilm, FiImage, FiPlay, FiSave, FiArrowUp } from 'react-icons/fi';
import { DEFAULT_STARTUP_PREFERENCES, readStartupPreferences,
  type StartupPreferences } from '@/shared/ui/loading/startupPreferences';
import './InitialLoaderSettings.css';

export function InitialLoaderSettings() {
  const [saved, setSaved] = useState(readStartupPreferences);
  const [draft, setDraft] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const variant = params.get('loader');
    const duration = Number(params.get('loaderDelay'));
    const exit = Number(params.get('loaderExit'));
    return { ...saved,
      ...(variant === 'video' || variant === 'cinematic' || variant === 'video-light' || variant === 'nneo-rising-fill' ? { variant } : {}),
      ...(params.has('loaderSound') ? { soundEnabled: params.get('loaderSound') === '1' } : {}),
      ...(params.has('loaderDelay') && Number.isFinite(duration) ? { durationMs: Math.min(20000, Math.max(0, duration)) } : {}),
      ...(params.has('loaderExit') && Number.isFinite(exit) ? { exitMs: Math.min(3000, Math.max(400, exit)) } : {}),
    } as StartupPreferences;
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const acceptConfiguration = useCallback((value: StartupPreferences) => {
    setSaved(value);
    setDraft(current => (new URLSearchParams(location.search).has('loader')) ? current : value);
  }, []);
  const configuration = useLoaderSettings('startup', acceptConfiguration);
  const changed = JSON.stringify(draft) !== JSON.stringify(saved);
  const update = (patch: Partial<StartupPreferences>) => {
    setDraft(current => ({ ...current, ...patch }));
    setMessage(''); setError('');
  };
  const save = async () => {
    setSaving(true);
    try {
      const persisted = await saveLoaderPreference('startup', draft);
      setSaved(persisted); setDraft(persisted); setMessage('Preferencia de inicio guardada.'); setError('');
      const url = new URL(window.location.href);
      ['loader', 'loaderDelay', 'loaderExit', 'loaderSound'].forEach(key => url.searchParams.delete(key));
      window.history.replaceState(window.history.state, '', url.href);
    } catch { setError('No se pudo guardar la preferencia del curso.'); } finally { setSaving(false); }
  };
  const preview = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('loader', draft.variant);
    url.searchParams.set('loaderSound', draft.soundEnabled ? '1' : '0');
    url.searchParams.set('loaderDelay', String(draft.durationMs));
    url.searchParams.set('loaderExit', String(draft.exitMs));
    window.location.assign(url.href);
  };
  return <article className="appearance-card startup-settings" aria-labelledby="startup-settings-title">
    <div className="appearance-heading">
      <div><h2 id="startup-settings-title">Inicio de la app</h2><p>Elige y prueba la experiencia de entrada.</p></div>
      <span className="resolved-theme">Todos los usuarios del curso</span>
    </div>
    <fieldset className="startup-settings__options" disabled={configuration.loading || Boolean(configuration.error) || saving}>
      <legend className="sr-only">Experiencia de inicio</legend>
      {([
        { value: 'video', label: 'Video', detail: 'Video de fondo y títulos con distintas entradas.', icon: FiFilm },
        { value: 'cinematic', label: 'Cinemática', detail: 'Imágenes de la comunidad y textos en secuencia.', icon: FiImage },
        { value: 'video-light', label: 'Video 02 · Revelado de luz', detail: 'Palabras que se enfocan y un destello sobre la frase final.', icon: FiFilm },
        { value: 'nneo-rising-fill', label: 'Rising Fill', detail: 'Contador de 000 a 100 con relleno ascendente, indicador sincronizado y apertura hacia la app.', icon: FiArrowUp },
      ] as const).map(({ value, label, detail, icon: Icon }) => <label key={value}
        className={`startup-settings__option${draft.variant === value ? ' is-selected' : ''}`}>
        <input type="radio" name="startup-variant" value={value} checked={draft.variant === value}
          onChange={() => update({ variant: value, ...(value === 'nneo-rising-fill' ? { durationMs: 0 } : {}) })} />
        <Icon aria-hidden="true" />
        <span><strong>{label}</strong><small>{detail}</small></span>
        {draft.variant === value && <FiCheck className="startup-settings__check" aria-hidden="true" />}
      </label>)}
    </fieldset>
    <div className="startup-settings__controls">
      <label>Tiempo de prueba
        <select value={draft.durationMs} onChange={event => update({ durationMs: Number(event.target.value) })}>
          {[0, 3000, 5000, 10000, 15000, 20000].map(value => <option key={value} value={value}>
            {value === 0 ? 'Solo mientras carga' : `${value / 1000} segundos`}
          </option>)}
        </select>
      </label>
      <label>{draft.variant === 'nneo-rising-fill' ? 'Apertura de paneles' : 'Fundido a la app'} · {((draft.variant !== 'cinematic' ? draft.exitMs : 800) / 1000).toLocaleString('es-CL')} s
        <input type="range" min={400} max={3000} step={100} value={draft.exitMs}
          disabled={draft.variant === 'cinematic'} onChange={event => update({ exitMs: Number(event.target.value) })}
          aria-label={draft.variant === 'nneo-rising-fill' ? 'Duración de la apertura de paneles' : 'Duración del fundido del video'} aria-valuetext={`${draft.exitMs / 1000} segundos`} />
      </label>
    </div>
    {draft.variant === 'nneo-rising-fill' && <label className="startup-settings__sound">
      <input type="checkbox" checked={draft.soundEnabled === true} onChange={event => update({ soundEnabled: event.target.checked })} />
      Sonido suave al abrir
    </label>}
    <p className="startup-settings__hint">{draft.variant === 'nneo-rising-fill' ? 'El contador espera a que la página esté lista y abre los paneles para revelarla.' : draft.variant !== 'cinematic'
      ? 'El video se vuelve transparente y revela la app por debajo.'
      : 'La cinemática conserva su salida de 0,8 segundos.'} La selección se aplica a todos los usuarios del curso.</p>
    <footer className="startup-settings__actions">
      <button type="button" className="startup-settings__reset" onClick={() => update(DEFAULT_STARTUP_PREFERENCES)}>Restablecer</button>
      <button type="button" onClick={preview}><FiPlay aria-hidden="true" /> Probar inicio</button>
      <ActionButton type="button" disabled={!changed || configuration.loading || Boolean(configuration.error) || saving} onClick={save}><FiSave aria-hidden="true" /> Guardar preferencia</ActionButton>
    </footer>
    {configuration.loading && <p role="status">Cargando configuración del curso…</p>}
    {configuration.error && <p role="alert">{configuration.error}</p>}
    {message && <p role="status" className="startup-settings__message">{message}</p>}
    {error && <p role="alert">{error}</p>}
  </article>;
}
