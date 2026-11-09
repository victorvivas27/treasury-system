import { useEffect, useState } from 'react';
import { ApoderadoRepositoryImpl } from '@/core/C-infra/repositories/apoderado/ApoderadoRepositoryImpl';
import type { InvitationDelivery } from '@/core/A-domain/entities/apoderado/InvitationDelivery';
import './InvitationProgress.css';

export type InvitationPhase = 'idle' | 'sending' | 'sent' | 'failed';
const terminal = new Set(['DELIVERED', 'BOUNCED', 'FAILED', 'COMPLAINED']);

export function InvitationProgress({ codigo, phase }: { codigo: string; phase: InvitationPhase }) {
  const [snapshot, setSnapshot] = useState<{ phase: InvitationPhase; value: InvitationDelivery } | null>(null);
  const delivery = snapshot?.phase === phase ? snapshot.value : null;
  const [queryFailed, setQueryFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (phase === 'sending' || phase === 'failed') return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = Date.now() + 60_000;
    const poll = async () => {
      try {
        const value = await new ApoderadoRepositoryImpl().getInvitationDelivery(codigo);
        if (cancelled) return;
        setSnapshot({ phase, value });
        setQueryFailed(false);
        if (phase === 'sent' && value.trackingEnabled !== false && !terminal.has(value.status) && Date.now() < deadline) {
          timer = setTimeout(() => void poll(), 5000);
        }
      } catch {
        if (!cancelled) setQueryFailed(true);
      }
    };
    void poll();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [codigo, phase, refresh]);

  const status = phase === 'sending' ? 'PROCESSING' : phase === 'failed' ? 'FAILED'
    : delivery?.status ?? (phase === 'sent' ? 'SENT' : 'IDLE');
  const hasSent = phase === 'sent' || ['SENT', 'DELAYED', 'DELIVERED', 'BOUNCED', 'COMPLAINED'].includes(status);
  const received = status === 'DELIVERED' || status === 'COMPLAINED';
  const failed = ['FAILED', 'BOUNCED', 'COMPLAINED'].includes(status);
  const message = status === 'DELIVERED' ? 'El servidor del destinatario aceptó el correo. Puede estar en Spam.'
    : status === 'BOUNCED' ? 'El servidor rechazó el correo. Revisa la dirección del apoderado.'
    : status === 'COMPLAINED' ? 'El destinatario marcó el mensaje como spam.'
    : status === 'FAILED' ? 'No se pudo completar el envío de la invitación.'
    : status === 'DELAYED' ? 'La entrega está demorada. Resend volverá a intentarlo.'
    : status === 'SENT' && delivery?.trackingEnabled === false ? 'Enviado. El seguimiento de entrega aún no está configurado.'
    : status === 'SENT' ? 'Enviado. Esperando confirmación de entrega del servidor.'
    : status === 'PROCESSING' ? 'Preparando y enviando la invitación…'
    : status === 'UNTRACKED' && phase === 'sent' ? 'Envío aceptado. No hay confirmación de entrega disponible.'
    : 'Aquí verás el progreso del correo al enviar la invitación.';

  return <section className="invitation-progress" aria-label="Progreso de la invitación">
    <ol className="invitation-progress__steps">
      {[
        { label: 'En proceso', done: hasSent || received, active: status === 'PROCESSING' },
        { label: 'Enviado', done: hasSent, active: false },
        { label: 'Entregado al servidor', done: received, active: hasSent && !received && !failed },
      ].map((step, index) => <li key={step.label} aria-current={step.active ? 'step' : undefined}
        className={step.done ? 'is-done' : step.active ? 'is-active' : ''}>
        <span aria-hidden="true">{step.done ? '✓' : index + 1}</span><small>{step.label}</small>
      </li>)}
    </ol>
    <p role="status" aria-live="polite" className={failed ? 'invitation-progress__error' : ''}>{message}</p>
    {queryFailed && phase !== 'sending' && <p role="status">No pudimos consultar el estado. Esto no significa que el correo haya fallado.</p>}
    {phase !== 'sending' && (hasSent || queryFailed || delivery?.createdAt) &&
      <button type="button" className="invitation-progress__refresh" onClick={() => setRefresh(value => value + 1)}>Consultar estado</button>}
    {delivery?.createdAt && phase === 'idle' && <small>Último envío: {new Date(delivery.createdAt).toLocaleString('es-CL')}</small>}
  </section>;
}
