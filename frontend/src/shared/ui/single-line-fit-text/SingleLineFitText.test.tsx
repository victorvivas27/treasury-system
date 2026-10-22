import { render } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { SingleLineFitText } from './SingleLineFitText';
it('preserves full text and never shrinks below 12px even with a smaller requested minimum', () => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(10);
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(500);
  const text = 'Nombre y apellidos extremadamente largos para una columna estrecha';
  const { container } = render(<SingleLineFitText minFontSize={7}>{text}</SingleLineFitText>);
  const element = container.querySelector('span > span') as HTMLElement;
  expect(element.textContent).toBe(text);
  expect(parseFloat(element.style.fontSize)).toBeGreaterThanOrEqual(12);
  vi.restoreAllMocks();
});
