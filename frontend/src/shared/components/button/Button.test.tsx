import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button Component', () => {
  it('debe mostrar el texto enviado por props', () => {
    // Renderizamos el botón en el DOM virtual
    render(<Button label="Mi Botón" onClick={() => {}} />);

    // Verificamos si el texto existe
    expect(screen.getByText(/mi botón/i)).toBeInTheDocument();
  });

  it('debe disparar el evento onClick', () => {
    const mockClick = vi.fn(); // Función espía
    render(<Button label="Click" onClick={mockClick} />);

    const boton = screen.getByRole('button');
    fireEvent.click(boton);

    expect(mockClick).toHaveBeenCalledTimes(1);
  });
});
