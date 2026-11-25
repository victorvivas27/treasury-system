import { useEffect, useState } from 'react';
import { FiRefreshCw, FiX } from 'react-icons/fi';
import { resolveApiBaseUrl } from '@/core/D-config/api';
import { SERVICE_UNAVAILABLE_EVENT } from '@/core/D-config/axiosInterceptor';
import illustration from '@/assets/service-unavailable-characters.png';
import './ServiceNotice.css';

export const ServiceNotice = () => {
  const [visible, setVisible] = useState(!navigator.onLine);
  const [checking, setChecking] = useState(false);
  const [reachable, setReachable] = useState(false);

  useEffect(() => {
    const show = () => { setReachable(false); setVisible(true); };
    window.addEventListener(SERVICE_UNAVAILABLE_EVENT, show);
    window.addEventListener('offline', show);
    return () => {
      window.removeEventListener(SERVICE_UNAVAILABLE_EVENT, show);
      window.removeEventListener('offline', show);
    };
  }, []);

  const checkConnection = async () => {
    setChecking(true);
    try {
      const response = await fetch(`${resolveApiBaseUrl()}/service-availability`, {
        cache: 'no-store', signal: AbortSignal.timeout(35000),
      });
      setReachable(response.ok);
    } catch {
      setReachable(false);
    } finally {
      setChecking(false);
    }
  };

  if (!visible) return null;

  return <aside className="service-notice" role="status" aria-live="polite">
    <img src={illustration} alt="" className="service-notice__image" />
    <div className="service-notice__content">
      <strong>{reachable ? 'Ya hay conexión' : 'Estamos teniendo dificultades'}</strong>
      <p>{reachable
        ? 'Revisa si tu acción se completó antes de volver a intentarla.'
        : 'No pudimos completar la solicitud. Revisa tu conexión o inténtalo nuevamente en unos momentos.'}</p>
      {!reachable && <button type="button" onClick={() => void checkConnection()} disabled={checking}>
        <FiRefreshCw aria-hidden="true" /> {checking ? 'Comprobando…' : 'Comprobar conexión'}
      </button>}
    </div>
    <button className="service-notice__close" type="button" aria-label="Cerrar aviso de conexión"
      onClick={() => setVisible(false)}><FiX aria-hidden="true" /></button>
  </aside>;
};
