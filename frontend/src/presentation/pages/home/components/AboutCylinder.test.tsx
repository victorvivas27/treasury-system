import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AboutCylinder } from './AboutCylinder';
import type { AboutSection } from '@/core/A-domain/entities/community/AboutSection';
const sections = Array.from({ length: 3 }, (_, index) => ({ id: index + 1, title: `Mensaje ${index + 1}`, description: 'Un mensaje original para nuestra comunidad. '.repeat(8), icon: 'HEART', accentColor: index === 0 ? 'ORANGE' : 'GREEN', highlightedPhrase: 'Cada familia cuenta', featured: index === 0 })) as AboutSection[];
describe('AboutCylinder', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  });
  it('preserves messages and expands real text with accessible controls', () => {
    render(<AboutCylinder sections={sections} />);
    const button = screen.getByRole('button', { name: 'Leer más' });
    expect(screen.getByRole('group')).toHaveTextContent(sections[0].title);
    expect(screen.getByRole('group').querySelector('p')).toHaveTextContent('Un mensaje original para nuestra comunidad. Un mensaje original para nuestra comunidad. Un mensaje original para nuestra comunidad. Un mensaje…');
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    fireEvent.click(button);
    expect(screen.getByRole('dialog')).toHaveAccessibleName(sections[0].title);
    expect(screen.getByRole('dialog')).toHaveTextContent(sections[0].description.trim());
    expect(screen.getByRole('dialog')).toHaveTextContent('Cada familia cuenta');
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe('hidden');
  });
  it('wraps around using arrows and supports Home and End without motion', () => {
    render(<AboutCylinder sections={sections} />);
    const region = screen.getByRole('region');
    fireEvent.keyDown(region, { key: 'ArrowLeft' });
    expect(screen.getByRole('group')).toHaveAccessibleName('3 de 3: Mensaje 3');
    fireEvent.keyDown(region, { key: 'Home' });
    expect(screen.getByRole('group')).toHaveAccessibleName('1 de 3: Mensaje 1');
    fireEvent.keyDown(region, { key: 'End' });
    fireEvent.keyDown(region, { key: 'ArrowRight' });
    expect(screen.getByRole('group')).toHaveAccessibleName('1 de 3: Mensaje 1');
  });
  it('allows direct selection and collapses the previous message', () => {
    render(<AboutCylinder sections={sections} />);
    fireEvent.click(screen.getByRole('button', { name: 'Leer más' }));
    fireEvent.keyDown(screen.getByRole('region'), { key: 'ArrowRight' });
    expect(screen.getByRole('group')).toHaveAccessibleName('2 de 3: Mensaje 2');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('handles an empty collection without broken geometry or automatic movement', () => {
    render(<AboutCylinder sections={[]} />);
    expect(screen.getByRole('group')).toHaveTextContent('Una comunidad organizada y conectada');
    expect(screen.queryByRole('button', { name: /Mensaje siguiente|Mensaje anterior|Ver mensaje/ })).not.toBeInTheDocument();
  });
});
