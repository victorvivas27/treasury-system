import { act, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { HomeWelcome } from './HomeWelcome';

const { settings } = vi.hoisted(() => ({ settings: vi.fn() }));
vi.mock('@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl', () => ({
  TreasuryRepositoryImpl: class { getManagedCourseSettings = settings; },
}));
beforeEach(() => { settings.mockResolvedValue({ course: '2° A', schoolYear: 2027 }); });

it('welcomes the configured course without displaying the year and follows configuration changes', async () => {
  render(<HomeWelcome />);
  expect(await screen.findByText('Curso 2° A')).toBeInTheDocument();
  expect(screen.queryByText('2027')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cada familia hace la diferencia.');
  act(() => window.dispatchEvent(new CustomEvent('managed-course-changed', {
    detail: { course: '3° A', schoolYear: 2028 },
  })));
  expect(screen.getByText('Curso 3° A')).toBeInTheDocument();
  expect(screen.queryByText('2028')).not.toBeInTheDocument();
});

it('keeps the welcome available without inventing a course when settings cannot load', async () => {
  settings.mockRejectedValue(new Error('Unavailable'));
  await act(async () => { render(<HomeWelcome />); });
  expect(screen.getByText('Familias del curso')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
});
