import { useState } from 'react';
import { FiPlay } from 'react-icons/fi';
import { PageEntryVisual } from '@/shared/ui/loading/PageEntryVisual';
import './InitialLoaderSettings.css';

export function InitialLoaderSettings() {
  const [previewing, setPreviewing] = useState(false);
  return <>
    {previewing && <PageEntryVisual onExited={() => setPreviewing(false)} />}
    <article className="appearance-card startup-settings" aria-labelledby="startup-settings-title">
      <div className="appearance-heading">
        <div><h2 id="startup-settings-title">Inicio de la app</h2><p>Contador Rising Fill al abrir la app.</p></div>
        <span className="resolved-theme">Fijo</span>
      </div>
      <p className="startup-settings__hint">Aparece al iniciar y abre la app cuando está lista.</p>
      <footer className="startup-settings__actions">
        <button type="button" onClick={() => setPreviewing(true)}><FiPlay aria-hidden="true" /> Probar inicio</button>
      </footer>
    </article>
  </>;
}
