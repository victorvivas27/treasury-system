import { setCachedLoaderPreference, clearLoaderPreferenceCache } from '@/shared/ui/loading/loaderPreferenceCache';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { HomeEntryTransition } from './HomeEntryTransition';

vi.mock('@/shared/ui/loading/PageEntryVisual', () => ({
  PageEntryVisual: ({ ready, onExited, preferences }: { ready: boolean; onExited: () => void; preferences: { variant: string; soundEnabled?: boolean } }) =>
    <button disabled={!ready} onClick={onExited} data-variant={preferences.variant} data-sound={String(preferences.soundEnabled === true)}>Loader compartido</button>,
}));
afterEach(() => { localStorage.clear(); clearLoaderPreferenceCache(); });

it.each(['video', 'cinematic', 'video-light', 'nneo-rising-fill'])('usa el loader configurado %s y espera los datos del Home', variant => {
  setCachedLoaderPreference('pageTransition', { variant, durationMs: 0, exitMs: 800, soundEnabled: true });
  const onExited = vi.fn();
  const view = render(<HomeEntryTransition ready={false} onExited={onExited} />);
  const loader = screen.getByRole('button', { name: 'Loader compartido' });
  expect(loader).toHaveAttribute('data-variant', variant);
  expect(loader).toHaveAttribute('data-sound', 'true');
  expect(loader).toBeDisabled();
  expect(onExited).not.toHaveBeenCalled();
  view.rerender(<HomeEntryTransition ready onExited={onExited} />);
  fireEvent.click(loader);
  expect(onExited).toHaveBeenCalledOnce();
});

it('uses the initial Rising Fill cover for Home without chaining another loader', () => {
  const boot = document.createElement('div'); boot.id = 'app-boot-loader'; boot.dataset.variant = 'nneo-rising-fill'; document.body.append(boot);
  try {
    const onExited = vi.fn();
    const view = render(<HomeEntryTransition ready={false} onExited={onExited} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(document.querySelector('.page-transition-content[inert]')).not.toBeNull();
    view.rerender(<HomeEntryTransition ready onExited={onExited} />);
    expect(onExited).toHaveBeenCalledOnce();
  } finally { boot.remove(); }
});
