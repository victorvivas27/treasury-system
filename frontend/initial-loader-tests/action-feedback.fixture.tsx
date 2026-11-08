import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { Button } from '../src/shared/ui/button/Button';
import { ActionButton } from '../src/shared/ui/button/ActionButton';
import '../src/shared/style/global.css';

const execute = () => new Promise<void>(resolve => window.setTimeout(resolve, 1200));
function Preview() {
  const [saving, setSaving] = useState(false);
  return <main style={{ padding: 24, display: 'grid', gap: 16, maxWidth: 700, margin: 'auto' }}>
    <Button label="Guardar" size="medium" loading={saving} onClick={() => {
      setSaving(true);
      return execute().finally(() => setSaving(false));
    }} />
    <Button label="Enviar sugerencia" size="medium" onClick={execute} />
    <div style={{ display: 'flex', gap: 12 }}>
      <ActionButton className="base-button button-danger size-medium" style={{ flex: 1 }} onClick={execute}>Eliminar</ActionButton>
      <ActionButton className="base-button button-secondary size-medium" style={{ flex: 1 }}>Cancelar</ActionButton>
    </div>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Preview />);
