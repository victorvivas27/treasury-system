import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ModalConfirm } from './ModalConfirm';
it('names the dialog, traps keyboard focus, handles Escape and restores focus', () => {
  const trigger = document.createElement('button');
  document.body.append(trigger); trigger.focus();
  const cancel = vi.fn();
  const { unmount } = render(<ModalConfirm isOpen title="Eliminar registro" message="Acción irreversible" onCancel={cancel} onConfirm={vi.fn()} />);
  const dialog = screen.getByRole('dialog', { name: 'Eliminar registro' });
  expect(dialog).toHaveAccessibleDescription('Acción irreversible');
  const first = screen.getByRole('button', { name: 'Cancelar' });
  const last = screen.getByRole('button', { name: 'Confirmar' });
  expect(first).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
  expect(last).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Tab' }); expect(first).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' }); expect(cancel).toHaveBeenCalledOnce();
  unmount(); expect(trigger).toHaveFocus(); trigger.remove();
});
it('does not dismiss a transaction in progress and keeps a focus target', () => {
  const cancel = vi.fn();
  render(<ModalConfirm isOpen isLoading message="Guardando" onCancel={cancel} onConfirm={vi.fn()} />);
  expect(screen.getByRole('dialog')).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' }); expect(cancel).not.toHaveBeenCalled();
});
